---
layout: doc
title: Cache
component: utilities
---

# Cache

Some values are expensive to compute but do not change during one run: a
parsed configuration file, a list of categories, or a lookup table built
from a database. Computing them on every call wastes time, and storing them
in a global variable hides the dependency. `Cache` provides two traits that
store such values under a string ID inside a class. A method asks for a
value with `once()`, and the closure runs only the first time.

The two traits differ in scope:

- `InstanceCacheTrait`: each object has its own storage.
- `RuntimeCacheTrait`: static storage, shared by every call in the process.

## Minimal Setup

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

## Showcase: A Locale Table

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

## Refreshing a Value

Use `cacheRemove()` to delete one entry, and `cacheReset()` to delete all
entries of the object or class. `once()` is protected, so call it from
inside the class:

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

## Instance Storage

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

## Static Storage

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

## Null Results

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

## Method Summary

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

## Related

- [Attributes](./attributes): `TraitOptions` caches the attributes it reads
  with `RuntimeCacheTrait`.
