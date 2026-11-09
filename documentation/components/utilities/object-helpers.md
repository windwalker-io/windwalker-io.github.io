---
layout: doc
title: Object Helpers
component: utilities
---

# Object Helpers

Three helpers work with objects at the level of their state and identity.
`Cache` stores computed values inside a class, so an expensive step runs
once. `ReflectAccessor` reads and writes members regardless of visibility,
for tasks that the public API does not cover. The lazy object helpers check
and unwrap PHP 8.4 lazy objects, which defer their setup until first use.
Each section below is self-contained.

## Cache

Some values are expensive to compute but do not change during one run: a
parsed configuration file, a list of categories, or a lookup table built
from a database. Computing them on every call wastes time, and storing them
in a global variable hides the dependency. `Cache` provides two traits that
store such values under a string ID inside a class. A method asks for a
value with `once()`, and the closure runs only the first time.

The two traits differ in scope:

- `InstanceCacheTrait`: each object has its own storage.
- `RuntimeCacheTrait`: static storage, shared by every call in the process.

### Cache Minimal Setup

Use `InstanceCacheTrait` in a class, and wrap an expensive call in `once()`:

```php
use Windwalker\Utilities\Cache\InstanceCacheTrait;

class ProductRepository
{
    use InstanceCacheTrait;

    public function categories(): array
    {
        return $this->once(
            'categories',
            fn () => $this->loadCategories(),
        );
    }

    protected function loadCategories(): array
    {
        // Query the database.
        return ['books', 'music'];
    }
}
```

The first call to `categories()` runs the closure. Later calls on the same
object return the stored list.

### Showcase: A Locale Table

The following class loads a translation table once per process, and a
formatter reads its entries from it. Because the storage is static, every
formatter instance shares the same table:

```php
use Windwalker\Utilities\Cache\RuntimeCacheTrait;

final class Messages
{
    use RuntimeCacheTrait;

    public static function table(string $locale): array
    {
        return static::once(
            'table.' . $locale,
            fn () => self::loadFile($locale),
        );
    }

    protected static function loadFile(string $locale): array
    {
        // Read and parse the locale file.
        return ['greeting' => 'Hello'];
    }
}

Messages::table('en')['greeting']; // Hello
```

The key includes the locale, so each locale has its own entry in the same
storage. Calling `table('en')` again returns the stored array.

### Refreshing a Value

`once()` takes an optional third argument. Pass `true` to run the closure
again and replace the stored value. Use `cacheRemove()` to delete one entry,
and `cacheReset()` to delete all entries of the object or class. `once()` is
protected, so call it from inside the class:

```php
public function reloadCategories(): array
{
    return $this->once(
        'categories',
        fn () => $this->loadCategories(),
        true,
    );
}
```

### Instance Storage

`InstanceCacheTrait` keeps its entries in a property of the object. Two
objects of the same class do not share values:

```php
$a = new ProductRepository();
$b = new ProductRepository();

$a->categories(); // loads
$b->categories(); // loads again, its own storage is empty
```

Use this trait when the cached value depends on the object, such as a
connection or a configuration passed to the constructor.

### Static Storage

`RuntimeCacheTrait` stores values in a static property. Every caller in
the same process sees the same entries, and the storage lasts until the
process ends.

::: warning
Subclasses share the static storage of their parent class. A value cached
by `Base::once()` is visible in `Child::once()`, and `cacheReset()` clears
the entries of both. Use a key that includes the class name, or do not
extend a class that uses `RuntimeCacheTrait`.
:::

Static storage suits values that are the same for every request in the
process, such as parsed metadata. For values that depend on a request or
a user, use `InstanceCacheTrait` on an object that lives only for that
request.

### Null Results

The two traits treat a `null` result differently:

- `InstanceCacheTrait` stores the `null`. The closure does not run again.
- `RuntimeCacheTrait` does not store the `null`. The closure runs again on
  the next call.

Return a default value, such as an empty array, when you want the result
to stay cached.

::: info
`cacheHas()` returns `false` for a stored `null` in both traits, because a
`null` entry is treated as missing.
:::

### Cache Method Summary

`InstanceCacheTrait` methods are per object. `RuntimeCacheTrait` methods are
static.

| Method | Parameters | Description |
|--------|------------|-------------|
| `once()` | `string $id, callable $closure, bool $refresh = false` | Returns the stored value, or runs the closure and stores its result. Protected. |
| `cacheGet()` | `?string $id = null` | Returns a stored value, or `null`. Protected. |
| `cacheSet()` | `?string $id = null, $value = null` | Stores a value and returns it. Protected. |
| `cacheHas()` | `?string $id = null` | Whether a non-`null` value is stored. Protected. |
| `cacheRemove()` | `string $id` | Removes one entry. Public, returns `static`. |
| `cacheReset()` | None | Removes all entries. Public, returns `static`. |
| `RuntimeCacheTrait::once()` | `?string $id, callable $closure, bool $refresh = false` | Static version of `once()`. Protected. |
| `RuntimeCacheTrait::cacheGet()` | `string $id` | Static version of `cacheGet()`. Protected. |
| `RuntimeCacheTrait::cacheSet()` | `string $id, $value = null` | Static version of `cacheSet()`. Returns nothing. Protected. |
| `RuntimeCacheTrait::cacheHas()` | `string $id` | Static version of `cacheHas()`. Protected. |
| `RuntimeCacheTrait::cacheRemove()` | `string $id` | Static removal of one entry. Public, returns nothing. |
| `RuntimeCacheTrait::cacheReset()` | None | Static removal of all entries. Public, returns nothing. |

## Reflection

Most code should read and write an object through its public API. Some
tasks need the other path: a test that checks a private cache, a dump
helper that shows protected state, or an adapter that fills a value
object from a row. Raw PHP Reflection can do this, but every call needs
the same setup, and the type handling is easy to get wrong.
`ReflectAccessor` wraps these operations in static helpers. It reads and
writes members regardless of visibility, and it can convert the incoming
value to the declared type.

### Reflection Minimal Setup

`ReflectAccessor` is a static class. Call its methods directly:

```php
use Windwalker\Utilities\Reflection\ReflectAccessor;

class Counter
{
    private int $count = 3;
}

ReflectAccessor::getValue(new Counter(), 'count'); // 3
```

### Showcase: Filling a Value Object From a Row

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

### Reading and Writing Members

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

### Type Conversion

When `setValue()` receives `$safe = true`, it converts the value to the
property's declared type. The conversion is attempted in this order:

- A value that already has the property's class is kept unchanged.
- A `null` is kept when the type allows it.
- Scalar types use `TypeCast::try()`, in non-strict mode.

Without the flag, the value is written as it is, and PHP applies its own
rules for typed properties.

### Reflectors

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

### Reflection Method Summary

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

## Lazy Objects

PHP 8.4 can create lazy objects: an instance that exists in memory but
does its real setup only when it is first used. A settings loader that
reads files, or a client that opens a network connection, can be created
cheaply and initialized only when a method or property is touched. The
functions in this section help you check the state of such an object, and
reach the real object behind a proxy. They need PHP 8.4 or later.

### Lazy Minimal Setup

Create a lazy ghost with `ReflectionClass::newLazyGhost()`. The callback
receives the object and initializes it. The functions below take any
object:

```php
$ref = new ReflectionClass(Settings::class);

$settings = $ref->newLazyGhost(
    fn (Settings $object) => $object->load('app'),
);

\Windwalker\object_is_uninitialized_lazy($settings); // true
```

Reading a property or calling a method runs the callback once. The object
is then an ordinary initialized object.

### Showcase: A Deferred Settings Loader

The following example delays file reading until a setting is first read.
The check functions show the state before and after:

```php
final class Settings
{
    public array $values = [];

    public function load(string $name): void
    {
        $this->values = require __DIR__ . "/config/$name.php";
    }
}

$settings = (new ReflectionClass(Settings::class))
    ->newLazyGhost(fn (Settings $object) => $object->load('app'));

\Windwalker\object_is_uninitialized_lazy($settings); // true

$mode = $settings->values['mode'];

\Windwalker\object_is_uninitialized_lazy($settings); // false
```

The file is read at the line that reads `values`, not at construction.
The object can be passed around before that point without any cost.

### Ghosts and Proxies

Two kinds of lazy object exist:

- A ghost is the same object before and after initialization. Its
  properties are filled in by the callback.
- A proxy is a separate object that stands in for a real instance. Its
  callback returns the real object, which is created on first use.

Create a proxy with `ReflectionClass::newLazyProxy()`:

```php
$proxy = (new ReflectionClass(Settings::class))
    ->newLazyProxy(fn () => new Settings());

\Windwalker\object_is_proxy($proxy); // true
```

### Checking and Unwrapping

The functions in this namespace work on both kinds:

- `object_is_uninitialized_lazy()` is `true` while the object has not
  been initialized yet.
- `object_is_proxy()` is `true` for an uninitialized lazy object, and for
  a proxy that points to a different real object.
- `unwrap_lazy_object()` initializes the object if needed, and returns the
  real object.
- `unwrap_object_id()` and `unwrap_object_hash()` return the identifier or
  hash of the real object.

```php
$real = \Windwalker\unwrap_lazy_object($proxy);

$real instanceof Settings; // true
```

::: tip
Compare identities with `unwrap_object_id()` when a proxy and its real
object must be treated as one. Comparing `spl_object_id()` directly can
report them as different objects.
:::

::: info
Reading `unwrap_lazy_object()` initializes the object. Use the
`object_is_*` checks when you only need to know the state, so that the
object keeps its lazy behavior.
:::

### Lazy Object Method Summary

| Function | Parameters | Description |
|----------|------------|-------------|
| `unwrap_lazy_object()` | `object $object` | Initializes a lazy object if needed, and returns the real object. |
| `unwrap_object_id()` | `object $object` | Returns the `spl_object_id()` of the real object. |
| `unwrap_object_hash()` | `object $object` | Returns the `spl_object_hash()` of the real object. |
| `object_is_proxy()` | `object $object` | Whether the object is an uninitialized lazy object or a proxy. |
| `object_is_uninitialized_lazy()` | `object $object` | Whether the object is a lazy object not yet initialized. |

## Related

- [Attributes](./attributes): reading attributes with the same kind of
  helpers.
- [Type Cast](./type-cast): the conversion rules that `setValue()` uses.
