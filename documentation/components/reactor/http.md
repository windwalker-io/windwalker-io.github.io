---
layout: doc
title: HTTP
component: reactor
---

# HTTP

An HTTP server turns each Swoole request into a PSR-7 request, runs it
through the middleware chain, and then dispatches a `RequestEvent`. A
listener on that event creates the response. The HTTP flow is the same
as in other Windwalker HTTP components, so middleware and listeners
work the same way.

## Request Flow

For every request, the server:

1. Creates the PSR-7 request. The request carries a `swoole` attribute
   with the native request, response, connection ID (`fd`), and server.
2. Runs the middleware chain. The last step dispatches `RequestEvent`.
3. Sends `RequestEvent::$response` and dispatches `ResponseEvent`.
4. Dispatches `ErrorEvent` if an exception is thrown.

If no listener sets a response, the server sends an empty `200` response.
That default hides mistakes, so check the response in tests.

## Handling Requests

`RequestEvent` is the main extension point. Its `request` is a PSR-7
request, and its `response` is the response to send:

```php
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();

$server->onRequest(function (RequestEvent $event) use ($server) {
    $path = $event->request->getUri()->getPath();
    $factory = $server->getHttpFactory();

    $event->response = $factory
        ->createResponse(200)
        ->withBody(
            $factory->createStream("Path: $path")
        );
});
```

The request is immutable. To pass data to other listeners, store it in
`$event->attributes`. Add a response listener with `onResponse()` to
change or log the response after it is built.

## Middleware

Middleware are PSR-15 objects with a `process()` method. Each one receives
the request and the next handler. It can change the request, return a
response itself, or pass control on by calling the handler:

```php
$server->middleware(MyAuthMiddleware::class);
```

A string is created through the container, and any extra arguments are
passed to its constructor. Middleware run in the order they are added.
A middleware that returns a response without calling the handler stops
the chain, so the request listener does not run.

## Errors

When a listener throws, the server dispatches `ErrorEvent`. If no
listener stops propagation, the exception is rethrown and reaches
Swoole's error handling. If a listener stops propagation, the exception
is swallowed and the server sends nothing. Your listener must then write
the response through `$event->output`.

## Output

Responses are written by an output object. The default is
`SwooleOutput`, which writes the status line, headers, and body to the
native Swoole response. Replace it with `setOutputBuilder()` only if you
need to change how responses are written.
