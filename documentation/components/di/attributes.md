---
layout: doc
title: Attributes
component: di
---

# Attributes

The container can resolve attributes as decorators. Register each attribute for the targets where it should be
processed. Call `registerDefaultAttributes()` to register the built-in attributes for their default target types.

| Attribute | Default handler targets |
| --- | --- |
| `Decorator` | Classes |
| `Autowire` | Classes, callables, and parameters |
| `Inject` | Properties and parameters |
| `Setup` | Methods |
| `Service` | Properties and parameters |
| `Lazy` | Properties |

Class-level `Service`, `Isolation`, and `Lazy` markers, parameter-level `NoAutowire` and `Lazy` markers, and
`Factory` are also recognized directly during resolution; they do not need a registered attribute handler.

## #[Autowire]

For example, if you create a class with dependencies which has not set to container,
you will get error.

```php
class Flower
{
    public function __construct(public Sakura $sakura) 
    {}
}

$container->newInstance(Flower::class); // Error
```

Use `#[Autowire]` to create the dependency automatically. Register it for constructor parameters:

```php
use Windwalker\Attributes\AttributeType;
use Windwalker\DI\Attributes\Autowire;

// Register it
$container->getAttributesResolver()
    ->registerAttribute(Autowire::class, AttributeType::PARAMETERS);

class Flower
{
    public function __construct(#[Autowire] public Sakura $sakura) 
    {}
}

$flower = $container->newInstance(Flower::class); // No error

$flower->sakura; // Sakura object
```

When `Sakura` is not registered, autowiring creates a new dependency for each `Flower`:

```php
$flower1 = $container->newInstance(Flower::class);
$flower2 = $container->newInstance(Flower::class);

$flower1->sakura !== $flower2->sakura;
```

More about using attribute decorators, please see [Attributes Document](../attributes/)

`#[Autowire]` can also be applied to a class to enable autowiring for its constructor dependencies. Register the class
target or call `registerDefaultAttributes()`:

```php
use Windwalker\DI\Attributes\Autowire;

$container->registerDefaultAttributes();

#[Autowire]
class Flower
{
    public function __construct(public Sakura $sakura) {}
}

$flower = $container->newInstance(Flower::class);
```

## #[NoAutowire]

`#[NoAutowire]` prevents automatic creation of one constructor or method parameter, even when autowiring is enabled.
Use it when a parameter should keep its default value instead of being resolved automatically. An argument supplied
explicitly to `newInstance()` or `call()` still takes precedence:

```php
use Windwalker\DI\Attributes\NoAutowire;
use Windwalker\DI\DIOptions;

class ReportController
{
    public function __construct(
        #[NoAutowire]
        public ?OptionalLogger $logger = null,
    ) {}
}

$controller = $container->newInstance(
    ReportController::class,
    options: new DIOptions(autowire: true),
);
```

## #[Inject]

`#[Inject]` injects a dependency into a property or a constructor or method parameter. It works only on objects that the container creates.

### Resolution

For each target, the container:

1. Reads the type from the `id` argument, or from the first class or interface type.
2. Returns the registered service for that ID and tag, if one exists.
3. Otherwise, creates a concrete class. The created object is not registered.

Register an interface before you inject it. The container does not create interfaces.

```php
use Windwalker\Attributes\AttributeType;
use Windwalker\DI\Attributes\Inject;

// Register attribute.
$container->getAttributesResolver()
    ->registerAttribute(Inject::class, AttributeType::PROPERTIES | AttributeType::PARAMETERS);

// Prepare it.
$container->prepareSharedObject(Sakura::class);

class Flower
{
    #[Inject]
    public Sakura $sakura;

    public function __construct() 
    {}
}

$flower = $container->newInstance(Flower::class);

$flower->sakura; // Sakura object
```

### Tags

Pass a string or an enum case as the `tag`. Attribute values must be
constant expressions, so a closure cannot be used here:

```php
class Dashboard
{
    #[Inject(tag: 'claude')]
    public ChatModelInterface $claude;

    #[Inject(tag: ChatModelDriver::GPT)]
    public ChatModelInterface $gpt;
}
```

The container passes the tag to the binding. Bind the interface with a
closure that reads the tag, as shown on the
[Service Variants](/documentation/framework/core-concepts/dependency-injection/service-variants)
page. If no entry matches the tag, the untagged entry is used when it exists.

### Options

`id` overrides the type-hinted ID. `forceNew` creates a new value instead of
returning the cached one. `tag` selects the tagged entry. This example uses
all three:

```php
public function __construct(
    #[Inject(id: Sakura::class, forceNew: true, tag: 'fresh')]
    public Sakura $sakura,
) {}
```

Parameters work the same way:

```php
    public function __construct(#[Inject] public Sakura $sakura) 
    {}
```

Or directly set a class name:

```php
    #[Inject(Sakura::class)]
    protected FlowerInterface $flower;
```

## #[Service]

`#[Service]` resolves a shared service for a property or parameter, without a
separate binding. Register it for constructor parameters:

```php
use Windwalker\Attributes\AttributeType;
use Windwalker\DI\Attributes\Service;

// Register attribute.
$container->getAttributesResolver()
    ->registerAttribute(Service::class, AttributeType::PARAMETERS);

class Flower
{
    public function __construct(#[Service] public Sakura $sakura) 
    {}
}

$flower1 = $container->newInstance(Flower::class);
$flower2 = $container->newInstance(Flower::class);

// Same
$flower1->sakura === $flower2->sakura;
```

You can also direct a class name:

```php
    public function __construct(#[Service(Foo::class)] public FooInterface $foo) 
    {}
```

### Registering a Class

Put `#[Service]` on a class to let the container resolve it by class name,
without a binding:

```php
use Windwalker\DI\Attributes\Service;

// ...

#[Service]
class Foo 
{
    //
}
```

The container creates and stores the service on first resolution:

```php
$foo = $container->get(Foo::class);
```

### Non-Shared Services

`shared: false` creates a new object on every lookup:

```php
#[Service(shared: false)]
class ReportBuilder {}
```

### Tagged Services

`tag` registers the class for one tag only. A lookup without that tag throws
`DefinitionNotFoundException`:

```php
#[Service(tag: 'claude')]
class ClaudeDriver implements ChatModelInterface {}

$container->get(ClaudeDriver::class, tag: 'claude');
```

### Level Checks

Combine `providedIn` with `shared: false`. The level is then checked on
every lookup.

The `providedIn` argument restricts a service to specified container levels. For example, this declaration allows
resolution at level 2:

```php
#[Service(providedIn: 2, shared: false)]
class Foo {}
```

```php
// Level 1
$foo = $parentContainer->get(Foo::class); // Error

// Level 2
$foo = $parentContainer->createChild()->get(Foo::class); // OK
```

The `providedIn` argument accepts an integer or an array of container levels:

```php
#[Service(providedIn: [2, 3, 4], shared: false)]
class Foo {}
```

For programmatically configured definitions, `DIOptions(providedIn: ...)` also accepts a callback that receives the
current container level and returns whether the definition is available:

```php
$container->bind(
    Foo::class,
    Foo::class,
    options: new \Windwalker\DI\DIOptions(
        providedIn: static fn(int $level): bool => $level >= 2,
    ),
);
```

`#[Service]` also accepts a `tag`; resolve the service using the same tag. The `shared` option defaults to `true`.


### Choosing Inject or Service

- `#[Inject]` uses a service that is already registered. For an unregistered
  concrete class, it creates a new object and does not register it.
- `#[Service]` makes the class resolvable by itself. The container registers
  it on first use.

## `#[Isolation]`

`#[Isolation]` separates a shared service's cache between parent and child containers. By default, a child reuses the
parent's shared instance.

```php
$parentContainer->prepareSharedObject(Foo::class);

$foo1 = $parentContainer->get(Foo::class);

$childContainer = $parentContainer->createChild();

$foo2 = $childContainer->get(Foo::class);

$foo1 === $foo2; // TRUE
```

If we add `#[Isolation]` to `Foo` class, the child container will get a new instance.

```php
use Windwalker\DI\Attributes\Isolation;

#[Isolation]
class Foo 
{
    //
}

// ...

$parentContainer->prepareSharedObject(Foo::class);

$foo1 = $parentContainer->get(Foo::class);

$childContainer = $parentContainer->createChild();

$foo2 = $childContainer->get(Foo::class);

$foo1 === $foo2; // FALSE
```

## `#[Decorator]`

`#[Decorator]` wraps a class-created object in another class. Register the built-in attributes before creating the
decorated class. The decorator receives the original object as its first constructor argument; additional arguments
can be supplied to the attribute.

```php
use Windwalker\DI\Attributes\Decorator;

$container->registerDefaultAttributes();

#[Decorator(CachedRepository::class)]
class Repository {}

class CachedRepository
{
    public function __construct(public Repository $inner) {}
}

$repository = $container->newInstance(Repository::class);
```

`Decorator` can be repeated on a class to apply multiple wrappers.

## `#[Setup]`

Mark a method with `#[Setup]` to invoke it when the container creates the object. Register the built-in attributes with
`registerDefaultAttributes()` or register `Setup` for method targets:

```php
use Windwalker\DI\Attributes\Setup;

$container->registerDefaultAttributes();

class Cache
{
    #[Setup]
    public function initialize(): void
    {
        // Initialize the cache after construction.
    }
}
```

## `#[Factory]`

`#[Factory]` marks a closure that a callable returns as a factory. When you
pass a callable to `newInstance()`, the container calls it through
`Container::call()`. If the returned closure has `#[Factory]`, the container
resolves that closure instead. Its parameters are autowired, and its result
gets the member attributes. The attribute does not need a registered handler.

The attribute goes on the returned closure, not on the outer callable. Use it
when the inner closure needs services from the container:

```php
use Windwalker\DI\Attributes\Factory;

$container->set(SomeService::class, new SomeService());

$greeter = $container->newInstance(
    static fn() => #[Factory]
    static fn(SomeService $service): Greeter => new Greeter($service),
);
```

The inner closure is resolved only when it has `#[Factory]`. Without the
attribute, the closure is returned as it is:

```php
// Returns a Closure, not a Greeter.
$closure = $container->newInstance(
    static fn() => static fn(SomeService $service): Greeter
        => new Greeter($service),
);
```

`Container::resolve()` with a callable follows the same path.

### Named Methods

A method can return a factory too. Put `#[Factory]` on the method and return
it as a first-class callable:

```php
use Windwalker\DI\Attributes\Factory;

class GreeterFactory
{
    // Put the attribute on build(), because make() returns build(...).
    #[Factory]
    public function build(SomeService $service): Greeter
    {
        return new Greeter($service);
    }

    public function make(): \Closure
    {
        return $this->build(...);
    }
}

$greeter = $container->newInstance([new GreeterFactory(), 'make']);
```

### Arguments and Options

The `$args` and `DIOptions` of the outer call are passed to the inner
resolution. Both calls use the same values:

```php
use Windwalker\DI\DIOptions;

$greeter = $container->newInstance(
    static fn(string $name) => #[Factory]
    static fn(SomeService $service, string $name): Greeter
        => new Greeter($service, $name),
    ['name' => 'Alice'],
    new DIOptions(autowire: true),
);
```

Without `autowire: true`, the container must already have `SomeService`.
Otherwise it throws an error:

```php
// ERROR: DependencyResolutionException: Cannot resolve argument 1:
//        $service for ...
$container->newInstance(
    static fn() => #[Factory]
    static fn(SomeService $service): Greeter => new Greeter($service),
);
```

## `#[Lazy]`

`#[Lazy]` requests a PHP 8.4 lazy proxy for a class or dependency. For class-wide, per-call, parameter, and property
usage and the proxy limitations, see [Lazy Loading](./lazy).

## Registering custom attributes

```php
use Windwalker\Attributes\AttributeType;

$resolver = $container->getAttributesResolver();
$resolver->registerAttribute(MyAttribute::class, AttributeType::CLASSES);
```

See the [Attributes component](../attributes/).

## Ignore Attributes

Use `DIOptions(ignoreAttributes: true)` to skip all attributes while creating an object:

```php
use Windwalker\DI\DIOptions;

$container->newInstance(Foo::class, options: new DIOptions(ignoreAttributes: true));
```
