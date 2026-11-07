---
layout: doc
title: TaggedCachePool
component: cache
---

# TaggedCachePool

`TaggedCachePool` extends `CachePool` with tag-based invalidation. Each tag has a version. An item records the versions
of its tags when it is saved, and it becomes a miss once any of those versions changes. Invalidating a tag therefore
invalidates every item that carries it, without deleting them one by one.

```php
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Cache\Storage\FileStorage;
use Windwalker\Cache\TaggedCachePool;

$pool = new TaggedCachePool(
    new FileStorage(__DIR__ . '/cache/items'),
    new PhpSerializer(),
);

// Or convert an existing pool
$tagged = $cachePool->toTaggedPool(new FileStorage(__DIR__ . '/cache/tags'));
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

## Invalidating tags

```php
$pool->invalidateTags('posts');
```

## Tag storage

Tag versions are kept in a separate pool, which defaults to the item storage. Use `withTagPool()` to store them
elsewhere. A `StorageInterface` passed to it is wrapped in a `CachePool`.

Tag versions are also cached in process memory for a short time, so repeated checks do not query the tag storage each
time. Use `withoutKnownTagVersionsCache()` when other processes invalidate tags and the change must take effect
immediately.
