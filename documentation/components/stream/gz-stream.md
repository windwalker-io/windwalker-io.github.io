---
layout: doc
title: Gz Stream
component: stream
---

# Gz Stream

`GzStream` reads and writes gzip-compressed files through the same stream
interface as `Stream`. The file stays compressed on disk, and your code sees
the uncompressed bytes.

This matters for log archives, exports, and backups. Without it, you would
decompress the file to a temporary path, read that copy, and delete it
afterwards. With `GzStream`, the decompression happens inside the stream as
you read, so no extra copy is written.

## Setup

Create a `GzStream` with a path and a mode. The modes are the same constants
used by `Stream`:

```php
use Windwalker\Stream\GzStream;

use const Windwalker\Stream\WRITE_ONLY_RESET;

$stream = new GzStream(
    '/var/www/storage/logs/app.log.gz',
    WRITE_ONLY_RESET
);
```

`GzStream::fromFilePath()` is a static shortcut that accepts the same
arguments.

## Showcase

The example writes a rotated log, then reads the first lines back:

```php
use Windwalker\Stream\GzStream;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;
use const Windwalker\Stream\WRITE_ONLY_RESET;

$path = '/var/www/storage/logs/app-2026-11-07.log.gz';

$writer = new GzStream($path, WRITE_ONLY_RESET);

$writer->write("GET /home 200\n");
$writer->write("POST /login 302\n");
$writer->close();

$reader = new GzStream($path, READ_ONLY_FROM_BEGIN);

$header = $reader->read(13);

$reader->close();

echo $header; // GET /home 200
```

`write()` returns the number of uncompressed bytes it accepted. Call
`close()` when you finish writing. It writes the gzip footer and releases
the file.

## Reading and Seeking

`read()`, `getContents()`, `eof()`, and `tell()` behave as they do for
`Stream`. `tell()` reports the position in the uncompressed data, not in
the compressed file.

`seek()` and `rewind()` are supported. Seeking forward reads and discards
data up to the target. Seeking backward is slower, because the zlib library
must decompress from the start of the file again. If your code needs the
same region repeatedly, read it once into a `Stream` or a `StringStream`.

```php
use Windwalker\Stream\GzStream;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;

$reader = new GzStream(
    '/var/www/storage/logs/app-2026-11-07.log.gz',
    READ_ONLY_FROM_BEGIN
);

$reader->seek(10);

echo $reader->read(3); // 200

$reader->rewind();

echo $reader->getContents();
```

## Size

`GzStream` cannot report its size. `getSize()` throws `LogicException`.

**Pitfall:** Any code that calls `getSize()` on the stream fails. This
includes a `CachingStream` that wraps a `GzStream`, and code that sets a
`Content-Length` header from the stream size. Read the content with
`getContents()` instead, then use `strlen()` on the result.

## Writing and Closing

Opening a file with `WRITE_ONLY_RESET` replaces its content. Pass a read
mode when you only need to read.

**Pitfall:** Call `close()` as soon as you finish writing. It writes the gzip
footer and releases the file. Do not rely on the object being destroyed to
do that work.
