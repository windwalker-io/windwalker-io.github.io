---
layout: doc
title: Helpers
part: Components
chapter: Uri
menu: components/uri
component: uri
---

# Helpers

`UriHelper` and `UriNormalizer` are static classes that hold the low-level
rules of URL syntax. `Uri` calls them when it parses a string or sets a
part. Use them directly when you build a URL string yourself, when you
encode a single value for a specific part of a URL, or when you normalize a
path that does not belong to a `Uri` object.

URL parts use different encoding rules. A space in a query value is written
as `+`, while the same space in a path must be `%20`. Mixing the two causes
subtle errors that are hard to see in a browser. The helpers make the rule
explicit for each part, so you choose the right one.

## Showcase

The following example adds a file name to a path. The file name is encoded
for a path segment, so the result is a valid URL:

```php
use Windwalker\Uri\Uri;
use Windwalker\Uri\UriHelper;

$file = 'report 2026.pdf';

$uri = new Uri('https://example.com/files')
    ->withPathAppend('/' . UriHelper::encode($file, true));

echo $uri;
// https://example.com/files/report%202026.pdf
```

The `true` argument selects raw encoding, which uses `rawurlencode()`.
Details follow in the Encoding section below.

## Building and Parsing Queries

`buildQuery()` turns an array into a query string. It works like
`http_build_query()` with the `&` separator. Nested arrays become
bracketed keys, and `parseQuery()` reverses the process with `parse_str()`:

```php
use Windwalker\Uri\UriHelper;

echo UriHelper::buildQuery(['a' => 1, 'b' => [2]]);
// a=1&b%5B0%5D=2

print_r(UriHelper::parseQuery('a=1&b[]=2'));
// ['a' => '1', 'b' => ['2']]
```

::: info
`parseQuery()` follows PHP's `parse_str()` rules. For example, PHP replaces
dots and spaces in key names with underscores.
:::

## Encoding

`encode()` and `decode()` accept a string or an array. They use
`urlencode()` by default, which writes a space as `+`. Pass `true` as the
second argument to use `rawurlencode()`, which writes a space as `%20`:

```php
use Windwalker\Uri\UriHelper;

UriHelper::encode('a b/c');        // 'a+b%2Fc'
UriHelper::encode('a b/c', true);  // 'a%20b%2Fc'

UriHelper::decode('a+b%2Fc');      // 'a b/c'
UriHelper::decode('a%20b', true);  // 'a b'
```

::: warning
Use the raw form for path segments. The default form writes `+`, which a
server reads as a literal plus sign in a path, not as a space. Pass `true`
for every path segment and for any value that must keep `%20`.
:::

## Filtering

The `filter*()` methods encode the characters that are not allowed in one
part of a URL and keep the characters that are allowed, including valid
percent escapes. They are the same filters that `Uri` applies in
`withPath()`, `withQuery()`, and `withFragment()`:

```php
use Windwalker\Uri\UriHelper;

UriHelper::filterPath('/foo^bar baz/%5E');
// /foo%5Ebar%20baz/%5E

UriHelper::filterQuery('?k^ey=valu`&flag');
// k%5Eey=valu%60&flag

UriHelper::filterFragment('#/foo^bar');
// /foo%5Ebar
```

::: info
A filter encodes characters. It does not check that the result is a valid
URL. Use `Uri` to create a URL and read its parts back when you need a
check.
:::

## Normalizing Paths

`UriNormalizer` resolves dot segments, removes duplicate slashes, and adds
a leading or trailing slash to a path. `Uri` runs `normalizePath()` when it
parses a path, so a path given to `new Uri()` is already normalized.

```php
use Windwalker\Uri\UriNormalizer;

UriNormalizer::normalizePath('/foo/bar/../boo.php');
// /foo/boo.php

UriNormalizer::cleanPath('/a//b///c');
// /a/b/c

UriNormalizer::ensureRoot('foo');  // /foo
UriNormalizer::ensureDir('foo');   // foo/
```

`UriNormalizer::normalize()` applies `normalizePath()` to the path part of a
full string that contains `://`.

## Other Helpers

`UriHelper::parseUrl()` is a UTF-8 safe version of `parse_url()`. `Uri`
uses it when you pass `true` as the second constructor argument. Use
`UriHelper::isAbsolute()` to check whether a string is an absolute path or a
URI with a scheme. `UriHelper::filterScheme()` lowercases a scheme and
removes a trailing `:` or `://`.
