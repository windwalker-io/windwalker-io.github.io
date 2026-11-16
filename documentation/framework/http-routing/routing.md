---
layout: doc
title: Routing
---

# Routing

## Overview

Routing connects a request path to a handler. Windwalker defines every
route in plain PHP files, so the URL structure of your app is visible in
one place. The same definitions also build URLs from route names, so links
do not hard-code paths.

The routing system has four parts:

- `RouteCreator`: the builder you use in route files. It collects routes
  and groups.
- `Route`: one route, with its pattern, methods, handlers, and middlewares.
- `Router`: matches a request to a route. `RoutingMiddleware` calls it.
- `Navigator`: builds URLs from route names. See
  [Navigation](/documentation/framework/http-routing/navigation).

The [Request Lifecycle](/documentation/framework/core-concepts/request-lifecycle)
shows where routing runs in the request.

## Loading Route Files

Route files receive a `RouteCreator` in a variable named `$router`. The
`routing.routes` config lists the entry files, and `RouterProvider` loads
them when the application boots. In the starter app, the entry file is
`routes/main.route.php`.

Inside a route file, load more files with `load()` or `loadFolder()`:

```php
<?php

/** @var RouteCreator $router */

$router->load(__DIR__ . '/front/*.php');
$router->load([__DIR__ . '/a.php', __DIR__ . '/b.php']);
$router->loadFolder(__DIR__ . '/admin');

$router->load(function (RouteCreator $router) {
    $router->get('ping', '/ping');
});
```

`load()` also accepts a callable that receives the creator. Files loaded
from inside a group callback inherit that group's options, which is how the
starter app applies its middlewares to every front-end route.

## Showcase: A Post Page

The following example adds a page that shows one post. The starter app
loads every file in `routes/front/`, so no config change is needed.

Define the route in `routes/front/post.php`:

```php
<?php

declare(strict_types=1);

namespace App\Routes;

use App\Module\Front\Post\PostController;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id:\d+}')
    ->handler(PostController::class, 'show');
```

Create the controller in `src/Module/Front/Post/PostController.php`:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Http\Response\JsonResponse;

#[Controller]
class PostController
{
    public function show(string $id): JsonResponse
    {
        return new JsonResponse(['id' => $id]);
    }
}
```

The route pattern `/post/{id:\d+}` captures the number in the path. Windwalker
passes the captured value to the method argument named `$id`:

```text
GET /post/42   200  {"id":"42"}
GET /post/abc  404  Not Found
```

The route is named `front::post_show`. The `front::` prefix comes from the
`front` group's namespace. Other files can build the same URL by name:

```php
<?php

use Windwalker\Core\Router\Navigator;

$nav = $app->retrieve(Navigator::class);

$url = $nav->to('front::post_show', ['id' => 42]);
```

## Defining Routes

A route is created with a method named after an HTTP verb. The first
argument is the route name, and the second is the pattern:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id}');
$router->post('post_create', '/post');
$router->put('post_replace', '/post/{id}');
$router->patch('post_update', '/post/{id}');
$router->delete('post_delete', '/post/{id}');
```

The creator also has shortcut methods for common combinations:

- `fetch()`: `GET` and `QUERY`.
- `save()`: `POST`, `PUT`, and `PATCH`.
- `query()`: `QUERY` only.
- `any()`: every method. Use it when the route sets no method limit.

```php
<?php

/** @var RouteCreator $router */

$router->fetch('post_show', '/post/{id}')
    ->handler(PostController::class, 'show');

$router->save('post_store', '/post')
    ->handler(PostController::class, 'store');
```

Patterns are relative to the group. A leading slash is added when it is
missing, so `'post'` and `'/post'` are the same.

::: info
The router treats a request whose method does not match any route as a
route that does not exist. A `POST` to a `GET`-only route is not matched, and
the response is decided by the app's error handling.
:::

## Handlers

A handler can be a controller class, a `[Class, method]` pair, or a
closure. A controller class is marked with the `#[Controller]` attribute.
See [Controllers](/documentation/framework/http-routing/controllers). Use `handler()` to set one handler for all methods:

```php
<?php

use Windwalker\Http\Response\JsonResponse;

/** @var RouteCreator $router */

// Default task: GET runs index(), POST/PUT/PATCH run save(),
// DELETE runs delete().
$router->any('post_index', '/posts')
    ->handler(PostController::class);

// Call a specific method on the class.
$router->get('post_show', '/post/{id}')
    ->handler(PostController::class, 'show');

// A closure is also accepted.
$router->get('post_ping', '/post/ping')
    ->handler(fn () => new JsonResponse(['ok' => true]));
```

To use different handlers per method, call `handlers()` with named
arguments. The keys are method names, `fetch`, or `save`:

```php
<?php

/** @var RouteCreator $router */

$router->any('post_resource', '/post/{id}')
    ->handlers(
        get: [PostController::class, 'show'],
        post: [PostController::class, 'store'],
        delete: [PostController::class, 'delete'],
    );
```

::: warning
Within one `handlers()` call, the keys are applied in order. `fetch` and
`save` also set the methods they cover, so a later key replaces an earlier
one. Here the `fetch` handler replaces the `get` handler:

```php
$route->handlers(
    get: [PostController::class, 'show'],
    fetch: [PostController::class, 'list'],
);
```

Use separate `handlers()` calls when the order matters.
:::

If a route matches a request but has no handler for that method,
`RoutingMiddleware` throws `UnAllowedMethodException`, which returns `405`.
A `GET` without a handler falls back to `DefaultController`.

## Route Groups

A group shares options with every route created inside it. Use
`group()` with `register()` to define a group:

```php
<?php

use App\Module\Admin\AdminMiddleware;
use App\Module\Admin\Dashboard\DashboardController;
use Windwalker\Core\Middleware\CsrfMiddleware;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('admin')
    ->prefix('/admin')
    ->namespace('admin')
    ->middleware(CsrfMiddleware::class)
    ->middleware(AdminMiddleware::class)
    ->register(function (RouteCreator $router) {
        $router->get('dashboard', '/dashboard')
            ->handler(DashboardController::class);
    });
```

The group options work as follows:

- `prefix()`: adds a path prefix. The route above matches `/admin/dashboard`.
- `namespace()`: adds a name prefix. The route is named `admin::dashboard`.
- `middleware()`: runs before the route's own middlewares, in the order
  they are added.
- `hosts()`, `scheme()`, `methods()`, `vars()`, and `extra()` are inherited
  too.

::: tip
Use a group for every area of the app, such as `front` and `admin`. The
name prefix keeps route names unique across areas.
:::

### Nested Scopes

Calling `load()` inside a group registers the loaded files under that group.
Each loaded route inherits every option of the group: the prefix, namespace,
middlewares, hosts, scheme, methods, and vars. A loaded file can open another
group and call `load()` again, so one scope can contain a whole tree of
scopes. Each level adds its own options to the chain.

The following example scopes a set of pages to one organization. The
organization ID is in the URL, and a middleware loads the organization:

```php
<?php

// routes/front/org.php

use App\Module\Front\Org\OrgHomeController;
use App\Module\Front\Org\OrganizationMiddleware;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('org')
    ->prefix('/org/{org_id}')
    ->middleware(OrganizationMiddleware::class)
    ->register(function (RouteCreator $router) {
        $router->get('org_home', '/')
            ->handler(OrgHomeController::class);

        $router->load(__DIR__ . '/org/*.php');
    });
```

The files in `routes/front/org/` add a second scope. Each one adds a path
segment and a login check. The member routes below therefore run
`OrganizationMiddleware` first, then `LoginRequireMiddleware`, and match
`/org/{org_id}/member/{mid}`:

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

::: warning
A middleware of an outer scope can read the scope value only with
`getUrlVars()`. Use `$app->getUrlVars()['org_id']` in
`OrganizationMiddleware`, not `$app->input('org_id')`. `input()` returns
the route value when it is set, and falls back to a query value such as
`?org_id=2` only when the route value is `null` or empty.
:::

Host guards work the same way. A group with a host protects every route
below it. A request to another host does not match and returns `404`:

```php
<?php

/** @var RouteCreator $router */

$router->group('admin')
    ->hosts('admin.example.com')
    ->scheme('https')
    ->prefix('/')
    ->namespace('admin')
    ->register(function (RouteCreator $router) {
        $router->get('dashboard', '/dashboard')
            ->handler(DashboardController::class);
    });
```

::: tip
`KeepUrlQueryMiddleware` from `windwalker/unicorn` keeps a scope parameter,
such as `org_id`, in every URL that `Navigator` builds inside the group.
Pass a `uid` to separate scopes that use the same key.
:::

Nested scopes add some complexity, because a route's options come from every
group above it. In exchange, one group controls the prefix, host, and
middlewares of a whole area, and no route inside can drift out of it. This
is the reason Windwalker does not offer per-controller attributes for route
prefixes or hosts for now. Keep each scope in its own folder
so the tree is easy to read.

## Route Parameters

A placeholder in braces, such as `{id}`, matches one path segment. Add a
regular expression after a colon to restrict it:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id:\d+}');
$router->get('post_tag', '/tag/{slug:[a-z0-9-]+}');
```

Wrap a part of the path in brackets to make it optional. A placeholder such
as `{path:.+}` can match several segments:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_list', '/posts[/{page:\d+}]');
$router->get('file_show', '/files[/{path:.+}]');
```

`/posts` and `/posts/2` both match `post_list`. `/files/a/b/c` gives
`path` the value `a/b/c`.

Route parameters reach the handler as URL variables. The simplest way is a
method argument with the same name. A controller method receives `$id`
from `{id}` without any extra code:

```php
<?php

#[Controller]
class PostController
{
    public function show(string $id): JsonResponse
    {
        return new JsonResponse(['id' => $id]);
    }
}
```

Read them in other ways when needed:

- With the `#[RouteParam]` attribute on a parameter. See
  [Request & Input](/documentation/framework/http-routing/request-and-input).
- From the request context with `getUrlVars()`, which returns only the
  route variables.

Values are URL-decoded before they reach the handler.

### Route Parameters and Query Input

Route variables and query string values are separate sources. The request
input methods combine them, so `input()` returns both:

```php
<?php

// Route: /post/{id}, URL: /post/42?page=2
$app->input('id');   // from the route
$app->input('page'); // from the query string

$app->getUrlVars();  // ['id' => '42'], route variables only
```

::: warning
`input()` merges query values after route variables. A query string such as
`?id=7` replaces the `{id}` value of `/post/42`. Read route parameters with
a method argument, `#[RouteParam]`, or `getUrlVars()` when the value must
come from the route. See
[Request & Input](/documentation/framework/http-routing/request-and-input)
for the full list of input methods.
:::

The regular expression must not contain a capturing group. Use `(?:...)`
instead of `(...)`. Using the same placeholder twice in one pattern throws
an error.

## Matching Rules

The router matches the request path, not the query string. The path is
read from the `route` value of `SystemUri`, so the same routes work in any
folder the app is mounted in.

- A trailing slash is ignored. `/post/42/` matches `/post/{id}`.
- A method mismatch returns `404` (see the info note above).
- If no route matches, the request fails with `RouteNotFoundException`.

## Route Names and Aliases

A route name must be unique within its namespace. The compiled name is the
namespace, `::`, and the name you gave the route:

```text
front::post_show
admin::dashboard
```

::: warning
A second route with the same name silently replaces the first one. The
route compiler stores routes by name, so no error is raised. Check the
names of all loaded files when you add a route.
:::

Give a route more names with `alias()`. The router finds a route by its
name or by any of its aliases:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id}')
    ->alias('post_view')
    ->handler(PostController::class, 'show');
```

## Hosts and Schemes

A route can require a host or a scheme. A host can contain variables that
are added to the route variables:

```php
<?php

/** @var RouteCreator $router */

$router->get('blog_home', '/')
    ->hosts('{sub:\w+}.example.com')
    ->scheme('https')
    ->handler(BlogController::class);
```

For the host `news.example.com`, the route receives `sub` set to `news`.
A request with another scheme does not match the route.

## Routing Events and Fallbacks

`RoutingMiddleware` emits events around matching:

- `BeforeRoutingEvent`: before matching. The route can be changed.
- `AfterRoutingEvent`: after matching. It provides the matched `Route`.
- `RoutingNotMatchedEvent`: when no route matches.

Use the events from a listener or a subscriber, as described in the
[Request Lifecycle](/documentation/framework/core-concepts/request-lifecycle).
The `RoutingMiddleware` constructor also accepts a `$preMatch` closure, which
runs before the router, and a `$fallback` closure, which runs when no route
matches.

