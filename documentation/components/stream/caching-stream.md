---
layout: doc
title: Caching Stream
component: stream
---

# Caching Stream

`CachingStream` wraps a source that you can read only once, or that is slow
to read again, such as a network body, `php://input`, or a file on a remote
mount. It keeps every byte it reads in a second stream, the cache. Later
reads, seeks, and rewinds use the cache first, and only read the source for
data that has not been read yet.

A typical case is a request body that you inspect before you process it.
Reading the first bytes to detect the format would normally consume them. A
`CachingStream` lets you check the prefix, rewind, and then read the whole
body without asking the client to send it again.

## Setup

Pass the source as the first argument. The source can be a stream object, a
path, or a resource. The optional second argument is the cache. If you omit
it, the cache is a `php://temp` stream:

```php
use Windwalker\Stream\CachingStream;
use Windwalker\Stream\Stream;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;

$source = new Stream('php://input', READ_ONLY_FROM_BEGIN);

$body = new CachingStream($source);
```

## Showcase

The example reads the first five bytes to detect an XML body, rewinds, and
then reads the complete body:

```php
use Windwalker\Stream\CachingStream;
use Windwalker\Stream\Stream;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;

$source = new Stream('php://input', READ_ONLY_FROM_BEGIN);

$body = new CachingStream($source);

$prefix = $body->read(5);

if ($prefix === '<?xml') {
    // Choose the XML parser.
}

$body->rewind();

$content = $body->getContents();
```

The first `read(5)` pulls five bytes from `php://input` and copies them
into the cache. `rewind()` moves to the start of the cache, and
`getContents()` reads the cached bytes first, then continues on the source.
The source is read only once.

## How Reads and Seeks Work

Reading past the cache pulls more bytes from the source and writes them to
the cache, so the cache always holds everything read so far. Seeking inside
the cached range does not touch the source.

`seek()` supports `SEEK_SET`, `SEEK_CUR`, and `SEEK_END`. With
`SEEK_END`, the stream needs the source size. If the source does not know
its size, `CachingStream` reads the whole source into the cache first.

`getSize()` returns the larger of the cache size and the source size, so
it reports the full length once the source knows it.

**Tip:** The cache keeps everything you have read until the
`CachingStream` is released. For a large source, pass a cache that stays
on disk. A `php://temp` cache keeps data in memory up to a PHP limit and then
moves it to a temporary file, but the cache still holds every byte:

```php
use Windwalker\Stream\CachingStream;
use Windwalker\Stream\Stream;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;
use const Windwalker\Stream\READ_WRITE_RESET;

$cache = new Stream(
    '/var/www/storage/tmp/upload-cache.bin',
    READ_WRITE_RESET
);

$body = new CachingStream(
    new Stream('php://input', READ_ONLY_FROM_BEGIN),
    $cache
);
```

## Writing

Writes go to the cache only, at the current position. They overwrite the
cached bytes at that position, and they never change the source. Reads
after the write show the new data:

```php
use Windwalker\Stream\CachingStream;
use Windwalker\Stream\StringStream;

$stream = new CachingStream(new StringStream('FOO BAR'));

$stream->write('XY');

$stream->rewind();

echo $stream->getContents(); // XYO BAR
```

## End of Stream

`eof()` returns true only when both the cache and the source are at the
end. Reading the cached data does not make `eof()` true while the source
still has bytes.

## Closing

`close()` closes the source and the cache together.

::: warning
Closing a `CachingStream` also closes the source you passed in.
Do not close the source yourself, and do not keep using it after the
`CachingStream` is closed.
:::

::: warning
`getSize()` on a `CachingStream` also calls the source's
`getSize()`. Wrapping a `GzStream` therefore makes it throw, because
`GzStream` does not support that method. See [Gz Stream](./gz-stream).
:::

## DecoratorStream

`CachingStream` extends `DecoratorStream`. A decorator implements
`StreamInterface` and forwards every call to an inner stream, which it
stores in `$stream`. You get the inner stream back with
`getInnerStream()`, and you can replace it with `setInnerStream()`.

Extend `DecoratorStream` when you want to change one behavior and keep the
rest. Override only the methods you need. The base class calls through
`$this`, so an override affects the other methods. For example,
`getContents()` reads through `read()`:

```php
use Windwalker\Stream\DecoratorStream;
use Windwalker\Stream\StringStream;

class UppercaseStream extends DecoratorStream
{
    public function read($length): string
    {
        return strtoupper(parent::read($length));
    }
}

$stream = new UppercaseStream(new StringStream('foo bar'));

echo $stream->getContents(); // FOO BAR
```

::: info
The constructor argument is optional. Without it, the decorator wraps an
empty stream, so pass the inner stream when you need to read or write your
data.
:::
