---
layout: doc
title: Dump Attributes
component: utilities
---

# Dump Attributes

Debug output, logs, and arrays built for display often include whole
objects. Those objects may hold credentials, caches, or internal state that
should not appear in the output. The reverse also happens: a protected
property may be exactly what you need to see while debugging. The
`Expose`, `Invisible`, and `Transient` attributes let a class decide which
of its properties appear in these dumps, without changing the code that
creates the dump.

## Minimal Setup

Mark a property with `Invisible`, then pass the object to one of the dump
helper functions in the `Windwalker` namespace:

```php
use Windwalker\Utilities\Attributes\Invisible;

class User
{
    public string $name = 'alice';

    #[Invisible]
    public string $cache = 'warm';
}

\Windwalker\get_object_dump_values(new User());
// ['name' => 'alice']
```

The helpers are plain functions, so there is no container or service to
set up.

## Showcase: Dumping an Account

The following class exposes its role in dumps, hides its password, and
keeps a token out of every dump:

```php
use ReflectionProperty;
use Windwalker\Utilities\Attributes\Expose;
use Windwalker\Utilities\Attributes\Invisible;
use Windwalker\Utilities\Attributes\Transient;
use Windwalker\Utilities\TypeCast;

final class Account
{
    public string $email = 'alice@example.com';

    #[Expose]
    protected string $role = 'editor';

    #[Invisible]
    public string $password = 'secret';

    #[Transient]
    public string $sessionToken = 'abc123';
}

$account = new Account();

$dump = \Windwalker\get_object_dump_values($account);
// ['email' => 'alice@example.com', 'role' => 'editor']

$public = TypeCast::toArray(
    $account,
    false,
    false,
    ReflectionProperty::IS_PUBLIC,
);
// ['email' => 'alice@example.com']
```

The protected `role` appears only because of `Expose`. The password and the
token are absent from both results.

## The Three Attributes

Each attribute applies to a property. They differ in what they change:

- `Expose`: includes a protected or private property in the dump.
- `Invisible`: excludes a property from the dump, even when it is public.
- `Transient`: extends `Invisible`, so it excludes the property the same
  way. Use it for state that should never be dumped, such as a cache.

Subclasses of these attributes work the same way, because the check
includes subclasses of `Expose` and `Invisible`.

::: tip
Use `Invisible` or `Transient` for secrets and caches. Using `Expose` on a
private property is a deliberate choice, so keep it for values that are
safe to show.
:::

## Which Properties Are Included

Without `Expose`, the helpers skip protected and private properties. Public
properties are included unless `Invisible` is present.

An uninitialized typed property is skipped until it is assigned. After
assignment, it appears in the next dump:

```php
class Profile
{
    public ?string $bio;
}

$profile = new Profile();

\Windwalker\get_object_dump_values($profile); // []

$profile->bio = 'Hello';

\Windwalker\get_object_dump_values($profile); // ['bio' => 'Hello']
```

## Filtering the Dump

The second argument of both helpers is a filter. It accepts
`ReflectionProperty` flags, such as `ReflectionProperty::IS_PUBLIC`.
`null`, the default, applies no filter:

```php
\Windwalker\get_object_dump_values(
    $account,
    \ReflectionProperty::IS_PUBLIC,
);
```

`get_object_dump_props()` takes the same arguments, but returns the
`ReflectionProperty` objects instead of the values.

## Where the Attributes Apply

The attributes are read only by the dump helpers. Two paths use them:

- The helper functions `get_object_dump_values()` and
  `get_object_dump_props()`.
- `TypeCast::toArray()`, when you pass a `$filter` as its fourth
  argument.

Without a filter, `TypeCast::toArray()` returns the result of
`get_object_vars()`, which ignores these attributes.

::: info
Native functions, such as `json_encode()` and `serialize()`, do not read
these attributes. Use a dedicated serializer or a DTO when a value must be
excluded from output of that kind.
:::

## Method Summary

| Function or class | Parameters | Description |
|-------------------|------------|-------------|
| `get_object_dump_values()` | `object $object, ?int $filter = null` | Visible, initialized property values, keyed by name. |
| `get_object_dump_props()` | `object\|string $object, ?int $filter = null` | Visible `ReflectionProperty` objects, keyed by name. |
| `has_attributes()` | `mixed $ref, string $attr, bool $instanceof = false` | Whether a class, object, or property has an attribute. |
| `TypeCast::toArray()` | `mixed $data, bool $recursive = false, bool $onlyDumpable = false, ?int $filter = null` | Converts to an array; applies the attributes when `$filter` is set. |
| `Expose`, `Invisible`, `Transient` | None | Property attributes that include or exclude a property in dumps. |

## Related

- [Attributes](./attributes): reading attributes from classes, members,
  and parent classes.
- [Assert](./assert): another utility that describes values in messages.
