---
layout: doc
---

# Error Handling and Error Codes

An API should return failures in the same envelope as successes, with an
HTTP status and a machine-readable code. Windwalker converts exceptions
thrown inside an API method into that shape, so controller code can throw
normally.

## Throwing an API error

Throw `ApiException` with a message, a code, and an HTTP status:

```php
use Windwalker\Core\Http\Exception\ApiException;

#[JsonApi]
public function show(int $id): array
{
    $user = $this->findUser($id);

    if (!$user) {
        throw new ApiException('User not found', 'USER_NOT_FOUND', 404);
    }

    return $user;
}
```

The arguments are `message`, `code`, and `statusCode`. A string code becomes
the response `code`:

```php
// Response "code" is "USER_NOT_FOUND"; PHP exception code is 500.
throw new ApiException('User not found', 'USER_NOT_FOUND', 404);
```

::: tip
A string `code` is the most useful field for the frontend. Each failure can
carry its own name, such as `USER_NOT_FOUND` or `EMAIL_TAKEN`, so client
code branches on the cause instead of parsing the message or status:

```js
const res = await fetch('/api/users/' + id);
const body = await res.json();

if (!body.success) {
    switch (body.code) {
        case 'USER_NOT_FOUND':
            showNotFound();
            break;
        case 'EMAIL_TAKEN':
            showEmailField();
            break;
        default:
            showGenericError(body.message);
    }
}
```
:::

## Defining error codes with an enum

For a set of errors shared across endpoints, define a backed enum. Put
the message on each case with `#[Title]` and the HTTP status with
`#[HttpStatus]`:

```php
use Windwalker\Core\Http\Exception\ApiErrorCodeTrait;
use Windwalker\Core\Http\Exception\HttpStatus;
use Windwalker\Utilities\Attributes\Enum\Title;

enum ErrorCode: int
{
    use ApiErrorCodeTrait;

    #[Title('Resource not found')]
    #[HttpStatus(404)]
    case NOT_FOUND = 40401;

    #[Title('Permission denied')]
    #[HttpStatus(403)]
    case FORBIDDEN = 40301;
}
```

Use the enum in place of a message:

```php
ErrorCode::NOT_FOUND->throw();

ErrorCode::FORBIDDEN->throw('You cannot edit this post');
```

`throw()` never returns. `exception()` returns the `ApiException` without
throwing, which is useful when you need to attach a previous exception.

::: info
An enum used as an error code must be int-backed and must have
`#[HttpStatus]`. Otherwise Windwalker throws a `LogicException`.
:::

## The error response

Any exception inside a `#[JsonApi]` method becomes a `JsonBuffer` with
`success` set to `false`. The status comes from the error's status code:

```json
{
    "status": 404,
    "message": "User not found",
    "data": [],
    "success": false,
    "code": "USER_NOT_FOUND"
}
```

Throwing an enum case produces the same shape. The integer code is sent as a
string:

```json
{
    "status": 404,
    "message": "Resource not found",
    "data": [],
    "success": false,
    "code": "40401"
}
```

## Debug and production messages

The `message` depends on the application's debug mode. For this throw:

```php
throw new ApiException('User not found', 40401);
```

the production response has the plain message:

```json
{
    "message": "User not found",
    "success": false
}
```

In debug mode, the message is prefixed with the code, file, and line, and
`data` also includes the exception and backtrace:

```json
{
    "message": "#40401 User not found - File: /app/src/Ctrl.php (27)",
    "success": false
}
```

::: warning
Do not put sensitive information in exception messages. Debug mode shows
the file path and stack trace, so turn debug off in production.
:::

## HTTP status for an error

An integer code gives the status from its first three digits. An explicit
`statusCode` argument takes precedence:

```php
// Status 404, from the first three digits of 40401
throw new ApiException('User not found', 40401);

// Status 503, from the explicit statusCode argument
throw new ApiException('Service busy', 0, 503);
```

An enum case uses its `#[HttpStatus]` value:

```php
// Status 403, from #[HttpStatus(403)] on the case
ErrorCode::FORBIDDEN->throw('You cannot edit this post');
```
