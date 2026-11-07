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

## Available storages

| Storage               | Use case                                                              |
|-----------------------|-----------------------------------------------------------------------|
| `ArrayStorage`        | In-process memory. The default. Lost when the process ends.          |
| `NullStorage`         | Stores nothing. Use it to disable caching.                            |
| `FileStorage`         | One file per entry under a root directory.                            |
| `FlysystemStorage`    | Files on a Flysystem `Filesystem` adapter. Extends `FileStorage`.     |
| `PhpFileStorage`      | Entries read back with `include`. Use with `PhpFileSerializer`.       |
| `ForeverFileStorage`  | File storage whose entries never expire.                              |
| `ModifiedFileStorage` | Treats an entry as a miss when a listed file is newer than the entry. |
| `DatabaseStorage`     | Rows in a table through `windwalker/database`.                        |
| `PdoStorage`          | Rows in a table through a raw `PDO` connection.                       |
| `RedisStorage`        | Redis, using the `redis` extension.                                   |
| `MemcachedStorage`    | Memcached, using the `memcached` extension.                           |

Database storages create their table on the first failed save if `autoCreateTable` is enabled. The table can also be
created ahead of time with `php windwalker cache:table`.

## FileStorage options

`FileStorage` accepts an options array. The most relevant option is `deny_access`:

```php
use Windwalker\Cache\Storage\FileStorage;

$storage = new FileStorage(__DIR__ . '/cache', ['deny_access' => true]);
```

When `deny_access` is `true`, entries are saved with a `.php` extension and a guard, so they are not served as plain
files if the directory is exposed by the web server. Other options are `lock`, `extension`, and `expiration_format`.
