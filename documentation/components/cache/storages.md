---
layout: doc
title: Storages
component: cache
---

# Storages

A storage determines where cache entries are kept. Every storage implements `StorageInterface`. Some storages also
implement optional interfaces:

- `GroupedStorageInterface`: supports `withGroup()` to separate entries by group.
- `PrunableStorageInterface`: supports `prune()` to remove expired entries.
- `TouchableStorageInterface`: supports an atomic expiration update, used by `touch()`.

```php
use Windwalker\Cache\Storage\PrunableStorageInterface;

$storage = $pool->getStorage();

if ($storage instanceof PrunableStorageInterface) {
    $storage->prune();
}
```

## ArrayStorage

Keeps entries in a PHP array for the current process. It is the default and needs no setup.

```php
use Windwalker\Cache\Storage\ArrayStorage;

$storage = new ArrayStorage(
    pruneProbability: 0.01,
    group: 'request',
);
```

- `pruneProbability`: chance (0 to 1) that a write triggers a prune of expired entries.
- `group`: key namespace.

- **Tip:** Entries disappear when the process or request ends. It suits one run, such as a single request or a worker loop.

::: warning
It is not shared between processes. Two PHP-FPM workers hold separate copies.
:::

## NullStorage

Stores nothing, so every read is a miss. Use it to disable caching in a profile, for example in tests.

```php
use Windwalker\Cache\CachePool;
use Windwalker\Cache\Storage\NullStorage;

$pool = new CachePool(new NullStorage());
```

::: warning
Code that depends on a saved value, such as a counter built with `modify()`, never sees a hit.
:::

## FileStorage

Writes one file per entry under a root directory. It is simple, shared across processes on one machine, and supports
groups (each group is a subdirectory) and `prune()`.

```php
use Windwalker\Cache\Storage\FileStorage;

$storage = new FileStorage(
    root: __DIR__ . '/cache',
    options: [
        'lock' => true,
        'deny_access' => true,
    ],
    pruneProbability: 0.01,
    group: 'products',
);
```

- `root`: directory that holds the entries. It must be writable.
- `options`: `lock` (default `true`) locks files on read and write. `deny_access` (default `false`) saves entries with
  a `.php` extension and a guard. `extension` (default `.data`) and `expiration_format` are also available.
- `pruneProbability` and `group`: as in `ArrayStorage`.

::: warning
Do not place `root` inside a publicly served directory unless `deny_access` is enabled.
:::

::: warning
Not suitable for several web servers unless the directory is on shared storage.
:::

- **Tip:** `clear()` walks the whole group directory, which can be slow for large caches.

## FlysystemStorage

Extends `FileStorage` but writes through a Flysystem `Filesystem`, so the same code works with local disks, S3, or other
adapters.

```php
use League\Flysystem\Filesystem;
use League\Flysystem\Local\LocalFilesystemAdapter;
use Windwalker\Cache\Storage\FlysystemStorage;

$filesystem = new Filesystem(
    new LocalFilesystemAdapter(__DIR__ . '/cache'),
);

$storage = new FlysystemStorage(
    driver: $filesystem,
    options: ['deny_access' => true],
    group: 'products',
);
```

- `driver`: the Flysystem `Filesystem` instance. The adapter decides where files go.
- `options`, `pruneProbability`, and `group`: as in `FileStorage`.

::: warning
It requires `league/flysystem` and an adapter for the target storage.
:::

- **Tip:** Remote adapters add network latency to every read and write.

## PhpFileStorage

Stores each entry as a PHP file and reads it with `include`. Reads can be fast because PHP's opcode cache keeps the
compiled file.

```php
use Windwalker\Cache\CachePool;
use Windwalker\Cache\Serializer\PhpFileSerializer;
use Windwalker\Cache\Storage\PhpFileStorage;

$pool = new CachePool(
    new PhpFileStorage(__DIR__ . '/config-cache'),
    new PhpFileSerializer(),
);
```

It takes the same parameters as `FileStorage`.

::: warning
Use it only with `PhpFileSerializer`. Other serializers do not produce a file that `include` can read back.
:::

::: warning
Values must be representable by `var_export()`. Closures cannot be stored.
:::

## ForeverFileStorage

A `FileStorage` whose entries never expire. Expiration is ignored on read.

```php
use Windwalker\Cache\Storage\ForeverFileStorage;

$storage = new ForeverFileStorage(__DIR__ . '/generated', group: 'routes');
```

It takes the same parameters as `FileStorage`.

::: warning
Nothing removes old entries automatically. Use it for data you invalidate explicitly.
:::

## ModifiedFileStorage

A `FileStorage` that treats an entry as a miss when any file in a list is newer than the entry. It suits output derived
from source files, such as compiled templates.

```php
use Windwalker\Cache\Storage\ModifiedFileStorage;

$storage = new ModifiedFileStorage(
    root: __DIR__ . '/compiled',
    listenFiles: [
        __DIR__ . '/templates/layout.edge',
        __DIR__ . '/templates/header.edge',
    ],
    options: ['deny_access' => true],
);
```

- `root`: the directory that holds the entries.
- `listenFiles`: files or `SplFileInfo` objects whose modification times are checked.
- `options`: as in `FileStorage`.

::: warning
The check uses file modification times. Copying files that keep old timestamps can hide a change.
:::

- **Tip:** Each `has()` checks every listed file, so keep the list short.

## DatabaseStorage

Stores entries as rows in a table through `windwalker/database`. It supports groups, `prune()`, and touch. Every
server that uses the same database shares the entries.

```php
use Windwalker\Cache\Storage\DatabaseStorage;

$storage = new DatabaseStorage(
    db: $db,
    group: 'products',
    table: 'cache_items',
    columns: [],
    pruneProbability: 0.01,
    autoCreateTable: false,
);
```

- `db`: a `DatabaseAdapter`, usually obtained from the container.
- `group`: stored in the `group` column.
- `table` and `columns`: the table name and column name overrides.
- `autoCreateTable`: when `true`, the table is created after a save fails because it is missing.

- **Tip:** Values are stored in a `longtext` column. Large values are slow to write and read, and they grow the table.
- **Tip:** Slower than memory or Redis. Use it when a shared, durable cache is required and a database is already available.

::: warning
`autoCreateTable` is convenient in development. In production, create the table with `php windwalker cache:table`
and a migration.
:::

- **Tip:** `prune()` runs at random, using `pruneProbability`. Expired rows are not removed at once.

## PdoStorage

The same design as `DatabaseStorage`, but it takes a raw `PDO` connection, so the Windwalker database package is not
required.

```php
use Windwalker\Cache\Storage\PdoStorage;

$pdo = new PDO('mysql:host=127.0.0.1;dbname=app', 'user', 'secret');

$storage = new PdoStorage(
    pdo: $pdo,
    group: 'products',
    table: 'cache_items',
    columns: [
        'id' => 'id',
        'key' => 'key',
        'group' => 'group',
        'payload' => 'payload',
        'expired_at' => 'expired_at',
    ],
);
```

- `pdo`: the connection.
- `columns`: maps the logical column names to the actual column names.

::: warning
If `columns` do not match the table, every save fails. Keep the mapping in step with the table definition.
:::

- **Tip:** Same `longtext` and prune caveats as `DatabaseStorage`.

## RedisStorage

Stores entries in Redis with native key expiration. Redis removes expired keys itself, so `prune()` is not
implemented. It supports `touch()` and reads several keys at once.

```php
use Redis;
use Windwalker\Cache\Storage\RedisStorage;

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$storage = new RedisStorage(driver: $redis, group: 'products');
```

- `driver`: a connected `Redis` instance. When `null`, it connects to `127.0.0.1:6379`.
- `group`: used as a key prefix (`group:key`).

::: warning
`clear()` on a group runs `KEYS group:*`, which scans the whole keyspace and can block Redis on large databases.
:::

::: warning
Pass a configured instance in production. The default connects to localhost.
:::

::: warning
The cache shares a Redis database with other data unless you use a separate database or instance.
:::

## MemcachedStorage

Stores entries in Memcached through the `memcached` extension. It is fast and shared across servers, and it supports
multi-get.

```php
use Memcached;
use Windwalker\Cache\Storage\MemcachedStorage;

$memcached = new Memcached();
$memcached->addServer('127.0.0.1', 11211);

$storage = new MemcachedStorage($memcached);
```

- `driver`: a `Memcached` instance. The constructor throws `RuntimeException` if the extension is not loaded.

::: warning
It has no groups, so `withGroup()` throws `LogicException`. Use key prefixes instead.
:::

::: warning
`clear()` calls `flush()`, which empties the entire Memcached server, including data used by other applications.
:::

::: warning
There is no `prune()`. Memcached evicts entries when memory is full, so entries can vanish before they expire.
:::

## Choosing a storage

- Single request or worker: `ArrayStorage`.
- One machine, no extra services: `FileStorage`.
- Several servers, fast and disposable: `RedisStorage` or `MemcachedStorage`.
- Several servers, durable, and a database already exists: `DatabaseStorage`.
