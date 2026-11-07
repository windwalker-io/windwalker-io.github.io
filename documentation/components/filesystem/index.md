---
layout: doc
title: Introduction
part: Components
chapter: Filesystem
menu: components/filesystem
component: filesystem
---

# Introduction

Windwalker Filesystem wraps file and directory operations in a fluent
interface. A path becomes a `FileObject`, and its methods handle the work
that plain PHP functions leave to the caller: creating missing parent
folders, copying folders recursively, and reporting failures as
exceptions.

The package has these main parts:

- `FileObject`: a path wrapper that extends `SplFileInfo`. It reads,
  writes, copies, moves, and deletes files and folders.
- `Filesystem`: a static facade. Each call wraps the path in a
  `FileObject` and forwards the call.
- `FilesIterator`: the iterator returned by directory listings such as
  `items()`, `files()`, and `folders()`.
- `PathCollection`: a set of root paths that can be listed as one.
- `Path`: static helpers for path strings, such as normalizing paths and
  making user input safe.
- `TempFileObject`: a file or folder that can remove itself when it is no
  longer needed.

A path string is only data. Wrapping it in a `FileObject` gives it
behavior. Creating the object does not touch the disk; the checks and
operations run when you call their methods.

## Installation

```bash
composer require windwalker/filesystem ^4.0
```

The package requires PHP 8.4.6 or later.

The following packages are used by some features but are not declared in
`composer.json`. Install them when you use the matching features:

- `windwalker/stream` for `readStream()`, `writeStream()`, and
  `getStream()`.
- `windwalker/promise` for the `*Async()` methods.
- `windwalker/data` for `readAndParse()`.
- `webmozart/glob` for `glob()` and `glob_all()`.

## Use as Standalone Component

Load the Composer autoloader. The package registers the helper functions
`fs()`, `glob()`, and `glob_all()` in the `Windwalker` namespace.

```php
use function Windwalker\fs;

$file = fs('/var/www/storage/notes/todo.txt');

$file->write("Buy milk\n");

echo (string) $file->read();
```

`Filesystem` offers the same operations as static methods, without
wrapping the path first:

```php
use Windwalker\Filesystem\Filesystem;

Filesystem::write('/var/www/storage/notes/todo.txt', "Buy milk\n");

$content = Filesystem::read('/var/www/storage/notes/todo.txt');
```

## Use in Windwalker

Windwalker does not register a filesystem service in the DI container.
Keep the storage location in configuration, inject it as a string, and
wrap it where file operations are needed:

```php
use Windwalker\Filesystem\FileObject;

use function Windwalker\fs;

class ReportStorage
{
    public function __construct(
        protected string $root
    ) {
    }

    public function save(string $name, string $content): FileObject
    {
        return fs($this->root)
            ->appendPath('/' . $name)
            ->write($content);
    }
}
```

## Core Concepts

**Paths identify objects.** `appendPath()` and `prependPath()` return a
new object. `write()`, `mkdir()`, and `touch()` return the same object so
that calls can be chained.

```php
use function Windwalker\fs;

$dir = fs('/var/www/storage');

$dir->appendPath('/cache');   // The new object is discarded.

$cache = $dir->appendPath('/cache')->mkdir();
```

**Exceptions instead of `false`.** Most failures throw a
`FilesystemException`, or a `FileNotFoundException` for missing sources.
Both live in `Windwalker\Filesystem\Exception`.

**Static and instance APIs share one implementation.** `Filesystem::copy()`
calls `FileObject::copyTo()`, and `Filesystem::write()` calls
`FileObject::write()`. Choose the style that reads better in your code.

## Choosing an Entry Point

Three entry points lead to the same behavior. Pick the one that fits the
code around it:

| Entry point | Use it when |
| --- | --- |
| `fs($path)` or `new FileObject($path)` | You work with one path and chain several operations on it. |
| `Filesystem::method($path, ...)` | You need a single call and the path is a string. |
| `new PathCollection([...])` | Several roots must be read as one listing. |

`fs()` and `Filesystem::get()` return a `FileObject`, so both support the
same method chains. The static calls on `Filesystem` are shortcuts for
`Filesystem::get($path)->method(...)`.

## An End-to-End Example

The following example combines the main parts of the package. It collects
CSV files from several roots, sums a column into a temporary file, and copies
the result to a safe location in the export folder:

```php
use Windwalker\Filesystem\Filesystem;
use Windwalker\Filesystem\Path;
use Windwalker\Filesystem\PathCollection;

use function Windwalker\fs;

$roots = new PathCollection(
    [
        '/var/www/app/data/orders',
        '/var/www/app/data/archive',
    ]
);

$sources = $roots
    ->files(recursive: true)
    ->filter(
        static fn ($file) => $file->getExtension() === 'csv'
    )
    ->toArray();

$sum = 0;

foreach ($sources as $path) {
    $lines = explode("\n", trim((string) fs($path)->read()));

    foreach (array_slice($lines, 1) as $line) {
        $sum += (int) explode(',', $line)[1];
    }
}

$temp = Filesystem::createTemp(
    dir: '/var/www/app/storage/tmp',
    prefix: 'sum-',
);

$temp->write("total,$sum\n");

$target = Path::makeSafeAbsolute(
    'report-' . date('Ymd') . '.csv',
    '/var/www/app/storage/exports'
);

$temp->copyTo($target, force: true);
```

When `$temp` goes out of scope, the temporary file is removed automatically.
The copy in `exports/` remains.

## Typical Use Cases

- **Upload handling:** validate the name with `Path::makeSafe()`, write it
  with `write()` or `writeStream()`, and serve it from a folder outside the
  web root. See [Path Utilities](./path-utilities).
- **Backups and archives:** copy folders, move finished files, and remove
  old entries. The example below shows the pattern. See
  [File Object](./file-object).
- **Scanning content:** find templates, configuration, or assets across
  several roots with `PathCollection`, and filter by metadata. See
  [Iterating Files](./iterating-files) and
  [Path Collection](./path-collection).
- **Intermediate files:** imports, conversions, and unpacking steps write
  to a temporary file or folder, which is removed automatically. See
  [Temporary Files](./temp-files).
- **Grouped operations:** independent reads or writes return promises that
  you collect at the end. See [Async Operations](./async-operations).

### A Backup Routine

The following routine copies an upload folder to a backup location, then
removes archived files older than 30 days from the original folder:

```php
use Windwalker\Filesystem\FileObject;

use function Windwalker\fs;

$source = fs('/var/www/storage/uploads');

$source->copyTo('/var/www/backup/uploads', force: true);

$cutoff = time() - 30 * 86400;

$old = $source
    ->files(recursive: true)
    ->filter(
        static fn (FileObject $file) => $file->getMTime() < $cutoff
    )
    ->toArray();

foreach ($old as $path) {
    fs($path)->deleteIfExists();
}
```

## Topic Pages

- [File Object](./file-object): reading, writing, copying, moving, and
  deleting files and folders.
- [Iterating Files](./iterating-files): directory listings, filters, and
  Ant-style glob patterns.
- [Path Collection](./path-collection): listing several roots as one
  result without duplicates.
- [Path Utilities](./path-utilities): normalizing paths and making user
  input safe.
- [Temporary Files](./temp-files): self-cleaning temporary files and
  folders.
- [Async Operations](./async-operations): promise-based variants of the
  file methods.

## Common Pitfalls

**User input is not trusted.** Pass names or paths from users through
`Path::makeSafe()` or `Path::makeSafeAbsolute()` before use. See
[Path Utilities](./path-utilities).

## Related components

- [Stream](../stream/): the stream objects returned by the
  stream methods.
- [Promise](../promise/): the promises returned by the async
  methods.
- [Data](../data/): the parsed results of `readAndParse()`.
