---
layout: doc
title: Symbol
component: utilities
---

# Symbol

Some APIs need a marker that means something specific: "use the default",
"do not change", or "no action". Plain strings work, but a typo in one of
them is silently treated as a different value. Integers and `null` have the
same problem, and `null` often already means "not set". `Symbol` is a
small object for named markers. Each name maps to exactly one instance, so
markers are compared by identity, and a misspelled name becomes a
different marker that is easy to spot.

## Minimal Setup

Create a symbol with `create()`, and compare it with `is()`:

```php
use Windwalker\Utilities\Symbol;

$keep = Symbol::create('keep');

$keep->is('keep');             // true
$keep->is(Symbol::create('keep')); // true
```

`create()` returns the same instance for the same name, so two calls with
the same name give identical objects.

## Showcase: Optional Updates

The following example updates a user record. A field is left unchanged
when its value is the `keep()` marker. A `null` is a real value that clears
the field:

```php
use Windwalker\Utilities\Symbol;

final class UserUpdate
{
    public static function apply(array $user, array $changes): array
    {
        foreach ($changes as $field => $value) {
            if (Symbol::keep()->equals($value)) {
                continue;
            }

            $user[$field] = $value;
        }

        return $user;
    }
}

$user = ['name' => 'alice', 'phone' => '555-0100'];

$user = UserUpdate::apply($user, [
    'name' => Symbol::keep(),
    'phone' => null,
]);

// ['name' => 'alice', 'phone' => null]
```

`keep()` is a static call with no definition of its own. `Symbol` turns any
static method name into a marker, so `Symbol::keep()` and
`Symbol::create('__KEEP__')` refer to the same value.

## Comparing Symbols

Use `is()` or `equals()` to compare a symbol with a value. Both accept a
plain value or another symbol:

- `is()` and `equals()` return `true` when the stored name matches the
  given string, or when the given symbol has the same name.
- `same()` compares two symbol objects by identity.

## The Magic Methods

Any static method call creates a symbol named after the method. The method
name is converted to uppercase and wrapped in double underscores. For
example, `Symbol::default()` has the value `__DEFAULT__`.

::: info
Because any static call creates a symbol, a typo such as `Symbol::kepp()`
does not fail. It creates a new marker, so a comparison with `keep()` is
false. Compare against the value you created with `create()` when the
names come from configuration.
:::

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `create()` | `string $value` | Returns the single instance for a name. |
| `is()` | `mixed $value` | Whether the symbol equals a value or symbol. |
| `equals()` | `mixed $value` | Same as `is()`. |
| `same()` | `Symbol $symbol1, Symbol $symbol2` | Whether two symbols are the same instance. |
| `getValue()` | None | Returns the symbol's name. |
| `Symbol::name()` | None | Static magic call; returns the symbol named after the method. |

## Related

- [Serial](./serial): numbered sequences.
