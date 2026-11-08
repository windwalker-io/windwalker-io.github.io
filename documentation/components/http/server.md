---
layout: doc
title: Server
component: http
---

# Server

A server accepts incoming HTTP requests, turns each one into a PSR-7
request, and lets your code produce the response through events. The
package has two adapters that share the same event model. `PhpServer`
handles the request of the current PHP process, which suits the CGI-style
SAPI of PHP-FPM or a single script. `ReactServer` runs a long-lived event
loop on `react/http`, so one process serves many requests. Code written
for one adapter works with the other, because the listeners and events are
the same. Middleware are the exception. They run only on servers built
with `HttpServerTrait`, such as `PhpServer`.

For a Swoole server, use the [Reactor](/documentation/components/reactor/index)
component. It builds on the same events and middleware described here.

## Minimal Setup

Create a `PhpServer`, listen for `RequestEvent`, and set a response on the
event:

```php
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Http\Response\TextResponse;
use Windwalker\Http\Server\PhpServer;

$server = new PhpServer();

$server->onRequest(function (RequestEvent $event) {
    $event->response = new TextResponse(
        'Hello: ' . $event->request->getUri()->getPath(),
    );
});

$server->listen();
```

`listen()` reads the request from the PHP globals, dispatches the events,
and sends the response.

## Showcase

This example routes two paths, adds a header to every response, and logs
failures:

```php
use Windwalker\Http\Event\ErrorEvent;
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Http\Event\ResponseEvent;
use Windwalker\Http\Response\JsonResponse;
use Windwalker\Http\Response\TextResponse;
use Windwalker\Http\Server\PhpServer;

$server = new PhpServer();

$server->onRequest(function (RequestEvent $event) {
    $path = $event->request->getUri()->getPath();

    $event->response = match ($path) {
        '/health' => new JsonResponse(['status' => 'ok']),
        default => new TextResponse('Not found', 404),
    };
});

$server->onResponse(function (ResponseEvent $event) {
    $event->response = $event->response
        ->withHeader('X-Served-By', 'windwalker');
});

$server->onError(function (ErrorEvent $event) {
    error_log($event->exception->getMessage());
});

$server->listen();
```

Each listener receives the event object and may change it. A response
set in `onRequest()` is kept for `onResponse()`, which can add headers or
log the response.

## Requests from ServerRequestFactory

`listen()` builds the request from the PHP globals with
`ServerRequestFactory::createFromGlobals()`. Pass a request yourself when
you need another source, such as a test or a command-line job. `handle()`
runs one request through the middleware and events, and `listen()` only
forwards its `request` option to it:

```php
use Windwalker\Http\Factory\ServerRequestFactory;
use Windwalker\Http\Output\Output;
use Windwalker\Http\Response\TextResponse;
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Http\Server\PhpServer;

$server = new PhpServer();

$server->onRequest(function (RequestEvent $event) {
    $name = $event->request->getQueryParams()['name'] ?? 'guest';

    $event->response = new TextResponse("Hello, $name");
});

$server->setOutputBuilder(
    fn() => new Output('php://memory'),
);

$request = ServerRequestFactory::createFromUri(
    'https://example.com/hello?name=sakura',
);

$server->handle($request);
```

`ServerRequestFactory` provides static helpers that build a server request
from a URI or the globals. `createFromUri()` accepts a URI string or
object, and fills the server parameters from it. It has no method
argument, so set the method with `withMethod()` when the request is not a
`GET`:

```php
$request = ServerRequestFactory::createFromUri(
    'https://example.com/login',
    parsedBody: ['username' => 'sakura'],
)->withMethod('POST');

$server->handle($request);
```

`createFromGlobals()` also accepts overrides. Pass `$_SERVER`-style
values, query parameters, parsed body, cookies, and files to change what
the request contains:

```php
$request = ServerRequestFactory::createFromGlobals(
    server: [
        'REQUEST_METHOD' => 'GET',
        'REQUEST_URI' => '/hello?name=sakura',
        'HTTP_HOST' => 'example.com',
    ],
);
```

The output builder controls where the response is written. The default
is a `StreamOutput` on `php://output`. In tests and CLI jobs, use an
`Output` on a memory stream, as shown above, to read the result instead
of sending it to the terminal.

::: tip
Set the output builder before calling `handle()`. A test that does not
replace it prints the response to the console.
:::

::: warning
`createFromGlobals()` reads `$_SERVER` when you pass no server values.
Passing an empty array falls back to the globals, so pass a value such as
`['REQUEST_METHOD' => 'GET']` when you need an explicit request.
:::

## Events

The server dispatches three events:

- `RequestEvent`: the request has been created and no response exists
  yet. Set `$event->response` to answer the request.
- `ResponseEvent`: the response is ready. It carries the same request
  and output, and can change the response before it is sent.
- `ErrorEvent`: a middleware or listener threw an exception. It holds
  the exception and a response with the status code of the exception, if
  it is a client error, otherwise 500.

Register a listener with `onRequest()`, `onResponse()`, or `onError()`.
Each method accepts a priority as its second argument. Listeners run in
priority order. Use `$event->attributes` to share data between the
listeners of one request:

```php
$server->onRequest(
    function (RequestEvent $event) {
        $event->attributes['startedAt'] = microtime(true);
    },
    100,
);
```

The `RequestEvent` also has an `endHandler`. It is a callable that
receives the output and the response after the response is sent. Use it
for work that must run after the body has been written, such as closing
a file:

```php
use Windwalker\Http\Output\OutputInterface;

$event->endHandler = function (OutputInterface $output) {
    // Runs after the response is sent.
};
```

::: warning
If no listener sets a response, the server sends an empty `200` response.
The request appears to succeed, so this bug is easy to miss. Check the
response in your tests.
:::

::: info
An `ErrorEvent` that is not stopped is rethrown after the listeners have
run. To send your own error response, respond with
`$event->output->respond()` and call `$event->stopPropagation()`.
:::

## Listening with ReactServer

`ReactServer` runs its own event loop and binds to a host and port. The
package requires `react/http` only for development, so install it in the
application that uses this adapter:

```bash
composer require react/http
```

The API is the same as `PhpServer`. Pass the host and port to `listen()`:

```php
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Http\Response\TextResponse;
use Windwalker\Http\Server\ReactServer;

$server = new ReactServer();

$server->onRequest(function (RequestEvent $event) {
    $event->response = new TextResponse('pong');
});

$server->listen('127.0.0.1', 8080);
```

`listen()` blocks until the loop stops. Call `stop()` from a listener,
or from another signal handler, to close the socket and leave the loop.
Calling `listen()` again while the server is listening throws a
`RuntimeException`.

::: warning
A listener that blocks, such as a slow database query or a `sleep()`,
stops every other request of the process. Move slow work out of the
listener, or use the event loop's asynchronous tools.
:::

::: warning
The process stays alive between requests. Do not store per-request data
in static properties or global variables, because the next request can
read it.
:::

## Custom Adapters

`PhpServer` and `ReactServer` are built from the `HttpServerTrait`. You
can use the same trait to build a server for another listening mechanism.
The class must use `EventAwareTrait`, implement `ServerInterface`, and
provide `getOutputBuilder()`:

```php
use Closure;
use Windwalker\Event\EventAwareTrait;
use Windwalker\Http\Output\StreamOutput;
use Windwalker\Http\Server\HttpServerTrait;
use Windwalker\Http\Server\ServerInterface;

class MyServer implements ServerInterface
{
    use EventAwareTrait;
    use HttpServerTrait;

    public function listen(
        string $host = '0.0.0.0',
        int $port = 0,
        array $options = [],
    ): void {
        // Accept a connection, build a request, then call:
        // $this->handleRequest($request, $this->createOutput());
    }

    public function stop(): void
    {
        //
    }

    public function getOutputBuilder(): ?Closure
    {
        return static fn() => new StreamOutput();
    }
}
```

`handleRequest()` runs the middleware, dispatches the events, sends the
response, and closes the output. The adapter only has to provide the
request and the output. Because the trait calls `adaptLegacyEvents()` in
its constructor, the class must use `EventAwareTrait`.

The `HttpServer` class of earlier versions is deprecated. Use `PhpServer`
or `ReactServer` directly, as shown on this page.
