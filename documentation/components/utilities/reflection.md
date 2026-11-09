---
layout: doc
title: Reflection
component: utilities
---

# Reflection

Most code should read and write an object through its public API. Some
tasks need the other path: a test that checks a private cache, a dump
helper that shows protected state, or an adapter that fills a value
object from a row. Raw PHP Reflection can do this, but every call needs
the same setup, and the type handling is easy to get wrong.
`ReflectAccessor` wraps these operations in static helpers. It reads and
writes members regardless of visibility, and it can convert the incoming
value to the declared type.

## Minimal Setup

`ReflectAccessor` is a static class. Call its methods directly:

```php
use Windwalker\Utilities\Reflection\ReflectAccessor;

class Counter
{
    private int $count = 3;
}

ReflectAccessor::getValue(new Counter(), 'count'); // 3
```

## Showcase: Filling a Value Object From a Row

The following example fills a value object from an associative array, such
as a database row. Strings from the database are converted to the declared
types:

```php
use Windwalker\Utilities\Reflection\ReflectAccessor;

final class Product
{
    private int $id = 0;

    private float $price = 0.0;

    private ?string $note = null;

    public function getPrice(): float
    {
        return $this->price;
    }
}

function hydrate(object $target, array $row): object
{
    foreach ($row as $name => $value) {
        ReflectAccessor::setValue($target, $name, $value, true);
    }

    return $target;
}

$product = hydrate(new Product(), [
    'id' => '7',
    'price' => '9.50',
    'note' => null,
]);

$product->getPrice(); // 9.5
```

The `true` argument asks `setValue()` to convert the value to the
property's type. `'9.50'` becomes the float `9.5`, and `'7'` becomes the
integer `7`.

## Reading and Writing Members

The helpers work on private and protected members:

- `hasProperty()` checks whether a property exists on the object's class,
  whatever its visibility.
- `getValue()` reads a property by name.
- `setValue()` writes a property by name. Pass `true` as the fourth
  argument to cast the value to the declared type.
- `invoke()` calls a method by name, and passes the remaining arguments
  to it.
- `getPropertiesValues()` returns the values of all properties as an
  array, keyed by name.

```php
ReflectAccessor::hasProperty($product, 'price'); // true
ReflectAccessor::invoke($product, 'getPrice');   // 9.5
```

::: warning
`setValue()` on a name that is not a declared property creates a dynamic
property. PHP 8.2 and later deprecate dynamic properties, so the class
should declare the property instead.
:::

`getPropertiesValues()` accepts a class name as well as an object. Without an
instance, only static properties have values, and the other properties
are returned as `null`.

## Type Conversion

When `setValue()` receives `$safe = true`, it converts the value to the
property's declared type. The conversion is attempted in this order:

- A value that already has the property's class is kept unchanged.
- A `null` is kept when the type allows it.
- Scalar types use `TypeCast::try()`, in non-strict mode.

Without the flag, the value is written as it is, and PHP applies its own
rules for typed properties.

## Reflectors

`reflect()` returns the reflection object for a value. A class name gives
`ReflectionClass`, an object gives `ReflectionObject`, and a closure gives
`ReflectionFunction`:

```php
ReflectAccessor::reflect(Product::class); // ReflectionClass
ReflectAccessor::reflect(new Product());  // ReflectionObject
```

`getReflectProperties()` and `getReflectMethods()` return reflection
objects keyed by name. Both accept filter flags, so you can restrict them
to public members.

`getNoRepeatAttributes()` returns the attributes of a reflector keyed by
attribute class name. It reads only the reflector's own attributes, not
those of its parent classes.

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `getPropertiesValues()` | `object\|string $object, int $filters = ...` | Values of all matching properties, keyed by name. |
| `setValue()` | `object $object, mixed $propertyName, mixed $value, bool $safe = false` | Writes a property, optionally casting to its type. |
| `hasProperty()` | `object $object, string $propertyName` | Whether the property exists, any visibility. |
| `getValue()` | `object $object, string $propertyName` | Reads a property, any visibility. |
| `invoke()` | `object $object, string $methodName, ...$args` | Calls a method, any visibility. |
| `reflect()` | `mixed $value` | Returns a `ReflectionClass`, `ReflectionObject`, or `ReflectionFunction`. |
| `getReflectProperties()` | `object\|string $object, ?int $filters = ...` | Reflection properties keyed by name. |
| `getReflectMethods()` | `string\|object $object, ?int $filters = ...` | Reflection methods keyed by name. |
| `getNoRepeatAttributes()` | `Reflector $ref, ?string $name = null, int $flags = 0` | Attributes keyed by class name; own attributes only. |

## Related

- [Attributes](./attributes): reading attributes with the same kind of
  helpers.
- [Type Cast](./type-cast): the conversion rules that `setValue()` uses.
