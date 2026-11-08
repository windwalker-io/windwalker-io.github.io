---
layout: doc
title: Middleware
component: http
---

# Middleware

Some work applies to many requests before any listener runs: checking an
API key, serving static files, or adding security headers. Middleware
holds this work in one place. Each middleware receives the request and
the next handler. It can answer the request itself, change the request
before passing it on, or change the response that comes back. The chain
follows PSR-15, so middleware from other libraries work as well.

The server runs the middleware in the order they were added. The last
step of the chain dispatches `RequestEvent`, so listeners run only when
every middleware has passed the request on.

## Minimal Setup

Add a middleware with `middleware()`. The method returns the server, so
calls can be chained:

```php
use Windwalker\Http\Middleware\FaviconFixMiddleware;
use Windwalker\Http\Server\PhpServer;

$server = new PhpServer();

$server->middleware(
    new FaviconFixMiddleware('/var/www/public'),
);
```

## Showcase

This example serves public files first, then requires an API key for
everything else. Requests that pass both steps reach the listener:

```php
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Http\Middleware\FileProcessMiddleware;
use Windwalker\Http\Response\EmptyResponse;
use Windwalker\Http\Response\JsonResponse;
use Windwalker\Http\Server\PhpServer;

class ApiKeyMiddleware implements MiddlewareInterface
{
    public function __construct(
        protected string $key,
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ): ResponseInterface {
        $given = $request->getHeaderLine('X-Api-Key');

        if (!hash_equals($this->key, $given)) {
            return new EmptyResponse(401);
        }

        return $handler->handle(
            $request->withAttribute('authorized', true),
        );
    }
}

$server = new PhpServer();

$server->middleware(
    new FileProcessMiddleware('/var/www/public'),
);

$server->middleware(
    new ApiKeyMiddleware(getenv('API_KEY')),
);

$server->onRequest(function (RequestEvent $event) {
    $event->response = new JsonResponse(['ok' => true]);
});

$server->listen();
```

A middleware that returns a response without calling `$handler->handle()`
ends the chain. The listeners of that request never run.

## Writing Middleware

A middleware is an object that implements `MiddlewareInterface`, as shown
above. A callable works as well, and it receives the same two arguments:

```php
$server->middleware(
    function (
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ) {
        $response = $handler->handle($request);

        return $response->withHeader(
            'X-Frame-Options',
            'DENY',
        );
    },
);
```

Call `$handler->handle()` to pass the request on, and modify its result
if needed. Changing the request before the call and the response after
it are the two common patterns.

::: warning
Compare secrets with `hash_equals()`, not with `===`. A direct
comparison can reveal the key through the time it takes to fail.
:::

## Entries and the Resolver

`middleware()` accepts an object or a callable. A class name string is
also accepted, together with its constructor arguments. The class is
created with `Windwalker\DI\create()`, so it requires `windwalker/di`:

```php
$server->middleware(
    ApiKeyMiddleware::class,
    getenv('API_KEY'),
);
```

To resolve every entry through your own container, set a resolver. It
receives each entry in the queue and returns the middleware to run:

```php
$server->setMiddlewareResolver(
    fn(mixed $entry) => is_string($entry)
        ? $container->get($entry)
        : $entry,
);
```

The resolver receives objects and callables too, not only strings. Return
them unchanged, as the example does, or the chain fails.

## Built-in Middleware

Traditional web servers such as Apache or Nginx serve static files and
`favicon.ico` before PHP runs. With PHP-FPM, the PHP process only sees
the requests that the web server passes on. An event loop server that
receives every request in PHP has no such layer. The Swoole server of
Reactor is one of them, and it runs the middleware chain of this package
because it uses the same `HttpServerTrait`. The two built-in middleware
fill the gap, so the server behaves like a simple web server during
development or in a small deployment:

```php
use Windwalker\Http\Middleware\FaviconFixMiddleware;
use Windwalker\Http\Middleware\FileProcessMiddleware;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();

$server->middleware(
    new FaviconFixMiddleware(__DIR__ . '/public'),
);

$server->middleware(
    new FileProcessMiddleware(__DIR__ . '/public'),
);
```

The order matters. Both middleware answer their requests, and anything
else passes to the listeners. Add them before your own middleware, so
public files are served without the checks of the application.

For production, keep letting a web server or a CDN serve static files,
because it is faster and handles caching better than PHP does.

`FaviconFixMiddleware` answers requests for `/favicon.ico`. If the file
exists in the public path, it is sent with the image content type.
Browsers request this path automatically, so without a reply they log a
missing icon. Otherwise the request gets an empty `200` response:

```php
$server->middleware(
    new FaviconFixMiddleware('/var/www/public'),
);
```

`FileProcessMiddleware` serves any existing file under the public path.
It sets `Content-Type` from the file extension and a `Last-Modified`
header. Requests for paths that are not files go to the next handler. The
headers listed in the `headers` option are added to every file response:

```php
use Windwalker\Http\Middleware\FileProcessMiddleware;

$server->middleware(
    new FileProcessMiddleware(
        '/var/www/public',
        options: [
            'headers' => [
                'Cache-Control' => 'public, max-age=3600',
            ],
        ],
    ),
);
```

Each header value can be a callable. It receives the file as an
`SplFileInfo` and returns the value.

A path that contains a `..` segment after decoding, such as
`/%2e%2e/secret.txt`, also goes to the next handler and is never read.

`FileProcessMiddleware` needs the `symfony/mime` package to detect the
content type. Install it in your application. The constructor throws a
`DomainException` when the package is missing.

::: warning
`FileProcessMiddleware` serves every file in the public path, including
hidden files such as `.env`. Keep application files and secrets outside
that directory. Do not symlink application directories into the public
path, because the middleware follows the links.
:::
