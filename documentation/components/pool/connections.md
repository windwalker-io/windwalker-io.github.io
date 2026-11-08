---
layout: doc
title: Connections
component: pool
---

# Connections

A pool manages the lifecycle of its connections, but it does not know how
to open one. Your class does that. The pool wraps each connection with
state, usage counters, and timestamps, and uses them to decide when to
reuse, retire, or drop it.

## Minimal Setup

Extend `AbstractConnection` and implement the four protocol methods:
`connect()`, `disconnect()`, `isConnected()`, and `ping()`.

```php
use Windwalker\Pool\AbstractConnection;

class MyConnection extends AbstractConnection
{
    public function __construct(
        protected string $dsn,
    ) {
        parent::__construct();
    }

    // Implement connect(), disconnect(), isConnected(), and ping().
}
```

::: warning
Always call `parent::__construct()` in your constructor. `AbstractConnection`
records the creation time there. Without the call, the creation time stays
at `0`, and `maxLifetime` retires the connection on its first borrow.
:::

## Showcase

The class below wraps a PDO connection. It is the connection used in the
[Connection Pool](/documentation/components/pool/connection-pool) and
[Health and Lifetime](/documentation/components/pool/health-and-lifetime)
examples:

```php
use Windwalker\Pool\AbstractConnection;

class PdoConnection extends AbstractConnection
{
    protected ?\PDO $pdo = null;

    public function __construct(
        protected string $dsn,
        protected string $username = '',
        protected string $password = '',
    ) {
        parent::__construct();
    }

    public function connect(): mixed
    {
        $this->pdo = new \PDO(
            $this->dsn,
            $this->username,
            $this->password,
            [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ],
        );

        return $this->pdo;
    }

    public function disconnect(): mixed
    {
        $this->pdo = null;

        return true;
    }

    public function isConnected(): bool
    {
        return $this->pdo !== null;
    }

    public function ping(): bool
    {
        if ($this->pdo === null) {
            return false;
        }

        try {
            $this->pdo->query('SELECT 1');

            return true;
        } catch (\PDOException) {
            return false;
        }
    }

    public function getPdo(): \PDO
    {
        return $this->pdo;
    }
}
```

The pool does not call `connect()` when it creates a connection. The caller
does, after borrowing, when `isConnected()` returns `false`. The Database
package follows the same pattern.

`ping()` must not throw. The pool calls it when a connection is borrowed
with `Heartbeat::LAZY`, or from its timer with `Heartbeat::INTERVALS`. An
exception from a borrow-time check propagates out of `getConnection()`.
The class above catches the `PDOException` and returns `false`, so the pool
drops the connection instead.

## Connection States

The state describes where a connection is in its lifecycle. The pool sets
the state for you:

- `ConnectionState::INACTIVE`: the connection is idle in the stack.
- `ConnectionState::ACTIVE`: the connection is borrowed.
- `ConnectionState::ABANDONED`: the connection will be dropped on the next
  borrow or release.

Read the state with `getState()`. You rarely set it yourself.

## Returning and Dropping

A connection can be returned to the pool in two ways:

```php
$conn->release();

$conn->release(true);
```

`release()` returns the connection only when it is `ACTIVE`. Calling it on
an idle connection does nothing. `release(true)` skips the state check. The
pool uses it internally when it creates a connection.

To discard a connection that failed, pass it to the pool:

```php
$pool->dropConnection($conn);
```

`dropConnection()` disconnects the connection and stops counting it in
`totalCount()`. This is the right call after a network error, because a
broken connection should not return to the stack.

::: info
`release()` throws a `ConnectionPoolException` when the connection has no
pool. This only happens for a connection that you create outside a pool.
:::

## Reconnecting

`reconnect()` calls `disconnect()` and then `connect()` on the same object.
Use it when you want to keep the connection in the pool but need a fresh
session, for example after the server has restarted:

```php
$conn->reconnect();
```

## Usage Counters

Each connection keeps some counters that the pool reads:

- `getCreatedTime()`: the Unix time when the object was created.
- `getLastTime()`: the Unix time of the last borrow. Call
  `updateLastTime()` to refresh it.
- `getCurrentUses()`: the number of times the connection has been borrowed.

`getId()` returns a number the pool assigns when it creates the connection.

## Leak Detection

A borrowed connection that is destroyed without being released is a leak.
The connection's destructor reports it, in this order:

- To the connection's `$logger` property, when it is set.
- To the pool's logger, when the pool has one.
- As an `E_USER_WARNING`, when `$leakWarning` is `true`.

```php
$conn->leakWarning = false;
```

::: warning
A leaked connection is never returned to the pool. The pool still counts it
in `totalCount()`, so enough leaks exhaust `maxSize` and every later borrow
fails. Release every connection in a `finally` block or in a `catch` block
that drops it.
:::
