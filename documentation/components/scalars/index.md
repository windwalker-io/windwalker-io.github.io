---
layout: doc
title: Introduction
part: Components
chapter: Scalars
menu: components/scalars
component: scalars
---

# Introduction

Windwalker Scalars wraps PHP arrays and strings in two objects,
`ArrayObject` and `StringObject`, so that common operations can be chained
on a single value. Native array and string functions are procedural, use
inconsistent argument order, and often force you to nest calls or store
temporary variables. Splitting a CSV line, cleaning each field, dropping
empty fields, and joining the result takes several statements in plain
PHP. With Scalars, it becomes one readable chain.

The package has these main parts:

- `ArrayObject`: a list or map with filtering, mapping, sorting, grouping,
  and aggregation methods. See [Array Object](./array-object).
- `StringObject`: a string with an encoding, offering trimming, searching,
  case conversion, padding, and character-aware measurement. See
  [String Object](./string-object).
- `ScalarsFactory`: a static helper that wraps a native value in the
  matching object.
- `str()` and `arr()`: global helper functions in the `Windwalker`
  namespace that create the two objects.

Methods that transform a value return a new object, so the original stays
unchanged. A few `ArrayObject` methods, such as `set()`, `push()`, and
`takeout()`, change the object in place. The topic pages list them.

## Installation

```bash
composer require windwalker/scalars ^4.0
```

The package requires PHP 8.4.6 or later. It depends on `windwalker/utilities`,
which provides the `Arr` and `Str` helpers that both objects use.

## Use as Standalone Component

Composer loads the helper functions. Start with `str()` or `arr()` and chain
methods from there:

```php
use function Windwalker\str;

$names = str('  alice , BOB,, carol  ')
    ->explode(',')
    ->map(fn (string $name) => trim($name))
    ->filter(fn (string $name) => $name !== '')
    ->map(fn (string $name) => ucfirst(strtolower($name)))
    ->implode(', ');

echo $names; // Alice, Bob, Carol
```

`explode()` returns an `ArrayObject`, and `implode()` returns a
`StringObject` again. Each step returns the type that the next step needs.

## Use in Windwalker

Scalars is not registered in the Windwalker container, so there is no
service to inject. Use it the same way as in standalone usage, by calling
the `arr()` and `str()` helpers where you need them:

```php
use function Windwalker\arr;

class OrderExporter
{
    public function exportPaidIds(array $orders): string
    {
        return arr($orders)
            ->filter(fn (array $order) => $order['status'] === 'paid')
            ->column('id')
            ->values()
            ->implode(',')
            ->getString();
    }
}
```

## Core Concepts

Scalars works in three steps: wrap, transform, and unwrap.

- **Wrap**: use `arr()` or `str()`. You can also use `ArrayObject::wrap()`
  or `ScalarsFactory::fromNative()`. The factory wraps an array in an
  `ArrayObject` and a scalar in a `StringObject`. It returns other values,
  such as objects and `null`, unchanged.
- **Transform**: call methods in a chain. Most of them return a new object
  of the same class.
- **Unwrap**: call `dump()` on an `ArrayObject` to get the native array. Call
  `getString()` or cast with `(string)` on a `StringObject`.

## Topic Pages

- [Array Object](./array-object): creating, reading, transforming, grouping,
  and sorting arrays, plus the methods that change the object in place.
- [String Object](./string-object): inspecting, transforming, and converting
  strings, with encoding and inflection support.

## Related components

- [Utilities](../utilities/): the `Arr` and `Str` helpers that both objects
  delegate to.
- [Data](../data/): the `Collection` class that `StringObject::jsonDecode()`
  returns. The `windwalker/data` package must be installed to use it.
