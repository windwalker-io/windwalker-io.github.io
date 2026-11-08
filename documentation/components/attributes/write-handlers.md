---
layout: doc
title: Write Your Own Attribute Handlers
component: attributes
---

# Write Your Own Attribute Handlers

An attribute handler is an invokable attribute class that receives an `AttributeHandler` and returns a callable. The returned callable wraps the previous handler, which is available by invoking `$handler` with the same arguments.

`AttributeInterface` documents this contract. The resolver does not require the interface, but the attribute object must be callable and its `__invoke()` method must return a callable.

Each member type passes a different value to `$handler()` and expects a different result. Use this table as a reference while reading the examples below:

| Member | Resolver method | `$handler()` returns | What your wrapper should return |
|--------|-----------------|----------------------|----------------------------------|
| Class | `createObject()`, `decorateObject()` | `object` (the created or existing instance) | `object`, returned to the caller |
| Method | `resolveMethods()` | `array` callable, `[object, 'methodName']` | Ignored by `resolveMethods()`; the resolver returns `$instance` |
| Property | `resolveProperties()` | `mixed` (current property value) | Ignored; assign the value through `ReflectionProperty` |
| Parameter | `call()` | `mixed` (the argument value) | `mixed`, used as the argument passed to the callable |
| Callable (function or method) | `call()` | `mixed` (the callable's result) | `mixed`, returned by `call()` |

## The AttributeHandler object

Every attribute handler receives an `AttributeHandler`. It wraps the next handler in the chain and gives access to the target being resolved.

Public properties:

- `$handler`: `callable`, the wrapped next handler. `$handler()` is the same as calling this property.
- `$reflector`: `Reflector`, the reflection object of the target.
- `$object`: `?object`, the instance the member belongs to.
- `$resolver`: `AttributesResolver`, the resolver that runs the attribute.
- `$options`: `array`, the merged resolver and call options.

These properties can be read from outside the class, but only the handler can write them.

Methods:

- `__invoke(...$args): mixed`: calls the wrapped handler. Same as `$handler(...$args)`.
- `get(): callable`: returns the wrapped handler.
- `set(callable $handler): static`: replaces the wrapped handler and returns `$this`.
- `getReflector(): Reflector`: returns the reflection object.
- `getResolver(): AttributesResolver`: returns the resolver.
- `getObject(): mixed`: returns the instance, or `null` when there is none.
- `getOptions(): array`: returns the options by reference, so `$opts = &$handler->getOptions();` modifies the handler's own options.
- `setOptions(array $options): static`: replaces all options and returns `$this`.

The reflector type and object depend on the target:

| Member | `getReflector()` returns | `getObject()` returns |
|--------|--------------------------|------------------------|
| Class (`createObject()`) | `ReflectionClass` | `null` |
| Class (`decorateObject()`) | `ReflectionObject` | `null` |
| Method (`resolveMethods()`) | `ReflectionMethod` | The instance |
| Property (`resolveProperties()`) | `ReflectionProperty` | The instance |
| Parameter (`call()`) | `ReflectionParameter` | `null` |
| Callable (`call()`) | The callable's reflector | The bound context, if any |

`getObject()` is `null` for `decorateObject()` even though the decorated instance is the value your wrapper receives from `$handler()`. Use the value returned by `$handler()` instead.

```php
#[\Attribute(\Attribute::TARGET_PROPERTY)]
final class Info implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
        return function () use ($handler): mixed {
            // ReflectionProperty, so the property name is available.
            $name = $handler->getReflector()->getName();

            // The Profile instance that owns the property.
            $owner = $handler->getObject();

            // Current value of the property, before the chain continues.
            $value = $handler();

            echo "{$name} on " . $owner::class . ": {$value}\n";

            return $value;
        };
    }
}
```

## Class attributes and object construction

For class attributes, the wrapped handler creates the original object. Use `createObject()` to create and decorate an instance, or `decorateObject()` to decorate an existing object.

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
        // $handler(...$args) returns object: the created or existing Service.
        // The wrapper returns a DecoratedObject instead.
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

// Type: DecoratedObject. The Service is created by the original builder.
$created = $resolver->createObject(Service::class);

// Type: DecoratedObject. The existing Service instance is wrapped.
$decorated = $resolver->decorateObject(new Service());
```

`createObject(string $class, ...$args)` resolves constructor parameters before creating the instance. `decorateObject(object $object, array $options = [])` starts with the existing object. Both apply registered class attributes.

## Custom object builder

`AttributesResolver` inherits `setBuilder(Closure $builder)` from `ObjectBuilder`. Use it in standalone integrations when object creation should be delegated to another builder.

```php
use Windwalker\Attributes\AttributesResolver;
use Windwalker\DI\Container;

$resolver = new AttributesResolver();
$container = new Container();
$resolver->setBuilder(
    static fn (string $class, ...$args): object => $container->newInstance($class, $args)
);
```

## Method attributes

`resolveMethods()` runs the handlers for registered method attributes. The value returned by `$handler()` is the method callable, such as `[$object, 'onEvent']`; the method itself is not called by `resolveMethods()`.

Functions do not have a separate scanning method. To wrap a function, register its attribute as `AttributeType::CALLABLE` and invoke it through `call()`.

```php
use Windwalker\Attributes\AttributeHandler;
use Windwalker\Attributes\AttributeInterface;
use Windwalker\Attributes\AttributeType;
use Windwalker\Attributes\AttributesResolver;

#[\Attribute(\Attribute::TARGET_METHOD)]
final class DiscoverMethod implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
        return function () use ($handler): mixed {
            // $method is array: [$subscriber, 'onEvent'].
            // This is the callable, not the method's return value.
            $method = $handler();

            // getObject() returns the Subscriber instance.
            $handler->getObject()->methods[] = $method;

            // Ignored by resolveMethods(), so the return value does not matter.
            return $method;
        };
    }
}

final class Subscriber
{
    public array $methods = [];

    #[DiscoverMethod]
    public function onEvent(): void
    {
    }
}

$resolver = new AttributesResolver();
$resolver->registerAttribute(DiscoverMethod::class, AttributeType::METHODS);
$subscriber = new Subscriber();

// Runs each method wrapper once. Returns $subscriber.
// After this call, $subscriber->methods holds one callable.
$resolver->resolveMethods($subscriber);
```

## Callable and parameter attributes

`call()` applies registered callable attributes and parameter attributes before invoking a method, function, closure, or other callable. The optional context is bound to a non-static callable.

```php
use Windwalker\Attributes\AttributeHandler;
use Windwalker\Attributes\AttributeInterface;
use Windwalker\Attributes\AttributeType;
use Windwalker\Attributes\AttributesResolver;

#[\Attribute(\Attribute::TARGET_PARAMETER)]
final class Uppercase implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
        // $handler() returns mixed: the argument value, 'flower'.
        // The wrapper returns string: 'FLOWER', which replaces the argument.
        return fn (): string => strtoupper((string) $handler());
    }
}

#[\Attribute(\Attribute::TARGET_FUNCTION | \Attribute::TARGET_METHOD)]
final class AddPrefix implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
        // $handler(...$args) returns mixed: the method's result.
        // The wrapper returns string: 'value:' prefixed to that result.
        return fn (...$args): string => 'value:' . $handler(...$args);
    }
}

$resolver = new AttributesResolver();
$resolver->registerAttribute(Uppercase::class, AttributeType::PARAMETERS);
$resolver->registerAttribute(AddPrefix::class, AttributeType::CALLABLE);

$format = new class {
    #[AddPrefix]
    public function format(#[Uppercase] string $value): string
    {
        return $value;
    }
};

// Type: string. The value is 'value:FLOWER'.
$result = $resolver->call([$format, 'format'], ['flower']);
```

`call(callable $callable, array $args = [], ?object $context = null, array $options = []): mixed` accepts positional and named arguments. A callable attribute can change the arguments passed to `$handler(...)` or transform the returned value. The final options array supports `excludes`, a list of attribute class names to skip.

To replace the invocation mechanism, call `setInvokeHandler(callable $invokeHandler)`. When configured, `call()` delegates directly to this handler with the callable, argument array, and context; it does not run the resolver's normal callable and parameter processing.

## Property attributes

`resolveProperties()` passes the current property value to the attribute handler. A handler that wants to replace a property value must write it through the `ReflectionProperty`; returning a transformed value alone does not assign it.

```php
use ReflectionProperty;
use Windwalker\Attributes\AttributeHandler;
use Windwalker\Attributes\AttributeInterface;
use Windwalker\Attributes\AttributeType;
use Windwalker\Attributes\AttributesResolver;

#[\Attribute(\Attribute::TARGET_PROPERTY)]
final class TrimValue implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
        return function () use ($handler): string {
            // $handler() returns mixed: the current property value.
            $value = trim((string) $handler());

            // Assigning is required. Returning $value alone does not
            // change the property.
            /** @var ReflectionProperty $property */
            $property = $handler->getReflector();
            $property->setValue($handler->getObject(), $value);

            // Ignored by resolveProperties().
            return $value;
        };
    }
}

final class Profile
{
    #[TrimValue]
    public string $name = '  Windwalker  ';
}

$resolver = new AttributesResolver();
$resolver->registerAttribute(TrimValue::class, AttributeType::PROPERTIES);

// $profile->name is now 'Windwalker'.
$profile = new Profile();
$resolver->resolveProperties($profile);
```
