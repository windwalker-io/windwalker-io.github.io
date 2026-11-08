---
layout: doc
title: Swoole Stack
component: pool
---

# Swoole Stack

In a coroutine server, many coroutines can need a connection at the same
time. A stack that cannot wait would fail those requests at once.
`SwooleStack` stores idle connections in a `Swoole\Coroutine\Channel`. A
coroutine that finds no idle connection suspends, and resumes when another
coroutine releases one. The stack also lets the pool run timers for leak
reports and heartbeats.

## Minimal Setup

Pass a `SwooleStack` as the second argument. The integer is the capacity of
the channel, so it must be at least `maxSize`:

```php
use Windwalker\Pool\ConnectionPool;
use Windwalker\Pool\PoolOptions;
use Windwalker\Pool\Stack\SwooleStack;

$pool = new ConnectionPool(
    new PoolOptions(maxSize: 10, waitTimeout: 3),
    new SwooleStack(10),
);
```

::: warning
Keep the channel capacity at least equal to `maxSize`. The pool checks
`maxSize` before it pushes a connection back, but a full channel blocks the
push. Give `SwooleStack` a capacity that matches the pool, or a larger one.
:::

## Showcase

The example below starts a coroutine server, then handles fifty requests in
parallel with one pool. Each request borrows a connection, runs a query,
and returns the connection. A request that waits longer than `waitTimeout`
gets a `503` response:

```php
use Swoole\Coroutine;
use Windwalker\Pool\ConnectionPool;
use Windwalker\Pool\Exception\ConnectionPoolException;
use Windwalker\Pool\PoolOptions;
use Windwalker\Pool\Stack\SwooleStack;

$pool = new ConnectionPool(
    new PoolOptions(maxSize: 10, waitTimeout: 3),
    new SwooleStack(10),
);

$pool->setConnectionBuilder(
    fn () => new PdoConnection($dsn, $user, $password)
);

function handleRequest(ConnectionPool $pool, int $id): array
{
    try {
        $conn = $pool->getConnection();
    } catch (ConnectionPoolException $e) {
        return ['status' => 503, 'error' => $e->getMessage()];
    }

    try {
        if (!$conn->isConnected()) {
            $conn->connect();
        }

        $stmt = $conn->getPdo()->prepare(
            'SELECT name FROM users WHERE id = ?'
        );
        $stmt->execute([$id]);

        $name = $stmt->fetchColumn();

        $conn->release();

        return ['status' => 200, 'name' => $name];
    } catch (\Throwable $e) {
        $pool->dropConnection($conn);

        return ['status' => 500, 'error' => $e->getMessage()];
    }
}

\Swoole\Coroutine\run(function () use ($pool) {
    foreach (range(1, 50) as $id) {
        Coroutine::create(
            fn () => handleRequest($pool, $id)
        );
    }
});
```

`PdoConnection` is the class from the
[Connections](/documentation/components/pool/connections) page.

## Waiting for a Connection

When every connection is borrowed and `maxSize` is reached, a caller waits.
Two options control the wait:

- `waitTimeout`: the number of seconds to wait. The default `-1` waits
  indefinitely. When the time runs out, the pool throws a
  `WaitTimeoutException`.
- `maxWait`: the maximum number of callers allowed to wait at the same
  time. A caller beyond this limit gets a `ConnectionPoolException` at once.

Both exceptions extend `ConnectionPoolException`, so one `catch` block can
handle either case, as the showcase does.

```php
use Windwalker\Pool\PoolOptions;

$options = new PoolOptions(
    maxSize: 10,
    maxWait: 100,
    waitTimeout: 3,
);
```

::: tip
Keep `waitTimeout` short in a web server. A caller that waits for seconds
holds its request open, and a limited `maxWait` returns an error sooner.
:::

## Timers

When `init()` runs with `timerInterval` above `0`, and the stack supports
timers, the pool starts one timer. The timer does two things on every tick:

- It reports connections that are borrowed for longer than `leakTimeout`.
- It pings idle connections when `heartbeat` is `Heartbeat::INTERVALS`.

```php
use Windwalker\Pool\Enum\Heartbeat;
use Windwalker\Pool\PoolOptions;

$options = new PoolOptions(
    maxSize: 10,
    timerInterval: 30,
    leakTimeout: 120,
    heartbeat: Heartbeat::INTERVALS,
);
```

The pool stops the timer when it is destroyed. See
[Health and Lifetime](/documentation/components/pool/health-and-lifetime)
for what each option does.

::: info
The timer only runs with `SwooleStack`. With `PhpStack` or `SingleStack`,
`timerInterval`, `leakTimeout`, and `Heartbeat::INTERVALS` have no effect.
:::

## Coroutine Ownership

Borrow a connection in the coroutine that uses it, and release it in the
same coroutine. Do not pass a borrowed connection to another coroutine and
let that coroutine release it. Each coroutine should hold its own
connection for the length of one operation.
