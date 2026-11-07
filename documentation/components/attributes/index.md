---
layout: doc
title: Attributes
component: attributes
---

# Attributes

The `windwalker/attributes` package provides `AttributesResolver` for registering PHP attributes and applying their handlers during object creation, callable execution, and method, property, or parameter resolution. `AttributeType` selects the targets to handle, while `AttributeInterface` and `AttributeHandler` define the handler contract and its context.

## Installation

```bash
composer require windwalker/attributes ^4.0
```

The package requires PHP 8.4.6 or later.

## Use as Standalone Component

Register an attribute class for its target, then use `AttributesResolver` to create or decorate an object. An attribute handler receives the previous handler and returns a callable that wraps it.

```php
use Windwalker\Attributes\AttributeHandler;
use Windwalker\Attributes\AttributeInterface;
use Windwalker\Attributes\AttributeType;
use Windwalker\Attributes\AttributesResolver;

#[\Attribute(\Attribute::TARGET_CLASS)]
final class Decorate implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
        return fn (...$args): DecoratedObject => new DecoratedObject($handler(...$args));
    }
}

final class DecoratedObject
{
    public function __construct(public object $inner)
    {
    }
}

#[Decorate]
final class Service
{
}

$resolver = new AttributesResolver();
$resolver->registerAttribute(Decorate::class, AttributeType::CLASSES);

$decorated = $resolver->createObject(Service::class);
```

For other target types and resolver operations, see [Available Types & Actions](./available-type-actions). To implement handlers, see [Write Your Own Attribute Handlers](./write-handlers).

## Use in Windwalker Application

Windwalker DI uses an `AttributesResolver` integrated with the application container. Register custom attribute classes in a DI configuration file; when the application loads that configuration, the container applies registered class attributes as it creates objects.

For example, add the attribute from the standalone example to the application's DI configuration:

```php
// etc/di.config.php

use Windwalker\Attributes\AttributeType;

return [
    // ...

    'attributes' => [
        Decorate::class => AttributeType::CLASSES,
    ],
];
```

Use the existing application container to create the object:

```php
#[Decorate]
class Service
{
    // ...
}

$decorated = $container->newInstance(Service::class);
```

The container uses its configured resolver for object creation, so no separate `AttributesResolver` or `Container` needs to be instantiated.

## Core API

| API | Purpose |
| --- | --- |
| `AttributesResolver` | Registers attribute classes and applies their handlers to object creation, callable execution, and registered methods, properties, or parameters. |
| `AttributeType` | Provides target flags, including the Windwalker-specific `CALLABLE` target. |
| `AttributeInterface` | Defines the invokable attribute handler contract; `__invoke()` returns a callable. |
| `AttributeHandler` | Exposes the previous handler, reflection target, associated object, resolver, and options to an attribute handler. |

## Related components

- [DI](../di/)
- [Utilities](../utilities/)
