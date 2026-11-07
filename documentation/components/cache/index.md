---
layout: doc
title: Introduction
part: Components
component: cache
---

# Introduction

Windwalker Cache is a PSR-6 and PSR-16 compatible cache library. Values are stored through a pluggable storage and
encoded through a pluggable serializer. Read-through helpers such as `fetch()` reduce cache stampedes, and
`TaggedCachePool` invalidates groups of items by tag.

## Installation

```bash
composer require windwalker/cache ^4.0
```

Windwalker Cache 4.x requires PHP 8.4.6 or later.

## Use as Standalone Component

```php
use Windwalker\Cache\CachePool;
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Cache\Storage\FileStorage;

$pool = new CachePool(
    new FileStorage(__DIR__ . '/cache'),
    new PhpSerializer(),
);

$pool->set('user.1', ['name' => 'Alice'], 3600);

$report = $pool->fetch(
    'report.daily',
    fn () => generateReport(),
    ttl: 600,
);
```

## Use in Windwalker

`CachePackage` binds `CachePool`, `CacheInterface`, and `CacheItemPoolInterface` to the container. Pools are created
from the `cache` configuration. Use the existing container or application; do not create a new `Container`.

Inject the pool as a constructor dependency:

```php
use Windwalker\Cache\CachePool;

class ProductService
{
    public function __construct(
        protected CachePool $cache
    ) {
    }
}
```

Or retrieve it from the container or the application:

```php
$cache = $container->get(CachePool::class);

$cache = $app->retrieve(CachePool::class);
```

To get a named profile, use `CacheFactory`:

```php
use Windwalker\Core\Factory\CacheFactory;

$htmlCache = $container->get(CacheFactory::class)->get('html');
```

### Configuration

The package ships `etc/cache.config.php`. Override it in the host app by placing a file with the same name in
`etc/packages/`. The `default` key selects the profile used when no name is given. Profiles are defined under
`factories.instances`, and storage factories under `factories.storages`.

```php
// etc/packages/cache.config.php

use Windwalker\Cache\CachePackage;
use Windwalker\Cache\CachePool;
use Windwalker\Cache\Serializer\JsonAssocSerializer;
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Cache\Serializer\RawSerializer;
use Windwalker\Cache\Storage\NullStorage;
use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\Core\Factory\CacheFactory;

return #[ConfigModule(
    name: 'cache',
    enabled: true,
    priority: 100,
    belongsTo: CachePackage::class,
)]
static fn() => [
    'no_cache' => env('CACHE_DISABLED'),

    'default' => 'global',

    'providers' => [
        CachePackage::class,
    ],

    'factories' => [
        'instances' => [
            'none' => static fn(): CachePool => new CachePool(
                new NullStorage(),
            ),
            'global' => static fn() => CacheFactory::cachePoolFactory(
                'file',
                PhpSerializer::class,
            ),
            'html' => static fn() => CacheFactory::cachePoolFactory(
                'file',
                RawSerializer::class,
            ),
            'db' => static fn() => CacheFactory::cachePoolFactory(
                'db',
                JsonAssocSerializer::class,
            ),
        ],
        'storages' => [
            'file' => static fn() => CacheFactory::fileStorage(),
            'db' => static fn() => CacheFactory::dbStorage(),
        ],
    ],
];
```

To create the `cache_items` table used by the `db` storage, run:

```bash
php windwalker cache:table [name]
```

## Reference

- [CachePool](/documentation/components/cache/cache-pool): pool operations, read-through helpers, locking, and `CacheItem`.
- [TaggedCachePool](/documentation/components/cache/tagged-pool): tag-based invalidation.
- [Storages](/documentation/components/cache/storages): available storage backends.
- [Serializers](/documentation/components/cache/serializers): available serializers and how to combine them.

## Related components

- [Crypt](/documentation/components/crypt/): encryption used by `CipherSerializer`.
- [Promise](/documentation/components/promise/): required by `CachePool::fetchAsync()`.
- [Database](/documentation/components/database/): the adapter used by `DatabaseStorage`.
