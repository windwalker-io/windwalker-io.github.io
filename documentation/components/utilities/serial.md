---
layout: doc
title: Serial
component: utilities
---

# Serial

Some code needs a counter that is independent of the database: numbering
documents within a tenant, giving each test fixture a unique ID, or tracing
how many times a handler ran. `Serial` keeps these counters in memory. Each
counter is identified by a name or by an object, so separate sequences do
not interfere with each other.

## Minimal Setup

`Serial` is a static class. Ask for the next number of a named sequence:

```php
use Windwalker\Utilities\Serial;

Serial::get('invoice'); // 1
Serial::get('invoice'); // 2
```

The first call returns `1`. Each call after that returns the next number.

## Showcase: Numbering Documents Per Tenant

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

## Named and Object Sequences

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

## Changing a Sequence

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

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `get()` | `string\|object $name` | Advances the sequence and returns its new value. |
| `current()` | `string\|object $name` | Returns the last value, or `0`, without advancing. |
| `set()` | `string\|object $name, int $value` | Sets the sequence to a value. |
| `reset()` | `string\|object $name` | Sets the sequence to `0`. |
| `resetAll()` | None | Clears all sequences. |

## Related

- [Symbol](./symbol): unique named markers, without a counter.
