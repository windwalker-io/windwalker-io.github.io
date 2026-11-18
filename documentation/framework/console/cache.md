---
layout: doc
---

# Cache

The cache commands clear files under the cache directory and purge
configured cache pools. Use them after a deployment, when a stale value
must disappear, or when a tag-based invalidation is needed.

## Clearing Cache Files

`cache:clear` deletes files under the `WINDWALKER_CACHE` directory. It
keeps the `.gitignore`, `.htaccess`, and `web.config` files.

```bash
php windwalker cache:clear
php windwalker cache:clear views routes
```

With no arguments, everything is cleared. With folder names, only those
folders under the cache directory are cleared.

::: warning
`cache:clear` with no arguments removes all cache files. Running it on
a busy production site causes the next requests to rebuild the caches.
Clear specific folders when you can.
:::

## Purging Cache Pools

`cache:purge` works on the cache pools defined in
`cache.factories.instances`.

```bash
php windwalker cache:purge
php windwalker cache:purge default session
php windwalker cache:purge -g users
php windwalker cache:purge -t product -t price
```

- Profile arguments: the pool profiles to purge. With none, all
  profiles are purged.
- `-g, --group`: clear one or more cache groups. Repeat the option to
  clear several groups.
- `-t, --tag`: invalidate one or more tags. Repeat the option for more
  tags.

An unknown profile name prints an error and the command continues with
the next profile.

::: tip
Tags are the cleanest way to invalidate related values. Tag cache items
when you store them, and purge the tag when the underlying data changes.
:::

## Completion

Both commands complete profile names, group names, and tag names in
the shell, after you install the hook from
[Basic Commands](./basic-commands#shell-completion).

