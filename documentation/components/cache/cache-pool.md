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

## TTL

The TTL (time to live) decides how long an entry stays valid. Most methods accept several forms:

```php
// Integer: seconds from now
$pool->set('a', $value, 3600);

// DateInterval: any interval object
$pool->set('b', $value, new DateInterval('PT1H'));

// ISO 8601 duration string, starting with "P"
$pool->fetch('c', fn () => $value, ttl: 'PT2H');
$pool->fetch('d', fn () => $value, ttl: 'P1D');

// Relative date string, parsed by DateInterval::createFromDateString()
$pool->fetch('e', fn () => $value, ttl: '+30 minutes');

// null: fall back to the default (see below)
$pool->set('f', $value);
```

Which forms each method accepts:

- `set()`, `setMultiple()`, and `CacheItem::expiresAfter()` accept integers, `DateInterval`, and `null`. A string
  throws a `TypeError`, so `set('x', $v, '+1 hour')` does not work.
- `fetch()`, `fetchAsync()`, `modify()`, `compute()`, and `touch()` also accept the string forms.
- `withDefaultTtl()` accepts the string forms. The constructor's `$defaultTtl` parameter accepts only `DateInterval`,
  an integer, or `null`.

Windwalker's core `Chronos` API accepts `Time\Duration` from PHP 8.6. The cache package does not, so convert the
value to seconds or a `DateInterval` before passing it.

### Default TTL

`defaultTtl` is the TTL used when no TTL is given. Set it on a derived pool:

```php
$short = $pool->withDefaultTtl('+10 minutes');

$short->set('weather', $weather); // expires in 10 minutes
```

It applies to:

- `set()` and `setMultiple()` without a TTL.
- `modify()`, `compute()`, and `touch()` without a TTL.
- Items returned by `getItem()` before `expiresAfter()` is called.

Pitfalls:

- `fetch()` with a `null` TTL does not use `defaultTtl`. It stores the value for one year. Pass an explicit TTL to
  `fetch()`.
- When `defaultTtl` is `null`, the default is one year.

## Derived pools

The `with*` methods, such as `withStorage()`, `withSerializer()`, `withGroup()`, and `withDefaultTtl()`, return a new
pool and leave the original unchanged. Use them to derive pools from a shared base:

```php
$sessionCache = $pool->withGroup('session')->withDefaultTtl('+30 minutes');
```

`withGroup()` requires a storage that supports groups. Otherwise it throws `LogicException`.

## Groups

A group is a namespace inside a storage. The same key in two groups refers to two different entries, and `clear()`
only removes the entries of the current group. Use groups to keep separate domains apart, such as sessions and
product data, without changing key names.

```php
$products = $pool->withGroup('products');
$sessions = $pool->withGroup('sessions');

$products->set('list', $list, 3600);
$sessions->set('list', $other, 3600);

$products->clear(); // removes only the "products" entries
```

`withGroup()` returns a new pool. It throws `LogicException` if the storage does not implement
`GroupedStorageInterface`, so check `isGroupSupported()` when the storage is configurable.

How groups are stored depends on the storage:

- `ArrayStorage`, `FileStorage` and its variants: a subdirectory or array segment per group.
- `DatabaseStorage` and `PdoStorage`: a `group` column.
- `RedisStorage`: a key prefix in the form `group:key`.
- `MemcachedStorage`: no groups. Use key prefixes instead.

Pitfalls:

- Avoid `:` in group names. Redis joins the group and the key with `:`, so names can collide.
- `clear()` on a group runs a scoped delete. Calling `clear()` on a pool without a group empties everything in the
  storage.
- Profiles from `CacheFactory` use the profile name as the group by default. Each profile's database entries
  therefore live in their own group, and file entries go to `@cache/<profile>`.
- `withGroup()` on a `TaggedCachePool` also applies to its tag pool when the tag pool supports groups.

## Atomic Read-Through

`fetch()`, `modify()`, and `compute()` run a handler under a lock, so the read-and-write cycle is atomic.

| Helper      | Behavior                                                                  |
|-------------|---------------------------------------------------------------------------|
| `fetch()`   | This is similar to `getOrSave()`, returns the cached value. On a miss, or when early expiration applies, the handler computes and stores it. |
| `modify()`  | Modify an exists cache value, the handler transforms the value and stores it. Returns `false` on a miss. |
| `compute()` | Modify or create, try fetch the existing value and modify it, or computes a new one on a miss. Returns the new value. |

```php
use Windwalker\Cache\CacheItem;

$users = $pool->fetch(
    'users.active',
    fn () => $repo->findActive(),
    ttl: '+10 minutes',
);

$pool->modify(
    'stats.views',
    fn (CacheItem $item) => $item->get() + 1,
    ttl: 86400,
);

$count = $pool->compute(
    'stats.visits',
    function (CacheItem $item) {
        // On a miss, there is no previous value yet.
        $previous = 0;

        if ($item->isHit()) {
            $previous = $item->get();
        }

        return $previous + 1;
    },
    ttl: 86400,
);
```

`compute()` always stores the value the handler returns, so it works whether the key exists or not. Use
`$item->isHit()` to tell the two cases apart. `modify()` skips the handler on a miss, while `compute()` runs it.

The handler can also return a `CacheItem`. In that case the item's value, TTL, and tags are stored.

### Locking and stampede prevention

When many requests miss the same key at once, each would run the expensive handler. The helpers prevent this in two
ways:

- **Lock**: `fetch()`, `modify()`, `compute()`, and `touch()` acquire a file lock for the key while the handler runs,
  so the read-and-write cycle is atomic across processes. Other processes wait for the lock, then read the value the
  first one stored.
- **Early recompute**: `fetch()` accepts a `$beta` factor for XFetch. A still-valid item may be recomputed slightly
  before it expires, so one request refreshes it while the others keep reading the old value. `1.0` is recommended,
  `0` disables early recompute, and `INF` always recomputes. The handler's runtime (`ctime`) is recorded and used in
  the calculation. See the [XFetch paper](https://www.vldb.org/pvldb/vol8/p886-vattani.pdf).

### Early recompute with beta

`fetch()` takes a `$beta` argument, the XFetch factor, as its fourth parameter. Every call that serves a hit may decide
to recompute the value early. The decision is random, and it becomes more likely as the expiration approaches. The
window before expiration scales with `$beta` and with the handler's runtime (`ctime`), so an expensive value starts
refreshing earlier than a cheap one.

```php
// Default: a balanced window, recommended for most values.
$report = $pool->fetch(
    'report.daily',
    fn () => $reporter->build(),
    ttl: 3600,
    beta: 1.0,
);

// Never recompute early. The handler runs only on a miss.
$config = $pool->fetch(
    'config.site',
    fn () => $repo->loadConfig(),
    ttl: 3600,
    beta: 0,
);

// Recompute earlier and more often, for very expensive handlers.
$stats = $pool->fetch(
    'stats.monthly',
    fn () => $warehouse->monthlyStats(),
    ttl: 86400,
    beta: 2.0,
);

// Always recompute, bypassing the cache for hits.
$fresh = $pool->fetch(
    'live.quotes',
    fn () => $api->quotes(),
    ttl: 60,
    beta: INF,
);
```

Guidelines:

- Use `1.0` for ordinary values. The refresh happens shortly before expiration, and only one request in a burst is
  likely to recompute.
- Use `0` when the value must not be refreshed ahead of its TTL, or when the handler is cheap and the lock is enough.
- Raise `beta` when the handler is slow and misses are costly. Values with a high `ctime` are refreshed earlier.
- `INF` turns every hit into a recompute. Use it only in tests or for debugging.
- The runtime is stored with values written by `fetch()`. Values written with `set()` or `save()` have no runtime, so
  early recompute uses only the remaining TTL.

### Avoiding avalanches

Stampede protection works per key. When many keys are written at the same moment with the same TTL, they also expire
together, and the resulting misses can overload the backend. Add a random offset to TTLs for related keys so that
expirations are spread out:

```php
$ttl = 3600 + random_int(0, 300);

$pool->fetch('products.top', fn () => $repo->top(), ttl: $ttl);
```

### CacheLock

`CacheLock` is a static, file-based lock. It is not a per-pool object: every pool in a process shares the same lock
files and configuration.

Each key is mapped to one lock file with `abs(crc32($key)) % count`. The number of files is the number of stripes.
Two keys in the same stripe wait for each other, even if they are unrelated. More stripes mean fewer collisions.

By default `CacheLock` uses 20 files: the package's own source files under `src/`. They work, but they are not
dedicated lock files and should not be relied on in production. Configure your own files at bootstrap:

```php
use Windwalker\Cache\CacheLock;

CacheLock::setFiles([
    '/var/www/app/storage/locks/cache-0.lock',
    '/var/www/app/storage/locks/cache-1.lock',
    '/var/www/app/storage/locks/cache-2.lock',
    '/var/www/app/storage/locks/cache-3.lock',
]);

CacheLock::setTimeout(5.0);
```

The files must exist before the lock is used. `CacheLock` only opens existing files, so create them during
deployment, for example with `touch`. A missing file does not raise an error. The lock is skipped, the handler runs
without it, and an error is logged.

### When to add more lock files

Increase the number of files when lock waits show up under load, for example:

- Many concurrent requests on different keys are slow, and the logs show lock waits or timeouts.
- The timeout warning `Failed to acquire lock within timeout` appears in the logs.

Then raise the count, for example to 32 or 64. Generate the list in one place:

```php
use Windwalker\Cache\CacheLock;

$dir = '/var/www/app/storage/locks';
$count = 32;

CacheLock::setFiles(
    array_map(
        fn (int $i) => sprintf('%s/cache-%02d.lock', $dir, $i),
        range(0, $count - 1),
    ),
);
```

Keep these rules when changing the list:

- **Use the same list in every process.** Striping depends on the count. If one process has 16 files and another has
  32, the same key maps to different files, and the two processes no longer exclude each other.
- **Set it before the first lock.** `setFiles()` closes the open handles and resets the lock state. Call it in the
  bootstrap, for example in a service provider or the entry script.
- **Create the files on a local, writable filesystem.** `flock()` is unreliable on many network filesystems.

### Behavior and pitfalls

- **Scope**: `flock()` coordinates processes on the same machine only. Servers that share a cache storage do not share
  these locks. Across machines, rely on a storage that handles concurrency, or accept that a lock covers one host.
- **Timeout**: if the lock cannot be acquired within `setTimeout()` (default 30 seconds), the handler runs without
  it. A timeout of `0` gives up immediately. `setWaitInterval()` sets how often the lock is retried (default 100 ms).
- **Re-entrancy**: within one process, a handler that calls a helper for the same key does not deadlock. It receives
  the current cached value and does not run the handler again.
- **Shared stripes**: two different keys in the same process and stripe share one file handle. Releasing one key
  releases the stripe, so the other key loses its lock early. Use more stripes when many keys are active at once.
- **Logging**: set `CacheLock::$logger` to a PSR-3 logger to see acquisition, timeout, and release messages.
- **Single-process use**: pass `lock: false` for in-process storages such as `ArrayStorage`, or in single-threaded
  environments. A file lock adds overhead without protecting anything there.

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
