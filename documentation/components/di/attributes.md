---
layout: doc
title: Attributes
component: di
---

# Attributes

The container can resolve attributes as decorators. Register each attribute for the targets where it should be
processed. Call `registerDefaultAttributes()` to register the built-in attributes for their default target types.

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

`#[Inject]` injects a class-typed dependency into a property or parameter. The container uses a registered service when
available; otherwise, it creates the class. Register or bind interfaces to concrete services before injecting them.

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

`#[Inject]` accepts `id`, `forceNew`, and `tag`. `id` overrides the type-hinted service ID, `forceNew` bypasses a
registered definition's cached value, and `tag` selects a tagged definition:

```php
public function __construct(
    #[Inject(id: Sakura::class, forceNew: true, tag: 'fresh')]
    public Sakura $sakura,
) {}
```

`#[Inject]` can also use on parameters:

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

`#[Service]` resolves an injectable service and shares it by default. Register it for constructor parameters:

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

### Declare Service

`#[Service]` can also declare a class as a shared service. The container recognizes this class-level attribute when the
service is resolved by class name:

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

### Provided In

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

`#[Factory]` marks a closure returned by a callable passed to `newInstance()` as a factory definition. The container
resolves the returned closure instead of returning the closure itself:

```php
use Windwalker\DI\Attributes\Factory;

$service = $container->newInstance(
    static fn() => #[Factory]
    static fn(): ReportService => new ReportService(),
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
