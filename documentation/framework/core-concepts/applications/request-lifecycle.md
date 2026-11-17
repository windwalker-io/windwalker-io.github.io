---
layout: doc
title: Request Lifecycle
---

# Request Lifecycle

## Overview

Every Windwalker application follows the same chain of steps for each
request: boot the runtime, create a request context, match a route,
dispatch a controller, and send the response. Knowing this order tells you
where to hook in, which objects exist at each step, and when those objects
are released.

The chain is the same for every entry point, but the lifetime of the
process differs:

- A classic PHP-FPM or Apache request boots, handles one request, and exits.
- A long-running server, such as Swoole, boots once and then handles many
  requests in the same process.
- A WebSocket server boots once and handles connection events and messages
  over time.

The three [application layers](/documentation/framework/core-concepts/applications/layers)
decide what survives between requests. This page follows a request through
those layers and lists the events you can listen to along the way.

## Runtime Boot

Every entry point starts with the `Runtime` class. The host app's
`www/index.php` shows the order:

```php
<?php

$root = __DIR__ . '/..';

include $root . '/vendor/autoload.php';

include __DIR__ . '/../etc/define.php';

if (Runtime::shouldBlock(['dev'], env('DEV_ALLOW_IPS'))) {
    Runtime::forbidden();
}

Runtime::boot(WINDWALKER_ROOT, __DIR__);

Runtime::loadConfig(Runtime::getRootDir() . '/etc/runtime.config.php');

$container = Runtime::getContainer();
```

The runtime performs these steps:

- Load the Composer autoloader and `etc/define.php`, which defines the path
  constants and loads the `.env` files.
- Check the access rule with `Runtime::shouldBlock()`.
- Record the root and work directories.
- Load the runtime configuration into the root container, which is layer 1
  (`AppLayer::RUNTIME`).

### Access Control at Runtime

`Runtime::shouldBlock()` compares the client address with the allowed list
from the `DEV_ALLOW_IPS` environment variable. It runs before the
application is created, so a blocked request never reaches your code.

::: warning
When the rule is active for the current environment, the forwarded address
is trusted only when the connection comes from one of the addresses in
`PROXY_TRUSTED_IPS`. Otherwise, an `X-Forwarded-For` header blocks the
request. Set `PROXY_TRUSTED_IPS` when the app runs behind a load balancer.
:::

## Application Boot

The application is a `WebApplication` subclass, created in a child container
of the root container (layer 2, `AppLayer::APP`). It loads the application
configuration, such as `etc/app/main.config.php`:

```php
<?php

// etc/app/main.config.php
return [
    'middlewares' => [
        RoutingMiddleware::class,
    ],

    'listeners' => [
        //
    ],
];
```

The entry point then attaches the application to the server and boots it once
for the process. During this boot, the configuration is registered, the
middlewares from the `middlewares` key are queued, and the `booting()` hook
is called. Override the hook in your application class to add setup code:

```php
<?php

namespace App\Web;

use Windwalker\Core\Application\WebApplication;
use Windwalker\DI\Container;

class Application extends WebApplication
{
    protected function booting(Container $container): void
    {
        // Register application-wide services here.
    }
}
```

For how services are registered, see
[Dependency Injection](/documentation/framework/core-concepts/dependency-injection/dependency-injection).

## Request Context

For each request, the application creates an `AppContext` in a new child
container, which is layer 3 (`AppLayer::REQUEST`). The request is available
in that container, and the request-level providers are booted before the
request runs.

`AppContext` is the request-level application. Use it to read the request
and route, and to dispatch controllers:

```php
<?php

use Windwalker\Core\Application\AppContext;

class ProfileService
{
    public function __construct(protected AppContext $app) {}

    public function currentRoute(): ?string
    {
        return $this->app->getMatchedRoute()?->getName();
    }
}
```

Services that are provided at the request layer are created once per
request and discarded with the request container. See
[Application Layers](/documentation/framework/core-concepts/applications/layers) for
the `providedIn` values.

## Request Flow

This section follows a request through a classic web entry point. The
`PhpServer` in `www/index.php` calls `executeServerEvent()` for each
request.

```text
  Server
    |  1. RequestEvent (host sets the response)
    v
  Application
    |  2. Create the layer 3 AppContext
    |  3. BeforeRequestEvent (application)
    v
  AppContext
    |  4. BeforeRequestEvent (AppContext)
    |  5. BeforeAppDispatchEvent
    v
  Middlewares
    |  6. RoutingMiddleware matches the route
    |     (routing events on AppContext)
    |  7. Route middlewares, then the controller
    v
  ControllerDispatcher
    |     BeforeControllerDispatchEvent
    |     controller runs
    |     AfterControllerDispatchEvent
    |  <- response returns through the middlewares
    v
  Application
    |  8. AfterRequestEvent (application)
    v
  AppContext
    |  9. AfterRequestEvent (AppContext)
    v
  Server
    |  10. ResponseEvent, then output the response
    |  11. AfterRespondEvent (AppContext),
    |      release providers
    v
  Done
```

1. The server creates a PSR-7 request from the globals and emits
   `Windwalker\Http\Event\RequestEvent`. The host app listens to this event
   and sets `$event->response`.
2. `executeServerEvent()` creates the request context from the event, then
   runs `runContext()`.
3. `runContext()` emits `BeforeRequestEvent` on the application, then on
   the `AppContext`.
4. `runContext()` emits `BeforeAppDispatchEvent` on the `AppContext`. It
   passes the middleware queue, which you can change in a listener.
5. The middlewares run in order. The last step is
   `ControllerDispatcher::dispatch()`.
6. `RoutingMiddleware` matches the route. It merges the group middlewares
   with the route middlewares and runs them, then finds the handler for the
   HTTP method.
7. `ControllerDispatcher` emits `BeforeControllerDispatchEvent`, calls the
   controller, and emits `AfterControllerDispatchEvent`.
8. The response travels back through the middlewares in reverse order.
9. `runContext()` emits `AfterRequestEvent` on the application, then on the
   `AppContext`.
10. The server emits `ResponseEvent`, then sends the response to the client.
11. The server calls the end handler registered by `executeServerEvent()`.
    It calls `stopContext()`, which emits `AfterRespondEvent` on the
    `AppContext` and then releases the providers.

The middlewares run in order, and the response travels back through them.

## Hooking into the Lifecycle

You can listen to lifecycle events at two levels:

- Application listeners, from the `listeners` key of a configuration file.
  They receive `BeforeRequestEvent`, `AfterRequestEvent`, and
  `TerminatingEvent`.
- `AppContext` listeners, from route subscribers, or from `$app->on()`
  inside a service. They receive the routing, controller, and
  `AfterRespondEvent` events.

The following example adds a `Cache-Control` header to every controller
response. It also adds a security header to every response from the
application:

```php
<?php

// etc/app/main.config.php
use Windwalker\Core\Events\Web\AfterRequestEvent;

return [
    'listeners' => [
        AfterRequestEvent::class => static function (
            AfterRequestEvent $event
        ) {
            $event->response = $event->response
                ->withHeader('X-Frame-Options', 'DENY');
        },
    ],
];
```

```php
<?php

// src/Listener/CacheHeaderSubscriber.php
namespace App\Listener;

use Windwalker\Core\Events\Web\AfterControllerDispatchEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;

#[EventSubscriber]
class CacheHeaderSubscriber
{
    #[ListenTo(AfterControllerDispatchEvent::class)]
    public function noStore(AfterControllerDispatchEvent $event): void
    {
        $event->response = $event->response
            ->withHeader('Cache-Control', 'no-store');
    }
}
```

Attach the subscriber to a single route. It runs only for that route:

```php
<?php

// routes/front.route.php
use App\Listener\CacheHeaderSubscriber;

$router->get('post_show', '/post/{id}')
    ->handler(PostController::class)
    ->subscribe(CacheHeaderSubscriber::class);
```

Route subscribers are attached to the `AppContext` during routing, so they
exist only for that request. For the listener syntax, see
[Listeners](/documentation/components/event/listeners).

## Event Reference

The events are plain objects. Public properties you can change are noted.
Changes to an event are visible to the next listener and to the code that
emits it.

### Application Events

These events are in the `Windwalker\Core\Events\Web` namespace.

- `BeforeRequestEvent`: emitted on the application and on the `AppContext`.
  - `$container`: the request container.
  - `$request`: the PSR-7 request. Replace it to change the request for the
    rest of the lifecycle.
- `BeforeAppDispatchEvent`: emitted on the `AppContext`.
  - `$request`: the PSR-7 request.
  - `$container`: the request container.
  - `$middlewares`: the middleware queue. Replace it to add or remove
    middlewares for this request.
- `AfterRequestEvent`: emitted on the application and on the `AppContext`.
  - `$container`: the request container.
  - `$response`: the response. Replace it to change the output.
- `AfterRespondEvent`: emitted on the `AppContext` after the response is
  sent.
  - `$container`: the request container.
- `TerminatingEvent`: emitted on the application when `terminate()` is
  called.
  - `$app`: the root application.
  - `$container`: the root container.

::: warning
`AfterRespondEvent` runs after the response has been output. Changing the
response in a listener for this event has no effect on the client. Use
`AfterRequestEvent` to change the response.
:::

### Routing Events

These events are emitted by `RoutingMiddleware` and are forwarded to the
`AppContext`. Listeners on the application do not receive them.

- `Windwalker\Core\Events\Web\BeforeRoutingEvent`: emitted before matching.
  - `$systemUri`: the system URI of the request.
  - `$request`: the PSR-7 request.
  - `$route`: the route path to match.
- `Windwalker\Core\Events\Web\AfterRoutingEvent`: emitted after matching.
  - `$systemUri`, `$request`, and `$route`, as above.
  - `$matched`: the matched `Route`. Replace it to change the route.
- `Windwalker\Core\Events\Web\RoutingNotMatchedEvent`: emitted when no route
  matches and no fallback is set.
  - `$systemUri`, `$request`, and `$route`, as above.
  - `$exception`: the `RouteNotFoundException` that is thrown after the
    event. Replace it to change the error.

### Controller Events

These events are emitted by `ControllerDispatcher` on the `AppContext`.

- `Windwalker\Core\Events\Web\BeforeControllerDispatchEvent`: emitted before
  the controller is called.
  - `$controller`: the controller. Replace it to call a different
    controller.
  - `$app`: the `AppContext`.
- `Windwalker\Core\Events\Web\AfterControllerDispatchEvent`: emitted after
  the controller returns and its result is converted to a response.
  - `$app`: the `AppContext`.
  - `$response`: the response. Replace it to change the output.

### HTTP Server Events

These events come from the server package, `windwalker/http`. The host
app's `index.php` adds the application's dispatcher as a dealer of the
server, so application listeners also receive them.

- `Windwalker\Http\Event\RequestEvent`: emitted for each request.
  - `$request`: the PSR-7 request.
  - `$output`: the output handler.
  - `$response`: the response. Set it to answer the request.
  - `$endHandler`: a callback that runs after the response is output.
  - `$attributes`: an array of values shared between the events.
  - `$fd`: the connection ID, used by WebSocket and Swoole servers.
- `Windwalker\Http\Event\ResponseEvent`: emitted before the response is
  output. It has the same properties as `RequestEvent`.
- `Windwalker\Http\Event\ErrorEvent`: emitted when the server catches an
  exception. Its `$exception` property holds the error. If no listener
  stops propagation, the server rethrows it.

## Errors During Dispatch

When a middleware or controller throws, the application decides between
rethrowing the exception and redirecting back with a flash warning. Debug
mode, `GET` requests, JSON requests, and API calls rethrow the exception.
Other requests are logged to the channel set by `error.log_channel`
(default `error`), then redirected.

::: warning
A failed `POST` in production is logged and redirected, not shown. Check the
`error` log channel, or enable debug mode in development, to see the real
exception.
:::

## Response Output and Termination

When the server outputs the response, the request is complete. The
`stopContext()` method then emits `AfterRespondEvent` and releases the
providers that implement `RequestReleasableProviderInterface`:

```php
<?php

use Windwalker\Core\DI\RequestReleasableProviderInterface;
use Windwalker\DI\Container;

class ConnectionProvider implements RequestReleasableProviderInterface
{
    public function releaseAfterRequest(Container $container): void
    {
        // Close or return the request-scoped resource here.
    }
}
```

`TerminatingEvent` runs once, after the server loop ends. The host
`index.php` calls `$app->terminate()` after `$server->listen()` returns.

## Long-Running Servers

A long-running server, such as Swoole, boots the runtime and the application
once. The entry script then handles every request with the same process.
For each request, the server creates a new `AppContext`, runs it, and
releases it when the response is sent.

Because each request gets its own layer 3 container, objects from one
request are released with that container. Keep per-request state in
request-level services, and keep long-lived state in application-level
services. See [Application Layers](/documentation/framework/core-concepts/applications/layers#long-running-servers).

::: warning
`runCliServerRequest()` catches exceptions and writes them to the server
terminal. The process keeps running, so check the terminal output after
you change a listener or a controller.
:::

## WebSocket Servers

A WebSocket server uses `WsRootApplication` instead of `WebApplication`.
Its lifecycle is driven by connection events, not by a single request. The
reactor script in `resources/servers/swoole_websocket.php` connects the
server events to the application:

- Open: the handshake request is stored, `opening()` runs, and an `OPEN`
  route is dispatched if the application has one. The dispatch uses a
  `WsAppContext`.
- Message: a new `WsAppContext` is created for each message, using the
  stored handshake request.
- Close: `closing()` runs, a `CLOSE` route is dispatched if present, and the
  stored request is released.

Only the handshake request survives between messages, not the
`WsAppContext` or its services. Store state that must survive between
messages in a shared store, such as a memory table.

For the connection events and the room and user mapping, see
[WebSocket](/documentation/components/reactor/websocket) and
[Memory Tables](/documentation/components/reactor/memory-tables).
