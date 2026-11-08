---
layout: doc
title: Introduction
part: Components
chapter: Uri
menu: components/uri
---

# Introduction

Windwalker Uri provides a PSR-7 `UriInterface` implementation for building,
parsing, and rendering URLs. Most URLs in an application come from several
sources: a configured base address, a route, user input, and a query built
by code. Joining these pieces as strings is error-prone. This package
treats a URI as a value object: each change returns a new instance, so a
base URL can be shared between services without one of them altering it
for the others.

The package has these main parts:

- `Uri`: the PSR-7 URI value object. It parses a string, exposes its parts,
  and returns modified copies through `with*()` methods.
- `ExtendedUriInterface`: the interface `Uri` implements. It adds query
  variable helpers, user and password accessors, and native conversions.
- `UriFactory`: a PSR-17 factory that creates `Uri` instances.
- `UriTemplate`: an RFC 6570 URI Template with `expand()` and `extract()`.
  It is an optional add-on that needs a template library.
- `UriHelper` and `UriNormalizer`: static helpers for query building,
  filtering, encoding, and path normalization. `Uri` uses them internally.

## Installation

```bash
composer require windwalker/uri ^4.0
```

The package requires PHP 8.4.6 or later. It depends on `psr/http-message`,
`psr/http-factory`, and `windwalker/utilities`.

## Use as Standalone Component

The Composer autoloader loads the package. Create a `Uri` from a string,
change its parts, and render it:

```php
use Windwalker\Uri\Uri;

$uri = new Uri('https://example.com/search?q=php');

$uri = $uri->withVar('page', 2)
    ->withFragment('results');

echo $uri;
// https://example.com/search?q=php&page=2#results
```

Each `with*()` call returns a new instance, so the original stays
unchanged. Read the [Uri](./uri) page for the full model.

For a PSR-17 factory, use `UriFactory`:

```php
use Windwalker\Uri\UriFactory;

$uri = new UriFactory()->createUri('https://example.com/api');
```

## Use in Windwalker

The Uri package does not register services in the DI container, so there
is nothing to inject. Create a `Uri` where you need it and pass it on as
a value. The same code works inside a Windwalker application and outside
one:

```php
use Windwalker\Uri\Uri;

class CallbackUrlBuilder
{
    public function build(string $token): string
    {
        $uri = new Uri('https://example.com/callback')
            ->withVar('token', $token);

        return (string) $uri;
    }
}
```

When a value may already be a PSR-7 URI, such as the URI of a request
message, or may be `null`, pass it to `Uri::wrap()`. It returns the same
instance for a `Uri` and converts other values:

```php
$uri = Uri::wrap($request->getUri());
```

If a library asks for a PSR-17 `UriFactoryInterface`, create a
`UriFactory` directly with `new UriFactory()`.

## Core Concepts

A `Uri` keeps the scheme, user information, host, port, path, query, and
fragment as separate parts. Reading a part never changes the URI, and
rendering it with `__toString()` or `toString()` always rebuilds the string
from those parts. Query data is kept in two forms: the encoded query string
and an array of decoded variables, which `withVar()` and `withoutVar()`
keep in sync.

`withPath()`, `withQuery()`, `withVar()`, and `withPathAppend()` filter and
encode the values they receive. The [Uri](./uri) page explains the details.

## Topic Pages

- [Uri](./uri): creating, reading, and modifying URIs, query variables,
  rendering with selected parts, and native conversions.
- [URI Template](./uri-template): building URLs from RFC 6570 templates,
  and extracting variables from an incoming URL.
- [Helpers](./helpers): the static encoding, filtering, and path
  normalization helpers that the package uses internally.

## Related components

- [HTTP](../http/): the PSR-7 message and PSR-17 factory package, which
  builds on `Uri` for requests.
- [Stream](../stream/): the PSR-7 stream package, used together with HTTP
  messages.
