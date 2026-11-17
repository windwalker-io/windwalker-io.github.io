---
layout: doc
---

# Middlewares and CORS

Middlewares wrap an API method before and after it runs. The JSON envelope,
the CORS headers, and the access checks are all middlewares, so an endpoint
gets them by declaration rather than by code in each method.

For how middlewares are written and registered, see
[Middleware](../http-routing/middleware.md).

## Middlewares for APIs

These middlewares are the ones most APIs use:

- `#[JsonApi]`: wraps the result in the `JsonBuffer` envelope. See
  [JSON API Response](./json-api.md).
- `#[Json]`: encodes the result as plain JSON, with no envelope.
- `CorsMiddleware`: sends the CORS headers. See the section below.
- `ForceSslMiddleware`: redirects plain HTTP requests to HTTPS.
- `MaintenanceMiddleware`: returns a maintenance response while the site is
  offline.

`#[JsonApi]` and `#[Json]` are attributes on the controller method. The
others are route middlewares, added with `middleware()`.

## Adding CORS to a route

Attach `CorsMiddleware` to a route or group with `middleware()`. Pass
arguments with `create()`:

```php
use Windwalker\Core\Middleware\CorsMiddleware;
use function Windwalker\DI\create;

$router->group('api')
    ->middleware(
        fn() => create(
            CorsMiddleware::class,
            allowOrigins: [
                'https://app.example.com',
                'https://admin.example.com',
            ],
        )
    )
    ->register(function () use ($router) {
        $router->get('post_list', '/posts');
    });
```

See [Middleware](../http-routing/middleware.md) for the full route syntax.

## Allowed origins

`allowOrigins` accepts a comma-separated string or an array. When it is not
set, `CorsMiddleware` reads the `CORS_ALLOW_ORIGINS` environment variable.

The `Access-Control-Allow-Origin` header depends on the configuration:

```php
// Request without an Origin header: the response sends "*"
create(CorsMiddleware::class)

// A single ORIGIN entry: echoes whatever Origin the request sends
create(CorsMiddleware::class, allowOrigins: 'ORIGIN')

// A list: echoes the request's Origin only when it is listed
// Origin https://app.example.com: echoed
// Origin https://evil.example.net: not echoed
create(
    CorsMiddleware::class,
    allowOrigins: 'https://app.example.com,https://admin.example.com',
)
```

::: warning
Use `ORIGIN` only for APIs that do not depend on the origin being checked.
Any site can then call the endpoint, so combine it with authentication.
:::

## Other CORS options

`CorsMiddleware` also accepts these options:

```php
create(
    CorsMiddleware::class,
    // false turns CORS handling off
    enabled: true,
    // Send the headers before the controller runs. If the controller
    // throws, the headers are already sent and the exception is rethrown.
    sendInstantly: true,
    // Receives messages from the CORS handler
    logger: $logger,
)
```

::: tip
Preflight `OPTIONS` requests get an empty response from `CorsMiddleware`.
Put it on the routes that browsers call from another origin, so preflight
requests succeed without a controller method.
:::
