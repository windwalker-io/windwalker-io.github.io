---
layout: doc
title: Dependency Injection
---

# Dependency Injection

## Introduction

Dependency injection (DI) means a class declares what it needs in its
constructor, and code outside the class supplies it. Compare a service that
creates its own gateway:

```php
class CheckoutService
{
    protected StripeGateway $gateway;

    public function __construct()
    {
        $this->gateway = new StripeGateway();
    }
}
```

with one that asks for an interface:

```php
class CheckoutService
{
    public function __construct(
        protected PaymentGatewayInterface $gateway,
    ) {}
}
```

The container decides which object fills each interface. Switching
gateways, or using a fake in tests, then means changing one binding.

## How Windwalker Uses DI

Windwalker creates a container for the runtime and one for each
application. Packages and your project register services during boot, and
the container fills constructor type hints in controllers, middleware, and
services.

- **Container**: stores definitions, creates objects, and shares them.
  See the [DI component](/documentation/components/di/basic-usage).
- **Service providers**: register a group of related services. See
  [Service Providers](#service-providers).
- **Service variants**: configure DI keys and pick one of several
  implementations at runtime. See
  [Service Variants](/documentation/framework/core-concepts/service-variants).
- **Layers**: the runtime, application, and request containers. See
  [Container Layers](/documentation/framework/core-concepts/layers).
- **Attributes**: `#[Inject]`, `#[Autowire]`, `#[Service]`, and others. See
  the [DI attributes](/documentation/components/di/attributes) page.

## Service Providers

A service provider registers one group of related services, such as
everything a payment feature needs. A package can ship one, and a project
enables it with a single line. Windwalker calls each provider once during
boot.

### Minimal Setup

The following example adds a checkout feature. It needs four parts: the
classes, a provider that registers them, the configuration that enables the
provider, and the code that uses them.

#### Declare the Dependencies

The service depends only on an interface:

```php
// src/Payment/PaymentGatewayInterface.php
namespace App\Payment;

interface PaymentGatewayInterface
{
    public function charge(int $amount, string $currency): string;
}
```

```php
// src/Payment/StripeGateway.php
namespace App\Payment;

class StripeGateway implements PaymentGatewayInterface
{
    public function charge(int $amount, string $currency): string
    {
        return "charge-$amount";
    }
}
```

```php
// src/Payment/CheckoutService.php
namespace App\Payment;

class CheckoutService
{
    public function __construct(
        protected PaymentGatewayInterface $gateway,
    ) {}

    public function checkout(int $amount): string
    {
        return $this->gateway->charge($amount, 'USD');
    }
}
```

#### Register the Services

The provider binds the interface and prepares the shared service:

```php
// src/Provider/PaymentProvider.php
namespace App\Provider;

use App\Payment\CheckoutService;
use App\Payment\PaymentGatewayInterface;
use App\Payment\StripeGateway;
use Windwalker\DI\Container;
use Windwalker\DI\ServiceProviderInterface;

class PaymentProvider implements ServiceProviderInterface
{
    public function register(Container $container): void
    {
        $container->bindShared(
            PaymentGatewayInterface::class,
            StripeGateway::class,
        );

        $container->prepareSharedObject(CheckoutService::class);
    }
}
```

#### Enable the Provider

Add the provider to `providers` in `etc/di.config.php`:

```php
// etc/di.config.php, inside the returned array
'providers' => [
    \App\Provider\PaymentProvider::class,
],
```

#### Use the Services

The controller receives `CheckoutService` through its constructor:

```php
namespace App\Controller;

use App\Payment\CheckoutService;

class CheckoutController
{
    public function __construct(
        protected CheckoutService $checkout,
    ) {}

    public function pay(): string
    {
        return $this->checkout->checkout(1200);
    }
}
```

Code outside the request can use the same object:

```php
$checkout = $app->retrieve(CheckoutService::class);

echo $checkout->checkout(1200); // charge-1200
```

::: info
`CheckoutService` is shared for the whole application, so it outlives a
single request in a long-running server. See
[Container Layers](/documentation/framework/core-concepts/layers).
:::

Without the provider, `retrieve()` throws, because the class is not
registered.

### Showcase: Reading Settings During Registration

The `register()` method can read configuration with `getParam()`, and a
closure can use the value when the service is created:

```php
namespace App\Provider;

use App\Payment\PaymentGatewayInterface;
use App\Payment\StripeGateway;
use Windwalker\DI\Container;
use Windwalker\DI\ServiceProviderInterface;

class PaymentProvider implements ServiceProviderInterface
{
    public function register(Container $container): void
    {
        $container->bindShared(
            PaymentGatewayInterface::class,
            fn(Container $container) => new StripeGateway(
                apiKey: $container->getParam('payment.stripe.key'),
            ),
        );
    }
}
```

The value is read when the service is first requested. This example
assumes `StripeGateway` takes a `string $apiKey` argument.

### Provider Interfaces

A provider can implement these interfaces. Each runs at a different time:

- `ServiceProviderInterface::register(Container $container)`: when the
  provider is registered. Use it for bindings.
- `BootableProviderInterface::boot(Container $container)`: right after
  registration, while configuration is still loading.
- `BootableDeferredProviderInterface::bootDeferred(Container $container)`:
  after all configuration sections are registered.
- `RequestBootableProviderInterface::bootBeforeRequest(Container $container)`:
  at the start of each web request, in the request container.
- `RequestReleasableProviderInterface::releaseAfterRequest(Container $container)`:
  at the end of each web request.

The request interfaces are from `Windwalker\Core\DI`. See
[Container Layers](/documentation/framework/core-concepts/layers#request-hooks)
for details.

```php
use Windwalker\DI\BootableDeferredProviderInterface;

class PaymentProvider implements
    ServiceProviderInterface,
    BootableDeferredProviderInterface
{
    public function register(Container $container): void
    {
        // Register bindings here.
    }

    public function bootDeferred(Container $container): void
    {
        $container->extend(
            \App\Payment\CheckoutService::class,
            function (\App\Payment\CheckoutService $checkout) {
                return $checkout;
            },
        );
    }
}
```

### Registering Providers

Register a provider in one of two ways:

- Add it to the `providers` key of a configuration section.
- Call `registerServiceProvider()` yourself, for example in a test:

```php
$container = new \Windwalker\DI\Container();
$container->registerServiceProvider(new PaymentProvider());
```

Configuration entries are resolved through the container and are usually
class names. A class listed in several sections is registered once.

::: tip
Keep provider constructor arguments registered in the container. An
unregistered class dependency stops the boot.
:::

::: info
`registerByConfig()` does not call `bootDeferred()`. A custom loader must
call it itself.
:::

::: warning
Shared objects that a provider creates in `boot()` live in the application
container. In a long-running server they persist across requests, so keep
per-request state out of them. See
[Container Layers](/documentation/framework/core-concepts/layers).
:::

## Injecting Dependencies

A class can receive a dependency in these ways.

### Constructor Injection

Declare the dependency as a typed constructor parameter. It is the preferred
style, and the class can be built by hand in a test:

```php
$service = new CheckoutService(new StripeGateway());
```

### Property Injection

Use `#[Inject]` on a property when a constructor is not practical. The
container fills it after creating the object:

```php
use Windwalker\DI\Attributes\Inject;

class ReportBuilder
{
    #[Inject]
    protected CheckoutService $checkout;
}
```

::: info
Only objects created by the container get their attributes processed. An
object created with `new` keeps its `#[Inject]` properties empty.
:::

### Injecting by Tag

Add `tag` to `#[Inject]` to pick one of several variants. The tag is passed to
the binding, as described in [Service Variants](/documentation/framework/core-concepts/service-variants).
Assume the interface is bound in `etc/di.config.php`:

```php
'bindings' => [
    PaymentGatewayInterface::class => function (
        Container $container,
        ?string $tag = null,
    ) {
        return match ($tag) {
            'paypal' => $container->newInstance(PaypalGateway::class),
            default => $container->newInstance(StripeGateway::class),
        };
    },
],
```

A service can then ask for a specific variant:

```php
class DonationService
{
    public function __construct(
        #[Inject(tag: 'paypal')]
        protected PaymentGatewayInterface $gateway,
    ) {}
}
```

Attribute values must be constants, so pass a string or an enum case, not a
closure. The full option list is on the
[DI attributes](/documentation/components/di/attributes) page.

### The Container Itself

The container registers itself, so a class can type-hint `Container`:

```php
use Windwalker\DI\Container;

class ReportExporter
{
    public function __construct(protected Container $container) {}
}
```

Use this only when the class must choose a service at runtime. Injecting the
container hides the real dependencies.

## Registering and Creating Services

Use `#[Service]` to register a class, and `#[Autowire]` to create a new
object on each injection.

### Auto-Registering Services with #[Service]

`#[Service]` lets a class be resolved without a binding. Put it on the class
to register it on first use:

```php
namespace App\Report;

use Windwalker\DI\Attributes\Service;

#[Service]
class ReportBuilder {}
```

`#[Service]` can also use on a parameter, will auto create and register the class if it is not registered.

```php
class ReportController
{
    public function __construct(
        #[Service]
        protected ReportBuilder $report,
    ) {}
}
```

::: warning
Carefully use `#[Service]` on parameters. It registers the class as a shared object,
so every controller that injects it uses the same instance, which can leak
state. Other developers may not notice that the class is now global, and
cause conflicts. Prefer declaring `#[Service]` on the class to make this
behavior explicit.
:::

Add `shared: false` to get a new object on every lookup:

```php
#[Service(shared: false)]
class ReportBuilder {}
```

::: tip
Prefer plain constructor injection for dependencies that are always needed.
Declare helper classes with class-level `#[Service]`.
:::

### Creating New Instances with #[Autowire]

`#[Autowire]` creates the dependency when it is not registered. If the
class is registered, the registered object is used. A new object is created
on every injection, and it is not stored in the container:

```php
namespace App\Report;

use Windwalker\DI\Attributes\Autowire;

class ReportBuilder {}

class ReportController
{
    public function __construct(
        #[Autowire]
        protected ReportBuilder $report,
    ) {}
}
```

Use `#[Autowire]` for classes that you do not want to register, and that
must not share state, such as a builder or a temporary helper. Each
controller gets its own `ReportBuilder`.

::: info
`#[Autowire]` checks the container first. A class with class-level
`#[Service]` is registered, so `#[Autowire]` returns the shared object. Use
one attribute per class, and choose `#[Autowire]` for classes that stay
unregistered.
:::

The attribute is available on parameters and properties in the default
attribute set. For the full behavior and class-level use, see the
[DI attributes](/documentation/components/di/attributes) page.

## Application Methods

The application shortcuts delegate to its container:

- `retrieve($id)`: returns a registered service. It throws an exception
  when the ID is not registered.
- `make($class, $args)`: creates a new object on every call. It does not
  register the class.
- `service($class, $args)`: creates the object and registers it as
  shared on the first call. Later calls return the same object.
- `bind($id, $value)`: binds an ID to a class, an object, or a closure.
  See the [container binding rules](/documentation/components/di/basic-usage).
- `resolve($source)`: resolves a config path, class name, or callable.

```php
$pdf = $app->make(\App\Report\PdfRenderer::class);
$mailer = $app->service(\App\Mail\Mailer::class);
```

Use `retrieve()` for services that are already registered, and `service()`
for a class that should be created on first use.

## Further Reading

The DI component documentation covers the container API in depth:

- [Basic Usage](/documentation/components/di/basic-usage): creating,
  binding, and sharing objects.
- [Attributes](/documentation/components/di/attributes): every built-in
  attribute, with its options.
- [Tagged Services](/documentation/components/di/tagged-services): tags and
  factories in detail.
- [Lazy Loading](/documentation/components/di/lazy): lazy proxies and their
  limits.
- [Parameters](/documentation/components/di/parameters): parameter factories
  and references.
- [Multi Levels](/documentation/components/di/multi-levels): child containers.
