---
layout: doc
title: Uri
part: Components
chapter: Uri
menu: components/uri
component: uri
---

# Uri

`Uri` is the main class of the package. It parses a URL string into its
parts, lets you read and change those parts, and renders the result back to
a string. Code that builds URLs from several sources, such as a base URL in
configuration, a route path, and query values from the request, can pass a
`Uri` between steps without sharing a mutable string. A payment provider
callback is a typical case: one base URL is used by several services, and
each service adds its own query values to a copy of it.

## Creating a URI

Pass a string to the constructor. The constructor parses the string and
normalizes the path, so `.` and `..` segments are resolved:

```php
use Windwalker\Uri\Uri;

$uri = new Uri('https://example.com/a/b/../c?x=1#top');

echo $uri->getPath();
// /a/c
```

Pass `true` as the second argument when the URL contains non-ASCII
characters. The path is then parsed as UTF-8 and encoded:

```php
$uri = new Uri('https://example.com/路徑', true);

echo $uri->getPath();
// /%E8%B7%AF%E5%BE%91
```

Use `Uri::wrap()` when a value may be a string, a `Stringable`, a PSR-7 URI,
or `null`. It returns the same instance for a `Uri` and converts other
values into a new one:

```php
$uri = Uri::wrap($request->getUri());
```

## Showcase

The following example builds an API request URL from a base address, a
path, a paged query, and a fragment. Each step returns a new object, so
the base can be reused:

```php
use Windwalker\Uri\Uri;

$base = new Uri('https://api.example.com/v2');

$users = $base
    ->withPathAppend('/users')
    ->withVar('status', 'active')
    ->withVar('page', 3)
    ->withFragment('list');

echo $users;
// https://api.example.com/v2/users?status=active&page=3#list

$orders = $base->withPathAppend('/orders');

echo $orders;
// https://api.example.com/v2/orders
```

`$base` still renders as `https://api.example.com/v2` after both calls.

## Reading Parts

Each part has a getter. Missing parts return an empty string, except
`getPort()`, `getUser()`, and `getPassword()`, which return `null`:

```php
$uri = new Uri('https://user@example.com:8443/docs?lang=en#intro');

$uri->getScheme();    // 'https'
$uri->getHost();      // 'example.com'
$uri->getPort();      // 8443
$uri->getPath();      // '/docs'
$uri->getQuery();     // 'lang=en'
$uri->getFragment();  // 'intro'
$uri->getUser();      // 'user'
$uri->getPassword();  // null
```

`getAuthority()` returns the `[user-info@]host[:port]` part. It omits the
port when it is the default for the scheme. `isSSL()` returns `true` when
the scheme is `https`.

## Immutability

Every `with*()` method clones the object and changes the copy. The original
keeps its value:

```php
$a = new Uri('https://example.com/blog?page=1');
$b = $a->withVar('page', 2)->withVar('lang', 'en');

echo $a;  // https://example.com/blog?page=1
echo $b;  // https://example.com/blog?page=2&lang=en
```

::: info
`getOriginal()` returns the string that was passed to the constructor. It
does not change after a `with*()` call, so use `(string) $uri` to get the
current value.
:::

## Changing the Path

`withPath()` accepts a path with or without a leading slash. It normalizes
dot segments and encodes characters that are not allowed in a path. It
rejects a `?` or `#`, which belong to the query and the fragment:

```php
$uri = new Uri('https://example.com')
    ->withPath('docs/getting started');

echo $uri;
// https://example.com/docs/getting%20started

new Uri('https://example.com')->withPath('/search?q=1');
// InvalidArgumentException: Path should not contain `?` and `#` symbols.
```

`withPathAppend()` adds a suffix to the current path. It filters the whole
resulting path the same way `withPath()` does: characters that are not
allowed in a path are percent-encoded, and existing escape sequences are
kept, so `%20` is not encoded twice:

```php
$uri = new Uri('https://example.com/files')
    ->withPathAppend('/report 2026.pdf');

echo $uri->getPath();
// /files/report%202026.pdf

$uri = new Uri('https://example.com/files')
    ->withPathAppend('/report%202026.pdf');

echo $uri->getPath();
// /files/report%202026.pdf
```

::: info
The suffix is still a path, not a single segment. A `/` in it adds a
new level, and `?` or `#` are encoded rather than starting a query or a
fragment. Use `UriHelper::encode(..., true)` on a segment when you need a
literal encoded value, or use `withPath()` to build the whole path.
:::

## Working with Query Variables

The query can be changed as a string or as an array of variables. Use
`withVar()` to set one variable and keep the others, `withoutVar()` to
remove one, and `withQueryParams()` to replace the query with an array:

```php
$uri = new Uri('https://example.com/search?q=php&page=1');

$uri = $uri->withVar('page', 2)
    ->withoutVar('q');

echo $uri;
// https://example.com/search?page=2

$uri = $uri->withQueryParams([
    'q' => 'php uri',
    'tags' => ['http', 'psr-7'],
]);

echo $uri->getQuery();
// q=php+uri&tags%5B0%5D=http&tags%5B1%5D=psr-7
```

Read variables with `getVar()`, `hasVar()`, and `getQueryValues()`:

```php
$uri->hasVar('q');       // true
$uri->getVar('q');       // 'php uri'
$uri->getVar('lang', 'en'); // 'en', the default when missing
```

::: tip
`withQuery()` replaces the whole query string. `withVar()` and
`withoutVar()` keep the other variables, so prefer them when you change
only one value.
:::

Values are encoded with `http_build_query()` rules. Spaces become `+`, and
array keys become `name%5B0%5D` style keys. Pass a string to `withQuery()`
when another encoding is required.

## Rendering

`(string) $uri` and `toString()` render the full URI. `toString()` accepts
a bit mask of parts, so you can render only some of them:

```php
$uri = new Uri('https://example.com:8080/docs?lang=en#intro');

$uri->toString(Uri::SCHEME | Uri::HOST);
// https://example.com

$uri->toString(Uri::URI | Uri::FRAGMENT);
// /docs?lang=en#intro
```

The constants `Uri::SCHEME`, `Uri::USER`, `Uri::PASSWORD`, `Uri::HOST`,
`Uri::PORT`, `Uri::PATH`, `Uri::QUERY`, and `Uri::FRAGMENT` can be
combined. `Uri::USER_INFO`, `Uri::FULL_HOST`, `Uri::URI`, and `Uri::ALL`
are shortcuts for common groups.

::: warning
The default rendering includes the password. Do not write `(string) $uri`
or `toString()` into logs, error messages, or cache keys when the URI may
contain credentials. Render without the user information instead:

```php
$safe = $uri->toString(Uri::ALL & ~Uri::USER_INFO);
```
:::

## Ports and Authority

`withPort()` accepts an integer between 1 and 65535, or `null` to remove
the port. It throws an `InvalidArgumentException` for other values:

```php
$uri = new Uri('https://example.com')->withPort(8443);

echo $uri->getAuthority();
// example.com:8443

new Uri('https://example.com')->withPort(70000);
// InvalidArgumentException: Number of "70000" is not a valid TCP/UDP port
```

`getAuthority()` leaves out the port when it is the default for the scheme,
so `https://example.com:443` has the authority `example.com`.

## Converting to Native URI Objects

`toRfc3986()` and `toWhatWg()` return the native `Uri\Rfc3986\Uri` and
`Uri\WhatWg\Url` objects. These classes come from the native `uri`
extension of PHP 8.5. Use them when you need strict RFC 3986 parsing or
WHATWG URL behavior:

```php
$native = new Uri('https://example.com/path/file.html')->toRfc3986();

echo $native->getPath();
// /path/file.html
```

::: info
Both methods require the native URI extension. On PHP versions where the
extension is not available, they fail. Code that must run on PHP 8.4 or lower
should not call them.
:::

## Reference

`Uri` implements `ExtendedUriInterface`, which extends
`Psr\Http\Message\UriInterface`. Any PSR-7 consumer accepts a `Uri`. For
complete method signatures, read `src/Uri.php` and
`src/ExtendedUriInterface.php` in the `windwalker/uri` package.
