---
layout: doc
title: Validation & Filter
---

# Validation & Filter

Input from forms, query strings, and APIs is untrusted. Windwalker splits
the work into two steps:

- **Validation** checks that a value meets a rule and rejects it if not.
- **Filtering** converts a value into a clean form, such as trimming it,
  keeping only letters, or casting it to an integer.

:::info
The standalone package has its own detailed guide: [Filter](../../../components/filter/index.md). This page focuses on using it inside the Windwalker framework.
:::

Two APIs cover both steps. Prefer the native callback API, which uses plain
PHP. The string DSL is still available for configuration-driven rules.

## Native Callback Rules

`FilterService` provides `filterWith()` and `validateWith()`. They take
PHP closures directly, so you write rules with plain PHP and first-class
callable syntax such as `trim(...)`. No rule strings are needed. Use the
global helpers `\Windwalker\filterWith()` and `\Windwalker\validateWith()`,
or inject `FilterService`:

```php
use function Windwalker\filterWith;
use function Windwalker\validateWith;

// A single closure applies to the whole value.
$name = filterWith($input['name'], trim(...));

// A list forms a chain, applied in order.
$name = filterWith($input['name'], [strval(...), trim(...)]);

// After 8.6, you can also use partial application syntax with pipe operators:
$name = filterWith(
    $input['slug'], 
    fn($v) => ($v |> strval(...) |> str_replace('_', '-', ?))
);

// An associative array maps keys to rules and applies them recursively.
$data = filterWith($input, [
    'foo' => [strval(...), trim(...)],
    'bar' => ['baz' => intval(...)],
]);

// A closure returning a falsy value fails the validation.
validateWith($input['age'], [
    static fn (mixed $v): bool => is_int($v) && $v >= 0,
]);
```

Each rule type accepts these forms:

- **Closure**: applied to the whole value.
- **Instance**: any object implementing `FilterInterface` (for
  `filterWith()`) or `ValidatorInterface` (for `validateWith()`). Every
  class in `Windwalker\Filter\Rule` qualifies, so you can `new` one
  directly. Instances can be mixed with closures in a rule list.
- **List**: a non-empty list of closures or interface instances, applied
  in order. Each result feeds the next item.
- **Associative array**: maps field keys to sub-rules. Nesting is allowed.

```php
use Windwalker\Filter\FilterInterface;
use Windwalker\Filter\Rule\IPV4;
use Windwalker\Filter\Rule\Regex;

// Built-in rule class used as a validator.
$ok = validateWith($input['ip'], new IPV4());

// Anonymous class for a custom filter, mixed with closures.
$upper = new class implements FilterInterface {
    public function filter(mixed $value): mixed
    {
        return strtoupper((string) $value);
    }
};

$code = filterWith($input['code'], [trim(...), $upper, new Regex('/^CODE-\d+$/')]);
```

Behavior to know:

- Missing keys are skipped. Absent input keys are left alone.
- A non-array value under a map rule is returned unchanged.
- Every validator in a chain receives the original value. Only filters
  pass transformed values forward.
- A failed validation throws `ValidateException`. The message starts with
  `Value`, or with `Field "a.b"` for a nested path.
- Closures are identified by type. Pass `trim(...)`, not the string `'trim'`.
- A `ValidatorInterface` passed to `filterWith()`, or a `FilterInterface`
  passed to `validateWith()`, throws `InvalidArgumentException`.

::: info
`filter()` and `validate()` accept only `string|array` rules. Passing a
closure to them raises a `TypeError`. Use the `*With()` methods instead.
:::

### Registration Example

This handler validates every field before it saves anything, then cleans
the values:

```php
use Windwalker\Filter\Exception\ValidateException;
use function Windwalker\filterWith;
use function Windwalker\validateWith;

function registerUser(array $input): array
{
    $errors = [];

    $checks = [
        'name' => fn () => validateWith(
            $input['name'] ?? null,
            [
                fn ($v) => is_string($v) && $v !== '',
                fn ($v) => mb_strlen($v) <= 50,
            ],
        ),
        'age' => fn () => validateWith(
            $input['age'] ?? null,
            fn($v) => filter_var($v, FILTER_VALIDATE_INT) !== false,
        ),
        'email' => fn () => validateWith(
            $input['email'] ?? null,
            fn($v) => filter_var($v, FILTER_VALIDATE_EMAIL) !== false,
        ),
    ];

    foreach ($checks as $field => $check) {
        try {
            $check();
        } catch (ValidateException $e) {
            $errors[$field] = $e->getMessage();
        }
    }

    if ($errors !== []) {
        return ['errors' => $errors];
    }

    return [
        'name' => filterWith($input['name'], trim(...)),
        'age' => filterWith($input['age'], intval(...)),
        'email' => filterWith($input['email'], trim(...)),
    ];
}
```

Keep `$e->getMessage()` for developers. Show users a generic message.

## String Rules (DSL)

The `filter()` and `validate()` functions take a string rule syntax
instead. Both delegate to `FilterService`. Use this form when rules come
from configuration or a compact syntax is preferred:

```php
use Windwalker\Filter\Exception\ValidateException;
use function Windwalker\filter;
use function Windwalker\validate;

$age = filter($input['age'], 'int');

try {
    validate($input['email'], 'required|email');
} catch (ValidateException $e) {
    $error = $e->getMessage();
}
```

- `filter($value, $rules)` returns the cleaned value.
- `validate($value, $rules)` returns `true` or throws `ValidateException`.

Use `FilterService` directly when you need the `strict` argument. The global
`validate()` function does not accept it:

```php
use Windwalker\Core\Service\FilterService;

$filter = $container->get(FilterService::class);

$filter->validate($input['age'], 'int', strict: true);
```

For request-level rules, such as route attributes, see
[Validation and Filter](/documentation/framework/core-concepts/http-routing/validation-and-filter).
The [Filter component](/documentation/components/filter/) documents the
rule engine.

### Rule Reference

Every rule name the `FilterService` factory registers is listed below.
Chain rules with `|`. Pass parameters with `name(key: value)`.

```php
// Scalar and type rules
'abs'                 // absolute value
'neg'                 // negative value
'raw'                 // no cleaning; validates only
'required'            // fails on empty input
'string'              // also string([strict])
'int'                 // also int([strict])
'float'               // also float([strict])
'bool'                // also bool([strict])
'array'               // also array([strict])
'object'              // also object([strict])

// Character rules
'alnum'               // keeps A-Z, a-z, 0-9
'cmd'                 // keeps letters, digits, _ . -
'words'               // keeps letters and _
'email'               // email address characters
'url'                 // URL characters

// Network address rules
'ip'                  // IPv4 or IPv6 address
'ipv4'                // IPv4 address
'ipv6'                // IPv6 address

// Parameterized rules
'range(min: 1, max: 10)'   // clamps numbers to bounds (same as clamp)
'clamp(min: 1, max: 10)'   // clamps numbers to bounds
'length(max: 50)'          // maximum length, UTF-8 by default
'regex(regex: "/\\d+/", type: "match")'   // match or replace
'default(guest)'           // value used when input is empty
'func(strtolower)'         // named callable
```

::: info
`range` extends `clamp` and has the same behavior. Use either name.
:::

### Filtering

Filter rules return a transformed value. They never reject input. Each
character rule keeps only the characters it names:

- `alnum` keeps `A-Z`, `a-z`, and `0-9`.
- `cmd` keeps letters, digits, `_`, `.`, and `-`.
- `words` keeps letters and `_`, so digits and spaces are removed.
- `email` and `url` remove characters that are invalid in that format.

```php
$filter->filter('Hello World 9', 'words');   // 'HelloWorld'

$filter->filter('ABCdef', 'func(strtolower)'); // 'abcdef'

$filter->filter(null, 'default(guest)');     // 'guest'
```

Parameterized rules change the value with their options:

```php
// Truncate to 3 characters
$filter->filter('abcd', 'length(max: 3)');   // 'abc'

// Keep only matches of the pattern
$filter->filter('a1b22', "regex(regex: '/\\d+/', type: 'match')");
// '122'

// Remove matches of the pattern
$filter->filter('a1b22', "regex(regex: '/\\d+/', type: 'replace')");
// 'ab'
```

`range` and `clamp` limit numbers to the bounds:

```php
$filter->filter(20, 'range(min: 1, max: 10)');  // 10
$filter->filter(0, 'range(min: 1, max: 10)');   // 1
```

::: warning
`filter()` never reports a problem. Truncation and clamping change the
value silently. Call `validate()` when out-of-range input must be rejected.
:::

### Validation

`validate()` throws a `ValidateException` when the value fails. A value
passes when filtering does not change it. A numeric string such as `'25'`
passes `int` with the default comparison.

```php
validate('', 'required');                       // throws
validate('150', 'range(min: 13, max: 120)');    // throws
validate('25', 'int|range(min: 13, max: 120)'); // passes
```

Use `required` in a chain when the field must exist. Without it, an empty
value can still pass the other rules.

::: warning
`raw` performs no cleaning. It only validates that the value is unchanged,
so it is never a safe default. For HTML output, escape values with
`htmlspecialchars()` or your template engine. Filtering is not escaping.
:::

### Validating a Payload

Pass an array of `field => rules` pairs to validate a whole payload.
Fields without a rule are not checked:

```php
use function Windwalker\validate;

validate($input, [
    'name' => 'required|length(max: 50)',
    'email' => 'required|email',
]);
```

::: warning
A field missing from the rule map passes unchecked. Map every field your
code uses.
:::

### Strict Mode

`FilterService::validate()` accepts `strict: true`. Strict mode compares the
filtered value with `===`, so type changes fail:

```php
$filter->validate('5', 'int', strict: true);
```

The default compares loosely. Use strict mode for values that come from
code, such as IDs or flags, where a string would be a bug.

### Custom Rules

Register your own rule under a name with `FilterService`:

```php
$filter->addFilterCallback(
    'upper',
    fn($value) => strtoupper((string) $value),
);

$filter->filter('abc', 'upper'); // 'ABC'
```

Use `addFilterFactory()` for a full rule class, and `removeFilter()` to
remove a rule by name.


## Error Handling

- `validate()` and `validateWith()` throw
  `Windwalker\Filter\Exception\ValidateException` on the first failing rule.
  Catch it to show a message, or let it reach your error handler.
- `filter()` never throws for bad input. It returns a changed value.

::: tip
Collect errors per field, as in the registration example. The user then
sees every problem at once, not one per submit.
:::
