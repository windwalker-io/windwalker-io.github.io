---
layout: doc
title: Introduction
part: Components
chapter: Stream
menu: components/stream
component: stream
---

# Introduction

Windwalker Stream provides PSR-7 stream objects for reading and writing
bytes. A stream can be a file, a string, a gzip archive, or the body of an
HTTP message. This package gives all of them one interface, so code that
accepts a `StreamInterface` works the same way whatever the bytes come from.

The package has these main parts:

- `Stream`: wraps a PHP resource, such as a file, `php://memory`, or
  `php://temp`. It is the default choice for files.
- `StringStream`: holds a string in memory, with no resource behind it.
- `GzStream`: reads and writes gzip-compressed files, and presents the
  uncompressed bytes.
- `CachingStream`: remembers what it reads from a one-way or slow source,
  so that it can seek and rewind over that data.
- `DecoratorStream`: the base class that forwards every call to an inner
  stream. Extend it to add behavior.
- `StreamHelper` and `NullStream`: helpers that copy data between streams,
  and a sink that discards everything written to it.

Every class implements `Psr\Http\Message\StreamInterface`. Each stream keeps
a position: reads and writes start at the current position and move it
forward. Keep the position in mind when you read a stream more than once.

## Installation

```bash
composer require windwalker/stream ^4.0
```

The package requires PHP 8.4.6 or later. It depends on `psr/http-message`
and `windwalker/utilities`.

## Use as Standalone Component

The Composer autoloader loads the package. Import the mode constants you
use from the `Windwalker\Stream` namespace.

```php
use Windwalker\Stream\Stream;

use const Windwalker\Stream\READ_ONLY_FROM_BEGIN;

$stream = new Stream(
    '/var/www/storage/notes/todo.txt',
    READ_ONLY_FROM_BEGIN
);

echo $stream->getContents();
```

Choose the class by where the bytes come from:

| Source | Class |
| --- | --- |
| A file path or PHP resource | `Stream` |
| A string you already have | `StringStream`, or `Stream::fromString()` |
| A gzip-compressed file | `GzStream` |
| A one-way or slow source you read more than once | `CachingStream` |

## Use in Windwalker

The Stream package registers no services in the DI container. Its classes
are plain objects that you create where they are needed. To get a stream
inside an application, receive the PSR-7 message that the application
already provides, and read its body:

```php
use Psr\Http\Message\ServerRequestInterface;

class ImportHandler
{
    public function __construct(
        protected ServerRequestInterface $request
    ) {
    }

    public function import(): string
    {
        $body = $this->request->getBody();

        $body->rewind();

        return $body->getContents();
    }
}
```

Keep file paths and other settings in configuration, and pass them to the
stream constructors in the services that use them.

## Core Concepts

**Streams are positional.** `read()`, `write()`, and `getContents()` work
from the current position. They do not restart from the beginning of the
content. Call `rewind()` or `seek()` before reading again.

::: warning
`Stream::fromString()` writes the string and leaves the
position at the end. A call to `getContents()` right after it returns an
empty string:
:::

```php
use Windwalker\Stream\Stream;

$stream = Stream::fromString('FOO BAR');

$stream->rewind();

echo $stream->getContents(); // FOO BAR
```

**Errors throw exceptions.** Failed operations on an open stream throw a
`RuntimeException`, rather than returning `false`. Each topic page lists
the cases that behave differently.

## Topic Pages

- [Stream](./stream): file and resource streams, the mode constants,
  copying data with `StreamHelper`, and `NullStream`.
- [String Stream](./string-stream): in-memory strings that you can
  overwrite, seek, and mark as read-only.
- [Gz Stream](./gz-stream): reading and writing gzip-compressed files.
- [Caching Stream](./caching-stream): caching a one-way source, and
  extending streams with `DecoratorStream`.

## Related components

- [HTTP](../http/): the PSR-7 messages whose bodies are streams.
- [Filesystem](../filesystem/): `readStream()` and `writeStream()` return
  and accept these stream objects.
