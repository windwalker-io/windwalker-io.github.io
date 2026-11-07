---
layout: doc
title: Miscellaneous
component: attributes
---

# Miscellaneous

## `AttributeHandler`

`AttributeHandler` is passed to every attribute's `__invoke()` method. It exposes the wrapped handler, reflection target, associated object, resolver, and options.

| Method | Return type | Description |
| --- | --- | --- |
| `__invoke(&...$args)` | `mixed` | Calls the previous handler with the supplied arguments. |
| `get()` | `callable` | Returns the previous handler. |
| `set(callable $handler)` | `static` | Replaces the previous handler. |
| `getReflector()` | `Reflector` | Returns the reflection object for the current target. |
| `getObject()` | `mixed` | Returns the associated instance when the target belongs to an object. |
| `getResolver()` | `AttributesResolver` | Returns the resolver that is running the attribute. |
| `getOptions()` | `array` | Returns the options passed to this handler. |
| `setOptions(array $options)` | `static` | Replaces the handler options. |

The reflection object depends on the target: class creation uses `ReflectionClass`, object decoration uses `ReflectionObject`, callable resolution uses callable reflection, parameters use `ReflectionParameter`, and properties use `ReflectionProperty`.

## `AttributesAwareTrait`

`AttributesAwareTrait` lazily creates an `AttributesResolver` and allows it to be replaced.

```php
use Windwalker\Attributes\AttributesAwareTrait;
use Windwalker\Attributes\AttributesResolver;

$component = new class {
    use AttributesAwareTrait;
};

$resolver = $component->getAttributesResolver();
$component->setAttributesResolver(new AttributesResolver());
```

## Attribute lookup

`Windwalker\Attributes\AttributesAccessor` is deprecated. Use `Windwalker\Utilities\Attributes\AttributesAccessor` for direct reflection-based lookup. `runAttributeIfExists()` returns the number of matching attributes and passes each instantiated attribute and the original source to the callback.

```php
use ReflectionObject;
use Windwalker\Utilities\Attributes\AttributesAccessor;

$object = new ExampleObject();
$count = AttributesAccessor::runAttributeIfExists(
    new ReflectionObject($object),
    ExampleAttribute::class,
    static function (ExampleAttribute $attribute, mixed $source): void {
        // Inspect the attribute instance.
    }
);
```

## Resolver API

The resolver accepts an options array on its constructor. The per-call `options` arrays for resolving methods, properties, and callables support `excludes`, a list of attribute class names that should be skipped.

| Method | Signature | Description |
| --- | --- | --- |
| `createObject()` | `createObject(string $class, ...$args): object` | Creates an object and applies registered class attributes. |
| `decorateObject()` | `decorateObject(object $object, array $options = []): object` | Applies class attributes to an existing object. |
| `resolveClassCreate()` | `resolveClassCreate(string $class, ?callable $builder = null, array $options = []): AttributeHandler` | Builds the class-creation handler. |
| `call()` | `call(callable $callable, array $args = [], ?object $context = null, array $options = []): mixed` | Resolves callable and parameter attributes, then invokes the callable. |
| `resolveCallable()` | `resolveCallable(mixed $callable, ?object $context = null, array $options = []): callable` | Returns the callable wrapped by registered callable attributes. |
| `resolveProperties()` | `resolveProperties(object $instance, array $options = []): object` | Runs handlers for registered property attributes. |
| `resolveMethods()` | `resolveMethods(object $instance, array $options = []): object` | Runs handlers for registered method attributes. |
| `resolveConstants()` | `resolveConstants(object $instance, array $options = []): object` | Runs handlers for registered class-constant attributes. |
| `resolveObjectMembers()` | `resolveObjectMembers(object $instance, array $options = []): object` | Runs constant, property, and method resolution. |
| `resolveParameter()` | `resolveParameter(mixed &$value, ReflectionParameter $ref, array $options = []): mixed` | Applies parameter attributes to a value. |
| `registerAttribute()` | `registerAttribute(string $attributeClass, int $target = Attribute::TARGET_ALL): static` | Registers a class for one or more target bits. |
| `removeAttribute()` | `removeAttribute(string $attributeClass, int $target = Attribute::TARGET_ALL): static` | Removes a class from one or more target bits. |
| `hasAttribute()` | `hasAttribute(string\|ReflectionAttribute $attributeClass, int $target = Attribute::TARGET_ALL): bool` | Checks whether the class is registered for a target. |
| `setBuilder()` | `setBuilder(Closure $builder): static` | Sets the object builder inherited from `ObjectBuilder`. |
| `setInvokeHandler()` | `setInvokeHandler(callable $invokeHandler): static` | Replaces callable invocation performed by `call()`. |
