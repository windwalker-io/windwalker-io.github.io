---
layout: doc
---

# Connection Pool

Connection pooling keeps a set of open database connections in memory and lends them to code that needs one. Windwalker uses a pool to serve database queries from several coroutines inside a single Swoole worker process without opening a new connection for every request.

## Why Use a Connection Pool

A database connection costs a TCP handshake, authentication, and server-side session setup. In a traditional PHP-FPM application, the process ends after each request, so every request pays that cost again.

A Swoole worker is long-lived. It can keep connections open between requests, but a single connection cannot serve several coroutines at once, because each query waits on the same socket. A pool solves this:

- A coroutine borrows one connection from the pool.
- It runs its queries on that connection.
- It returns the connection so another coroutine can use it.

The pool keeps the number of open connections bounded and reuses them.

## Limits of a Software Pool

The pool lives inside one PHP process. Its limits are:

- Each worker owns its own pool, so the database sees `workers × maxSize` connections.
- Connections are not shared across processes or servers.
- The pool does not multiplex queries, split reads and writes, or fail over to another server.

For strict requirements, such as many application servers sharing one database, use a dedicated connection pooler like [ProxySQL](https://proxysql.com/) (MySQL) or [PgBouncer](https://www.pgbouncer.org/) (PostgreSQL). Use the software pool when a few workers need reusable connections without extra infrastructure.

## Setting Up a Pool with Swoole

The pool needs the `swoole` extension and a `SwooleStack`. Pass the stack to `ConnectionPool` explicitly. If you create the adapter without a pool, Windwalker uses a `SingleStack` that holds one connection and cannot serve concurrent coroutines.

Create the pool in the `workerStart` event, not in the master process. Connections and coroutine channels cannot cross a `fork()`.

```php
use Swoole\Http\Server;
use Windwalker\Database\DatabaseFactory;
use Windwalker\Pool\ConnectionPool;
use Windwalker\Pool\Enum\Heartbeat;
use Windwalker\Pool\PoolOptions;
use Windwalker\Pool\Stack\SwooleStack;

$server = new Server('0.0.0.0', 8080);
$db = null;

$server->on('workerStart', function () use (&$db) {
    // Each worker creates its own pool after the fork.
    $pool = new ConnectionPool(
        new PoolOptions(
            maxSize: 10,
            minSize: 2,
            waitTimeout: 3,
            idleTimeout: 60,
            maxLifetime: 1800,
            maxUses: 10000,
            leakTimeout: 30,
            heartbeat: Heartbeat::LAZY,
            timerInterval: 10,
        ),
        new SwooleStack(10),
    );

    $db = (new DatabaseFactory())->create(
        'pdo_mysql',
        [
            'host' => '127.0.0.1',
            'dbname' => 'app',
            'user' => 'app',
            'password' => getenv('DB_PASSWORD'),
            'charset' => 'utf8mb4',
        ],
        $pool,
    );
});

$server->on('request', function ($request, $response) use (&$db) {
    // Each request runs in its own coroutine and borrows a connection.
    $posts = $db->prepare('SELECT id, title FROM posts WHERE state = ?')
        ->execute([1])
        ->all();

    $response->end(json_encode($posts));
});

$server->start();
```

`DatabaseFactory::create()` accepts the pool as its third argument. The driver then borrows and returns connections automatically on each query. Use the `'pdo_mysql'` driver name for PDO with MySQL. Pool support is not limited to PDO. The same `$pool` argument works for the other drivers the factory creates, such as `'mysqli'` and `'pgsql'`.

::: warning
Do not create the pool in the master process before `start()`. Connections opened before `fork()` are shared by every worker and fail in hard-to-notice ways.
:::

### Choosing the Pool Size

The total number of database connections is `workers × maxSize`. Keep that total below the server's connection limit, such as MySQL `max_connections`, and leave headroom for migrations and admin tools.

- Start with `maxSize` between 5 and 20, based on how many requests a worker handles at the same time that use the database.
- Set `SwooleStack` capacity to the same `maxSize`. The stack stores up to that many idle connections.
- Set `minSize` lower than or equal to `maxSize`. The pool opens `minSize` connections when it initializes, so this value controls warm-up.

Measure under real load before you increase the size. More connections increase memory on both sides and do not help when the database is the bottleneck.

See [Connections](/documentation/components/pool/connections) and [Swoole Stack](/documentation/components/pool/swoole-stack) for the underlying pool behavior.

## Complete Example

The example below sets up a worker-scoped pool, runs a read query, and runs a write inside a transaction.

```php
use Swoole\Http\Server;
use Windwalker\Database\DatabaseAdapter;
use Windwalker\Database\DatabaseFactory;
use Windwalker\Pool\ConnectionPool;
use Windwalker\Pool\Enum\Heartbeat;
use Windwalker\Pool\PoolOptions;
use Windwalker\Pool\Stack\SwooleStack;

$server = new Server('0.0.0.0', 8080);
$db = null;

$server->on('workerStart', function () use (&$db) {
    $pool = new ConnectionPool(
        new PoolOptions(
            maxSize: 10,
            minSize: 2,
            waitTimeout: 3,
            maxLifetime: 1800,
            maxUses: 10000,
            leakTimeout: 30,
            heartbeat: Heartbeat::LAZY,
            timerInterval: 10,
        ),
        new SwooleStack(10),
    );

    $db = (new DatabaseFactory())->create(
        'pdo_mysql',
        [
            'host' => '127.0.0.1',
            'dbname' => 'app',
            'user' => 'app',
            'password' => getenv('DB_PASSWORD'),
            'charset' => 'utf8mb4',
            'afterConnect' => [
                "SET time_zone = '+00:00'",
            ],
        ],
        $pool,
    );
});

$server->on('request', function ($request, $response) use (&$db) {
    if ($request->server['request_uri'] === '/posts') {
        $posts = $db->prepare('SELECT id, title FROM posts')
            ->execute()
            ->all();

        $response->end(json_encode($posts));

        return;
    }

    if ($request->server['request_uri'] === '/publish') {
        // The whole transaction runs on one borrowed connection.
        $db->transaction(function (DatabaseAdapter $db) use ($request) {
            $db->prepare('UPDATE posts SET state = 1 WHERE id = ?')
                ->execute([(int) $request->get['id']]);

            $db->prepare('INSERT INTO logs (message) VALUES (?)')
                ->execute(['Post published']);
        });

        $response->end('OK');
    }
});

$server->start();
```

## Pool Features

`ConnectionPool` takes a `PoolOptions` object. The options below cover the features that matter most for a database pool. The full list and defaults are in the [Connection Pool component page](/documentation/components/pool/connection-pool).

### Warm-up and Waiting

`minSize` connections are created when the pool initializes. When every connection is in use, `getConnection()` creates a new one until `maxSize` is reached. After that, the caller waits.

```php
new PoolOptions(
    maxSize: 10,
    minSize: 2,
    maxWait: 50,      // Max callers allowed to wait in line
    waitTimeout: 3,   // Seconds a caller waits for a connection
);

// ERROR: WaitTimeoutException when no connection frees up in time
```

::: info
`PhpStack` does not wait. It throws `ConnectionPoolException` immediately when no connection is idle. Use `SwooleStack` for coroutine waiting.
:::

### Idle, Lifetime, and Usage Limits

Connections are retired when they become stale, so a long-running worker does not keep a dead or ageing session.

```php
new PoolOptions(
    idleTimeout: 60,     // Close connections idle longer than 60 seconds
    maxLifetime: 1800,   // Retire connections older than 30 minutes
    maxUses: 10000,      // Retire a connection after 10,000 borrows
);
```

Retired connections are replaced on demand, so these limits do not reduce the pool's capacity.

### Health Checks and Heartbeat

The `heartbeat` option decides when the pool pings a connection:

- `Heartbeat::NONE`: no pings.
- `Heartbeat::LAZY`: pings an idle connection before handing it out.
- `Heartbeat::INTERVALS`: a timer pings idle connections every `timerInterval` seconds.

```php
new PoolOptions(
    heartbeat: Heartbeat::LAZY,
    timerInterval: 10,   // Used by INTERVALS and by the leak check
);
```

::: tip
Use `Heartbeat::LAZY` for most services. It detects a dead connection before a query fails and adds one cheap ping per borrow.
:::

### Leak Detection

A connection that is never released keeps one pool slot occupied forever. Set `leakTimeout` to report such connections:

```php
new PoolOptions(
    leakTimeout: 30,   // Seconds a connection may stay borrowed
);

// Logged: "Connection leak detected: ..., last used at ..."
```

The pool reports leaks through its logger. Pass a PSR logger to `ConnectionPool`. The leak check runs in the pool timer, so `timerInterval` must be greater than 0.

### Automatic Reconnect

`AbstractDriver::useConnection()` retries once after reconnecting when the error message matches a dropped connection, such as "gone away", "lost connection", or "server closed the connection unexpectedly". Other errors are rethrown.

```php
// A dropped connection is reconnected and the query is retried once.
$db->prepare('SELECT 1')->execute();
```

::: warning
A retry repeats the whole callback. Do not use `useConnection()` directly for a non-idempotent statement that has already changed data before the connection dropped. Wrap writes in a transaction so a dropped connection rolls back instead of leaving partial work.
:::

### After-connect Callbacks

`afterConnect` runs each time a connection is opened. Use it for session settings. It accepts a SQL string, a closure, or an array of both.

```php
'afterConnect' => [
    "SET time_zone = '+00:00'",
    "SET NAMES utf8mb4",
    function (AbstractDriver $driver) {
        $driver->execute('SET SESSION sql_mode = "STRICT_ALL_TABLES"');
    },
],
```

::: info
Callbacks run only for a newly opened connection. A connection reused from the pool keeps the session settings it received when it was opened.
:::

### Read-only Mode

Set `readonly` to block write queries on the driver. The check runs in `prepare()` before the statement reaches the database.

```php
'readonly' => true,        // Block write queries
'readonlyNative' => true,  // Also set the session read-only (MySQL,
                           // PostgreSQL, SQLite)
'readonlyThrow' => true,   // Throw instead of silently skipping writes
```

```php
// ERROR: DatabaseQueryException: Database is in readonly mode,
//        write query is not allowed.
$db->prepare('UPDATE posts SET state = 0')->execute();
```

::: warning
With `readonlyThrow` set to `false`, a write query is replaced with `SELECT 1 WHERE 1 = 0`. It returns an empty result and does not raise an error, so a failed write can go unnoticed. Keep `readonlyThrow` enabled unless you have a specific reason to disable it.
:::

## Debugging

Use these checks when queries wait, fail, or hold connections too long.

- Pass a logger to `ConnectionPool` to see leak reports and pool events.
- Check `$pool->count()` for idle connections in the stack and `$pool->totalCount()` for all connections the pool has created.
- Set `leakTimeout` so forgotten connections are reported instead of silently exhausting the pool.
- Compare `maxSize` with the number of coroutines that query at once. Timeouts with a low `count()` usually point to a connection that is never released.

```php
$pool->setLogger($logger);

// Idle connections in the stack
$idle = $pool->count();

// All connections the pool currently owns
$total = $pool->totalCount();
```

## Transactions and Kept Connections

`DatabaseAdapter::transaction()` runs a callback inside a transaction and commits or rolls it back. When the callback throws, the transaction is rolled back and the exception is rethrown.

```php
$db->transaction(function (DatabaseAdapter $db) {
    $db->prepare('UPDATE accounts SET balance = balance - 10 WHERE id = 1')
        ->execute();

    $db->prepare('UPDATE accounts SET balance = balance + 10 WHERE id = 2')
        ->execute();
});

// ERROR: Rolls back and rethrows when either statement fails.
```

### How the Connection Is Kept

A transaction must run every statement on the same connection. `AbstractPlatform::transactionStart()` asks the driver for a connection with `getConnection(true)`. The driver keeps that connection until the transaction ends:

1. `transactionStart()` borrows a connection and stores it on the driver as the kept connection.
2. Every query on the driver reuses the kept connection instead of borrowing a new one.
3. `transactionCommit()` or `transactionRollback()` runs the commit or rollback.
4. The kept connection is released back to the pool.

`isInTransaction()` returns `true` while a transaction is open or a connection is kept. You can use the same flow directly:

```php
$platform = $db->getPlatform();

$platform->transactionStart();

try {
    $db->prepare('UPDATE posts SET state = 1 WHERE id = ?')
        ->execute([10]);

    $platform->transactionCommit();
} catch (\Throwable $e) {
    $platform->transactionRollback();

    throw $e;
}
```

::: warning
The kept connection belongs to the driver object, not to the coroutine. While a transaction is open, other coroutines that use the same `$db` run their queries on that connection. Keep transactions short, and do not interleave a transaction with unrelated work in other coroutines that share the adapter.
:::

::: tip
Use `$db->transaction()` rather than manual start, commit, and rollback calls. It guarantees the connection is released even when the callback throws.
:::

### Releasing the Kept Connection

`releaseKeptConnection()` returns the kept connection to the pool without ending the transaction. Use it only when you manage the connection yourself, for example after `getDriver()->getConnection(true)`:

```php
$driver = $db->getDriver();

$conn = $driver->getConnection(true);

// ... run statements on the same connection ...

$driver->releaseKeptConnection();
```

Calling `dropConnection()` releases the kept connection and removes it from the pool, which is useful after a fatal error on that connection.
