---
layout: doc
title: URI Template
part: Components
chapter: Uri
menu: components/uri
component: uri
---

# URI Template

`UriTemplate` implements [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570),
the URI Template standard. A template describes a URL with named
placeholders, such as `{id}` for a path value and `{?page}` for an optional
query value. Define the template once, for example for an API endpoint, and
expand it with different values wherever you need the URL. In the other
direction, `extract()` reads the values back out of a URL that matches the
template, which helps when a service receives links that follow a known
pattern.

## Enabling the Template Engine

`UriTemplate` does not expand templates by itself. It delegates to a template
library, and the package does not install one. Install `rize/uri-template`
in your project:

```bash
composer require rize/uri-template
```

`guzzlehttp/uri-template` also works for `expand()`, and the package uses it
when `rize/uri-template` is not installed. It does not support `extract()`,
so install `rize/uri-template` if you extract values.

::: warning
Without a supported library, `expand()` and `__toString()` throw a
`DomainException`. `extract()` requires `rize/uri-template`.
:::

## Showcase

The example below defines an API endpoint, expands it for two requests, and
then reads the user ID back from a link that a client sent:

```php
use Windwalker\Uri\UriTemplate;

$endpoint = new UriTemplate(
    'https://api.example.com/users/{id}{?expand}',
    ['expand' => 'profile']
);

echo $endpoint->expand(['id' => 42]);
// https://api.example.com/users/42?expand=profile

echo $endpoint->expand(['id' => 7, 'expand' => 'orders']);
// https://api.example.com/users/7?expand=orders

$vars = new UriTemplate('https://api.example.com/users/{id}')
    ->extract('https://api.example.com/users/42');

echo $vars['id'];
// 42
```

Variables passed to `expand()` are merged over the variables given to the
constructor. Values passed at expansion time win.

## Expanding

`expand()` returns a string. `__toString()` expands the template with only
its own variables:

```php
$tpl = new UriTemplate('https://example.org/foo/{foo}{?bar}');

echo $tpl->expand(['foo' => '123', 'bar' => 'yoo']);
// https://example.org/foo/123?bar=yoo
```

Values are encoded by the template library according to RFC 6570. For
example, a space in a path value becomes `%20`:

```php
echo \Windwalker\Uri\uri_expand(
    'https://example.org/{foo}',
    ['foo' => 'a b']
);
// https://example.org/a%20b
```

The helper functions `uri_prepare()`, `uri_expand()`, and `uri_extract()`
in the `Windwalker\Uri` namespace wrap the class for one-off use.
`uri_prepare()` returns the `UriTemplate` object itself.

## Binding Variables

`bind()` stores a reference to a variable, and `bindValue()` stores a copy.
Use `bind()` when a value changes after the template is created:

```php
$id = 7;

$tpl = new UriTemplate('https://example.org/items/{id}');
$tpl->bind('id', $id);

echo $tpl->expand();
// https://example.org/items/7

$id = 8;

echo $tpl->expand();
// https://example.org/items/8
```

::: info
`bind()` keeps a reference, so the template reads the variable each time it
expands. `bindValue()` takes a snapshot at the moment it is called.
:::

## Extracting Values

`extract()` matches a URL against the template and returns the variables it
found as an array of strings:

```php
$tpl = new UriTemplate('https://example.org/foo/{foo}{?bar}');

$vars = $tpl->extract('https://example.org/foo/123?bar=yoo');

// ['foo' => '123', 'bar' => 'yoo']
```

The `uri_extract()` helper does the same in one call:

```php
$vars = \Windwalker\Uri\uri_extract(
    'https://example.org/{foo}',
    'https://example.org/3'
);

// ['foo' => '3']
```

::: warning
A URL that does not match the template does not throw. Without the second
argument set to `true`, `extract()` can return partial values. For
example, a URL with another host returns `['foo' => 'https:']` for the
template above. Pass `true` as the second argument to get an empty array
on a mismatch, or check the URL against the expected host and path before
you trust the values.
:::

## Customizing the Engine

`setExpandHandler()` and `setExtractHandler()` replace the functions that
do the work. Each receives the template and the variables, and returns the
result. Use them to plug in a different template library:

```php
$tpl = new UriTemplate('tpl', ['a' => 1]);

$tpl->setExpandHandler(
    static fn (string $template, array $vars) => $template
        . ':'
        . json_encode($vars)
);

echo $tpl->expand(['b' => 2]);
// tpl:{"a":1,"b":2}
```
