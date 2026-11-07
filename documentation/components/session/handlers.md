---
layout: doc
title: Storage Handlers
component: session
---

# Storage Handlers

A bridge decides when the session is loaded and saved. A handler decides
where the data is kept. Choosing a handler is the main decision when you
deploy an application, because it determines whether sessions survive a
restart and whether several servers can share them.

- With one server, files are simple and fast to set up.
- With several servers behind a load balancer, every server must reach the
  same storage, so use a database or Redis.
- For tests, or for pages that must not keep state, use an in-memory or a
  null handler.

Each handler is an object that you pass to a bridge:

```php
use Windwalker\Session\Bridge\PhpBridge;
use Windwalker\Session\Handler\FilesystemHandler;

$bridge = new PhpBridge(
    [],
    new FilesystemHandler('/var/lib/app/sessions'),
);
```

## Filesystem Handler

`FilesystemHandler` stores each session in a file. The first argument is the
directory, and the `prefix` option sets the start of the file name. It
requires `windwalker/filesystem`.

```php
use Windwalker\Session\Handler\FilesystemHandler;

$handler = new FilesystemHandler(
    '/var/lib/app/sessions',
    ['prefix' => 'sess_'],
);
```

::: warning
The framework's default filesystem handler stores files in
`sys_get_temp_dir() . '/sess'`. On a shared server, that directory can be
read by other users. Use a dedicated directory that only the application
user can read and write.
:::

The handler accepts only session IDs that contain letters, digits, commas,
and hyphens. Other IDs raise an `InvalidArgumentException`. See
[Security](./security).

## Database Handler

`DatabaseHandler` stores sessions in a table. It takes a `DatabaseAdapter`
from `windwalker/database`. The default table name is `windwalker_sessions`,
and the `table` option changes it. The table needs the columns `id`, `data`,
and `time` by default. Use the `columns` option if your table uses other
names:

```php
use Windwalker\Session\Handler\DatabaseHandler;

$handler = new DatabaseHandler(
    $db,
    [
        'table' => 'sessions',
    ],
);
```

### Writing Extra Columns

Sometimes a session table has columns for other data, such as the user ID
or the client IP. Pass a closure as the third argument. It receives the
column map before it is written, and it must return the complete map:

```php
use Windwalker\Session\Handler\DatabaseHandler;

$handler = new DatabaseHandler(
    $db,
    ['table' => 'sessions'],
    writeHandler: static function (
        array $values,
        string $id,
        string $data,
    ) use ($request): array {
        $values['ip'] = $request->getServerParams()['REMOTE_ADDR'] ?? null;

        return $values;
    },
);
```

The closure receives the values keyed by the real column names, the session
ID, and the serialized data. The ID column is always restored to the session
ID, so the closure cannot change it. Each returned column must exist in the
table.

::: warning
The closure is not called when the bridge refreshes only the timestamp, which
happens with `lazy_write` when the data is unchanged. In that case, the extra
columns keep their previous values.
:::

## PDO Handler

`PdoHandler` uses a `PDO` connection directly, without `windwalker/database`.
Its options match `DatabaseHandler`:

```php
use Windwalker\Session\Handler\PdoHandler;

$pdo = new PDO($dsn, $user, $password);

$handler = new PdoHandler($pdo, ['table' => 'sessions']);
```

## Redis Handler

`RedisHandler` stores each session as a key with a time to live.
Pass a Redis client. It can be the `Redis` or `RedisArray` extension class,
or a Predis client:

```php
use Windwalker\Session\Handler\RedisHandler;

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$handler = new RedisHandler(
    $redis,
    [
        'prefix' => 'app_sess_',
        'ttl' => 1800,
    ],
);
```

The `ttl` option sets the lifetime in seconds. If it is not set, the handler
uses `gc_maxlifetime`, and then PHP's `session.gc_maxlifetime`. See
[Security](./security) for how lifetimes apply.

## Native, Array, and Null Handlers

Three handlers do not need external services:

```php
use Windwalker\Session\Handler\ArrayHandler;
use Windwalker\Session\Handler\NativeHandler;
use Windwalker\Session\Handler\NullHandler;

// PHP's default save handler, used by NativeBridge.
$native = new NativeHandler();

// Keeps sessions in memory. Lost when the script ends. Useful in tests.
$array = new ArrayHandler();

// Stores nothing. Each session starts empty.
$null = new NullHandler();
```

The framework uses `NullHandler` for the `null` instance, which is used for
robots. See [Security](./security).
