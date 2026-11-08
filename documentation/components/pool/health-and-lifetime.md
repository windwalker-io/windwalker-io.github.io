---
layout: doc
title: Health and Lifetime
component: pool
---

# Health and Lifetime

Connections do not last forever. A database server closes idle sessions
after a timeout, a long-lived session can accumulate state or memory, and a
connection can break without any warning. The pool can retire connections
by age and usage, and it can check whether a connection still responds
before handing it out.

## Minimal Setup

The health settings are options on `PoolOptions`. Set only the ones you
need. The defaults keep idle connections for 60 seconds and turn off the
other checks:

```php
use Windwalker\Pool\Enum\Heartbeat;
use Windwalker\Pool\PoolOptions;

$options = new PoolOptions(
    maxSize: 8,
    idleTimeout: 60,
    maxLifetime: 1800,
    maxUses: 5000,
    heartbeat: Heartbeat::LAZY,
);
```

## Showcase

The worker below handles a queue of jobs with one pool. Connections are
retired by the pool when they are old, used too often, or fail a ping. The
worker only drops a connection that raised an error during a job:

```php
use Windwalker\Pool\ConnectionPool;
use Windwalker\Pool\Enum\Heartbeat;
use Windwalker\Pool\PoolOptions;
use Windwalker\Pool\Stack\PhpStack;

$pool = new ConnectionPool(
    new PoolOptions(
        maxSize: 8,
        minSize: 2,
        idleTimeout: 60,
        maxLifetime: 1800,
        maxUses: 5000,
        heartbeat: Heartbeat::LAZY,
    ),
    new PhpStack(),
);

$pool->setConnectionBuilder(
    fn () => new PdoConnection($dsn, $user, $password)
);

$pool->init();

foreach ($jobs as $job) {
    $conn = $pool->getConnection();

    try {
        if (!$conn->isConnected()) {
            $conn->connect();
        }

        runJob($job, $conn->getPdo());

        $conn->release();
    } catch (\Throwable $e) {
        $pool->dropConnection($conn);
    }
}
```

`PdoConnection` is the class from the
[Connections](/documentation/components/pool/connections) page.

## Age and Usage Limits

The pool checks age and usage limits at different times:

- `idleTimeout`: drops an idle connection that has not been used for the
  given number of seconds. The check runs when a connection is borrowed.
  Default `60`. Use `-1` to disable it.
- `maxLifetime`: drops a connection once it is older than the given number
  of seconds, counted from its creation. The check runs when a connection
  is borrowed. Default `-1`, which means no limit.
- `maxUses`: drops a connection on release after it has been borrowed the
  given number of times. Default `-1`, which means no limit.

```php
use Windwalker\Pool\PoolOptions;

$options = new PoolOptions(
    idleTimeout: 30,
    maxLifetime: 3600,
    maxUses: 1000,
);
```

Set `maxLifetime` to a value below the server's own session timeout. The
pool then retires the connection before the server closes it under you.

## Heartbeat

The `heartbeat` option decides when the pool pings a connection. It takes
one of the `Heartbeat` cases:

- `Heartbeat::NONE`: the pool never pings. This is the default.
- `Heartbeat::LAZY`: the pool pings an idle connection when it is borrowed.
  A failed ping drops the connection, and the pool tries the next one.
- `Heartbeat::INTERVALS`: a timer pings idle connections every
  `timerInterval` seconds. A failed connection is marked `ABANDONED`, and the
  next borrow or release drops it.

```php
use Windwalker\Pool\Enum\Heartbeat;
use Windwalker\Pool\PoolOptions;

$options = new PoolOptions(
    heartbeat: Heartbeat::LAZY,
);

$options = new PoolOptions(
    heartbeat: Heartbeat::INTERVALS,
    timerInterval: 30,
);
```

::: tip
`LAZY` covers most cases. It adds one ping for each borrowed connection and
needs no timer. Use `INTERVALS` when a pool sits idle for long periods and
you want dead connections removed before a caller borrows them.
:::

::: warning
`INTERVALS` and `leakTimeout` need a timer, which only `SwooleStack`
provides. With `PhpStack` or `SingleStack`, they are silently ignored. The
connections are not pinged and no leak is reported. See
[Swoole Stack](/documentation/components/pool/swoole-stack).
:::

## Leak Timeout

`leakTimeout` reports a connection that has been borrowed for longer than
the given number of seconds. It logs a warning through the pool's logger,
but it does not drop the connection. The default is `-1`, which turns it
off. Like `INTERVALS`, it runs on the timer, so it needs `SwooleStack`.

```php
use Windwalker\Pool\PoolOptions;

$options = new PoolOptions(
    timerInterval: 10,
    leakTimeout: 60,
);
```

::: warning
`ping()` runs inside `getConnection()` for `LAZY`. If it throws, the
exception reaches the caller, and the connection is neither returned nor
dropped. Catch the error inside `ping()` and return `false`, as the
[Connections](/documentation/components/pool/connections) example does.
:::
