---
layout: doc
title: Cookies
component: session
---

# Cookies

A session is found again on the next request through its ID. The ID is
normally carried in a cookie, so the browser sends it back with every
request. The cookies component writes that cookie and reads it. It can be
replaced when the framework or your application needs a different way to
send headers, for example with PSR-7 responses.

The package provides two implementations of `CookiesInterface`:

- `Cookies` sends headers immediately with PHP's `setcookie()`. It is the
  default for a standalone `Session`.
- `ArrayCookies` stores cookies in memory and reads them from an array. It
  does not send anything. You attach the generated headers to your response.

## Minimal Setup

A `Session` creates a `Cookies` object when you do not pass one. The default
cookie is `httpOnly`, expires after 30 days, and is `SameSite=Lax`:

```php
use Windwalker\Session\Bridge\PhpBridge;
use Windwalker\Session\Handler\FilesystemHandler;
use Windwalker\Session\Session;

$session = new Session(
    ['name' => 'APP_SESSID'],
    new PhpBridge([], new FilesystemHandler('/var/lib/app/sessions')),
);
```

## Showcase

The following example uses PSR-7 cookies. It reads the cookies of the
current request, stores the session with the cookie options that you choose,
and adds the `Set-Cookie` headers to the response:

```php
use Windwalker\Session\Bridge\PhpBridge;
use Windwalker\Session\Cookie\ArrayCookies;
use Windwalker\Session\Cookie\CookiesInterface;
use Windwalker\Session\Cookie\CookiesOptions;
use Windwalker\Session\Handler\FilesystemHandler;
use Windwalker\Session\Session;

$cookies = ArrayCookies::create(
    $request->getCookieParams(),
    new CookiesOptions(
        expires: '+2 hours',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: CookiesInterface::SAMESITE_LAX,
    ),
);

$session = new Session(
    ['name' => 'APP_SESSID'],
    new PhpBridge([], new FilesystemHandler('/var/lib/app/sessions')),
    $cookies,
);

$session->set('locale', 'en-US');

foreach ($cookies->getCookieHeaders() as $header) {
    $response = $response->withAddedHeader('Set-Cookie', $header);
}
```

Here `$request` is a PSR-7 `ServerRequestInterface`, and `$response` is the
response that you return. Call `getCookieHeaders()` after all cookies are
set, just before you return the response.

## Cookie Options

`CookiesOptions` holds the attributes of a cookie: `expires`, `path`,
`domain`, `secure`, `httpOnly`, and `sameSite`. Pass it to `set()` as
shown below, or to the constructor of `ArrayCookies` or `Cookies` as the
default for every cookie:

```php
use Windwalker\Session\Cookie\Cookies;
use Windwalker\Session\Cookie\CookiesOptions;

$cookies = new Cookies();

$cookies->set(
    'remember',
    'token-value',
    new CookiesOptions(
        expires: '+30 days',
        path: '/account',
        httpOnly: true,
    ),
);
```

`expires` accepts a relative string, a timestamp, or a `DateTimeInterface`.

When you need to change the cookie parameters of the native session cookie,
call `setCookieParams()` on the session before it starts. It applies only
when the session uses `Cookies`, and it sends the options with
`session_set_cookie_params()`:

```php
$session->setCookieParams(
    new CookiesOptions(
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
    ),
);
```

::: warning
The framework's default configuration sets `secure` to `false` for the
session cookie. Over HTTPS, a cookie without the `Secure` flag can also be
sent over plain HTTP. In production, set `secure` to `true`, or keep the
automatic setting described below.
:::

## Reading and Removing Cookies

Use `get()` and `remove()` for cookies that your application stores
outside the session:

```php
$token = $cookies->get('remember');

$cookies->remove('remember');
```

`Cookies::get()` reads the request's `$_COOKIE` array, so a value that you
set in the current request is visible only in the next request. `ArrayCookies`
returns the values you set during the request.
