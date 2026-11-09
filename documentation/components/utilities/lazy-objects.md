---
layout: doc
title: Lazy Objects
component: utilities
---

# Lazy Objects

PHP 8.4 can create lazy objects: an instance that exists in memory but
does its real setup only when it is first used. A settings loader that
reads files, or a client that opens a network connection, can be created
cheaply and initialized only when a method or property is touched. The
functions in this page help you check the state of such an object, and
reach the real object behind a proxy. They need PHP 8.4 or later.

## Minimal Setup

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

## Showcase: A Deferred Settings Loader

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

## Ghosts and Proxies

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

## Checking and Unwrapping

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

## Method Summary

| Function | Parameters | Description |
|----------|------------|-------------|
| `unwrap_lazy_object()` | `object $object` | Initializes a lazy object if needed, and returns the real object. |
| `unwrap_object_id()` | `object $object` | Returns the `spl_object_id()` of the real object. |
| `unwrap_object_hash()` | `object $object` | Returns the `spl_object_hash()` of the real object. |
| `object_is_proxy()` | `object $object` | Whether the object is an uninitialized lazy object or a proxy. |
| `object_is_uninitialized_lazy()` | `object $object` | Whether the object is a lazy object not yet initialized. |

## Related

- [Reflection](./reflection): reading and writing members through reflection.
