---
layout: doc
description: How to send CORS headers for an API route or group by attaching CorsMiddleware instead of setting the headers in the controller.
---

# CORS

Browsers block a page from calling an API on another origin unless the
API sends CORS headers. `CorsMiddleware` sends those headers for a route
or group, so the controller does not set them itself.

For how middlewares are written and registered, see
[Middleware](../http-routing/middleware.md).

## Adding CORS to a route

Attach `CorsMiddleware` to a route or group with `middleware()`:

```php
use Windwalker\Core\Middleware\CorsMiddleware;
use function Windwalker\DI\create;

$router->group('api')
    ->middleware(
        CorsMiddleware::class,
        allowOrigins: [
            'https://app.example.com',
            'https://admin.example.com',
        ],
    )
    ->register(function () use ($router) {
        $router->get('post_list', '/posts');
    });
```

See [Middleware](../http-routing/middleware.md) for the full route syntax.

## Allowed origins from the environment

`allowOrigins` accepts a comma-separated string or an array. When it is
not passed, `CorsMiddleware` reads the `CORS_ALLOW_ORIGINS` variable. Pass
the value yourself when you want a fallback for a missing variable:

```php
middleware(
    CorsMiddleware::class,
    allowOrigins: env('CORS_ALLOW_ORIGINS')
        ?: 'https://app.example.com',
);
```

```dotenv
CORS_ALLOW_ORIGINS=https://app.example.com,https://admin.example.com
```

The `Access-Control-Allow-Origin` header depends on the list:

```php
// Request without an Origin header: the response sends "*"
middleware(CorsMiddleware::class)

// A single ORIGIN entry: echoes whatever Origin the request sends
middleware(CorsMiddleware::class, allowOrigins: 'ORIGIN')

// A list: echoes the request's Origin only when it is listed
// Origin https://app.example.com: echoed
// Origin https://evil.example.net: not echoed
middleware(
    CorsMiddleware::class,
    allowOrigins: 'https://app.example.com,https://admin.example.com',
)
```

::: warning
`ORIGIN` echoes any origin. Use it only for APIs that do not depend on
the origin being checked, and combine it with authentication.
:::

## Choosing the origin per request

Use the `configure` option when the allowed origin depends on the request.
It runs after the static list is applied. It receives the `CorsHandler`,
and the container injects `ServerRequestInterface` into it:

```php
use Psr\Http\Message\ServerRequestInterface;
use Windwalker\Core\Http\CorsHandler;

middleware(
    CorsMiddleware::class,
    // NOTE: You must wrap the closure in a factory function
    configure: fn() => function (
        CorsHandler $cors,
        ServerRequestInterface $request,
    ): CorsHandler {
        $cors->allowOrigin('https://app.example.com');

        return $cors;
    },
);
```

Browsers reject `*` when a request sends credentials, so do not use `*`
for the value. Always echo one origin you have checked.

### Mobile apps and per-host origins

A service that serves many domains, such as one API for each tenant,
cannot list them all in advance. Build the origin from the `Host` the
request was sent to:

```php
// NOTE: You must wrap the closure in a factory function
configure: fn() => function (
    CorsHandler $cors,
    ServerRequestInterface $request,
): CorsHandler {
    $scheme = $request->getUri()->getScheme();
    $host = $request->getHeaderLine('Host');

    $cors->allowOrigin($scheme . '://' . $host);

    return $cors;
},
```

::: tip
Limit the scheme and host to your own domains before echoing them.
Otherwise any request that sets its own `Host` header gets an allowed
origin.
:::

### Accepted hosts stored in the database

Some apps keep a list of accepted hosts per account. The middleware
checks the request `Host` against that list and echoes it only when it
matches:

```php
configure: fn() => function (
    CorsHandler $cors,
    ServerRequestInterface $request,
    AcceptHostRepository $hosts,
): CorsHandler {
    $host = $request->getHeaderLine('Host');

    // Your own lookup: returns the accepted origin, or null
    $origin = $hosts->findOriginByHost($host);

    if ($origin !== null) {
        $cors->allowOrigin($origin);
    }

    return $cors;
},
```

`AcceptHostRepository` is an example of an application service; replace it
with your own lookup. Without a match, no `Access-Control-Allow-Origin`
header is sent, so the browser blocks the request.

## Other CORS options

```php
create(
    CorsMiddleware::class,
    // false turns CORS handling off
    enabled: true,
    // true: send the headers before the controller runs.
    // false (default): add the headers to the response; if the
    // controller throws, the headers are sent immediately and the
    // exception is rethrown.
    sendInstantly: false,
    // A closure, a LoggerInterface, or a logger tag name
    logger: null,
)
```

::: tip
`CorsMiddleware` answers `OPTIONS` preflight requests with an empty
response and does not call the controller. Attach it to every route that
browsers call from another origin.
:::
