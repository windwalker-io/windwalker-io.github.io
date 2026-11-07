---
layout: doc
title: Stream
component: stream
---

# Stream

`Stream` is the general-purpose stream. It wraps a PHP resource, which can be
a file opened by path, a resource you already have, or a memory buffer such
as `php://memory` and `php://temp`. Code that needs a PSR-7 body for a file
or a resource uses `Stream`, so one interface covers every file handle in
the application.

The class is a thin layer over `fopen()`. It adds the PSR-7 methods and
reports failures as exceptions instead of `false`.

## Setup

Pass a path and a mode. The mode constants come from the
`Windwalker\Stream` namespace, and they mirror the `fopen()` modes:

```php
use Windwalker\Stream\Stream;

use const Windwalker\Stream\WRITE_ONLY_RESET;

$stream = new Stream('/var/www/storage/log.txt', WRITE_ONLY_RESET);
```

Calling `new Stream()` with no argument opens `php://memory`, which gives
you a scratch buffer.

| Constant | `fopen()` mode | Effect |
| --- | --- | --- |
| `READ_ONLY_FROM_BEGIN` | `rb` | Read from the start. |
| `READ_WRITE_FROM_BEGIN` | `rb+` | Read and write from the start. |
| `WRITE_ONLY_RESET` | `wb` | Truncate the file, then write. |
| `READ_WRITE_RESET` | `wb+` | Truncate the file, then read and write. |
| `WRITE_ONLY_FROM_END` | `ab` | Append to the file. |

The remaining constants cover the `+` read-and-write variants, appending
with `READ_WRITE_FROM_END`, and the `CREATE` and `CREATE_ONLY` modes
(`cb` and `xb`). The full list is in the package's `bootstrap.php`.

## Showcase

The example writes a CSV report, reads it back, and copies the result
into an in-memory buffer:

```php
use Windwalker\Stream\Stream;
use Windwalker\Stream\StreamHelper;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;
use const Windwalker\Stream\WRITE_ONLY_RESET;

$report = new Stream(
    '/var/www/storage/exports/orders.csv',
    WRITE_ONLY_RESET
);

$report->write("id,total\n");
$report->write("1001,25.00\n");
$report->write("1002,40.50\n");
$report->close();

$source = new Stream(
    '/var/www/storage/exports/orders.csv',
    READ_ONLY_FROM_BEGIN
);

$buffer = new Stream();

StreamHelper::copy($source, $buffer);
$source->close();

$buffer->rewind();

echo $buffer->getContents();
```

`write()` returns the number of bytes written, and each `write()` call
starts where the previous one ended. `close()` releases the file, so the
second stream can open it.

## Creating Streams

Besides the constructor, three static methods create streams for common
inputs.

`Stream::fromString()` writes a string into a new memory stream:

```php
use Windwalker\Stream\Stream;

$stream = Stream::fromString('Hello');

$stream->rewind();

echo $stream->getContents();
```

`Stream::fromFilePath()` opens a file. Its default mode is
`READ_WRITE_RESET`, which empties the file:

```php
use Windwalker\Stream\Stream;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;

$stream = Stream::fromFilePath(
    '/var/www/storage/notes/todo.txt',
    READ_ONLY_FROM_BEGIN
);
```

**Pitfall:** Calling `fromFilePath()` without a mode truncates the file.
Pass `READ_ONLY_FROM_BEGIN` or another mode that keeps the content when you
only need to read.

`Stream::wrap()` is for functions that accept several input types. It
returns a `StreamInterface` unchanged, and it wraps a path or a resource
into a new `Stream`:

```php
use Windwalker\Stream\Stream;

function body(mixed $input): string
{
    $stream = Stream::wrap($input);

    $stream->rewind();

    return $stream->getContents();
}
```

**Pitfall:** `wrap()` does not create a missing file. A path that cannot
be opened produces a PHP warning. Later calls on that object throw
`RuntimeException`. Check that the file exists before you wrap it, or use a
create mode such as `WRITE_ONLY_CREATE_FROM_BEGIN`.

## Reading and Writing

`write()` appends to the current position and returns the byte count.
`read($length)` returns up to `$length` bytes. `getContents()` returns
everything from the current position to the end. `tell()`, `seek()`,
`rewind()`, and `eof()` manage the position.

```php
use Windwalker\Stream\Stream;

$stream = new Stream();

$stream->write('FOO BAR');
$stream->rewind();

echo $stream->read(3); // FOO
echo $stream->tell();  // 3
```

**Pitfall:** Casting a stream to a string, as in `(string) $stream`, rewinds
it, reads the whole content, and leaves the position at the end. A later
`getContents()` returns an empty string. Call `rewind()` after the cast if
you need to read again.

**Pitfall:** Writing to a stream opened with a read-only mode throws
`RuntimeException`. Use `isWritable()` and `isReadable()` to check the mode
before you rely on it.

## Closing and Detaching

`close()` closes the resource and clears the stream. After it, the object
holds no resource.

`detach()` removes the resource from the object and returns it, without
closing it. Use it when another part of your code takes over the handle:

```php
use Windwalker\Stream\Stream;

$stream = new Stream();

$resource = $stream->detach();

fwrite($resource, 'FOO BAR');

fclose($resource);
```

**Pitfall:** After `detach()`, the stream object is unusable, and the
caller is responsible for closing the returned resource.

## Copying with StreamHelper

`StreamHelper` contains static methods that copy data between streams.
Each method reads in chunks of 4096 bytes, so large files do not need to fit
in memory.

- `copy($src, $dest)` copies between two stream objects. It rewinds a
  seekable source first, so the whole content is copied.
- `copyTo($src, $dest)` copies into a destination. The destination can be
  a path or a resource. It opens the destination with `READ_WRITE_RESET`,
  then closes it.
- `copyFrom($src, $dest)` reads from a source that can be a path or a
  resource. It closes the source when done.
- `copyToString($stream, $maxLen)` returns a string. It reads from the
  current position, up to `$maxLen` bytes. The default `-1` reads to the
  end.

```php
use Windwalker\Stream\StreamHelper;
use Windwalker\Stream\StringStream;

$stream = new StringStream('FOO BAR');

$stream->seek(4);

echo StreamHelper::copyToString($stream); // BAR
```

**Pitfall:** `copyTo()` overwrites an existing file at the destination.
Write to a new path when you must keep the original.

```php
use Windwalker\Stream\StreamHelper;
use Windwalker\Stream\StringStream;

StreamHelper::copyTo(
    new StringStream('FOO BAR'),
    '/var/www/storage/exports/report.txt'
);
```

## NullStream

`NullStream` implements the same interface but keeps nothing. Reads return
an empty string, the size is `0`, and `write()` discards its input and
returns `0`. Use it as a sink when you need a stream object but do not need
the data, for example when measuring a copy or as the cache of a
`CachingStream` that you do not read back.

```php
use Windwalker\Stream\NullStream;
use Windwalker\Stream\StreamHelper;
use Windwalker\Stream\Stream;

$source = Stream::fromString('FOO BAR');

StreamHelper::copy($source, new NullStream());
```
