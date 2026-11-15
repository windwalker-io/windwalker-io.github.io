---
layout: doc
title: Container Layers
---

# Container Layers

## Introduction

In a long-running server (Swoole, the CLI server), the process handles many
requests. An object created in one request can survive into the next and
leak one user's state into another. Windwalker splits the container into
layers, each with its own lifetime. Per-request services live in the request
layer, and services that are safe to share live in the application layer.

## The Layers

Windwalker names three layers with the `AppLayer` constants:

- `AppLayer::RUNTIME` (1): the process-wide container. It is created once
  when the process boots.
- `AppLayer::APP` (2): the application container, a child of the runtime
  container. It lives as long as the application does. In a long-running
  server, that means the whole server lifetime.
- `AppLayer::REQUEST` (3): the request container, a child of the
  application container. Windwalker creates one for each request and
  discards it when the request ends.

```php
$app->getContainer()->getLevel(); // 2
```

## Minimal Setup: A Request-Scoped Service

A service declares its layers with the `providedIn` option of `DIOptions`.
A shopping cart belongs to one visitor's request, so it is provided only
at the request layer:

```php
namespace App\Provider;

use App\Cart\ShoppingCart;
use Windwalker\Core\Application\AppLayer;
use Windwalker\DI\Container;
use Windwalker\DI\DIOptions;
use Windwalker\DI\ServiceProviderInterface;

class CartProvider implements ServiceProviderInterface
{
    public function register(Container $container): void
    {
        $container->prepareSharedObject(
            ShoppingCart::class,
            null,
            new DIOptions(providedIn: AppLayer::REQUEST),
        );
    }
}
```

Each request gets its own cart. A controller receives it in the constructor:

```php
namespace App\Controller;

use App\Cart\ShoppingCart;

class CartController
{
    public function __construct(
        protected ShoppingCart $cart,
    ) {}

    public function add(int $productId): void
    {
        $this->cart->add($productId);
    }
}
```

The application layer cannot provide it, so this lookup fails:

```php
// Throws: the service cannot be provided at level 2
$app->retrieve(ShoppingCart::class);
```

## The providedIn Values

`providedIn` accepts a level, a list of levels, or a closure:

- A single level, which the service is provided in only:

```php
new DIOptions(providedIn: AppLayer::REQUEST);
```

- A list of levels:

```php
new DIOptions(providedIn: [AppLayer::APP, AppLayer::REQUEST]);
```

- A closure receives the level and returns `true` where the service may live:

```php
new DIOptions(
    providedIn: fn(int $level) => $level >= AppLayer::REQUEST,
);
```

::: info
The level is checked at lookup time, not at registration. A wrong level
does not fail on boot.
:::

## Isolation

Sometimes a service must be shared within one request but rebuilt for each
request, even though it is declared once. The `#[Isolation]` attribute
marks a class for that behavior:

```php
namespace App\Database;

use Windwalker\DI\Attributes\Isolation;

#[Isolation]
class ConnectionPool
{
    // Holds connections for the current request.
}
```

Declare the class with `prepareSharedObject()` so Windwalker can build new
instances from it:

```php
$container->prepareSharedObject(ConnectionPool::class);
```

Each child builds its own instance. A child that is not isolated reuses the
parent's:

```php
$child = $app->getContainer()->createChild();

$child->get(ConnectionPool::class);
// A new instance for this child, not the application's instance.
```

`new DIOptions(isolation: true)` declares the same thing in code. Core uses it
for some of its own services.

::: warning
Isolation works only for services that Windwalker can rebuild, such as those
registered with `prepareObject()` or `prepareSharedObject()`. A service
registered with an existing object through `share()` or `set()` stays the
same instance in every child.
:::

## Long-Running Servers

In a long-running server, shared services in the application layer keep their
state until the server stops. That suits stateless services, such as a
configuration reader. It is wrong for per-request data, such as the current
user or a shopping cart.

::: warning
Do not store per-request state in an application-layer service. The next
request gets the old state silently. Use `providedIn: AppLayer::REQUEST`, or
`#[Isolation]` with `prepareSharedObject()`.
:::

## Request Hooks

Providers can run code at the start and end of each web request. Implement
one or both interfaces:

```php
namespace App\Provider;

use App\Request\RequestState;
use Windwalker\Core\Application\AppLayer;
use Windwalker\Core\DI\RequestBootableProviderInterface;
use Windwalker\Core\DI\RequestReleasableProviderInterface;
use Windwalker\DI\Container;
use Windwalker\DI\DIOptions;
use Windwalker\DI\ServiceProviderInterface;

class RequestStateProvider implements
    ServiceProviderInterface,
    RequestBootableProviderInterface,
    RequestReleasableProviderInterface
{
    public function register(Container $container): void
    {
        $container->prepareSharedObject(
            RequestState::class,
            null,
            new DIOptions(providedIn: AppLayer::REQUEST),
        );
    }

    public function bootBeforeRequest(Container $container): void
    {
        $container->get(RequestState::class)->start();
    }

    public function releaseAfterRequest(Container $container): void
    {
        $container->get(RequestState::class)->finish();
    }
}
```

`bootBeforeRequest()` runs after the request container is created.
`releaseAfterRequest()` runs when the request ends, for cleanup.

## Child Containers

A child container inherits its parent's definitions. When a child looks up a
service that only the parent has, it takes a copy. Values set on the child
stay there:

```php
$child = $app->getContainer()->createChild();

$child->getLevel(); // 3
$child->share('request.id', 'req-42');

$app->getContainer()->has('request.id'); // false
```

For details, see [Multi Levels](/documentation/components/di/multi-levels).
