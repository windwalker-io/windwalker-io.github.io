---
layout: doc
title: Iterating Files
component: filesystem
---

# Iterating Files

Listing a directory with `RecursiveDirectoryIterator` means handling
dot entries, separating files from folders, and wrapping each entry
yourself. The listing methods on `FileObject` and `Filesystem` do this
work and return a `FilesIterator`. Each item is a `FileObject`, so the
same methods are available on every entry.

## Listing a Folder

`items()` returns files and folders, `files()` returns only files, and
`folders()` returns only folders. Each method accepts a `$recursive`
flag. Use the object form when you already have a path, or the static
form when you have a string:

```php
use Windwalker\Filesystem\Filesystem;

use function Windwalker\fs;

$views = fs('/var/www/app/views');

foreach ($views->files(recursive: true) as $file) {
    echo $file->getRelativePathname('/var/www/app/views'), PHP_EOL;
}

$folders = Filesystem::folders('/var/www/app/views');
```

Listing a path that does not exist throws a `FileNotFoundException`. Listings
are not sorted; the order depends on the file system, so use `usort()` when
the order matters.

## A Showcase: Collecting Source Files

The following example collects the PHP files in a source folder, skips
test files, and returns their paths as an array of strings:

```php
use Windwalker\Filesystem\FileObject;

use function Windwalker\fs;

$sources = fs('/var/www/app/src')
    ->files(recursive: true)
    ->filter(
        static fn (FileObject $file) => $file->getExtension() === 'php'
    )
    ->filter(
        static fn (FileObject $file) => !str_ends_with(
            $file->getFilename(),
            'Test.php'
        )
    )
    ->toArray();

foreach ($sources as $path) {
    echo $path, PHP_EOL;
}
```

`FilesIterator` extends the `NestedIterator` from `windwalker/utilities`,
so the iterator methods are chainable and lazy. `filter()`, `map()`,
`each()`, `limit()`, and `slice()` do not read the whole folder at once.
`toArray()` reads all items and returns their path strings. Use `foreach`
when you need `FileObject`s, and `first()` returns the first item as a
`FileObject`, or `null`.

## Recursion

A recursive listing walks every level below the folder. Use `files()` or
`folders()` with `recursive: true` when you need one kind of entry, as in
the example above. `items()` with `recursive: true` returns both kinds in
one pass:

```php
use function Windwalker\fs;

$root = fs('/var/www/app');

$everything = $root->items(recursive: true);
$filesOnly = $root->files(recursive: true);
$foldersOnly = $root->folders(recursive: true);
```

The `$flags` argument of each listing method is passed to the underlying
`FilesystemIterator`. The iterator always adds `KEY_AS_PATHNAME` and
`CURRENT_AS_FILEINFO`, so leave the argument empty unless you need a
specific behavior.

## Glob Patterns

`Filesystem::glob()` and the helper `Windwalker\glob()` support Ant-style
patterns, including `**` for any depth. They depend on
`webmozart/glob`, which is not installed by default.

```php
use function Windwalker\glob;

$controllers = glob('/var/www/app/src/**/*Controller.php');
```

`glob()` returns an array of path strings. `Filesystem::glob()` returns a
`FilesIterator` instead, so you can filter it like any other listing.

`glob_all()` accepts several patterns and merges the results without
duplicates. A pattern that starts with `!` removes matching paths from
the result:

```php
use function Windwalker\glob_all;

$templates = glob_all(
    [
        '/var/www/app/views/**/*.php',
        '!/var/www/app/views/**/*.bak.php',
    ]
);
```

Write paths with `/` as the separator on every platform. The package
converts the pattern for `webmozart/glob`, but a pattern that mixes
separators is harder to read.

## Filtering by Metadata

`FileObject` extends `SplFileInfo`, so every item carries the standard
metadata methods. Combine them with `filter()` to select files by size,
age, or name without a second pass over the directory.

The following example finds log files that are larger than 10 MB and have
not changed in the last 30 days, which are candidates for archiving:

```php
use Windwalker\Filesystem\FileObject;

use function Windwalker\fs;

$threshold = time() - 30 * 86400;

$candidates = fs('/var/www/storage/logs')
    ->files(recursive: true)
    ->filter(
        static fn (FileObject $file) => $file->getExtension() === 'log'
    )
    ->filter(
        static fn (FileObject $file) => $file->getSize() > 10 * 1024 * 1024
    )
    ->filter(
        static fn (FileObject $file) => $file->getMTime() < $threshold
    )
    ->toArray();
```

`getSize()` returns bytes and `getMTime()` returns a Unix timestamp. Both
come from `SplFileInfo`, and both read the file's metadata at call time, so
a file that changes during the scan can produce a different result.

## Transforming Results

`map()` and `reduce()` run lazily, like `filter()`. Use `reduce()` to
calculate a summary, and `map()` to turn each item into a value that the
rest of your code needs.

This example builds a relative listing and totals the size of a folder in
one pass over the directory:

```php
use function Windwalker\fs;

$root = '/var/www/public/assets';

$listing = fs($root)
    ->files(recursive: true)
    ->map(
        static fn ($file) => $file->getRelativePathname($root)
    )
    ->toArray();

$totalBytes = fs($root)
    ->files(recursive: true)
    ->reduce(
        static fn (int $sum, $file) => $sum + $file->getSize(),
        0
    );
```

`limit()` is useful for previews. It stops reading after the requested
number of items, so a folder with a million entries does not need to be
scanned to show the first twenty:

```php
use function Windwalker\fs;

$preview = fs('/var/www/storage/uploads')
    ->items()
    ->limit(0, 20)
    ->toArray();
```

`observe()` wraps the iterator as an RxPHP `Observable` for reactive
pipelines. It requires `reactivex/rxphp`.

## Glob Examples

Ant-style patterns are shorter than nested loops when you select files by
name across several folders. The most common forms are:

- `/var/www/app/*/config.php`: one level of folders, each containing
  `config.php`.
- `/var/www/app/**/config.php`: `config.php` at any depth.

```php
use function Windwalker\glob_all;

$templates = glob_all(
    [
        '/var/www/app/**/*.php',
        '/var/www/app/**/*.twig',
        '!/var/www/app/vendor/**',
    ]
);
```

Use `Filesystem::glob()` when you need the `FilesIterator` methods, such
as `filter()` on the result, instead of an array of strings. Matches reflect
the file system at call time, so check `exists()` before you use a path that
might be removed later.

## Walking Several Roots

To list one set of folders that may overlap, put them in a
`PathCollection`. The collection skips nested roots and removes duplicate
results. See [Path Collection](./path-collection) for the full behavior.

## Pitfalls

**Do not change a tree while walking it.** Deleting or renaming entries
during a recursive listing can skip or fail on entries that the iterator has
not reached. Collect the paths first with `toArray()`, then modify them:

```php
$stale = fs('/var/www/storage/cache')
    ->files(recursive: true)
    ->filter(
        static fn ($file) => $file->getMTime() < time() - 3600
    )
    ->toArray();

foreach ($stale as $path) {
    fs($path)->deleteIfExists();
}
```

**Large listings use memory.** `toArray()` loads every entry at once. For
large folders, iterate with `foreach` and stop early, or use `limit()`.
