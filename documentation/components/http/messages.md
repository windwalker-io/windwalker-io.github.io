---
layout: doc
title: Messages
component: http
---

# Messages

HTTP messages are the shared model of this package. A request describes
what a client wants, and a response describes what a server returns.
Both are PSR-7 objects, so a library that accepts a PSR-7 request can
receive a `Windwalker\Http\Request\Request`, and a PSR-7 response from
another library can be passed to `Output`. Your code can build and
inspect messages without knowing which transport or server is used.

## Minimal Setup

Create messages with `HttpFactory`, which implements the PSR-17 factory
interfaces. It needs no configuration:

```php
use Windwalker\Http\HttpFactory;

$factory = new HttpFactory();

$request = $factory->createRequest(
    'POST',
    'https://api.example.com/items',
);
```

## Showcase

This example builds a request, sends it through a client, and reads a
response:

```php
use Windwalker\Http\HttpClient;
use Windwalker\Http\HttpFactory;

$factory = new HttpFactory();
$client = new HttpClient();

$request = $factory->createRequest(
    'POST',
    'https://api.example.com/items',
)
    ->withHeader('Content-Type', 'application/json')
    ->withBody(
        $factory->createStream('{"name":"sakura"}'),
    );

$response = $client->sendRequest($request);

$status = $response->getStatusCode();
$item = $response->toArray();
```

## Immutable Messages

Every `with*()` method returns a new instance. The original message is
unchanged, so a chain must be assigned or passed on:

```php
$request->withHeader('X-Trace', 'abc');

// The header is set only on the returned object.
$traced = $request->withHeader('X-Trace', 'abc');
```

::: warning
Calling `withHeader()` and discarding the result has no
effect. This is the most common mistake with PSR-7 objects.
:::

## Requests

`Request` is the outgoing message. Read it with `getMethod()`,
`getUri()`, `getRequestTarget()`, and `getHeaders()`. The header methods
are case-insensitive, as required by PSR-7:

```php
use Windwalker\Http\Request\Request;

$request = new Request()
    ->withMethod('GET')
    ->withRequestTarget('https://example.com/search?q=sakura');

$query = $request->getUri()->getQuery();
```

## Responses

Responses are created with classes that set a body type and content
type for you. Use them in controllers, middleware, and tests. Each class
takes a body, a status code, and headers:

```php
use Windwalker\Http\Response\EmptyResponse;
use Windwalker\Http\Response\HtmlResponse;
use Windwalker\Http\Response\JsonResponse;
use Windwalker\Http\Response\RedirectResponse;
use Windwalker\Http\Response\TextResponse;

$json = new JsonResponse(['id' => 1], 201);

$text = new TextResponse('pong');

$html = new HtmlResponse('<h1>Hello</h1>');

$redirect = new RedirectResponse('/login', 303);

$empty = new EmptyResponse(204);
```

`JsonResponse` encodes the given data. `HtmlResponse` and
`TextResponse` use their own content types. `XmlResponse` works the same
way with XML content.

For a file that the browser should download, use `AttachmentResponse`.
It sets default headers for binary downloads, and you can add your own:

```php
use Windwalker\Http\Response\AttachmentResponse;

$response = new AttachmentResponse(
    $csv,
    200,
    [
        'Content-Type' => 'text/csv',
        'Content-Disposition' => 'attachment; filename="report.csv"',
    ],
);
```

When the body is large or is produced while it is sent, use
`CallbackResponse`. Its callback receives the `OutputInterface`:

```php
use Windwalker\Http\Output\OutputInterface;
use Windwalker\Http\Response\CallbackResponse;

$response = new CallbackResponse(
    function (OutputInterface $output) {
        $output->write("id,name\n");
        $output->write("1,sakura\n");
    },
);
```

The response that `HttpClient` returns is an `HttpClientResponse`. It
extends `Response` and adds `getInfo()`, which holds the cURL or stream
information of the request.

## Server Requests

`ServerRequestFactory` builds the incoming request from PHP globals.
Read the query, body, uploaded files, and attributes from it:

```php
use Windwalker\Http\Factory\ServerRequestFactory;

$request = ServerRequestFactory::createFromGlobals();

$page = (int) ($request->getQueryParams()['page'] ?? 1);

$files = $request->getUploadedFiles();

$request = $request->withAttribute('userId', 42);
$userId = $request->getAttribute('userId');
```

Attributes are the usual way to pass data from middleware to a handler.

### Client IP

The IP address of the client should come from `IpHelper::getTrustedIp()`.
It reads `X-Forwarded-For` only when the direct peer is a trusted proxy:

```php
use Windwalker\Http\Helper\IpHelper;

$ip = IpHelper::getTrustedIp(
    ['10.0.0.0/8', '127.0.0.1'],
    $_SERVER,
);
```

::: warning
Do not read `X-Forwarded-For` or other forwarding headers
directly. Any client can send them, so they can be used to forge the
address that your application logs, rate-limits, or checks against an
allow list. The deprecated `HttpHelper::getIp()` does not take a list of
trusted proxies, and it should not be used in new code.
:::
