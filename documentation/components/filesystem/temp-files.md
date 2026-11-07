---
layout: doc
title: Temporary Files
component: filesystem
---

# Temporary Files

Import jobs, PDF renderers, and archive tools often need a scratch file
that exists only for part of a request. Creating it with `tempnam()` and
removing it by hand is easy to forget when an exception is thrown.
`Filesystem::createTemp()` returns a `TempFileObject` that removes its file
when the object is destroyed, when the script shuts down, or both.

## Creating a Temporary File

`createTemp()` creates a unique file in the system temporary folder, or
in the folder you give. The file name starts with `Windwalker-Temp-` unless
you pass a prefix:

```php
use Windwalker\Filesystem\Filesystem;

$tmp = Filesystem::createTemp();

$tmp->write('scratch data');

$path = $tmp->getPathname();
```

Folders are covered in [Temporary Folders](#temporary-folders) below.

## Cleanup Flags

The `$flags` argument controls when the file is removed. The default is
`Filesystem::DELETE_WHEN_DESTRUCT`, which removes the file when the
`TempFileObject` is destroyed:

```php
use Windwalker\Filesystem\Filesystem;

// Removed when $tmp is destroyed.
$tmp = Filesystem::createTemp();
```

`Filesystem::DELETE_WHEN_SHUTDOWN` removes the file when the PHP script ends,
through a shutdown function. The object stays alive until then:

```php
// Removed at the end of the script, even if $tmp goes out of scope.
$tmp = Filesystem::createTemp(
    flags: Filesystem::DELETE_WHEN_SHUTDOWN,
);
```

Set the behavior on an existing object with `deleteWhenDestruct()` and
`deleteWhenShutdown()`. Note that `deleteWhenDestruct()` takes an argument
and defaults to `false`, so calling it without one turns the behavior off:

```php
$tmp = Filesystem::createTemp();

$tmp->deleteWhenDestruct(false); // Keep the file when $tmp is destroyed.

$tmp->deleteWhenShutdown(); // Remove it at the end of the script instead.
```


## A Showcase: Importing an Uploaded Report

The following example stores a generated CSV in a temporary file, passes
its path to an importer, and relies on the object to clean up:

```php
use Windwalker\Filesystem\Filesystem;

function importReport(string $csv, Importer $importer): void
{
    $tmp = Filesystem::createTemp(prefix: 'report-');

    $tmp->write($csv);

    $importer->run($tmp->getPathname());
}
```

The function does not need a `finally` block. When the function returns,
or throws, `$tmp` is destroyed and the file is removed. Do not add
`DELETE_WHEN_SHUTDOWN` here. Its shutdown callback keeps a reference to the
object, so the file would survive the function until the script ends.

## Choosing a Location

`createTemp()` creates the target folder when it does not exist, so you can
point it at an application-specific folder. Use a dedicated folder for
sensitive data, since the system temporary folder can be read by other local
users:

```php
use Windwalker\Filesystem\Filesystem;

$tmp = Filesystem::createTemp(
    dir: '/var/www/storage/tmp',
    prefix: 'invoice-',
);
```

Pass `null` for `$dir` to use `sys_get_temp_dir()`:

```php
$tmp = Filesystem::createTemp(dir: null);
```

The prefix only helps identify files in logs and cleanup scripts. It does
not affect where the file is stored or who can read it. Make sure a custom
folder is writable only by your application.

## Temporary Folders

Some tools need a folder rather than a file, such as an unpacker, a
renderer that writes several outputs, or a git checkout. `createTempFolder()`
creates a uniquely named folder and returns a `TempFileObject` for it. Its
default prefix is `Windwalker-Temp-Folder-`, followed by a unique ID:

```php
use Windwalker\Filesystem\Filesystem;

$work = Filesystem::createTempFolder(prefix: 'unpack-');

echo $work->getPathname(); // /tmp/unpack-6650f2c1a3b7e
```

When the object is destroyed, the whole folder is removed, including its
contents. The removal walks the folder recursively, so nested files do not
need separate cleanup. The following function writes files into the folder
and returns the result. The folder is removed when the function returns or
throws:

```php
use Windwalker\Filesystem\Filesystem;

use function Windwalker\fs;

function unpackArchive(
    string $binary,
    string $json,
    Unpacker $unpacker,
): Result {
    $work = Filesystem::createTempFolder(prefix: 'unpack-');

    // write() creates the images/ folder when it does not exist.
    fs($work->getPathname() . '/images/logo.png')->write($binary);

    fs($work->getPathname() . '/manifest.json')->write($json);

    return $unpacker->run($work->getPathname());
}
```

Keep `$work` in scope for as long as the folder is used. Returning the path
to another part of the code does not keep the object alive, so the folder
may be removed before that code reads it.


## A Showcase: Converting a Document with an External Tool

The following example shows a complete flow. The input is written to a
temporary file, an external converter reads it and writes a second temporary
file, and the output is returned as a string. Both files are cleaned up when
the function returns, even if the converter fails:

```php
use Windwalker\Filesystem\Filesystem;

function convertToPdf(string $html): string
{
    $input = Filesystem::createTemp(prefix: 'in-');
    $output = Filesystem::createTemp(prefix: 'out-');

    $input->write($html);

    $command = sprintf(
        'wkhtmltopdf %s %s',
        escapeshellarg($input->getPathname()),
        escapeshellarg($output->getPathname()),
    );

    exec($command, $lines, $code);

    if ($code !== 0) {
        throw new RuntimeException('PDF conversion failed.');
    }

    return (string) $output->read();
}
```

Both `TempFileObject`s are local variables. When the function ends, both are
destroyed and their files are deleted. The paths are escaped with
`escapeshellarg()` because they are passed to a shell command. The
`wkhtmltopdf` tool is an example; replace it with the tool you use.

## Controlling the Lifetime

Three mechanisms control when a temporary path is removed. Each one is shown
below with the code that selects it.

### Destruct

The default. The file is removed when the last reference to the
`TempFileObject` goes away:

```php
function render(): string
{
    $tmp = Filesystem::createTemp();
    $tmp->write('draft');

    return (string) $tmp->read();
} // The file is removed here.
```

### Shutdown

`DELETE_WHEN_SHUTDOWN` registers a shutdown function. It runs at the end of
the script, including after `exit()`, so it covers workers and long-running
CLI commands:

```php
function startWorker(): void
{
    $tmp = Filesystem::createTemp(
        flags: Filesystem::DELETE_WHEN_SHUTDOWN,
    );

    // $tmp is still alive here, and the file survives this function.
}
```

The callback holds a reference to the object, so the file is removed at
shutdown, not when the variable goes out of scope.

### Manual

Call `deleteIfExists()` when you know the file is no longer needed, for
example after a large intermediate file has been consumed:

```php
$tmp = Filesystem::createTemp(prefix: 'chunk-');

$tmp->write($chunk);

$process($tmp->getPathname());

$tmp->deleteIfExists();
```

### Keeping the File

To keep a file after the object is gone, turn off the destruct flag before
releasing it:

```php
$report = Filesystem::createTemp(prefix: 'report-');

$report->write($csv);

$report->deleteWhenDestruct(false);

// The file is kept. Move it to its final location.
$report->moveTo('/var/www/storage/reports/2026.csv');
```

### Keep the Object Alive

`getPathname()` returns a plain string. It does not keep the
`TempFileObject` alive, so the file can be removed while code still uses the
path:

```php
$path = Filesystem::createTemp()->getPathname();

// The temporary object was destroyed above. The file is already gone.
```

Store the object in a variable for as long as the path is used.

