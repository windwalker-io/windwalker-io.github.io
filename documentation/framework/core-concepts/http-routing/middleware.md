---
layout: doc
title: Middleware
---

# Middleware

## Overview

A middleware wraps the request handling. It receives the request, can
change it or stop it, calls the rest of the chain, and can change the
response on the way back. Windwalker uses PSR-15 middlewares, so any class
that implements `Psr\Http\Server\MiddlewareInterface` works.

:::info
The standalone package has its own detailed guide: [Middleware](../../../components/http/middleware.md). This page focuses on using it inside the Windwalker framework.
:::

Many routes share the same checks and setup, such as login, CSRF
validation, an organization scope, or JSON output. A middleware keeps these
rules in one place. A group carries the middleware to every route inside it,
so an area of the app is protected by one line.

Windwalker runs middlewares from two places:

- Global: the `middlewares` list of a configuration file. It runs for every
  request and starts with `RoutingMiddleware`. The list is set in
  `etc/app/main.config.php`:

  ```php
  <?php

  return [
      'middlewares' => [
          RoutingMiddleware::class,
      ],
  ];
  ```

  See [Configuration](/documentation/framework/getting-started/configuration)
  for the other keys.
- Route: the `middleware()` method of a route or a group. It runs after
  `RoutingMiddleware` has matched the route.

## Using Middleware

### Writing a Middleware

A middleware passes the request on by calling `$handler->handle($request)`.
The following middleware rejects a request that has no API key header:

```php
<?php

declare(strict_types=1);

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Windwalker\Http\Exception\HttpRequestException;

class ApiKeyMiddleware implements MiddlewareInterface
{
    public function __construct(
        protected string $header = 'X-Api-Key'
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        if (!$request->hasHeader($this->header)) {
            throw new HttpRequestException('Missing API key', 401);
        }

        return $handler->handle($request);
    }
}
```

When a middleware returns a response without calling `handle()`, the chain
stops and the controller never runs. Throwing an exception has the same
effect, and the app renders the error.

### Attaching to a Route

Attach a middleware to one route with `middleware()`. The middleware runs
after the route is matched, and before the route's controller:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id}')
    ->handler(PostController::class, 'show')
    ->middleware(ApiKeyMiddleware::class);
```

### Attaching to a Group

Attach it to a group to cover every route inside the group:

```php
<?php

/** @var RouteCreator $router */

$router->group('api')
    ->prefix('/api')
    ->middleware(ApiKeyMiddleware::class)
    ->register(function (RouteCreator $router) {
        $router->get('post_list', '/posts')
            ->handler(PostController::class, 'list');
    });
```

### Passing Arguments

Extra arguments to `middleware()` go to the constructor by name. A `create()`
call in the `middlewares` list in a configuration file does the same. See
[Global Middleware](#global-middleware).

The following `ApiKeyMiddleware` reads a custom header:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id}')
    ->handler(PostController::class, 'show')
    ->middleware(
        ApiKeyMiddleware::class, 
        header: env('API_KEY_HEADER', 'X-Partner-Key')
    );
```

### Closures and Factories

A closure also works as a middleware. Windwalker calls it through the
container, so its parameters are injected by type. The outer function is a
factory. Windwalker calls it once when it builds the chain, and it must
return the per-request function. The following closure returns the
middleware itself:

```php
<?php

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** @var RouteCreator $router */

$router->get('ping', '/ping')
    ->middleware(
        // Use a factory function to wrap middleware function
        // The outer function is called once when the chain is built.
        fn () => function (
            ServerRequestInterface $request,
            RequestHandlerInterface $handler,
        ) {
            return $handler->handle($request);
        }
    );
```

Use the factory layer to build a configured middleware from the container.
Return a function that calls it for each request:

```php
<?php

use App\Middleware\ApiKeyMiddleware;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Windwalker\DI\Container;

/** @var RouteCreator $router */

$router->group('partner')
    ->prefix('/partner')
    ->middleware(
        function (Container $container) {
            return $container->newInstance(
                ApiKeyMiddleware::class,
                ['header' => env('API_KEY_HEADER', 'X-Partner-Key')],
            );
        }
    )
    ->register(function (RouteCreator $router) {
        // ...
    });
```

::: warning
A single-layer closure, such as `function (ServerRequestInterface $request,
RequestHandlerInterface $handler) {}`, is called when the chain is built.
Its request parameter cannot be injected at that point, and the request
fails. Always use the factory layer.
:::

### Attaching Several Middlewares

Use `middlewares()` to attach several middlewares in one call. They run in
the order listed.

### Global Middleware

Global middlewares run for every request. Add them to the `middlewares`
list in `etc/app/main.config.php`. The list runs in the order written, so
the position of an entry decides what it can see. The following example adds
an app middleware after `RoutingMiddleware`:

```php
<?php

// etc/app/main.config.php

use App\Middleware\RequestIdMiddleware;
use Windwalker\Core\Middleware\RoutingMiddleware;
use function Windwalker\DI\create;

return array_merge(
    require __DIR__ . '/windwalker.config.php',
    [
        'middlewares' => [
            RoutingMiddleware::class,
            fn() => create(
                RequestIdMiddleware::class,
                header: 'X-Request-Id',
            ),
        ],
    ],
    require __DIR__ . '/../config.php'
);
```

Use `fn() => create()` when the middleware needs arguments. It takes the class name
and the arguments as named arguments, the same as a route's `middleware()`
call. Use the class name alone when no arguments are needed.

A global middleware placed before `RoutingMiddleware` runs before the route
is matched. It sees every request, including those that match no route, but
it cannot read the route variables. A middleware placed after
`RoutingMiddleware` runs once the route is matched. It can use
`getUrlVars()`, and it runs before the route's own middlewares.

::: tip
Use a global middleware only for a rule that applies to every request, such
as a request ID or a maintenance check. Use a group for an area of the app.
:::

::: warning
Keep `RoutingMiddleware` in the list. Without it, no route is matched, and
the route middlewares and controllers never run.
:::

## Showcase: An Organization Scope

The following example scopes a set of pages to one organization. The URL
starts with `/org/{org_id}`. `OrganizationMiddleware` runs for every page
in the scope, and the member pages also require a login. The application
service `OrganizationService` is your own code. It checks whether an
organization exists.

The outer group loads the organization check:

```php
<?php

// routes/front/org.php

use App\Module\Front\Org\OrganizationMiddleware;
use App\Module\Front\Org\OrgHomeController;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('org')
    ->prefix('/org/{org_id:\d+}')
    ->middleware(OrganizationMiddleware::class)
    ->register(function (RouteCreator $router) {
        $router->get('org_home', '/')
            ->handler(OrgHomeController::class);

        $router->load(__DIR__ . '/org/*.php');
    });
```

The organization middleware reads the route variable with `getUrlVars()`:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Org;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Windwalker\Core\Http\AppRequest;
use Windwalker\Http\Exception\HttpRequestException;

class OrganizationMiddleware implements MiddlewareInterface
{
    public function __construct(
        protected AppRequest $appRequest,
        protected OrganizationService $organizations,
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $orgId = (int) $this->appRequest->getUrlVars()['org_id'];

        if (!$this->organizations->exists($orgId)) {
            throw new HttpRequestException('Organization not found', 404);
        }

        return $handler->handle($request);
    }
}
```

The inner group adds a login check. Its file is loaded from the outer
group, so every member route runs both middlewares:

```php
<?php

// routes/front/org/member.php

use App\Module\Front\Org\Member\MemberController;
use Lyrasoft\Luna\Middleware\LoginRequireMiddleware;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('member')
    ->prefix('/member')
    ->middleware(LoginRequireMiddleware::class)
    ->register(function (RouteCreator $router) {
        $router->get('member_show', '/{mid:\d+}')
            ->handler(MemberController::class, 'show');
    });
```

A `GET /org/7/member/42` request with a logged-in user then runs:

```text
RoutingMiddleware         matches member_show
OrganizationMiddleware    org 7 exists
LoginRequireMiddleware    user is logged in
MemberController::show    returns the member
```

::: tip
Check the scope once in the outer group. Each inner group adds only its
own rule, so the controllers stay free of scope checks.
:::

## Nested Groups

### Order of Execution

A route collects the middlewares of every group above it. The outermost
group comes first, the innermost group next, and the route's own
middlewares last. The chain for `member_show` above is:

```text
OrganizationMiddleware
LoginRequireMiddleware
(route middlewares, if any)
```

### Layers of Protection

Each level adds its own rule, so a group can be a layer of protection:

- The outer group decides which scope the request belongs to.
- An inner group adds a requirement for its area, such as a login.
- A route adds a rule that applies to that route only.

Groups can also add a `CsrfMiddleware` for every form in an area:

```php
<?php

use Windwalker\Core\Middleware\CsrfMiddleware;

/** @var RouteCreator $router */

$router->group('admin')
    ->prefix('/admin')
    ->middleware(CsrfMiddleware::class)
    ->register(function (RouteCreator $router) {
        // Every POST route in this group checks the CSRF token.
    });
```

The [Routing](/documentation/framework/core-concepts/http-routing/routing) page shows
the full admin route file.

::: warning
A route defined outside a group does not inherit the group's middlewares.
Keep every route that needs a check inside the group. A route placed
outside the group is not checked.
:::

## Keeping Scope Values in Links

### Using KeepUrlQueryMiddleware

Inside a scoped group, every URL needs the scope value, such as `org_id`.
`KeepUrlQueryMiddleware` adds it to each URL that `Navigator` builds for a
route in the same group. You do not pass the value by hand. Its `key` and
`uid` are named arguments of the constructor:

```php
<?php

use Unicorn\Middleware\KeepUrlQueryMiddleware;

/** @var RouteCreator $router */

$router->group('org')
    ->prefix('/org/{org_id:\d+}')
    ->middleware(OrganizationMiddleware::class)
    ->middleware(
        KeepUrlQueryMiddleware::class,
        key: 'org_id',
        uid: 'org',
    )
    ->register(function (RouteCreator $router) {
        // Routes in this group build links with org_id.
    });
```

### Separating Scopes with a uid

The middleware matches other routes by its class, `key`, and `uid`. Use a
`uid` to separate scopes that use the same key. The same method keeps a
`type` value across the pages of one admin area:

```php
<?php

/** @var RouteCreator $router */

$router->group('category')
    ->middleware(
        KeepUrlQueryMiddleware::class,
        key: 'type',
        uid: 'admin_category_type',
    )
    ->register(function (RouteCreator $router) {
        // ...
    });
```

::: warning
Give every scope a unique `uid`. Two scopes that use the same `key` and
an empty `uid` match each other, so their links share one value.
:::

## Middleware Attributes

### Built-in Attributes

Some middlewares can be placed directly on a controller method as an
attribute. The attribute applies only to that method. A group or route
middleware still runs for the method.

- `#[JsonApi]`: returns the return value in a JSON envelope with the
  status code, and renders exceptions as JSON errors.
- `#[Json]`: returns the return value as a `JsonResponse`, without the
  envelope.
- `#[Csrf]`: runs `CsrfMiddleware` before the method.
- `#[Method('POST', ...)]`: allows only the listed HTTP methods.

```php
<?php

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\Csrf;
use Windwalker\Core\Attributes\Json;
use Windwalker\Core\Attributes\JsonApi;
use Windwalker\Core\Attributes\Method;

#[Controller]
class PostController
{
    #[JsonApi]
    public function list(): array
    {
        return ['posts' => []];
    }

    #[Json]
    public function show(int $id): array
    {
        return ['id' => $id];
    }

    #[Csrf]
    public function store(): void
    {
        // ...
    }
}
```

::: info
`#[Method]` returns `400` for a method that is not listed. It does not
return `405`.
:::

::: warning
`#[Csrf]` checks only the `POST`, `PUT`, `PATCH`, and `DELETE` methods.
A `GET` request is not checked, so never change data in a `GET` method.
:::

### Writing a Custom Attribute

A custom attribute has two parts. The middleware holds the logic, and the
attribute attaches it to a method. Extend `AbstractMiddlewareAttribute` for
the attribute, and implement `AttributeMiddlewareInterface` for the
middleware. The following example allows a method only when a feature flag
is on.

#### The Middleware

Use `AttributeMiddlewareTrait` to get `process()`. You implement `run()`,
which receives the request and a `$next` closure:

```php
<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Service\FeatureService;
use Closure;
use Psr\Http\Message\ServerRequestInterface;
use Windwalker\Core\Middleware\AttributeMiddlewareInterface;
use Windwalker\Core\Middleware\AttributeMiddlewareTrait;
use Windwalker\Http\Exception\HttpRequestException;

class FeatureMiddleware implements AttributeMiddlewareInterface
{
    use AttributeMiddlewareTrait;

    public function __construct(
        protected FeatureService $features,
        protected string $name,
    ) {
    }

    public function run(
        ServerRequestInterface $request,
        Closure $next
    ): mixed {
        if (!$this->features->enabled($this->name)) {
            throw new HttpRequestException('Feature disabled', 404);
        }

        return $next($request);
    }
}
```

The middleware is resolved by the container, so its constructor
dependencies are injected. `FeatureService` is your own application
service.

#### The Attribute

The attribute carries the arguments from the method, and
`createMiddleware()` builds the middleware with them. The `__invoke()`
method that wraps the controller method is inherited from
`AbstractMiddlewareAttribute`:

```php
<?php

declare(strict_types=1);

namespace App\Attributes;

use App\Middleware\FeatureMiddleware;
use Attribute;
use Windwalker\Core\Middleware\AbstractMiddlewareAttribute;
use Windwalker\Core\Middleware\AttributeMiddlewareInterface;
use Windwalker\DI\Container;

#[Attribute(Attribute::TARGET_METHOD)]
class Feature extends AbstractMiddlewareAttribute
{
    public function __construct(protected string $name)
    {
    }

    public function createMiddleware(
        Container $container
    ): AttributeMiddlewareInterface {
        return $container->newInstance(
            FeatureMiddleware::class,
            ['name' => $this->name],
        );
    }
}
```

#### Using the Attribute

Place the attribute on the controller method, like a built-in one:

```php
<?php

use App\Attributes\Feature;

class ShopController
{
    #[Feature('shop')]
    public function index(): array
    {
        return ['products' => []];
    }
}
```

A request to `index()` runs the feature check before the method. When
the feature is off, the request returns `404`.

::: tip
Keep the rule in the middleware and the attribute as a thin wrapper.
The middleware can then be tested and reused by routes and groups.
:::

::: warning
An attribute protects only the method it is on. A new method without the
attribute is not checked. For a security rule, add the rule to a group
middleware, so that every route inside the group is covered.
:::


