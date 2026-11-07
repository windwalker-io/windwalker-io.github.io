---
layout: doc
title: TaggedCachePool
component: cache
---

# TaggedCachePool

`TaggedCachePool` extends `CachePool` with tag-based invalidation. Each tag has a version. An item records the versions
of its tags when it is saved, and it becomes a miss once any of those versions changes. Invalidating a tag therefore
invalidates every item that carries it, without deleting them one by one.

## Getting started

A tagged pool is a regular `CachePool` that also keeps tag versions in a second storage. You assemble it from a
storage and a serializer, the same way as `CachePool`.

### Standalone

```php
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Cache\Storage\FileStorage;
use Windwalker\Cache\TaggedCachePool;

$pool = new TaggedCachePool(
    new FileStorage(__DIR__ . '/cache'),
    new PhpSerializer(),
);

$pool->set('user.123.charts', $charts, 3600, ['user:123', 'charts']);

$pool->invalidateTags('user:123');
```

To add tags to a pool you already have, convert it:

```php
$tagged = $cachePool->toTaggedPool(null);
```

Passing `null` stores the tag versions in the same storage as the items. To keep them elsewhere, pass another
`StorageInterface` or `CacheItemPoolInterface`.

### In Windwalker

Add a profile that builds a tagged pool to the `cache` configuration in `etc/packages/cache.config.php`:

```php
'factories' => [
    'instances' => [
        'tagged' => static fn() => CacheFactory::taggedCachePool(
            'file',
            PhpSerializer::class,
        ),
    ],
    // ... storages as in the Configuration section
],
```

Then retrieve the profile from the factory. The factory caches each profile, so the same instance is returned on
later calls:

```php
use Windwalker\Core\Factory\CacheFactory;

$tagged = $container->get(CacheFactory::class)->get('tagged');
```

Inject it through the constructor when the service needs tags:

```php
use Windwalker\Cache\TaggedCachePool;

class SellerDashboard
{
    public function __construct(
        protected TaggedCachePool $cache
    ) {
    }
}
```

`CachePackage` binds `CachePool` to the container, not `TaggedCachePool`. Retrieve the tagged profile through
`CacheFactory` as shown above, or bind your own factory.

## Why use tags

Cached values often depend on the same underlying data. A post page, a category list, and an author sidebar may all
be built from one author record. When that record changes, every derived value must be refreshed. Without tags, the
application has to remember every cache key that depends on the author and delete each one. Tags let each cached value
declare what it depends on, and one call invalidates all of them.

Typical uses include:

```php
$pool->set('user.123.charts', $charts, 3600, ['user:123', 'charts']);
$pool->set('user.123.products', $products, 3600, ['user:123', 'products']);
$pool->set('user.456.charts', $charts2, 3600, ['user:456', 'charts']);

// Refresh everything belonging to user 123:
$pool->invalidateTags('user:123');

// Refresh the charts of all users:
$pool->invalidateTags('charts');
```

Each item carries two tags: one for its owner and one for its type. Invalidating an owner tag refreshes all of that
account's cached data, while invalidating a type tag refreshes that kind of data for every account.

Real-world example: a seller dashboard. Charts, product lists, and category trees are computed from each seller's shop
data. When a seller changes a product, the application invalidates `user:123`. When the chart calculation logic
changes, it invalidates `charts` once for all sellers.

Keys cannot contain `:`, so the example uses dots in keys. Tags accept any string.

Main advantages:

- **Precise invalidation**: only items that declare a dependency are affected.
- **No key bookkeeping**: the application does not need to know every derived key.
- **Cheap invalidation**: changing a tag version is a single write, regardless of how many items use the tag.
- **Safe failure**: when tag data is missing, items are treated as misses, so stale values are not served.

The trade-offs are an extra read for each tagged item, because the item's tag versions must be checked, and invalidated
items are not removed immediately. They remain in storage until they expire or are pruned.

```php
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Cache\Storage\FileStorage;
use Windwalker\Cache\TaggedCachePool;

$pool = new TaggedCachePool(
    new FileStorage(__DIR__ . '/cache/items'),
    new PhpSerializer(),
);

// Or convert an existing pool
$tagged = $cachePool->toTaggedPool(
    new FileStorage(__DIR__ . '/cache/tags'),
);
```

## Tagging items

Pass tags to `set()`, or assign them to a `CacheItem` before saving:

```php
$pool->set('post.1', $post, 3600, ['posts', 'post.1']);

$pool->fetch('posts.latest', function (CacheItem $item) use ($repo) {
    $item->tags('posts');

    return $repo->latest();
});
```

## Multiple tags

An item can carry any number of tags. Each tag has its own version, and the item stores a snapshot of all of them when
it is saved. On read, the item is valid only when every stored tag version still matches the current one. The check
is an AND across all tags, and the order of tags does not matter.

```php
$pool->set('post.1', $post, 3600, ['posts', 'author.5']);
```

## Invalidating one of several tags

Invalidating any single tag makes every item carrying that tag a miss. Items that do not carry it are unaffected:

```php
$pool->invalidateTags('author.5');

// "post.1" is now a miss, because it carries "author.5".
// Items tagged only with "posts" remain valid.
```

A miss behaves like a missing item: `get()` returns the default, and `fetch()` runs its handler and saves the result
with the current tag versions. The invalidation applies only to items saved before it. Items saved afterward receive
new versions.

Some details to keep in mind:

- Invalidating a tag that no item uses has no effect.
- A tag whose version is missing from the tag storage never matches a stored version, so the affected items are
  treated as misses. This fails safe: the value is recomputed instead of served stale.
- Tag versions are cached in process memory for a short time. The current process sees an invalidation immediately,
  but other processes may keep serving the old version for up to `getKnownTagVersionsTtl()` seconds (`0.15` by
  default).

## Tag storage

Tag versions are kept in a separate pool, which defaults to the item storage. Use `withTagPool()` to store them
elsewhere. A `StorageInterface` passed to it is wrapped in a `CachePool`.

Use `withoutKnownTagVersionsCache()` when other processes invalidate tags and the change must take effect
immediately.
