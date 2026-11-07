---
layout: doc
title: CacheLock
component: cache
---

# CacheLock

`CacheLock` is a static, file-based lock used by the read-through helpers (`fetch()`, `modify()`, `compute()`, and
`touch()`) when their `lock` argument is `true`. Each key is mapped to one of the configured lock files with `crc32()`,
so the number of lock files sets the number of lock stripes.

```php
use Windwalker\Cache\CacheLock;

CacheLock::setFiles([
    '/var/www/app/storage/locks/cache-1.lock',
    '/var/www/app/storage/locks/cache-2.lock',
]);

CacheLock::setTimeout(5.0);
```

If a lock cannot be acquired within the timeout, the helper runs its handler without the lock. A timeout of `0` gives
up immediately. The default timeout is 30 seconds.

The lock is re-entrant within one process: a handler that calls a helper for the same key does not deadlock.

Disable locking with the `lock` argument for in-process storages, or in single-threaded environments, where the file
lock adds overhead without benefit.
