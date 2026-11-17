---
layout: doc
title: HTTP Basics
---

# HTTP Basics

## Overview

The HTTP layer turns a PHP request into objects your code can read, and
turns the result of your code into a response. It has four main parts:

- PSR-7 messages: the request and response objects.
- PSR-15 middlewares: the chain that wraps request handling.
- `SystemUri`: a normalized view of the URL the app is served from.
- Routes and navigation: match a URL to a handler, and build URLs back.

The [Request Lifecycle](/documentation/framework/core-concepts/applications/request-lifecycle)
shows the order in which these parts run. This page introduces the objects
and how they behave. The [Routing](/documentation/framework/core-concepts/http-routing/routing),
[Navigation](/documentation/framework/core-concepts/http-routing/navigation),
[Request & Input](/documentation/framework/core-concepts/http-routing/request-and-input),
and [Responses](/documentation/framework/core-concepts/http-routing/responses) pages cover
each part in detail.

## PSR-7 Messages

Windwalker follows the PSR-7 interfaces. The request is a
`Psr\Http\Message\ServerRequestInterface`, and the response is a
`Psr\Http\Message\ResponseInterface`. The web request container binds the
server request, so code that runs during a request can read it.

Read input with the standard PSR-7 methods:

```php
<?php

use Psr\Http\Message\ServerRequestInterface;

function searchTerm(ServerRequestInterface $request): string
{
    $params = $request->getQueryParams();

    return trim((string) ($params['q'] ?? ''));
}
```

The classes in `windwalker/http` implement these interfaces. A plain
PSR-7 response looks like this:

```php
<?php

use Windwalker\Http\Response\JsonResponse;

$response = new JsonResponse(['status' => 'ok'], 200);
```

The [Responses](/documentation/framework/core-concepts/http-routing/responses) page
lists every response class and the `response()` builder. The
[Request & Input](/documentation/framework/core-concepts/http-routing/request-and-input)
page covers reading input in detail.

::: warning
PSR-7 messages are immutable. The `with*()` methods, such as `withHeader()`,
return a new object and leave the original unchanged. If you ignore the
return value, the change is silently lost.

```php
// Wrong: the new response is discarded.
$response->withHeader('X-Robots-Tag', 'noindex');

// Right: keep the object that withHeader() returns.
$response = $response->withHeader('X-Robots-Tag', 'noindex');
```
:::

## AppRequest

Your code rarely reads the PSR-7 request directly. Windwalker wraps it in
`AppRequest` (`Windwalker\Core\Http\AppRequest`), which adds the route
variables, the merged input, and the matched route. Most code uses the
readers on `AppContext`:

```php
<?php

$q = $app->input('q');
$route = $app->getMatchedRoute()?->getName();
```

The [Request & Input](/documentation/framework/core-concepts/http-routing/request-and-input)
page explains the two layers, the input cache, and the value-read events in
its [The AppRequest Object](/documentation/framework/core-concepts/http-routing/request-and-input#the-apprequest-object)
section.

## Middlewares (PSR-15)

A middleware implements `Psr\Http\Server\MiddlewareInterface`. Its
`process()` method receives the request and a handler. The middleware can
return a response itself, or call `$handler->handle($request)` to pass the
request to the rest of the chain. Then it receives the response and can
change it.

The following middleware adds a version header to every response it wraps:

```php
<?php

// src/Middleware/ApiVersionMiddleware.php
namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ApiVersionMiddleware implements MiddlewareInterface
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $response = $handler->handle($request);

        return $response->withHeader('X-Api-Version', '2');
    }
}
```

Attach it to one route. It runs after the route is matched:

```php
<?php

// routes/front.route.php
use App\Middleware\ApiVersionMiddleware;
use App\Module\Front\Post\PostController;

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id}')
    ->handler(PostController::class)
    ->middleware(ApiVersionMiddleware::class);
```

A request to `/post/42` now returns the `X-Api-Version: 2` header.

Global middlewares are listed in the `middlewares` key of a configuration
file, such as `etc/app/main.config.php`. This list runs for every request:

```php
<?php

// etc/app/main.config.php

use Windwalker\Core\Middleware\RoutingMiddleware;

return [
    'middlewares' => [
        RoutingMiddleware::class,
    ],
];
```

The [Middleware](/documentation/framework/core-concepts/http-routing/middleware) page
covers the order of execution, route groups, and middleware attributes.

## SystemUri

`SystemUri` (`Windwalker\Core\Router\SystemUri`) is a URI object built from
the request and the script name. It records where the app is mounted, so
routing does not depend on the folder the app lives in. Get it from the
request context:

```php
<?php

$uri = $app->getSystemUri();
```

For the request `https://example.com/shop/index.php/front/post/42`, the
main properties return:

```php
// Request: https://example.com/shop/index.php/front/post/42
echo $uri->root;  // https://example.com/shop/
echo $uri->route; // front/post/42/
```

The commonly used properties are:

- `full`: the full request URL, including the query string.
- `current`: the request URL without the query string.
- `root`: the base URL of the app, with a trailing slash.
- `route`: the path after the base URL and the script name.
- `routeWithQuery`: `route` followed by the query string.

`RoutingMiddleware` matches routes against `route`, so the same routes work
when the app moves to another folder.

::: tip
Build asset and page links from `root`, not from the request path. The
links then keep working when the app is mounted in a different folder.

```php
$cssUrl = $uri->root . 'assets/app.css';
```
:::

`route` always ends with a slash, even when the request URL does not.
The script name, such as `index.php`, is removed from it.

## Routes and Navigation

A route has a name, an HTTP method, a path pattern, and a handler. The
handler is usually a controller:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id}')
    ->handler(PostController::class);
```

`RoutingMiddleware` matches the request's `route` against these patterns.
The [Routing](/documentation/framework/core-concepts/http-routing/routing) page covers
route files, groups, and matching rules, and the
[Controllers](/documentation/framework/core-concepts/http-routing/controllers) page covers
the handler methods.

`Navigator` works in the other direction. It builds a URL from a route name
and sends redirects:

```php
<?php

use Windwalker\Core\Router\Navigator;

$nav = $app->retrieve(Navigator::class);

$url = $nav->to('front::post_show')->id(42); // /post/42

return $nav->redirect('/post/42');
```

The [Navigation](/documentation/framework/core-concepts/http-routing/navigation) page
explains the redirect rules, including which URLs `redirect()` accepts.
