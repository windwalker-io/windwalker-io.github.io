---
layout: doc
title: Compiled Template Cache
part: Components
component: edge
---

# Compiled Template Cache

Compiling a template means parsing its tokens and generating PHP. This
work is needed only when the template changes. The cache stores the
compiled PHP so that later renders can run it directly. Edge checks the
cache on every render, so a changed template is compiled again without
any manual step.

Two caches ship with the package. `EdgeArrayCache` keeps compiled code
in memory for the current process. `EdgeFileCache` writes compiled PHP
files to a directory and keeps them between requests.

## Minimal Setup

Pass a cache as the third argument of `Edge`. The second argument is the
cache, and the first is the loader:

```php
use Windwalker\Edge\Cache\EdgeFileCache;
use Windwalker\Edge\Edge;
use Windwalker\Edge\Loader\EdgeFileLoader;

$edge = new Edge(
    new EdgeFileLoader([__DIR__ . '/views']),
    new EdgeFileCache(__DIR__ . '/var/cache/edge'),
);
```

The cache directory must exist and be writable by the PHP process.

## Showcase

A production setup stores compiled templates in a cache directory and
turns on debug naming. Debug naming adds the template name to each
cache file, which makes the files easier to find while you work:

```php
use Windwalker\Edge\Cache\EdgeFileCache;
use Windwalker\Edge\Edge;
use Windwalker\Edge\Loader\EdgeFileLoader;

$cache = new EdgeFileCache(__DIR__ . '/var/cache/edge');
$cache->setDebug(true);

$edge = new Edge(
    new EdgeFileLoader([__DIR__ . '/views']),
    $cache,
);

echo $edge->render('pages.home', ['title' => 'Welcome']);
```

Run the example twice. The first call compiles `pages/home` and writes a
file such as `~home-<hash>.php` into the cache directory. The second call
reads that file. Edit the template and render again, and the file is
recompiled.

## How Expiration Works

`EdgeFileCache` compares the modification time of the template file with
the modification time of its cache file. The cache entry is expired when
the template is newer, or when the cache file does not exist.

Each template has its own cache entry. Editing a partial that an
`@include` renders updates only that partial's cache entry, because the
partial is rendered as its own template.

## Cache Implementations

- `EdgeFileCache` writes a PHP file per template and checks file
  modification times. Use it in production and development.
- `EdgeArrayCache` stores compiled code in an array for the current
  object. It is the default when no cache is given.

::: info
`EdgeArrayCache` always reports an entry as expired. Each render of a
template with this cache compiles the template again. This is intended
for tests and one-off scripts. Use `EdgeFileCache` for a web application.
:::

Use `remove()` on a cache to delete the entry for one template. Pass the
resolved file path, not the layout name:

```php
$cache->remove(__DIR__ . '/views/pages/home.blade.php');
```

## Windwalker Application

In a Windwalker application, the renderer uses `cache_path` from the
renderer `options` setting. When the setting is present, the renderer
creates an `EdgeFileCache` there. When it is missing, the renderer uses
`EdgeArrayCache`.

::: warning
Cache files are PHP code, and Edge includes them to run a template. Keep
the cache directory outside the public web root, and make it writable
only by the account that runs PHP. A writable cache directory lets
anyone who can write there run code in your application.
:::
