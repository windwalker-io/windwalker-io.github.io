---
layout: doc
title: Available Types & Actions
component: attributes
---

# Available Types & Actions

Use `registerAttribute()` to enable an attribute class for one or more resolver targets. Native targets use the corresponding PHP `Attribute::TARGET_*` bit; `CALLABLE` is an additional Windwalker target used by `AttributesResolver::call()`.

| Target | PHP attribute target | Resolver behavior |
| --- | --- | --- |
| `AttributeType::CLASSES` | `Attribute::TARGET_CLASS` | Decorates class creation or an existing object. |
| `AttributeType::CLASS_CONSTANTS` | `Attribute::TARGET_CLASS_CONSTANT` | Runs handlers for attributed class constants when `resolveConstants()` is called. |
| `AttributeType::METHODS` | `Attribute::TARGET_METHOD` | Runs handlers for attributed methods when `resolveMethods()` is called. |
| `AttributeType::FUNCTIONS` | `Attribute::TARGET_FUNCTION` | Registration bit for function attributes. There is no separate function-scanning method; use `CALLABLE` to wrap a function invoked through `call()`. |
| `AttributeType::PROPERTIES` | `Attribute::TARGET_PROPERTY` | Runs handlers for attributed properties when `resolveProperties()` is called. |
| `AttributeType::PARAMETERS` | `Attribute::TARGET_PARAMETER` | Transforms the argument value while `call()` resolves callable arguments. |
| `AttributeType::CALLABLE` | Windwalker-specific | Wraps an attributed method, function, closure, or other callable when `call()` is used. |
| `AttributeType::ALL` | All resolver target bits | Combines all six native targets and the Windwalker `CALLABLE` target. |

`registerAttribute(string $attributeClass, int $target = Attribute::TARGET_ALL): static` is chainable. The default PHP target mask does not include Windwalker's custom `CALLABLE` bit; register `AttributeType::CALLABLE` explicitly when needed. Multiple calls for the same class add target bits.

```php
use Windwalker\Attributes\AttributeType;
use Windwalker\Attributes\AttributesResolver;

$resolver = new AttributesResolver();
$resolver->registerAttribute(MyAttribute::class, AttributeType::METHODS);
$resolver->registerAttribute(CallableAttribute::class, AttributeType::CALLABLE);
```

## Class and object attributes

Use `createObject()` to construct and decorate an instance, or `decorateObject()` to decorate an existing instance.

```php
$resolver->registerAttribute(Decorator::class, AttributeType::CLASSES);

$created = $resolver->createObject(Service::class, $constructorArgument);
$decorated = $resolver->decorateObject($existingObject);
```

## Methods and callables

`resolveMethods()` invokes the registered method handlers; the wrapped value passed to each handler is the method callable. Use `call()` when a callable itself or its parameters need to be wrapped.

```php
$resolver->registerAttribute(Listener::class, AttributeType::METHODS);
$resolver->resolveMethods($subscriber);

$resolver->registerAttribute(CallableAttribute::class, AttributeType::CALLABLE);
$result = $resolver->call($callable, ['value' => 'input'], $context);
```

The `$args` argument to `call()` is an array and may use positional or named keys. The optional context is bound to non-static closures before invocation.

## Properties and parameters

Property handlers can read or update the property through `AttributeHandler`. Parameter handlers transform the argument value passed to the callable.

```php
$resolver->registerAttribute(PropertyAttribute::class, AttributeType::PROPERTIES);
$resolver->resolveProperties($object);

$resolver->registerAttribute(ParameterAttribute::class, AttributeType::PARAMETERS);
$result = $resolver->call($callable, ['flower']);
```

## Class constants

Register the class-constant attribute with `AttributeType::CLASS_CONSTANTS`, then call `resolveConstants()` on the object whose class constants should be processed.

```php
use Windwalker\Attributes\AttributeHandler;
use Windwalker\Attributes\AttributeInterface;
use Windwalker\Attributes\AttributeType;
use Windwalker\Attributes\AttributesResolver;

#[\Attribute(\Attribute::TARGET_CLASS_CONSTANT)]
final class DescribeConstant implements AttributeInterface
{
    public function __invoke(AttributeHandler $handler): callable
    {
        return function () use ($handler): mixed {
            [$object, $constant] = $handler();
            $object->constants[$constant->getName()] = $constant->getValue();

            return [$object, $constant];
        };
    }
}

final class ConstantCatalog
{
    public array $constants = [];

    #[DescribeConstant]
    public const VERSION = '1.0';
}

$resolver = new AttributesResolver();
$resolver->registerAttribute(DescribeConstant::class, AttributeType::CLASS_CONSTANTS);

$catalog = new ConstantCatalog();
$resolver->resolveConstants($catalog);
```
