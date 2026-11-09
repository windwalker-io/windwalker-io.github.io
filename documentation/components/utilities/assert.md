---
layout: doc
title: Assert
component: utilities
---

# Assert

Argument and invariant checks are often written as a plain `if` followed
by a `throw`, repeated in every method. The check and the message drift
apart, and the message rarely says which method failed or what value was
received. `Assert` turns each check into one call. The message is a
template that receives the caller's name and a description of the value,
so the exception explains itself.

## Minimal Setup

The `*Assert` classes are static, so you can call them directly. Choose
the class whose exception type fits the failure:

```php
use Windwalker\Utilities\Assert\ArgumentsAssert;

ArgumentsAssert::assert(
    $port > 0,
    'Port must be positive, got {value}.',
    $port,
);
```

If `$port` is `-1`, the call throws an `InvalidArgumentException` with
the message `Port must be positive, got -1.`

## Showcase: Guarding an Invoice

The following class checks its input when it is created, and checks its
state before each change. Each message names the method that failed:

```php
use Windwalker\Utilities\Assert\ArgumentsAssert;
use Windwalker\Utilities\Assert\LogicAssert;

final class Invoice
{
    protected string $status = 'open';

    public function __construct(
        protected int $quantity,
        protected float $unitPrice,
    ) {
        ArgumentsAssert::assert(
            $quantity > 0,
            '{caller}: quantity must be positive, got {value}.',
            $quantity,
        );
    }

    public function pay(): void
    {
        LogicAssert::assert(
            $this->status === 'open',
            '{caller}: invoice is already {value}.',
            $this->status,
        );

        $this->status = 'paid';
    }
}

$invoice = new Invoice(0, 9.99);
// InvalidArgumentException:
// Invoice::__construct(): quantity must be positive, got 0.
```

`{caller}` is filled in from the call stack, so the message names the
method that performed the check.

## Choosing an Assert Class

Each static class throws a different exception type. Use the one that
matches the kind of failure:

- `TypeAssert`: throws `TypeError`, for values with the wrong type.
- `ArgumentsAssert`: throws `InvalidArgumentException`, for bad arguments.
- `LogicAssert`: throws `LogicException`, for an invalid object state or
  call order.
- `RuntimeAssert`: throws `RuntimeException`, for failures that depend on
  the environment.

All four accept the same arguments, so you can switch the class without
changing the rest of the code.

## Assertions and Messages

The first argument is the assertion. A value is checked for truthiness.
A callable is invoked, and its return value is checked:

```php
RuntimeAssert::assert(
    fn () => is_file($path),
    'File {value} does not exist.',
    $path,
);
```

The method returns the assertion it received. For a callable, that is the
callable itself, not its result.

Placeholders in the message are replaced as follows:

- `{caller}`: the method that called the assertion.
- `{value}`: the value you passed as the third argument.
- `{type}`: a description of the value, such as `string(3) "abc"`,
  `BOOL (FALSE)`, or `(NULL)`.

Array values can be reached with a dotted path:

```php
ArgumentsAssert::assert(
    isset($user['email']),
    'User {value.name} has no email.',
    $user,
);
```

::: tip
Use `{type}` when the value may be long or sensitive. Arrays and objects
show only their type, and strings show a preview truncated to 50
characters.
:::

A message can also be a closure. It receives the caller, the value, and
the description, and returns the final string:

```php
ArgumentsAssert::assert(
    $age >= 18,
    fn (string $caller, mixed $value, string $type): string
        => "$caller rejected $type",
    $age,
);
```

If the closure throws, the message becomes
`Error when generating assert message: ...` and the assertion still
fails.

## Describing Values

`Assert::describeValue()` produces the text used by `{type}`. You can
call it yourself when you build a message:

- `null` becomes `(NULL)`.
- `true` and `false` become `BOOL (TRUE)` and `BOOL (FALSE)`.
- Numbers become their type and value, such as `integer(12)`.
- Strings become their length and text, truncated to 50 characters by
  default.
- Arrays become `array`, and objects become their class name.

## Custom Exceptions

Use `Assert::create()` when the exception class or code must be your
own. It returns an `Assert` instance that can be reused:

```php
use Windwalker\Utilities\Assert\Assert;

$assert = Assert::create(
    \DomainException::class,
    422,
);

$assert->assert($stock >= 0, 'Stock {value} is negative.', $stock);
```

`Assert::create()` defaults to `RuntimeException` with code `500`. The
`TypeAssert` family accepts a custom handler instead: a callable that
receives the message and returns a `Throwable`.

::: info
`{caller}` is read from the call stack. Call an assertion from inside a
function or method. Top-level script code has no caller name to report.
:::

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `ArgumentsAssert::assert()` | `$assertion, $message, $value = null, $exception = null` | Checks an assertion and throws `InvalidArgumentException`. |
| `LogicAssert::assert()` | `$assertion, $message, $value = null, $exception = null` | Checks an assertion and throws `LogicException`. |
| `RuntimeAssert::assert()` | `$assertion, $message, $value = null, $exception = null` | Checks an assertion and throws `RuntimeException`. |
| `TypeAssert::assert()` | `$assertion, $message, $value = null, $exception = null` | Checks an assertion and throws `TypeError`. |
| `TypeAssert::createAssert()` | `$exception = null, $caller = null` | Creates an `Assert` instance for the family. |
| `Assert::create()` | `$exceptionClass = RuntimeException::class, $code = 500, $caller = null` | Creates a reusable `Assert` with a custom exception. |
| `Assert::assert()` | `$assertion, $message, $value = null` | Checks an assertion on an instance. |
| `Assert::__invoke()` | `$assertion, $message, $value = null` | Same as `assert()`, so the instance can be called directly. |
| `Assert::throwException()` | `$message, $value = null` | Builds the message and throws it. |
| `Assert::exception()` | `$message, $value = null` | Builds and returns the exception without throwing it. |
| `Assert::getCaller()` | `$backSteps = 2` | Returns the `Class::method()` name from the call stack. |
| `Assert::describeValue()` | `$value, $truncate = 50` | Describes a value for `{type}`. |

## Related

- [Attributes](./attributes#dump-attributes): the dump visibility attributes
  (`Expose`, `Invisible`, `Transient`) are described there.
