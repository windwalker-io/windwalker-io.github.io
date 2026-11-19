---
layout: doc
title: Controllers
description: How plain PHP controllers marked with the Controller attribute are created and dispatched to their handler methods by the framework.
---

# Controllers

## Overview

A controller groups the handler methods for one area of your app. A route
names the method that should run, and the framework calls it with the
request data. Windwalker controllers are plain PHP classes. You mark them
with the `#[Controller]` attribute, and you do not extend a base class.

The controller layer has three parts:

- `#[Controller]`: the class attribute, from
  `Windwalker\Core\Attributes\Controller`. It marks the class as a
  controller and wraps it when the container creates it.
- `DelegatingController`: the wrapper the attribute creates. It picks the
  method for the task.
- `ControllerDispatcher`: runs the route's handler. It creates the
  controller and calls the method through the container.

Routes are defined in the [Routing](/documentation/framework/core-concepts/http-routing/routing)
page. The method arguments use the input attributes from
  [Request & Input](/documentation/framework/core-concepts/http-routing/request-and-input).
A route points at a controller method, and the framework passes the route
variable to the argument:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id}')
    ->handler(PostController::class, 'show');

// In PostController:
public function show(#[RouteParam] string $id): string
{
    return 'Post ' . $id;
}
```

## Declaring a Controller

Add the attribute to the class. No base class is needed:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

#[Controller]
class PostController
{
    public function show(string $id): JsonResponse
    {
        return response()->json(['id' => (int) $id]);
    }
}
```

Bind a method to a route with `handler()`. The first argument is the class,
and the second is the method name:

```php
<?php

/** @var RouteCreator $router */

$router->get('post_show', '/post/{id:\d+}')
    ->handler(PostController::class, 'show');
```

::: warning
Do not extend `Windwalker\Core\Controller\Controller`. A class that
extends it does not get the attribute's behavior, such as rendering the
route's view when `index()` is missing. Declare the class with the attribute
instead.
:::

## Showcase: A Post Controller

The following example adds a group of post routes and a controller for them.
It runs end to end when you load the route file from `routes/front/`.

The route file binds each route to a method:

```php
<?php

declare(strict_types=1);

namespace App\Routes;

use App\Module\Front\Post\PostController;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('post')
    ->prefix('/post')
    ->namespace('post')
    ->register(function (RouteCreator $router) {
        $router->get('post_index', '/')
            ->handler(PostController::class);

        $router->get('post_show', '/{id:\d+}')
            ->handler(PostController::class, 'show');

        $router->save('post_store', '/')
            ->handler(PostController::class, 'store');
    });
```

The controller provides the methods. `store()` returns a `RouteUri`, so the
browser is redirected to the new post:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Router\Navigator;
use Windwalker\Core\Router\RouteUri;
use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

#[Controller]
class PostController
{
    public function index(): JsonResponse
    {
        return response()->json(['posts' => []]);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['id' => (int) $id]);
    }

    public function store(Navigator $nav): RouteUri
    {
        // Save the post here, then redirect to its page.
        $id = 4;

        return $nav->to('post::post_show')->id($id);
    }
}
```

Requests against these routes return:

```text
GET  /post/     200  {"posts":[]}
GET  /post/42   200  {"id":42}
POST /post/     303  Location: /post/4
```

The `post_index` route names no method, so the dispatcher chooses one.
The next section explains how.

## Tasks and Default Methods

A task is the method that runs for a request. When a route names a method,
that method is the task. When it does not, the dispatcher chooses the
task from the HTTP method:

- `GET` and `QUERY` run `index()`.
- `POST`, `PUT`, and `PATCH` run `save()`.
- `DELETE` runs `delete()`.
- Other methods use the lowercase method name as the task.

A method name with an underscore is converted to camel case, so the
`some_method` task calls `someMethod()`.

The `post_index` route above uses this default. It serves `GET` with
`index()`. The same route with `any()` serves every method:

```php
<?php

/** @var RouteCreator $router */

$router->any('post_resource', '/post')
    ->handler(PostController::class);
```

::: info
A task whose method does not exist throws a `LogicException` with the
message `Method: ...::...() not found.`. The exception is raised for every
task except `index()`.
:::

### Rendering a View Without index()

A controller can omit `index()`. A `GET` route with a `view()` then renders
that view without calling a method. This is how the starter app's home page
works:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Home;

use Windwalker\Core\Attributes\Controller;

#[Controller]
class HomeController
{
    //
}
```

```php
<?php

/** @var RouteCreator $router */

$router->get('home', '/')
    ->handler(HomeController::class)
    ->view(HomeView::class);
```

The `view` value is a route variable. The built-in rendering receives it
as `$view`, so the view is rendered without a method in the controller.

## Injecting Dependencies

A controller can receive dependencies in three places: method arguments,
the constructor, and trait properties.

### Recommended Injection Method

Prefer method arguments. Each method declares only the services it needs,
which gives these benefits:

- Scope is isolated. A dependency used by one method does not affect the
  others.
- Unneeded services are not loaded. A method that does not use a service
  never creates it.

Use the other styles when they fit better:

1. Constructor parameters, for services that most methods use.
2. Trait properties, for a shared dependency that you want without a
   constructor, such as `Navigator`.

### Method Injection

Method injection is the preferred way to get dependencies. Each method
declares what it needs, and the container resolves the arguments for each
call. The sources are:

- Type-hinted services, such as `Navigator` or `AppContext`.
- Route variables, matched to the parameter with the same name.
- Request values, with attributes such as `#[BodyValue]` and `#[QueryParam]`.
- Your own services, by type.

The following method updates a post. The route variable `{id}` reaches
`$id`, and the request body reaches `$title`:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\Request\BodyValue;
use Windwalker\Core\Attributes\Request\RouteParam;
use Windwalker\Core\Router\Navigator;
use Windwalker\Core\Router\RouteUri;

#[Controller]
class PostController
{
    public function update(
        Navigator $nav,
        PostRepository $posts,
        #[RouteParam]
        string $id,
        #[BodyValue]
        string $title,
    ): RouteUri {
        $posts->update((int) $id, $title);

        return $nav->to('post::post_show')->id($id);
    }
}
```

```php
<?php

/** @var RouteCreator $router */

$router->patch('post_update', '/post/{id:\d+}')
    ->handler(PostController::class, 'update');
```

Each method has its own parameters, so a method reads only the values it
needs. When the route variable has another name, pass that name to the
attribute. For example, `#[RouteParam('post_id')] string $id` reads
`{post_id}`.

### Constructor Injection

Use the constructor for a service that most methods of the controller use.
The container creates the controller for each dispatch, so the constructor
runs once per request:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

#[Controller]
class PostController
{
    public function __construct(
        protected PostRepository $posts,
    ) {
    }

    public function index(): JsonResponse
    {
        return response()->json(['posts' => $this->posts->all()]);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->posts->find((int) $id));
    }
}
```

The constructor receives services only. Route variables and input values
reach methods, so read them in the method arguments.

### Trait Injection

A trait can add a property that the container injects. `NavigableTrait`
from `Windwalker\Core\Router` injects the `Navigator` as `$this->nav`:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Router\NavigableTrait;
use Windwalker\Core\Router\RouteUri;

#[Controller]
class PostController
{
    use NavigableTrait;

    public function store(): RouteUri
    {
        return $this->nav->to('post::post_show')->id(4);
    }
}
```

To share a service across controllers, write your own trait with the
`#[Inject]` attribute on a property:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Organization;

use App\Service\OrganizationService;
use Windwalker\DI\Attributes\Inject;

trait OrganizationAwareTrait
{
    #[Inject]
    protected OrganizationService $organizations;
}
```

::: info
A trait property does not appear in any method signature, so a reader
cannot see the dependency at a glance. Use a method argument when only one
method needs the service.
:::

### Calling Internal Methods with `call()`

A helper method on a controller can also need several services. Instead of
passing each service by hand, call the method with `AppContext::call()`.
The container resolves every type-hinted parameter:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Application\AppContext;

#[Controller]
class PostController
{
    public function index(AppContext $app): string
    {
        // Auto-injects PostService; $page is set manually.
        return $app->call($this->renderList(...), ['page' => 2]);
    }

    protected function renderList(
        PostService $posts,
        int $page = 1,
    ): string {
        return $posts->renderPage($page);
    }
}
```

Parameters that are not type-hinted services are matched by name. The
`['page' => 2]` argument overrides `$page` and replaces its default value.
Use this to pass a value into a method without changing its signature.

## Calling Other Controllers (HMVC)

HMVC means one controller calls another controller directly, inside the same
request. Use it to reuse a full controller action, such as rendering a
sidebar from another page's controller. Create the target controller with
`make()`, then call the method with `call()`:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\Request\BodyValue;

#[Controller]
class PostController
{
    public function index(AppContext $app): string
    {
        $sidebar = $app->make(SidebarController::class);

        return $app->call($sidebar->show(...), ['category' => 'news']);
        // Sidebar: news
    }
}

#[Controller]
class SidebarController
{
    public function show(
        #[BodyValue]
        string $category,
    ): string {
        return "Sidebar: {$category}";
    }
}
```

`make()` creates a new controller object each time, so each call gets a
fresh instance. The `['category' => 'news']` argument supplies the value
that `#[BodyValue]` would otherwise read from the request.

### Use `dispatchController()`

The `dispatch*()` methods run a controller as a full request. They pick the
task, apply task mapping, and handle the return value. `call()` only runs one
method, and it skips that routing step.

Use `dispatchController()` when the target method reads its values from
attributes such as `#[BodyValue]` and `#[QueryParam]`:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Application\AppContext;

class PostPage
{
    public function show(AppContext $app): string
    {
        // Attribute values come from the current request.
        return $app->dispatchController(
            [SidebarController::class, 'show'],
        );
    }
}
```

`input()` is read-only in a controller. It returns values from the current
request and cannot inject new ones. To pass values that the method reads from
`input()`, or from attributes, use `dispatchWithInput()` with an array. The
array replaces the request's body:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Application\AppContext;

class PostPage
{
    public function show(AppContext $app): string
    {
        return $app->dispatchWithInput(
            [SidebarController::class, 'show'],
            ['category' => 'news'],
        );
    }
}
```

To simulate a complete request, pass a `ServerRequestInterface` instead of
an array. The target controller then sees the headers, query, body, and
route values of that request:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Application\AppContext;
use Windwalker\Http\Factory\ServerRequestFactory;

class PostPage
{
    public function show(AppContext $app): string
    {
        // Build a new Request
        $request = new ServerRequestFactory()->createServerRequest(
            'POST',
            '/sidebar',
        )->withParsedBody(['category' => 'news']);
        
        // Or modify current request to simulate a new request.
        $request = $app->getAppRequest()->getServerRequest()
            ->withMethod('POST')
            ->withRequestTarget('/sidebar')
            ->withParsedBody(['category' => 'news']);

        // Dispatch with custom Request
        return $app->dispatchWithInput(
            [SidebarController::class, 'show'],
            $request,
        );
    }
}
```

::: warning
`dispatchWithInput()` restores the original request after the call. Do not
rely on it to change the request for code that runs after the call returns.
:::

## Task Mapping

The `#[TaskMapping]` attribute renames tasks at the class level. Use it when
a route's task name should differ from the method name:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\TaskMapping;

#[Controller]
#[TaskMapping(
    tasks: ['index' => 'home'],
    methods: ['PUT' => 'update'],
)]
class PostController
{
    public function home(): string
    {
        return 'home';
    }

    public function update(): string
    {
        return 'updated';
    }
}
```

With this mapping, `GET` runs `home()` and `PUT` runs `update()`. The
`tasks` key maps a task name, and `methods` maps an HTTP method. A
`'*'` key in `methods` sends every request to one method.

::: info
The mapping is applied after the default task is chosen. The `index`
key therefore matches a `GET` request with no task name.
:::

## Return Values

A method can return a string, an array, or a response object. The
framework converts the value into the HTTP response. A string is sent as
the body, and an array is encoded as JSON:

```php
<?php

public function ping(): string
{
    return 'pong';
}
```

The conversion rules, the response builder, redirects, downloads, and
JSON API responses are described in
[Responses](/documentation/framework/core-concepts/http-routing/responses).

## Error Handling

Throw an exception to stop the method and report an error. The framework
builds the response for you:

```php
<?php

public function show(string $id, PostRepository $posts): JsonResponse
{
    $post = $posts->find((int) $id);

    if (!$post) {
        throw new \RuntimeException('Post not found.', 404);
    }

    return response()->json($post);
}
```

After the throw, the framework takes over: it renders the error page or
flashes a warning and redirects back, depending on the request method and
the client. See [Exceptions](/documentation/framework/core-concepts/http-routing/exceptions)
for the rules.

## Flash Messages

`$app->addMessage()` stores a message in the session flash bag. Use it for a
successful result, then redirect. The message is shown on the next page:

```php
<?php

use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Router\Navigator;
use Windwalker\Core\Router\RouteUri;

public function store(AppContext $app, Navigator $nav): RouteUri
{
    $id = 4;

    $app->addMessage('Post saved.', 'success');

    return $nav->to('post::post_show')->id($id);
}
```

The message type is a free string, such as `info`, `success`, or `warning`.
The framework uses `warning` for the errors it flashes.

Read the messages with `$app->getMessages()`. The call removes them from the
flash bag unless you pass `true` as the second argument.

The `addMessage()` method needs the `windwalker/session` package. Without it,
the call throws a `DomainException`.

## Reminders

Public methods are tasks. A route without a task name runs `index()`,
`save()`, `delete()`, or a method named after the HTTP method. A public
helper with one of these names can therefore be reached from a URL.

::: warning
Keep helper methods `protected` or `private`, and give them names that
do not match a task. A public `save()` helper runs for every `POST`
request that uses the default task.
:::

Without the attribute, a route without a method that points to the class
fails instead of rendering the view.

