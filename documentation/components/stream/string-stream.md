---
layout: doc
title: String Stream
component: stream
---

# String Stream

`StringStream` is a stream that holds a string in memory. Unlike `Stream`,
it has no PHP resource behind it. The bytes live in a PHP string, so there
is no file handle to open, close, or leak.

Use it when the content already exists as a string, such as a rendered
template, an API response, or a test fixture, and you need the stream
methods to read or patch it. It is also useful when a PSR-7 body must be
built from a string without touching `php://memory`.

## Setup

Pass the string to the constructor. The optional mode only sets what
`isWritable()` reports:

```php
use Windwalker\Stream\StringStream;

$stream = new StringStream('FOO BAR');
```

The default mode is `rb+`. Pass `rb` for a stream that should report
itself as read-only:

```php
use Windwalker\Stream\StringStream;

$stream = new StringStream('FOO BAR', 'rb');

var_dump($stream->isWritable()); // bool(false)
```

A `StringStream` is readable and seekable by default. Use the fluent
setters `seekable()` and `writable()` to change those flags, and check them
with `isSeekable()` and `isWritable()`.

## Showcase

The example builds a fixed-width record from a template string, patches
the fields in place, and reads the result back:

```php
use Windwalker\Stream\StringStream;

$record = new StringStream(
    str_repeat(' ', 20)
);

$record->write('Alice');

$record->seek(10);
$record->write('2026-11-07');

$record->rewind();

echo $record->getContents();
```

Each `write()` starts at the current position, so the position decides where
the bytes land. Both writes overwrite existing bytes, so the length stays 20.

## Writing Overwrites

`write()` replaces bytes at the current position. It does not insert them,
and the position moves to the end of the written data:

```php
use Windwalker\Stream\StringStream;

$stream = new StringStream('FOO BAR');

$stream->seek(4);
$stream->write('XY');

echo $stream->getResource(); // FOO XYR
```

When the write goes past the end of the string, the string grows:

```php
use Windwalker\Stream\StringStream;

$stream = new StringStream('FOO BAR');

$stream->seek(6);
$stream->write('XYZ');

echo $stream->getResource(); // FOO BAXYZ
```

## Seeking

`seek()` supports `SEEK_SET`, `SEEK_CUR`, and `SEEK_END`. The end position
is the string length plus the offset, so a negative offset counts back from
the end:

```php
use Windwalker\Stream\StringStream;

$stream = new StringStream('FOO BAR');

$stream->seek(-3, SEEK_END);

echo $stream->read(10); // BAR
```

Seeking before the start of the string throws `RuntimeException`.

**Pitfall:** `seekable(false)` blocks `seek()` and `rewind()`. Both throw
`RuntimeException`, and `getContents()` still reads from the current
position. Use it only when a consumer must not rewind the content.

## Constructing from Objects

The constructor accepts any object that implements `__toString()`. The
object is converted to a string once, when the stream is created. Changes
to the object afterwards are not reflected in the stream:

```php
use Windwalker\Stream\StringStream;

$template = new class () {
    public function __toString(): string
    {
        return 'Hello';
    }
};

$stream = new StringStream($template);

echo $stream->getResource(); // Hello
```

Arrays and resources are rejected with `InvalidArgumentException`. Use
`Stream` for resources.

## Getting the Content

`getResource()` returns the underlying string, and `getSize()` returns its
byte length. `(string) $stream` returns the whole string. It rewinds the
stream first, so the position is `0` afterwards:

```php
use Windwalker\Stream\StringStream;

$stream = new StringStream('FOO BAR');

$stream->seek(4);

echo (string) $stream; // FOO BAR
echo $stream->tell();  // 0
```
