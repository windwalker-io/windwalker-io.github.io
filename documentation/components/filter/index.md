---
layout: doc
title: Introduction
part: Components
chapter: Filter
menu: components/filter
component: filter
---

# Introduction

Windwalker Filter cleans and validates raw input before your code uses it. Request data, CLI arguments, and imported files are all untrusted. The filter package turns a short syntax string such as `int|range(1,10)` into a chain that casts, clamps, or rejects each value in order.

The package has two main parts. `FilterFactory` builds filters from syntax strings, arrays, or classes. `ChainFilter` runs a list of filters and validators in sequence. Nested data is handled by `NestedFilter`, which applies a map of rules to arrays.

## Installation

Install via composer

```bash
composer require windwalker/filter ^4.0
```

## Use as Standalone Component

Create a factory and build a chain from a syntax string:

```php
use Windwalker\Filter\FilterFactory;

$factory = new FilterFactory();

$age = $factory->createChainFromSyntax('int|clamp(min: 1, max: 120)');

$age->filter('150');  // 120
```

Use `createNested()` to apply rules to a whole array:

```php
$filter = $factory->createNested([
    'name' => 'string|length(50)',
    'email' => 'email',
    'tags' => 'array',
]);
```

## Use in Windwalker

In a Windwalker app, obtain the factory from the container instead of creating a new one:

```php
use Windwalker\Filter\FilterFactory;

$factory = $container->get(FilterFactory::class);

$chain = $factory->createChainFromSyntax('string|required');
```

You can also declare `FilterFactory` as a constructor dependency. Either way, the host app's DI setup supplies the instance.

## Syntax

A syntax string is a list of clauses separated by `|`. Each clause runs in order. A clause is one of:

- A registered name, such as `int`, `trim`, or `email`.
- A name with parameters, such as `clamp(min: 1, max: 120)`.
- A class name, such as an enum or a `FilterInterface` class.

Parameters are written as `key: value` pairs. This is the preferred form:

```php
$factory->createChainFromSyntax(
    'int|clamp(min: 1, max: 120)|default(18)'
);
```

Positional arguments such as `clamp(1,120)` are also accepted, but named
arguments are clearer and do not depend on order.

Syntax names are case-sensitive. `Int` is not the same as `int`.

## Built-in Rules

The default factories cover common needs. Parameters are listed by name:

- Casts: `string`, `int`, `float`, `bool`, `array`, `object`.
  Each accepts `strict`, for example `int(strict: true)`.
- Strings: `alnum`, `cmd`, `words`, `raw`.
- Length: `length(max: 50, utf8: true)`. Both parameters are optional.
- Numbers: `abs`, `neg`.
- Bounds: `range(min: 1, max: 10)` and `clamp(min: 1, max: 10)`.
  Both parameters are required.
- Format: `email`, `url`, `ip`, `ipv4`, `ipv6`.
- Patterns: `regex(regex: '/^\d+$/', type: 'match')`.
  `type` is `match` or `replace`.
- Validation: `required`, `default(18)`. `default` takes one positional
  value, which replaces `''` and `null`.
- Callbacks: `func(strtoupper)`. `func` takes one positional callable name.

::: info
`range()` and `clamp()` clamp numeric values to the given bounds. They do not reject out-of-range values.
:::

## Filtering Nested Data

`createNested()` returns a `NestedFilter`. Apply it to an array with `filter()`:

```php
$filter = $factory->createNested([
    'user' => [
        'name' => 'string|length(50)',
        'age' => 'int|clamp(min: 0, max: 120)',
    ],
    'tags' => 'array',
]);

$clean = $filter->filter([
    'user' => ['name' => 'Alice', 'age' => '150'],
    'tags' => ['php', 'vitepress'],
]);
// $clean['user']['age'] === 120
```

## Validation

`test()` checks a value without changing it. It throws
`Windwalker\Filter\Exception\ValidateException` on the first failure.
A filter passes when `filter($value) === $value`.

```php
use Windwalker\Filter\Exception\ValidateException;

$chain = $factory->createChainFromSyntax('required|email');

try {
    $chain->test('not-an-email');
} catch (ValidateException $e) {
    // Handle invalid input.
}
```

::: warning
`filter()` never throws. It returns a transformed value even when the input is invalid, so use `test()` when invalid input must be rejected.
:::

## Custom Rules

Use `addFilterCallback()` to register a closure under a syntax name. The closure receives the value and returns the filtered value:

```php
$factory->addFilterCallback(
    'upper',
    fn($value) => strtoupper((string) $value),
);

$chain = $factory->createChainFromSyntax('upper');
```

Use `addFactory()` when you need a full filter class, and `removeFactory()` to unregister a name.

## Output Filtering

`OutputFilter` provides static helpers for cleaning HTML output, such as `safeHTML()`, `stripScript()`, and `stripStyle()`. These are not part of the syntax chain. Call them directly when you need to sanitize content before display.

```php
use Windwalker\Filter\OutputFilter;

$safe = OutputFilter::safeHTML($userHtml);
```
