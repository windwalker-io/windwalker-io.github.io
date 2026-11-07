---
layout: doc
title: Output
component: http
---

# Output

A PHP application sends a response in two steps: it writes the status
line and the headers, and then it writes the body. `Output` performs both
steps for a PSR-7 response, so your code only has to create the response.
It is the last step of a web request and the entry point for custom
output, for example a streamed file.

## Minimal Setup

Create an `Output` and pass a response to `respond()`. With no argument,
the body is written to `php://output`:

```php
use Windwalker\Http\Output\Output;
use Windwalker\Http\Response\JsonResponse;

$output = new Output();

$output->respond(new JsonResponse(['status' => 'ok']));
```

## Showcase

This example sends a file as a download. It uses `StreamOutput` for the
body, so large files are not loaded into memory:

```php
use Windwalker\Http\Output\StreamOutput;
use Windwalker\Http\Response\AttachmentResponse;
use Windwalker\Stream\Stream;

$file = new Stream(fopen('/var/exports/report.csv', 'r'));

$response = new AttachmentResponse(
    $file,
    200,
    [
        'Content-Type' => 'text/csv',
        'Content-Disposition' => 'attachment; filename="report.csv"',
    ],
);

$output = new StreamOutput();
$output->setMaxBufferLength(8192);

$output->respond($response);
```

The body is read from the stream in chunks of 8192 bytes, so large files
are not loaded into memory at once.

## Output Types

`Output` writes the status line, the headers, and the body. It accepts a
stream or a path as the target. Use a stream other than `php://output`,
for example a memory buffer in a test:

```php
$output = new Output('php://memory');
```

`NoHeaderOutput` writes only the body. Use it in console commands or
tests where the headers should not be sent:

```php
use Windwalker\Http\Output\NoHeaderOutput;
use Windwalker\Http\Response\TextResponse;

$output = new NoHeaderOutput();
$output->respond(new TextResponse('done'));
```

`StreamOutput` writes the body in chunks. Set the chunk size with
`setMaxBufferLength()`. When the response has a `Content-Range` header,
`StreamOutput` writes only the requested range, which supports resumable
downloads. Use `setDelay()` to pause between chunks.

`CallbackResponse` lets the response write its own body through the
output object, as shown on the [Messages](./messages) page.

## Headers and Output Order

`respond()` sends the status line and headers only if they have not
been sent yet, and then sends the body. The check uses `headersSent()`.

**Pitfall:** Any output written before `respond()` sends the body
first, for example an `echo`, a PHP warning, or a blank line after a
closing `?>` in an included file. After that, the headers cannot be sent,
so the status and content type of the response are lost. Do not write to
`php://output` directly while you use `Output`.
