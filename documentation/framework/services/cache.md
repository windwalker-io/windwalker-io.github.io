---
layout: doc
title: Cache
---

# Cache

Caching stores the result of expensive work so that later requests can reuse
it. A product page that needs several database joins and a remote price
lookup can be computed once and served from the cache for the next few
minutes. Windwalker's cache service gives the application one place to read,
write, and expire those values, and lets each part of the application choose
its own storage through named cache instances.

In Core, the cache service is provided by `CachePackage` from the
`windwalker/cache` package and assembled by `CacheFactory`. The default cache
instance is bound to the PSR-16 `Psr\SimpleCache\CacheInterface`, so a service
can receive it through its constructor.

## Basic Usage in Core

Inject `CacheInterface` into a service and use `get()`, `set()`, and
`delete()`. Pass a time to live (TTL) in seconds to `set()` to let the entry
expire.

```php
<?php

declare(strict_types=1);

namespace App\Service;

use Psr\SimpleCache\CacheInterface;

class ProductService
{
    public function __construct(
        protected CacheInterface $cache,
    ) {
    }

    public function getProductSummary(int $id): array
    {
        $key = 'product.summary.' . $id;

        $summary = $this->cache->get($key);

        if ($summary === null) {
            $summary = $this->buildSummary($id);

            // Keep the summary for five minutes.
            $this->cache->set($key, $summary, 300);
        }

        return $summary;
    }

    public function forgetProductSummary(int $id): void
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

The default instance is `global`. To use another instance, inject the
`CacheFactory` and call `get()` with the instance name.

```php
use Windwalker\Core\Factory\CacheFactory;

class HtmlFragmentService
{
    public function __construct(
        protected CacheFactory $cacheFactory,
    ) {
    }

    public function getFragment(string $name): ?string
    {
        return $this->cacheFactory->get('html')->get($name);
    }
}
```

`CacheFactory::get()` returns the same instance for the same name during a
request. Use it when a service needs a specific instance rather than the
default one.

## Configuring Cache Instances

The cache is configured in `etc/packages/cache.config.php`. The config has
two parts. The `factories.instances` section defines the named cache pools,
and the `factories.storages` section defines how each pool stores its
values. The `default` key selects the instance that `CacheInterface` uses.

```php
<?php

declare(strict_types=1);

use Windwalker\Cache\CachePackage;
use Windwalker\Cache\CachePool;
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Cache\Serializer\RawSerializer;
use Windwalker\Cache\Storage\NullStorage;
use Windwalker\Core\Factory\CacheFactory;

return [
    'default' => 'global',
    'providers' => [
        CachePackage::class,
    ],
    'factories' => [
        'instances' => [
            'none' => new CachePool(new NullStorage()),
            'global' => CacheFactory::cachePoolFactory(
                'file',
                PhpSerializer::class,
            ),
            'html' => CacheFactory::cachePoolFactory(
                'file',
                RawSerializer::class,
            ),
        ],
        'storages' => [
            'file' => CacheFactory::fileStorage(),
        ],
    ],
];
```

### How Factories Are Assembled

Each entry in `factories.instances` is a name mapped to a factory closure
that returns a `CachePool`. `CacheFactory::cachePoolFactory()` takes these
arguments:

- The storage name, such as `'file'`. It is resolved from
  `factories.storages`.
- The serializer class, such as `PhpSerializer::class`. It converts values
  to and from strings.
- An optional group and default TTL, which are left at their defaults above.

`CacheFactory::fileStorage()` and `CacheFactory::dbStorage()` return the
storage factories for the `storages` section. The `none` instance is written
directly as a `CachePool` with a `NullStorage`, which stores nothing. Use it
when a service must bypass caching, for example in tests.

### Where the File Driver Stores Cache Files

The `file` storage writes to the `@cache` alias. In the host app,
`@cache` points to `WINDWALKER_CACHE`, which uses the `CACHE_PATH`
environment variable. If `CACHE_PATH` is not set, the path is `cache/` under
the project root.

Each cache instance gets its own folder under that path. The `global`
instance writes to `cache/global/`, and the `html` instance writes to
`cache/html/`. The file name is `~` followed by the SHA-1 hash of the key,
with the `.data` extension, so keys with special characters are safe to use.

```text
cache/
├── global/
│   ├── ~3f786850e387550fdab836ed7e6dc881de23001b.data
│   └── ...
└── html/
    └── ...
```

::: warning
The file driver creates folders with `0755` permissions, and the cache
files are readable by any user that can read the PHP process's files. Keep
`CACHE_PATH` outside the public web root, and do not store passwords, tokens,
or other secrets in a file cache without a separate protection layer.
:::

::: tip
Set `CACHE_PATH` in the environment when the cache must live on a different
disk or a shared volume. Cache files are disposable, so the folder does not
need backups.
:::

## Database Storage

`DatabaseStorage` keeps cache entries in a database table instead of files.
It is useful when several servers must share the same cache, or when the
file system is read-only. The table defaults to `cache_items`, and the
storage keeps the key, group, payload, and expiration time in separate
columns.

Create the storage with `CacheFactory::dbStorage()` and add a pool that
uses it:

```php
'factories' => [
    'instances' => [
        'global' => CacheFactory::cachePoolFactory(
            'file',
            PhpSerializer::class,
        ),
        'shared' => CacheFactory::cachePoolFactory(
            'db',
            PhpSerializer::class,
        ),
    ],
    'storages' => [
        'file' => CacheFactory::fileStorage(),
        'db' => CacheFactory::dbStorage(
            null,
            'cache_items',
        ),
    ],
],
```

The first argument is the database connection name. `null` uses the default
connection. The table is created automatically when a save fails because the
table is missing. To create it ahead of time, generate a migration with
`CacheTableCommand`, or call `DatabaseStorage::createTable()` directly.

::: info
Expired rows are not removed on every write. By default, `DatabaseStorage`
prunes them with a probability of 1 percent per save.
:::

## Components Reference

This page covers how the cache is wired into Windwalker Core. For the
complete component documentation, see:

- [Cache Overview](/documentation/components/cache/index): package
  installation and standalone usage.
- [CachePool](/documentation/components/cache/cache-pool): pool operations,
  read-through helpers, locking, and `CacheItem`.
- [TaggedCachePool](/documentation/components/cache/tagged-pool): tag-based
  invalidation.
- [Storages](/documentation/components/cache/storages): available storage
  backends.
- [Serializers](/documentation/components/cache/serializers): available
  serializers and how to combine them.

To clear cache folders from the command line, see
[Cache Command](/documentation/framework/console/cache).
