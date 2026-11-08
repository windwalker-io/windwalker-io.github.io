---
layout: doc
title: Connection Pool
component: pool
---

# Connection Pool

Opening a connection is expensive. A pool opens connections once, keeps
them, and lends them to callers. A request or a job borrows a connection for
a short operation and returns it, so the next caller can reuse it without a
new handshake. `maxSize` caps how many connections can be open at the same
time, which protects the server behind them.

`ConnectionPool` is the class you use. It extends `AbstractPool`, which holds
the logic for creating, borrowing, returning, and closing connections.

## Minimal Setup

Create the pool with options and a stack. Then give it a builder callback
that creates one connection, and call `init()`:

```php
use Windwalker\Pool\ConnectionPool;
use Windwalker\Pool\PoolOptions;
use Windwalker\Pool\Stack\PhpStack;

$pool = new ConnectionPool(
    new PoolOptions(maxSize: 4),
    new PhpStack(),
);

$pool->setConnectionBuilder(
    fn () => new PdoConnection($dsn, $user, $password)
);

$pool->init();
```

The builder takes no arguments and returns a `ConnectionInterface`. The pool
calls it every time it needs a new connection.

## Showcase

The function below runs a query through a pooled connection. It returns the
connection on success. On failure, it drops the connection instead, so the
pool never reuses a broken one:

```php
use Windwalker\Pool\ConnectionPool;

function findUserName(ConnectionPool $pool, int $id): ?string
{
    $conn = $pool->getConnection();

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

        return $name === false ? null : $name;
    } catch (\Throwable $e) {
        $pool->dropConnection($conn);

        throw $e;
    }
}
```

::: tip
Release a connection as soon as the operation ends. A borrowed connection
is not available to other callers.
:::

## How Connections Are Handed Out

`getConnection()` tries the following steps in order:

- If the total number of connections is below `minSize`, it creates a new
  connection.
- It takes an idle connection. Expired connections are dropped on the way
  (see [Health and Lifetime](/documentation/components/pool/health-and-lifetime)).
- If no idle connection is available and the total is below `maxSize`, it
  creates a new connection.
- Otherwise, it waits for a connection up to `waitTimeout`, or throws a
  `ConnectionPoolException`.

`release()` returns the connection to the idle stack. The pool drops the
connection instead when it has reached `maxUses`, when it is abandoned, or
when the stack is already full. To close a connection you no longer want,
call `dropConnection()`. The pool disconnects it and stops counting it.

```php
$pool->release($conn);

$pool->dropConnection($conn);
```

`$conn->release()` does the same through the connection. It only takes
effect when the connection is `ACTIVE`.

## Sizing

The main options are the following:

- `maxSize`: the maximum number of open connections. Default `1`.
- `minSize`: the pool creates a connection on borrow while the total is
  below this value. Default `1`. The value is capped at `maxSize`.
- `maxWait`: the maximum number of callers allowed to wait. Default `-1`,
  which means no limit.
- `waitTimeout`: the number of seconds a caller waits for a connection.
  Default `-1`, which means wait indefinitely.
- `closeTimeout`: the number of seconds `close()` waits for each idle
  connection. Default `3`.

```php
use Windwalker\Pool\PoolOptions;

$options = new PoolOptions(
    maxSize: 10,
    minSize: 2,
    maxWait: 50,
    waitTimeout: 3,
);
```

::: info
`init()` fills the stack to `maxSize` when you use `PhpStack` or
`SwooleStack`. It does not use `minSize` for this.
:::

::: info
`PhpStack` does not wait for a connection. A borrow that finds no free
connection throws a `ConnectionPoolException` at once. `waitTimeout` and
`maxWait` only apply to the `SwooleStack`. See
[Swoole Stack](/documentation/components/pool/swoole-stack).
:::

If you omit the stack, the pool uses `SingleStack`. It keeps one connection
and is suitable for a single-process script.

## Closing the Pool

`close()` disconnects the idle connections and returns how many it closed.
It does not touch borrowed connections. A borrowed connection stays open
until it is released and the pool is closed again. The pool also calls
`close()` when it is destroyed.

```php
$closed = $pool->close();
```

::: warning
Release every borrowed connection before you close the pool at the end of a
long-running process. A connection that is still borrowed stays open and is
not closed by that call.
:::
