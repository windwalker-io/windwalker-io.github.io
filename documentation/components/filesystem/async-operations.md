---
layout: doc
title: Async Operations
component: filesystem
---

# Async Operations

Some workflows read or write several files and do not need the result of
each call immediately. The `*Async()` methods return a `Promise` that
resolves with the value of the matching synchronous method. You can chain
the promise with `then()` and `catch()`, or wait for it with `wait()`.

## Calling an Async Method

`FileObject` handles any call whose name ends in `Async` and whose base
name is in its allowed list. The allowed methods are `mkdir`, `copyTo`,
`moveTo`, `read`, `readStream`, `write`, `writeStream`, `delete`,
`deleteIfExists`, `files`, `folders`, `items`, and `getStream`. Any other
name with the `Async` suffix throws a `BadMethodCallException`, for example
`getPathnameAsync()`.

```php
use function Windwalker\fs;

$file = fs('/var/www/storage/notes/todo.txt');

$content = $file->readAsync()->wait();

echo (string) $content;
```

The `Filesystem` facade has the same methods as static calls, such as
`Filesystem::writeAsync()`.

## A Showcase: Reading Several Files

The following example reads a list of configuration files and merges the
results. Each call returns a promise, and the code waits for each result
at the end:

```php
use Windwalker\Filesystem\FileObject;

use function Windwalker\fs;

/** @var FileObject[] $files */
$files = [
    fs('/var/www/etc/routes.txt'),
    fs('/var/www/etc/menus.txt'),
    fs('/var/www/etc/labels.txt'),
];

$reads = array_map(
    static fn (FileObject $file) => $file->readAsync(),
    $files
);

$contents = array_map(
    static fn ($promise) => (string) $promise->wait(),
    $reads
);
```

For a single follow-up action, chain the promise instead of waiting:

```php
use Psr\Log\LoggerInterface;
use Windwalker\Filesystem\Filesystem;

function writeLog(LoggerInterface $logger): void
{
    Filesystem::writeAsync('/var/www/storage/log.txt', "started\n")
        ->then(
            static fn () => $logger->info('Log written.')
        )
        ->catch(
            static fn (Throwable $e) => $logger->error($e->getMessage())
        );
}
```

`LoggerInterface` is a PSR-3 interface, and any PSR-3 logger can be
passed in.

## Errors

When the synchronous method throws, the promise is rejected with that
exception. `catch()` receives the original exception, so you can handle the
failure where the operation was started:

```php
use Windwalker\Filesystem\Exception\FilesystemException;

use function Windwalker\fs;

fs('/var/www/storage/missing.txt')
    ->deleteAsync()
    ->catch(
        function (FilesystemException $e) {
            // Handle the failure here.
        }
    );
```

`wait()` throws `Windwalker\Promise\Exception\UncaughtException` instead.
The original exception is available through `getPrevious()`:

```php
use Windwalker\Promise\Exception\UncaughtException;

use function Windwalker\fs;

try {
    fs('/var/www/storage/missing.txt')->deleteAsync()->wait();
} catch (UncaughtException $e) {
    $original = $e->getPrevious(); // FilesystemException
}
```

Always handle the rejection, so that a failed write is not ignored.


## Chaining Operations

`then()` runs a callback after the promise resolves, and the callback can
return another promise. This lets you build a short sequence of dependent
operations without nested callbacks. The following example prepares a
folder, writes a file into it, and then reads the file back:

```php
use Windwalker\Filesystem\Filesystem;

Filesystem::mkdirAsync('/var/www/storage/exports')
    ->then(
        static fn () => Filesystem::writeAsync(
            '/var/www/storage/exports/today.csv',
            "id,total\n1,42\n"
        )
    )
    ->then(
        static fn () => Filesystem::readAsync(
            '/var/www/storage/exports/today.csv'
        )
    )
    ->then(
        static fn ($content) => print((string) $content)
    )
    ->wait();
```

Call `wait()` once at the end of the chain. Each step runs only after the
previous one succeeds; a failure skips the remaining `then()` callbacks and
reaches `catch()`.

## Static and Instance Forms

The `Filesystem` facade forwards each `*Async()` call to the matching
`FileObject` method, so both forms accept the same arguments:

```php
use Windwalker\Filesystem\Filesystem;

use function Windwalker\fs;

// Static form: forwards to FileObject::copyToAsync().
Filesystem::copyAsync('/var/www/a.txt', '/var/www/b.txt')->wait();

// Instance form: FileObject has no copyAsync() or moveAsync().
fs('/var/www/b.txt')
    ->moveToAsync('/var/www/archive/b.txt')
    ->wait();
```

`filesAsync()`, `foldersAsync()`, and `itemsAsync()` resolve with a
`FilesIterator`, so the listing methods from [Iterating Files](./iterating-files)
work on the result of `wait()`.

`createTempAsync()` is in the same forwarding map, but it is not a useful
entry point. The facade treats its first argument as a path, so calling it
without arguments fails with a `TypeError`:

```php
// TypeError: no path was given.
Filesystem::createTempAsync();

// Use the synchronous method for temporary files.
$tmp = Filesystem::createTemp();
```

## Ordering

Each async call starts when it is made, and two calls can finish in either
order. The following two writes to the same path have no defined result:

```php
Filesystem::writeAsync('/var/www/state.json', $first);
Filesystem::writeAsync('/var/www/state.json', $second);
```

Chain the writes with `then()` when the order matters:

```php
Filesystem::writeAsync('/var/www/state.json', $first)
    ->then(
        fn () => Filesystem::writeAsync(
            '/var/www/state.json',
            $second,
        )
    )
    ->wait();
```

Promises do not make a file operation faster. They let your code continue
while the operation runs.
