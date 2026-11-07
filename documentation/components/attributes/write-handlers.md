---
layout: doc
title: Write Your Own Attribute Handlers
component: attributes
---

# Write Your Own Attribute Handlers

An attribute handler is an invokable attribute class that receives an `AttributeHandler` and returns a callable. The returned callable wraps the previous handler, which is available by invoking `$handler` with the same arguments.

`AttributeInterface` documents this contract. The resolver does not require the interface, but the attribute object must be callable and its `__invoke()` method must return a callable.

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

$created = $resolver->createObject(Service::class);
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
            $method = $handler();
            $handler->getObject()->methods[] = $method;

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
        return fn (): string => strtoupper((string) $handler());
    }
}

#[\Attribute(\Attribute::TARGET_FUNCTION | \Attribute::TARGET_METHOD)]
final class AddPrefix implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
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
            $value = trim((string) $handler());

            /** @var ReflectionProperty $property */
            $property = $handler->getReflector();
            $property->setValue($handler->getObject(), $value);

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

$profile = new Profile();
$resolver->resolveProperties($profile);
```
