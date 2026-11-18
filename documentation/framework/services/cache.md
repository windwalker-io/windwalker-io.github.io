---
layout: doc
title: Cache
---

# Cache

Caching keeps the result of expensive work so later requests can reuse it.
A product page that runs several database joins and a remote price lookup
can compute its summary once and serve it from the cache for the next few
minutes. The cache service gives the application one place to read, write,
and expire these values, and lets each part of the application choose its
own storage through named cache instances.

In Windwalker Core, the cache is provided by `CachePackage` from the
`windwalker/cache` package and assembled by `CacheFactory`.

## Minimal Setup

The package is registered in `etc/packages/cache.config.php`. The
`factories.instances` section defines named cache pools, and the
`factories.storages` section defines where each pool stores its values.

```php
<?php

declare(strict_types=1);

namespace App\Config;

use Windwalker\Cache\CachePackage;
use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\Core\Factory\CacheFactory;

return #[ConfigModule(
    name: 'cache',
    enabled: true,
    priority: 100,
    belongsTo: CachePackage::class,
)]
static fn() => [
    'default' => 'global',

    'providers' => [
        CachePackage::class,
    ],

    'factories' => [
        'instances' => [
            'global' => static fn () => CacheFactory::cachePoolFactory(
                'file',
                \Windwalker\Cache\Serializer\PhpSerializer::class,
            ),
            'html' => static fn () => CacheFactory::cachePoolFactory(
                'file',
                \Windwalker\Cache\Serializer\RawSerializer::class,
            ),
        ],
        'storages' => [
            'file' => static fn () => CacheFactory::fileStorage(),
        ],
    ],
];
```

The `default` key selects the instance that the plain `CacheInterface`
receives. Each name under `instances` is a separate pool with its own
storage and serializer, so `global` and `html` never share entries.

## Complete Example

A product service caches a summary with `fetch()`. A fragment service uses
the `html` instance through a tag.

```php
<?php

declare(strict_types=1);

namespace App\Service;

use Windwalker\Cache\CachePool;

class ProductService
{
    public function __construct(
        protected CachePool $cache,
    ) {
    }

    public function getSummary(int $id): array
    {
        return $this->cache->fetch(
            'product.summary.' . $id,
            fn () => $this->buildSummary($id),
            ttl: 300,
        );
    }

    public function forgetSummary(int $id): void
    {
        $this->cache->delete('product.summary.' . $id);
    }

    protected function buildSummary(int $id): array
    {
        // Expensive queries and remote calls go here.
        return ['id' => $id, 'name' => 'Sample product'];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Service;

use Windwalker\Cache\CachePool;
use Windwalker\Core\Application\ApplicationInterface;

class FragmentService
{
    public function __construct(
        protected ApplicationInterface $app,
    ) {
    }

    public function getFragment(string $name): string
    {
        $cache = $this->app->retrieve(CachePool::class, tag: 'html');

        return $cache->fetch(
            'fragment.' . $name,
            fn () => $this->render($name),
            ttl: 600,
        );
    }

    protected function render(string $name): string
    {
        return '<p>' . htmlspecialchars($name) . '</p>';
    }
}
```

`ProductService` receives the default `global` pool through its
constructor. `FragmentService` asks for the `html` variant by tag, because
its entries must use `RawSerializer`. See
[Service Variants](/documentation/framework/core-concepts/dependency-injection/service-variants)
for the tagged binding rules, and
[Tagged Services](/documentation/components/di/tagged-services)
for the container API.

## Injecting Cache Variants

Each pool is a tagged variant of `CacheInterface`,
`CacheItemPoolInterface`, and `CachePool`. The tag is the instance name,
so the same class gives a different pool for each tag.

Use constructor injection for the default pool. Use the tag to select
another pool when the service needs it:

```php
use Psr\SimpleCache\CacheInterface;
use Windwalker\Cache\CachePool;

// Default pool, from the "default" key
public function __construct(
    protected CacheInterface $cache,
) {
}

// A named pool, selected by tag
$cache = $app->retrieve(CachePool::class, tag: 'html');
```

::: tip
Inject `CachePool` when you need `fetch()`, `modify()`, or `compute()`.
Inject `CacheInterface` when a library expects a PSR-16 cache.
:::

## Reading and Writing Values

The primary API is `fetch()`. It reads the key. If the key is missing or
expired, it calls the handler, stores the returned value, and returns it.
Use it for any value that can be rebuilt from its source.

```php
$summary = $cache->fetch(
    'product.summary.' . $id,
    fn () => $this->buildSummary($id),
    ttl: 300,
);
```

The handler runs only on a miss, so the expensive work happens once
per TTL window. The TTL is in seconds. When the pool has a default TTL,
omit `ttl:` to use it.

Use `get()`, `set()`, and `delete()` only when the value does not come from
a single handler, for example when a controller stores a value that arrives
from a form:

```php
$cache->set('cart.total', 1200, 3600);

$total = $cache->get('cart.total', 0);

$cache->delete('cart.total');
```

::: info
`get()` returns the default value when the key is missing. `has()` checks
existence without reading the value.
:::

Cache keys must not contain the characters `{}()/\@:`. Use dots or dashes
to separate parts of a key.

## Assembling Your Own Cache

Each entry in `factories.instances` is a factory closure that returns a
`CachePool`. `CacheFactory::cachePoolFactory()` combines one storage from
`factories.storages` with one serializer class. Use it to pair a storage
with a serializer that suits its values.

This example stores JSON-encoded values in Redis for a pool that other
services read from other languages:

```php
'instances' => [
    'shared' => static fn () => CacheFactory::cachePoolFactory(
        'redis',
        \Windwalker\Cache\Serializer\JsonSerializer::class,
    ),
],
'storages' => [
    'redis' => static function () {
        $redis = new \Redis();
        $redis->connect('127.0.0.1', 6379);

        return new \Windwalker\Cache\Storage\RedisStorage($redis);
    },
],
```

::: warning
`JsonSerializer` returns arrays and scalars, not objects. Store plain data
in a pool that uses it. Use `PhpSerializer` when you must store objects.
:::

## Storage Options

Each storage is a named entry in `factories.storages`. The storage decides
where values live, and the serializer decides how they are encoded.

### File Storage

`CacheFactory::fileStorage()` writes one file per key under the `@cache`
path. Each instance gets its own folder, and the file name is `~` plus the
SHA-1 hash of the key with the `.data` extension, so any key is safe.

```text
cache/
+-- global/
|   +-- ~3f786850e387550fdab836ed7e6dc881de23001b.data
+-- html/
    +-- ...
```

File storage locks each write with `flock()`, so concurrent requests on the
same host do not corrupt a value.

::: warning
Folders are created with `0755` permissions. Keep the cache path outside
the public web root, and do not store passwords or tokens in a file cache
without a separate protection layer.
:::

If the cache path must sit under the public directory, enable the
`deny_access` option of `FileStorage`. It prepends the `deny_code` option to
each stored value, which blocks direct web access to the cache file.

### Database Storage

`CacheFactory::dbStorage()` keeps entries in a database table. Pass a
connection name, or `null` for the default connection, and the table name:

```php
<?php

use Windwalker\Cache\Serializer\PhpSerializer;

return [
    'factories' => [
        'instances' => [
            'shared' => static fn () => CacheFactory::cachePoolFactory(
                'db',
                PhpSerializer::class,
            ),
        ],
        'storages' => [
            'db' => static fn () => CacheFactory::dbStorage(
                null,
                'cache_items',
            ),
        ],
    ],
];
```

The table defaults to `cache_items`. It stores the key, group, payload, and
expiration time, and it has a unique index on the key and group. The table
is created automatically when a save fails because it is missing. You can
also create it ahead of time with the `cache:table` command or
`DatabaseStorage::createTable()`.

::: info
File or Redis storage usually gives better performance than database
storage, because each read avoids a SQL query. Choose database storage for
the reasons below, and accept the extra cost for them.
:::

Database storage is useful in three cases:

- Sharing across hosts. Every server reads and writes the same table, so
  one server's entry is visible to all others. A file cache is local to one
  machine unless you mount a shared volume.
- Locking. Writes go through the database, so the storage stays consistent
  when several hosts update the same key. The per-key `CacheLock` used by
  `fetch()` is still file-based, so cross-host locking requires a shared
  filesystem. See [Cache Pool](/documentation/components/cache/cache-pool).
- State markers. Entries can be grouped and their expiration updated
  without rewriting the value, so a marker such as "the import last ran at"
  can live in the shared store.

Expired rows are not removed on every write. `DatabaseStorage` prunes them
randomly, with a default probability of 1 percent per save.

## Reminders

- A missing key returns `null` from `get()`, or the handler result from
  `fetch()`. Do not treat a cached `null` as a miss unless the handler
  returns one.
- Use the `none` instance to bypass caching for one service, for example
  in tests. It stores nothing and always reports a miss.
- Keep the cache path and database table out of public access, and do not
  cache secrets without protection.

## Components Reference

This page covers how the cache is wired into Windwalker Core. For the
complete component documentation, see:

- [Cache Overview](/documentation/components/cache/index): package
  installation and standalone usage.
- [Cache Pool](/documentation/components/cache/cache-pool): pool
  operations, read-through helpers, locking, and `CacheItem`.
- [Tagged Pool](/documentation/components/cache/tagged-pool): tag-based
  invalidation.
- [Storages](/documentation/components/cache/storages): available storage
  backends.
- [Serializers](/documentation/components/cache/serializers): available
  serializers and how to combine them.

To clear cache folders from the command line, see
[Cache Command](/documentation/framework/console/cache).
