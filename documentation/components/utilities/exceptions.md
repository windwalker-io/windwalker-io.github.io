---
layout: doc
title: Exceptions
component: utilities
---

# Exceptions

The utilities in this package signal problems with exceptions of their own,
and they expose a few reusable building blocks for your own exceptions.
Validation failures often have several messages, not one. Errors shown to
end users should be short, while logs need more detail. The traits and the
interface in this namespace cover both cases, so each exception class
does not have to repeat the same code.

## Minimal Setup

The package's exceptions are ordinary exception classes. You catch them the
same way you catch any other exception. `CastingException` is thrown by the
`must*()` methods of `TypeCast`:

```php
use Windwalker\Utilities\Exception\CastingException;
use Windwalker\Utilities\TypeCast;

try {
    TypeCast::mustInteger('abc');
} catch (CastingException $e) {
    echo $e->getMessage();
    // Safe convert value string(3) "abc" to type "int" failed.
}
```

`CastingException` extends `UnexpectedValueException`, so a `catch` for
that parent class also catches it.

## Showcase: A Validation Exception

The following exception carries several messages, shows them all to the
user, and includes the status code in its debug message. Use the traits
on your own exception class:

```php
use DomainException;
use Windwalker\Utilities\Exception\MultiMessagesExceptionTrait;
use Windwalker\Utilities\Exception\VerbosityExceptionInterface;
use Windwalker\Utilities\Exception\VerbosityExceptionTrait;

class ValidationException extends DomainException implements
    VerbosityExceptionInterface
{
    use MultiMessagesExceptionTrait;
    use VerbosityExceptionTrait;

    public function getDebugMessage(): string
    {
        return $this->getMessage() . ' (code ' . $this->getCode() . ')';
    }
}

$e = new ValidationException(
    ['Name is required.', 'Email is invalid.'],
    422,
);

$e->getMessage();
// "Name is required.\nEmail is invalid."

$e->getMessages();
// ['Name is required.', 'Email is invalid.']

$e->getMessageByVerbosity(true);
// "Name is required.\nEmail is invalid. (code 422)"
```

## Multiple Messages

`MultiMessagesExceptionTrait` accepts a string, an array, or `null` as its
first constructor argument. The messages are joined with the platform's
line break, so `getMessage()` still returns one string that works in a
normal `catch` block. Use `getMessages()` when you need each message on its
own, for example to render a list in a form:

```php
$messages = $e->getMessages();

foreach ($messages as $message) {
    echo '- ', $message, PHP_EOL;
}
```

An element of the array may itself be an array. Its items are joined with
the line break, and the result is one entry of `getMessages()`.

## Verbosity

`VerbosityExceptionInterface` separates a short message from a detailed
one. The trait provides `getMessageByVerbosity()`: a truthy argument returns
the debug message, and a falsy argument returns the normal message. The
class must provide `getDebugMessage()` itself:

```php
echo $e->getMessageByVerbosity(false); // short message for users
echo $e->getMessageByVerbosity(true);  // detailed message for logs
```

The trait checks only whether the argument is truthy. To support several
levels, override `getMessageByVerbosity()` in your class.

## Bad Method Calls

`ExceptionFactory::badMethodCall()` builds the exception that `TypeCast`
throws when you call a method it does not define. It returns a
`BadMethodCallException` whose message names the class and the method:

```php
use Windwalker\Utilities\Exception\ExceptionFactory;

throw ExceptionFactory::badMethodCall('publish', Article::class);
// Call to undefined method: Article::publish()
```

Pass the class name as the second argument. When it is omitted, the factory
reads the calling class from the call stack, as `Assert` does.

## Method Summary

| Class, trait, or method | Parameters | Description |
|-------------------------|------------|-------------|
| `CastingException` | Standard exception arguments | Thrown when a value cannot be converted safely. |
| `MultiMessagesExceptionTrait::__construct()` | `string\|array\|null $messages = null, int $code = 0, ?Throwable $previous = null` | Joins messages into one message string. |
| `getMessages()` | None | Returns the messages as an array. |
| `setMessages()` | `array $messages` | Replaces the stored messages. |
| `VerbosityExceptionInterface` | `getDebugMessage()`, `getMessageByVerbosity()` | Contract for short and detailed messages. |
| `VerbosityExceptionTrait::getMessageByVerbosity()` | `int\|bool $verbosity = false` | Returns the debug message when the verbosity is truthy. |
| `ExceptionFactory::badMethodCall()` | `string $name, ?string $caller = null` | Builds a `BadMethodCallException` for an undefined method. |

## Related

- [Assert](./assert): throws exceptions for failed checks.
- [Type Cast](./type-cast): throws `CastingException` in `must*()` methods.
