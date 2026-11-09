---
layout: doc
title: Identifiers
component: utilities
---

# Identifiers

Two small helpers cover identifiers that live for the length of a process.
`Serial` provides in-memory numbered sequences, for tasks such as numbering
documents or giving fixtures unique IDs. `Symbol` provides named markers
that are compared by identity, so a special value never collides with an
ordinary string. Each section below is self-contained.

## Serial

Some code needs a counter that is independent of the database: numbering
documents within a tenant, giving each test fixture a unique ID, or tracing
how many times a handler ran. `Serial` keeps these counters in memory. Each
counter is identified by a name or by an object, so separate sequences do
not interfere with each other.

### Serial Minimal Setup

`Serial` is a static class. Ask for the next number of a named sequence:

```php
use Windwalker\Utilities\Serial;

Serial::get('invoice'); // 1
Serial::get('invoice'); // 2
```

The first call returns `1`. Each call after that returns the next number.

### Showcase: Numbering Documents Per Tenant

The following example numbers invoices separately for each tenant. Each
tenant name gets its own sequence:

```php
use Windwalker\Utilities\Serial;

function nextInvoiceNumber(string $tenant): string
{
    return sprintf(
        '%s-%05d',
        strtoupper($tenant),
        Serial::get('invoice:' . $tenant),
    );
}

nextInvoiceNumber('acme'); // ACME-00001
nextInvoiceNumber('acme'); // ACME-00002
nextInvoiceNumber('zen');  // ZEN-00001
```

The sequence name combines the prefix and the tenant, so the two tenants do
not share a counter.

### Named and Object Sequences

A sequence can be named by a string, or tied to an object. Object sequences
are stored in a weak map, so the counter for an object is released when the
object is destroyed:

```php
$order = new stdClass();

Serial::get($order); // 1
Serial::get($order); // 2

Serial::current($order); // 2
```

`current()` returns the last value without advancing the sequence. It
returns `0` for a sequence that has not been used.

### Changing a Sequence

`set()` moves a sequence to a given value, and `reset()` moves it back to
`0`. The next call to `get()` then returns `value + 1`:

```php
Serial::set('invoice', 99);
Serial::get('invoice'); // 100

Serial::reset('invoice');
Serial::get('invoice'); // 1
```

`resetAll()` clears every named sequence and every object sequence. Use it
between tests, so that each test starts from the same numbers.

::: warning
`get()` throws an `OverflowException` when a sequence reaches the largest
integer. Store a sequence in a database if its values must survive a
restart of the process.
:::

### Serial Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `get()` | `string\|object $name` | Advances the sequence and returns its new value. |
| `current()` | `string\|object $name` | Returns the last value, or `0`, without advancing. |
| `set()` | `string\|object $name, int $value` | Sets the sequence to a value. |
| `reset()` | `string\|object $name` | Sets the sequence to `0`. |
| `resetAll()` | None | Clears all sequences. |

## Symbol

Some APIs need a marker that means something specific: "use the default",
"do not change", or "no action". Plain strings work, but a typo in one of
them is silently treated as a different value. Integers and `null` have the
same problem, and `null` often already means "not set". `Symbol` is a
small object for named markers. Each name maps to exactly one instance, so
markers are compared by identity, and a misspelled name becomes a
different marker that is easy to spot.

### Symbol Minimal Setup

Create a symbol with `create()`, and compare it with `is()`:

```php
use Windwalker\Utilities\Symbol;

$keep = Symbol::create('keep');

$keep->is('keep');             // true
$keep->is(Symbol::create('keep')); // true
```

`create()` returns the same instance for the same name, so two calls with
the same name give identical objects.

### Showcase: Optional Updates

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

### Comparing Symbols

Use `is()` or `equals()` to compare a symbol with a value. Both accept a
plain value or another symbol:

- `is()` and `equals()` return `true` when the stored name matches the
  given string, or when the given symbol has the same name.
- `same()` compares two symbol objects by identity.

### The Magic Methods

Any static method call creates a symbol named after the method. The method
name is converted to uppercase and wrapped in double underscores. For
example, `Symbol::default()` has the value `__DEFAULT__`.

::: info
Because any static call creates a symbol, a typo such as `Symbol::kepp()`
does not fail. It creates a new marker, so a comparison with `keep()` is
false. Compare against the value you created with `create()` when the
names come from configuration.
:::

### Symbol Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `create()` | `string $value` | Returns the single instance for a name. |
| `is()` | `mixed $value` | Whether the symbol equals a value or symbol. |
| `equals()` | `mixed $value` | Same as `is()`. |
| `same()` | `Symbol $symbol1, Symbol $symbol2` | Whether two symbols are the same instance. |
| `getValue()` | None | Returns the symbol's name. |
| `Symbol::name()` | None | Static magic call; returns the symbol named after the method. |

## Related

- [Iterators](./iterators): sequences of items and ordered queues.
- [Object Helpers](./object-helpers): lazy and reflective object helpers.
- [Helpers](./helpers): the global helper functions.
