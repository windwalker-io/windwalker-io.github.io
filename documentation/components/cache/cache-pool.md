---
layout: doc
title: CachePool
component: cache
---

# CachePool

`CachePool` implements the PSR-6 and PSR-16 interfaces. Its constructor takes a storage, a serializer, a logger, and a
default TTL:

```php
new CachePool(
    StorageInterface $storage = new ArrayStorage(),
    SerializerInterface $serializer = new RawSerializer(),
    LoggerInterface $logger = new NullLogger(),
    DateInterval|int|null $defaultTtl = null,
);
```

## Basic operations

Use PSR-16 methods for simple values:

```php
$pool->set('settings', $settings, 3600);
$settings = $pool->get('settings', default: []);
```

Use PSR-6 items when you need expiration or tags on a single value:

```php
$item = $pool->getItem('settings');

if (!$item->isHit()) {
    $item->set(loadSettings())->expiresAfter(3600);
    $pool->save($item);
}

$settings = $item->get();
```

Calls to `save()` are immediate. `saveDeferred()` queues an item until `commit()`. Deferred items are also committed
when the pool is destroyed, unless auto-commit is disabled with `withAutoCommit(false)`.

## Derived pools

The `with*` methods, such as `withStorage()`, `withSerializer()`, `withGroup()`, and `withDefaultTtl()`, return a new
pool and leave the original unchanged. Use them to derive pools from a shared base:

```php
$sessionCache = $pool->withGroup('session')->withDefaultTtl('+30 minutes');
```

`withGroup()` requires a storage that supports groups. Otherwise it throws `LogicException`.

## Read-through helpers

`fetch()`, `modify()`, and `compute()` run a handler under a lock, so the read-and-write cycle is atomic.

| Helper      | Behavior                                                                  |
|-------------|---------------------------------------------------------------------------|
| `fetch()`   | Returns the cached value. On a miss, or when early expiration applies, the handler computes and stores it. |
| `modify()`  | Only on a hit, the handler transforms the value and stores it. Returns `false` on a miss. |
| `compute()` | Transforms the existing value, or computes a new one on a miss. Returns the new value. |

```php
use Windwalker\Cache\CacheItem;

$users = $pool->fetch('users.active', fn () => $repo->findActive(), ttl: '+10 minutes');

$pool->modify('stats.views', fn (CacheItem $item) => $item->get() + 1, ttl: 86400);

$count = $pool->compute(
    'stats.visits',
    fn (CacheItem $item) => ($item->isHit() ? $item->get() : 0) + 1,
    ttl: 86400,
);
```

The handler can also return a `CacheItem`. In that case the item's value, TTL, and tags are stored.

`fetch()` accepts a `$beta` factor for early expiration. `1.0` is recommended, `0` disables early expiration, and
`INF` always recomputes. `fetch()` records the handler's runtime (`ctime`) and uses it for the early-expiration
calculation, following XFetch. See the
[XFetch paper](https://www.vldb.org/pvldb/vol8/p886-vattani.pdf) for details.

Pass `lock: false` to skip the file lock. This is suitable for in-process storages such as `ArrayStorage`.
See [CacheLock](/documentation/components/cache/cache-lock).

## Asynchronous fetch

`fetchAsync()` works like `fetch()` but returns a promise. It requires `windwalker/promise`. The handler may return a
promise, and the pool stores only the resolved value.

```php
use Windwalker\Promise\Promise;

Promise::all([
    $pool->fetchAsync('a', fn () => fetchRemote('a')),
    $pool->fetchAsync('b', fn () => fetchRemote('b')),
])->then(fn (array $values) => useValues($values))->wait();
```

## CacheItem

`CacheItem` is the item type used by PSR-6 methods and by the helper handlers. Create one with `CacheItem::create()` or
get one from `getItem()`.

```php
use Windwalker\Cache\CacheItem;

$item = CacheItem::create('config.mail', ['host' => 'smtp.example.com'])
    ->expiresAfter(new DateInterval('PT30M'))
    ->tags('mail', 'config');

$pool->save($item);
```

Keys must be non-empty and must not contain the characters `{}()/\@:`. Otherwise an `InvalidArgumentException` is thrown.
