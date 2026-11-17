---
layout: doc
title: Validation & Filtering
---

# Validation & Filtering

Input from forms, query strings, and APIs is untrusted. Windwalker splits
the work into two steps:

- **Validation** checks that a value meets a rule and rejects it if not.
- **Filtering** converts a value into a clean form, such as trimming it,
  keeping only letters, or casting it to an integer.

Both are driven by the same rule names, so one syntax string can do either.

## Minimal Usage

Call the global `filter()` and `validate()` functions. Both delegate to
`FilterService`, the service that owns the rule factory:

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

For request-level rules, such as attributes on route handlers, see
[Validation and Filter](/documentation/framework/core-concepts/http-routing/validation-and-filter).
The [Filter component](/documentation/components/filter/) documents the
rule engine itself.

## Registration Example

This handler validates each field before it saves anything. Rules run on
the raw input, and cleaning happens only after every check passes:

```php
use Windwalker\Filter\Exception\ValidateException;
use function Windwalker\filter;
use function Windwalker\validate;

function registerUser(array $input): array
{
    $checks = [
        'name' => 'required|length(max: 50)',
        'age' => 'required|int|range(min: 13, max: 120)',
        'email' => 'required|email',
    ];

    $errors = [];

    foreach ($checks as $field => $rules) {
        try {
            validate($input[$field] ?? null, $rules);
        } catch (ValidateException $e) {
            $errors[$field] = $e->getMessage();
        }
    }

    if ($errors !== []) {
        return ['errors' => $errors];
    }

    return [
        'name' => filter($input['name'], 'string|length(max: 50)'),
        'age' => filter($input['age'], 'int'),
        'email' => filter($input['email'], 'email'),
    ];
}
```

Keep `$e->getMessage()` for developers. Show users a generic message.

## Filter Rules

Filter rules return a transformed value. They do not reject input.

- `string`, `int`, `float`, `bool`, `array`, `object`: cast to that type.
- `alnum`: keeps `A-Z`, `a-z`, and `0-9`.
- `cmd`: keeps letters, digits, `_`, `.`, and `-`.
- `words`: keeps letters and `_`. Digits and spaces are removed.
- `email`: removes characters that are not valid in an email address.
- `url`: removes characters that are not valid in a URL.
- `abs`: returns the absolute value.
- `neg`: returns the negative of the value.
- `func(name)`: applies a callable by name.
- `default(value)`: replaces an empty value with `value`.

Examples:

```php
$filter->filter('Hello World 9', 'words');   // 'HelloWorld'

$filter->filter('ABCdef', 'func(strtolower)'); // 'abcdef'

$filter->filter(null, 'default(guest)');     // 'guest'
```

### Parameterized Filters

`length` and `regex` filter by changing the value:

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

`range` clamps numbers to the bounds:

```php
$filter->filter(20, 'range(min: 1, max: 10)');  // 10
$filter->filter(0, 'range(min: 1, max: 10)');   // 1
```

::: warning
`filter()` never reports a problem. Truncation and clamping change the
value silently. Call `validate()` when out-of-range input must be rejected.
:::

## Validate Rules

Validation rules throw `ValidateException` when the value fails. A value
passes when filtering does not change it.

- `required`: fails on an empty string or `null`.
- `int`, `string`, and other casts: pass when the value is already that
  type, or when it converts cleanly. A numeric string such as `'25'`
  passes `int` with the default comparison.
- `email`: fails when the value contains characters or formatting an
  email address cannot have. A trailing space fails.
- `length(max: n)`: fails when the string is longer than `n`.
- `range(min: n, max: m)`: fails when the number is outside the bounds.
- `regex(regex: '...', type: 'replace')`: fails when the pattern matches.
- `raw`: always passes.

```php
validate('', 'required');                   // throws
validate('150', 'range(min: 13, max: 120)'); // throws
validate('25', 'int|range(min: 13, max: 120)'); // passes
```

Use `required` in a chain when the field must exist. Without it, an empty
value can still pass the other rules.

::: warning
`raw` performs no cleaning. It only validates that the value is unchanged,
so it is never a safe default. For HTML output, escape values with
`htmlspecialchars()` or your template engine. Filtering is not escaping.
:::

## Array Input

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

## Strict Mode

`FilterService::validate()` accepts `strict: true`. Strict mode compares the
filtered value with `===`, so type changes fail:

```php
$filter->validate('5', 'int', strict: true);
```

The default compares loosely. Use strict mode for values that come from
code, such as IDs or flags, where a string would be a bug.

## Error Handling

- `validate()` returns `true` when the value passes.
- `validate()` throws `Windwalker\Filter\Exception\ValidateException` on the
  first failing rule in a chain.
- `ValidateException` extends `UnexpectedValueException`. Catch it to
  show a message, or let it bubble up to your error handler.
- `filter()` never throws for bad input. It returns a changed value.

::: tip
Collect errors per field, as in the registration example. The user then
sees every problem at once, not one per submit.
:::

## Custom Rules

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
