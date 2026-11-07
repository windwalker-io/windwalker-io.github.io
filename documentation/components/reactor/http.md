---
layout: doc
title: HTTP
component: reactor
---

# HTTP

HTTP servers convert each Swoole request into a PSR-7 `ServerRequestInterface`, run it through the middleware chain,
and dispatch a `RequestEvent`. The listener that handles the event sets the response.

## Request Flow

For each request, the server:

1. Creates the PSR-7 request. The request has a `swoole` attribute that holds `fd`, `request`, `response`, `server`,
   and `swooleServer`.
2. Runs the middleware chain. The last step emits `RequestEvent`.
3. Sends the response from `RequestEvent::$response`, then emits `ResponseEvent`.
4. Emits `ErrorEvent` if an exception occurs. If the event is not stopped, the exception is rethrown.

`RequestEvent` exposes these main properties:

| Property     | Description                                                                 |
|--------------|-----------------------------------------------------------------------------|
| `request`    | The PSR-7 request.                                                          |
| `output`     | The output object that sends the response. `SwooleOutput` by default.       |
| `response`   | The response to send. Set it in a listener.                                 |
| `endHandler` | An optional closure called after the response is sent.                      |
| `attributes` | Custom values shared with later events.                                     |

## Handling Requests

Attach a listener with `onRequest()`. The `RequestEvent` parameter is `Windwalker\Http\Event\RequestEvent`:

```php
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();

$server->onRequest(function (RequestEvent $event) use ($server) {
    $path = $event->request->getUri()->getPath();

    $event->response = $server->getHttpFactory()
        ->createResponse(200)
        ->withHeader('Content-Type', 'text/plain')
        ->withBody($server->getHttpFactory()->createStream("You requested: $path"));
});
```

Use `onResponse()` to change or log the response, and `onError()` to handle exceptions. Call `$event->stopPropagation()`
in an error listener to prevent the rethrow.

## Middleware

Middleware are PSR-15 objects that implement `process(ServerRequestInterface $request, RequestHandlerInterface $handler)`.
Add them with `middleware()`. A string is created through the DI container with the extra arguments you pass.

```php
$server->middleware(MyAuthMiddleware::class);
```

Middleware run in the order they are added. Each one can change the request, short-circuit with a response, or pass
the request to the next handler.

## Output

The default output object, `SwooleOutput`, writes the status line, headers, and body to the Swoole response. To change
how responses are written, set a closure with `setOutputBuilder()`. The closure receives the native Swoole response.
