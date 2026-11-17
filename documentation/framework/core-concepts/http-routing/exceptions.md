---
layout: doc
title: Exceptions
---

# Exceptions

## Overview

An exception stops the current method and tells the framework what went
wrong. Windwalker turns it into a response. What the user sees depends on
four things: the exception code, the request method and type, the debug
mode, and the verbosity setting.

The error layer has these parts:

- The exception code, which becomes the HTTP status.
- `WebApplication::dispatch()`, which decides whether an exception renders
  an error page or flashes a warning and redirects back.
- `AppVerbosity`, which controls how much of a message reaches the user.
- `ValidateFailException` and `ValidateException`, for validation errors.
- `RouteNotFoundException`, for a request or route that does not exist.
- `UnauthorizedException`, for a request that needs a login or is denied.
- `#[JsonApi]` and `ApiException`, for JSON error responses.

The [Controllers](/documentation/framework/core-concepts/http-routing/controllers) page
shows how a method returns values:

```php
<?php

public function ping(): string
{
    return 'pong';
}
```

The [Validation & Filter](/documentation/framework/core-concepts/http-routing/validation-and-filter)
page explains the rules that throw validation exceptions. A required
parameter throws `ValidateException` when it is missing:

```php
<?php

use Windwalker\Core\Attributes\Required;

public function show(#[Required] string $id): string
{
    return $id;
}
```

## Throwing an Exception

Throw an exception to stop the method. The exception code is the HTTP status:

```php
<?php

use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

public function show(string $id, PostRepository $posts): JsonResponse
{
    $post = $posts->find((int) $id);

    if (!$post) {
        throw new \RuntimeException('Post not found.', 404);
    }

    return response()->json($post);
}
```

### Status Codes

The status comes from the exception code:

- A valid HTTP status code, such as `404`, is used.
- A code that is not an HTTP status, including the default `0`, becomes
  `500`.

## What Happens to an Exception

`WebApplication::dispatch()` decides the response for each exception.

### Rethrown Exceptions

The exception is rethrown, so the error page renders, when the request is:

- a `GET` request,
- a request in debug mode,
- a request whose client accepts JSON, or
- an API call.

### Flashed Exceptions

Otherwise, the framework logs the error, flashes a warning with the
verbosity message, and redirects back to the previous page. Errors with 4xx
codes are not logged.

::: warning
A failure in a `POST`, `PUT`, `PATCH`, or `DELETE` request is easy to miss.
The user sees a warning message and a redirect, and the error appears only
in the log. Check the log when a form seems to do nothing.
:::

## Error Messages and Verbosity

The `app.verbosity` setting (env `APP_VERBOSITY`) controls how much of an
exception message reaches the user in a flash message. When it is not set,
the default is `NORMAL`, or `VERBOSE` in debug mode:

- `HIDDEN`: the fallback `Something went wrong`, unless the exception
  implements `SafeMessageExceptionInterface`. Such an exception provides a
  message that is safe to show.
- `NORMAL`: the exception message.
- `VERBOSE` and `VERY_VERBOSE`: a message with more detail, such as the SQL
  of a database error, when the exception implements
  `VerbosityExceptionInterface`.

::: info
Verbosity affects flash messages and log entries only. The error page and
JSON errors use the debug flag instead, so `HIDDEN` does not hide them.
:::

## Validation Exceptions

### ValidateFailException

`ValidateFailException` is thrown when `input()` validates named fields. Its
message is the validator message, in every mode. It also implements
`SafeMessageExceptionInterface`, so `HIDDEN` shows the message.

`InvalidTokenException`, thrown when a CSRF token is invalid, follows the
same branch in `dispatch()`. For these two exceptions, the framework checks
the request in this order:

- For an API call, the exception is rethrown. See
  [JSON API Errors](#json-api-errors).
- In debug mode with `VERY_VERBOSE`, the exception is rethrown and the error
  page renders.
- Otherwise, the framework flashes a warning with the verbosity message and
  redirects back to the previous page.

So a failed form on a normal HTML request redirects back with a warning. The
warning shows the validator message at every verbosity level, including
`HIDDEN`.

::: info
`VERBOSE` adds detail only when the exception has a debug message. `input()`
does not set one, so the message is the same as at `NORMAL`.
:::

### Redirect After a Validation Error

When `ValidateFailException` or `InvalidTokenException` is not caught in your
code, `dispatch()` adds the warning flash message and then calls
`Navigator::back()`. That method redirects to the local `Referer` of the
request. If there is no local `Referer`, it redirects to the site root.

To redirect to a specific route, catch the exception in your controller.
Add the flash message yourself, then return a redirect to the route you want:

```php
<?php

use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Form\Exception\ValidateFailException;
use Windwalker\Core\Router\Navigator;

public function save(string $id, AppContext $app): mixed
{
    try {
        // Validate the input and save the post here.
    } catch (ValidateFailException $e) {
        $app->addMessage($e->getMessage(), 'warning');

        $nav = $app->service(Navigator::class);

        return $app->redirect($nav->to('post_edit', ['id' => $id]));
    }
}
```

::: info
A caught exception skips the framework's verbosity handling. The
`$e->getMessage()` text is shown at every verbosity level, so pass only
messages that are safe to show.
:::

### ValidateException

`#[Assert]` and `#[Required]` throw `ValidateException`, not
`ValidateFailException`. The validation branch does not catch it, so it
follows the general rules in [What Happens to an Exception](#what-happens-to-an-exception).

### Throwing Validation Errors

Throw `ValidateFailException` yourself when your own check fails, such as a
rule that needs a database lookup. The constructor takes the message or a
list of messages, and the HTTP status code:

```php
<?php

use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Form\Exception\ValidateFailException;

public function save(AppContext $app): mixed
{
    $title = (string) $app->input('title');

    if (mb_strlen($title) > 100) {
        throw new ValidateFailException(
            'Title must be 100 characters or fewer.',
            400,
        );
    }

    if ($title === '') {
        throw new ValidateFailException(
            ['Title is required.', 'Slug is required.'],
            400,
        );
    }

    // Save the post here.
}
```

A list of messages is joined with a line break in the message. Use
`getMessages()` on the exception to read them as an array.

Add an extra debug message with `setDebugMessage()`. It is appended to the
message only in `VERBOSE` mode, which is the default in debug mode:

```php
<?php

use Windwalker\Core\Form\Exception\ValidateFailException;

$slug = 'hello-world';

$e = new ValidateFailException('Slug is already used.', 400);
$e->setDebugMessage('Slug "' . $slug . '" belongs to post #12.');

throw $e;
```

::: warning
The debug message is not shown in `HIDDEN` or `NORMAL` mode. It is shown in
`VERBOSE` mode, so it can reach users on a site that runs with verbose
output. Do not put secrets, SQL, or internal paths in it.
:::

For a JSON API, the status code becomes the HTTP status of the error. See
[JSON API Errors](#json-api-errors).

## Built-in Exceptions

The framework provides these exceptions for common cases. They carry an
HTTP status, so you do not need a generic `RuntimeException`.

### RouteNotFoundException

`RouteNotFoundException` means that no route matches, or that a route cannot
be found. Its default message is `Not found` and its default code is `404`.

The framework throws it in these places:

- `Router::match()`, when the URL matches no route.
- `Navigator`, when it cannot find the route it is asked to build a URL for.
- `RequestAssert::assertNotFound()`, when its assertion fails.

Throw it yourself for a resource that does not exist. Pass only the message,
because the `404` code is the default:

```php
<?php

use Windwalker\Core\Router\Exception\RouteNotFoundException;

public function show(string $id, PostRepository $posts): array
{
    $post = $posts->find((int) $id);

    if (!$post) {
        throw new RouteNotFoundException('Post not found.');
    }

    return ['post' => $post];
}
```

`RequestAssert::assertNotFound()` does the same check in one line. It throws
when the assertion is falsy and returns the assertion value otherwise:

```php
<?php

use Windwalker\Core\Http\RequestAssert;

public function show(string $id, PostRepository $posts): array
{
    $post = $posts->find((int) $id);

    RequestAssert::assertNotFound($post, 'Post not found.');

    return ['post' => $post];
}
```

When a route does not match, `RoutingMiddleware` first tries the fallback
route, if one is configured. If no route matches, it emits
`RoutingNotMatchedEvent` with the exception and throws
`$event->exception`. A listener can replace that property before the
exception is thrown.

::: info
If the fallback route throws another `RouteNotFoundException`, that
exception replaces the original one. The error is reported from the
fallback, not from the URL that did not match.
:::

### UnauthorizedException

`UnauthorizedException` means that the request needs a login (`401`) or
that the user is not allowed to do the action (`403`). Its default code is
`401`. Its default message is empty, so pass a message when you throw it
directly.

The assertion helpers in `RequestAssert` set the code and a default message:

- `assertUnauthorized()` throws code `401`, with the default message
  `Unauthorized`.
- `assertForbidden()` throws code `403`, with the default message
  `Forbidden`.

Use them to check the login and the permission in a controller:

```php
<?php

use Windwalker\Core\Http\RequestAssert;

public function edit(string $id, ?User $user, PostRepository $posts): array
{
    $post = $posts->find((int) $id);

    RequestAssert::assertUnauthorized(
        $user !== null,
        'Please log in first.',
    );
    RequestAssert::assertForbidden(
        $user->canEdit($post),
        'You cannot edit this post.',
    );

    return ['post' => $post];
}
```

The assertion can also be a closure. The closure runs only when the check
is made, so an expensive check runs only when the earlier checks pass:

```php
<?php

use Windwalker\Core\Http\RequestAssert;

RequestAssert::assertForbidden(
    fn() => $user->canEdit($post),
    'You cannot edit this post.',
);
```

To throw it directly, pass the message and the code:

```php
<?php

use Windwalker\Core\Security\Exception\UnauthorizedException;

throw new UnauthorizedException('Login required.', 401);
```

::: info
`InvalidTokenException`, thrown for a failed CSRF check, extends
`UnauthorizedException` and uses code `403`. A `catch` for
`UnauthorizedException` also catches CSRF failures.
:::

::: warning
`UnauthorizedException` does not implement `SafeMessageExceptionInterface`.
With `app.verbosity` set to `HIDDEN`, a denied `POST`, `PUT`, `PATCH`, or
`DELETE` request shows `Something went wrong` in the flash message, not your
message. Check the log to see the real message.
:::

## JSON API Errors

With the `#[JsonApi]` attribute (see
[Middleware Attributes](/documentation/framework/core-concepts/http-routing/middleware#middleware-attributes)),
an exception is rendered as a JSON error with the same status code:

```php
<?php

use Windwalker\Core\Attributes\JsonApi;

#[JsonApi]
public function show(string $id): array
{
    throw new \RuntimeException('Post not found.', 404);
}
```

Outside debug mode, the `message` is the exception message. Debug mode also
adds the exception class and a backtrace.

To set a business error code separately from the status, throw
`ApiException`. Its arguments are the message, the error code, and the HTTP
status:

```php
<?php

use Windwalker\Core\Http\Exception\ApiException;

throw new ApiException('Post not found.', 40401, 404);
```

::: warning
Outside debug mode, the JSON `message` is the exception message, and the
`app.verbosity` setting does not change it. Do not put SQL, file paths, or
other internal details in exception messages.
:::
