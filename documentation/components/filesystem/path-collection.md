---
layout: doc
title: Path Collection
component: filesystem
---

# Path Collection

Many features read from several roots at once, such as a theme folder,
a module folder, and a shared assets folder. Listing each root separately
returns the same file twice whenever one root is inside another. A
`PathCollection` holds the roots, skips any root that lies inside another
root in the collection, and returns one de-duplicated `FilesIterator` for
all of them.

## Creating a Collection

A collection takes an array of path strings or `SplFileInfo` objects. The
paths are wrapped as `FileObject`s:

```php
use Windwalker\Filesystem\PathCollection;

$roots = new PathCollection(
    [
        '/var/www/app/themes',
        '/var/www/app/modules',
    ]
);
```

## A Showcase: Finding Templates in Several Roots

The following example lists every Twig template under three roots. The
second root lies inside the first, so the collection scans it only once:

```php
use Windwalker\Filesystem\FileObject;
use Windwalker\Filesystem\PathCollection;

$roots = new PathCollection(
    [
        '/var/www/app/themes',
        '/var/www/app/themes/default',
        '/var/www/app/modules',
    ]
);

$templates = $roots
    ->files(recursive: true)
    ->filter(
        static fn (FileObject $file) => $file->getExtension() === 'twig'
    );

foreach ($templates as $file) {
    echo $file->getPathname(), PHP_EOL;
}
```

`items()`, `files()`, and `folders()` accept the same `$recursive` flag as
`FileObject`. Each returns a `FilesIterator`, which you can filter and
map like any other listing.

## Changing a Collection

Collections are value objects. Each method that changes the contents returns
a new collection and leaves the original unchanged. Assign the result, because
calling a method without assigning it discards the new collection:

```php
use Windwalker\Filesystem\PathCollection;

$roots = new PathCollection(['/var/www/a', '/var/www/b']);

$more = $roots->add('/var/www/c');
// $roots still has 2 paths. $more has 3.

$more = $roots->addPaths(['/var/www/c', '/var/www/d']);

$only = $roots->withPaths(['/var/www/x']); // Replaces all paths.
```

`appendAll()` and `prependAll()` add the same segment to every path:

```php
$assets = $roots->appendAll('/assets');
// ['/var/www/a/assets', '/var/www/b/assets']

$prefixed = $roots->prependAll('/root');
// ['/root/var/www/a', '/root/var/www/b']
```

`map()` applies a callback to each `FileObject`. The callback must return a
`FileObject`, because its return value replaces the path:

```php
$compiled = $roots->map(
    fn (FileObject $file) => $file->appendPath('compiled')
);
```

`getPath()` returns the `FileObject` at a numeric position, or `null` when
the position does not exist. `toArray()` returns the stored paths as strings.


`isChild()` tells whether a path lies inside one of the roots. The listing
methods use the same check to skip nested roots.

## Building a Collection from Configuration

Roots usually come from configuration. A typical setup has a project
folder, a set of optional extension folders, and a vendor folder, and
the list changes per environment. Build the collection once from the
configuration array, and skip roots that are not present in this
environment:

```php
use Windwalker\Filesystem\PathCollection;

use function Windwalker\fs;

$configured = [
    '/var/www/app/src',
    '/var/www/app/plugins',
    '/var/www/app/vendor/acme/shared',
];

$existing = array_filter(
    $configured,
    static fn (string $path) => fs($path)->isDir()
);

$roots = new PathCollection($existing);
```

Filtering with `isDir()` before the collection is built avoids the
`FileNotFoundException` that a missing root raises when a listing method is
called.

## Changing Roots

Each method that changes the collection returns a new object, so a base
collection can be shared and extended per request:

```php
$base = new PathCollection(['/var/www/app/src']);

$withPlugins = $base->add('/var/www/app/plugins');

$onlyVendor = $base->withPaths(['/var/www/app/vendor/acme/shared']);

$scoped = $base->appendAll('/Controller');
```

`map()` gives full control over each root. The callback receives a
`FileObject` and returns a `FileObject`, so you can, for example, resolve
a symbolic link before the collection uses the path:

```php
$resolved = $base->map(
    static fn ($file) => fs(realpath($file->getPathname()))
);
```

## Listing Folders and Files

`folders()` returns the folders of all roots, with the same `$recursive`
flag as the other listing methods. `getPath()` reads one root by its
position, which is useful when a root has a known role:

```php
$roots = new PathCollection(
    [
        '/var/www/app/themes',
        '/var/www/app/modules',
    ]
);

$themesFolder = $roots->getPath(0);

$themeNames = $roots
    ->folders(recursive: false)
    ->toArray();
```

`getPath()` returns `null` for a position that does not exist.

## Checking Membership

`isChild()` tells whether a path is inside one of the roots. It is the same
check that the listing methods use to skip nested roots, so you can use it
to validate a user-supplied path before you read it:

```php
$roots = new PathCollection(['/var/www/app/uploads']);

$roots->isChild('/var/www/app/uploads/2026/photo.jpg'); // true

$roots->isChild('/var/www/app/etc/secret.php'); // false
```

For a stronger guarantee, combine it with `Path::makeSafeAbsolute()`. See
[Path Utilities](./path-utilities).

## Pitfalls

**Roots do not resolve overrides.** Deduplication compares full paths, so
two roots that contain the same relative file, such as `home.twig`, return
both files. A theme system that expects the first root to win must choose
the file itself. Iterate the roots in priority order and stop at the first
match:

```php
$file = null;

foreach ($roots->getPaths() as $root) {
    $candidate = fs($root)->appendPath('/home.twig');

    if ($candidate->exists()) {
        $file = $candidate;
        break;
    }
}
```
