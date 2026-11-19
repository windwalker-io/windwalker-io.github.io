---
layout: doc
title: CSRF and CORS Protection
description: How CSRF tokens protect state-changing requests, which HTTP methods are checked by default, and how to apply the Csrf attribute to a method.
---

# CSRF and CORS Protection

Cross-Site Request Forgery (CSRF) tricks the browser of a logged-in user
into sending a request to your site from another page. Windwalker blocks
it with a token: the request must carry the token stored in the user's
session, and a page on another site cannot read that token.

The check runs for `POST`, `PUT`, `PATCH`, and `DELETE` by default.
`GET` requests are not checked, so they must never change data.

## How the Parts Fit Together

- `CsrfService`: creates the token, stores it in the session under
  `csrf-token`, and validates incoming requests.
- `CsrfMiddleware`: calls `CsrfService::validate()` for the matching
  HTTP methods.
- `#[Csrf]`: runs `CsrfMiddleware` before one controller method.
- `@csrf` (Edge) and Unicorn: put the token into forms and JavaScript
  requests.

## Minimal Usage

Add `#[Csrf]` to the method that changes data:

```php
use Windwalker\Core\Attributes\Csrf;
use Windwalker\Core\Http\AppRequest;

class PostController
{
    #[Csrf]
    public function store(AppRequest $request): void
    {
        // Only requests with a valid token reach this method.
    }
}
```

The form must send the token. In an Edge template, use `@csrf`:

```edge
<form method="post" action="/posts">
    @csrf

    <input type="text" name="title">
    <button type="submit">Save</button>
</form>
```

## Complete Example

This example is my own design, not taken from the framework. It combines
a form page, a protected save action, and a public webhook that is
excluded from the check.

Routes and middleware are wired as in the
[middleware](/documentation/framework/core-concepts/http-routing/middleware)
page. The controller uses `CsrfService` directly to show the token on
the form page:

```php
use Windwalker\Core\Attributes\Csrf;
use Windwalker\Core\Http\AppRequest;
use Windwalker\Core\Security\CsrfService;

class PostController
{
    public function __construct(
        protected CsrfService $csrf,
    ) {
    }

    public function form(): array
    {
        return [
            'csrfToken' => $this->csrf->getToken(),
        ];
    }

    #[Csrf]
    public function store(AppRequest $request): void
    {
        // Save the post. The token is already checked.
    }
}
```

## Attribute and Middleware

`#[Csrf]` runs the default check on one method. It can be placed on
methods and functions only. To check a group of routes, add
`CsrfMiddleware` to the group instead.

`CsrfMiddleware` accepts these constructor arguments:

- `excludes`: routes or URI patterns that skip the check.
- `workingMethods`: the HTTP methods to check. The default is `post`,
  `put`, `patch`, and `delete`.
- `inputMethod`: the input source for the token on non-API requests.
- `invalidMessage`: the message of the exception on failure.

Attach it to a route or a group with `middleware()`. Pass the options as
named arguments; the class is resolved through DI:

```php
<?php

use Windwalker\Core\Middleware\CsrfMiddleware;

/** @var RouteCreator $router */

$router->group('member')
    ->prefix('/member')
    ->middleware(
        CsrfMiddleware::class,
        excludes: ['/webhooks/*'],
        workingMethods: ['post', 'delete'],
        invalidMessage: 'The form expired. Reload and retry.',
    )
    ->register(function (RouteCreator $router) {
        // ...
    });
```

A string that starts with `/` is matched against the request URI, and
`*` works as a wildcard. Other strings are matched against route names.

::: tip
Use `excludes` for a specific route, such as a webhook that sends its
own signature. Do not disable CSRF for a whole group to fix one form.
:::

::: warning
An excluded route is not checked at all. Keep the list short and
review it when you add routes.
:::

## API Calls

For API requests, the middleware reads the token only from the
`X-CSRF-Token` header or the query string. The `inputMethod` setting is
ignored for API calls.

A form field sent in the body is not accepted for API calls.

## Forms

- `@csrf` (Edge): renders a hidden `anticsrf` field with the token.
- `<x-csrf />`: the component form of `@csrf`. It resolves to the same
  `layout.security.csrf` view, so it works without Unicorn.
- `CsrfService::input()`: returns the same hidden field as an element
  object for forms built in PHP.

## Sending the Token from JavaScript

AJAX requests cannot use the hidden field. Send the token in the
`X-CSRF-Token` header. Render the token into a `<meta>` tag in your layout
and read it in JavaScript:

```blade
<?php

use Windwalker\Core\Security\CsrfService;

$csrf = $app->retrieve(CsrfService::class);
?>

<meta name="csrf-token" content="{{ $csrf->getToken() }}">
```

```js
const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute('content');

const response = await fetch('/api/posts', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ title: 'Hello' }),
});
```

::: info
The token is stored in the session, so it stays the same for the whole
session. Reading it in a layout does not change it.
:::

With Unicorn, you do not need the `<meta>` tag. `useHttpClient()` adds
the `X-CSRF-Token` header to every axios request automatically. See the
Unicorn RAD documentation for details.

## Using CsrfService Directly

Inject `Windwalker\Core\Security\CsrfService` to read or check the token
yourself:

```php
use Windwalker\Core\Http\AppRequest;
use Windwalker\Core\Security\CsrfService;

class PostController
{
    public function __construct(
        protected CsrfService $csrf,
    ) {
    }

    public function store(AppRequest $request): void
    {
        $this->csrf->validate($request);

        // Save the post...
    }
}
```

`getToken()` returns the token stored in the session under `csrf-token`
and creates one when none exists. Pass `refresh: true` to replace it:

```php
$token = $this->csrf->getToken(refresh: true);
```

`validate()` accepts the token from the `X-CSRF-Token` header or the
`anticsrf` field. It throws `InvalidTokenException` when the token is
missing or wrong. The exception is an `UnauthorizedException`, and
`validate()` sets the response code to 403.

::: warning
If no session is available, `CsrfService` treats the check as passed and
the token is an empty string. The protection is silently disabled, so
make sure sessions are enabled on every route that needs the check.
:::
