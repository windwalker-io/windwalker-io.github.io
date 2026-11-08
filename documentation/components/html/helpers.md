---
layout: doc
title: Helpers
part: Components
chapter: HTML
menu: components/html
component: html
---

# Helpers

`HTMLHelper` is a static toolbox with two independent jobs. The first is
passing PHP data to JavaScript. The second is repairing an HTML fragment
whose tags are not closed. Both are plain static methods, so no object
needs to be created.

## Passing Data to JavaScript

Configuration for a page script often starts as a PHP array. `json_encode()`
can turn that array into JSON, but JSON cannot express a JavaScript function,
and it always quotes the keys. `HTMLHelper::getJSObject()` produces a
JavaScript object literal instead. Lists become JavaScript arrays, and
associative arrays and objects become JavaScript objects.

### Minimal Usage

```php
use Windwalker\Html\Helper\HTMLHelper;

$js = HTMLHelper::getJSObject(['page' => 2, 'sort' => 'name']);

// {page:2,sort:"name"}
```

### Showcase

The following example writes a page configuration into an inline script. It
includes a callback that must stay a JavaScript function, which is what
`RawWrapper` is for:

```php
use Windwalker\Html\Helper\HTMLHelper;
use Windwalker\Utilities\Wrapper\RawWrapper;

$config = [
    'baseUrl' => '/api',
    'page' => 2,
    'onSave' => new RawWrapper('(d) => save(d)'),
];

$json = HTMLHelper::getJSObject($config, true);

echo <<<HTML
<script>
    window.app = {$json};
</script>
HTML;
```

The output is a valid script block:

```html
<script>
    window.app = {"baseUrl":"\/api","page":2,"onSave":(d) => save(d)};
</script>
```

### Keys and Quoting

The second argument, `$quoteKey`, controls whether the keys are quoted.
It is `false` by default, which writes the keys unquoted:

```php
HTMLHelper::getJSObject(['page' => 2]);
// {page:2}

HTMLHelper::getJSObject(['page' => 2], true);
// {"page":2}
```

::: tip
Set `$quoteKey` to `true` when a key is not a plain JavaScript identifier,
such as `data-id` or `my-key`. Unquoted keys with hyphens or spaces are
not valid JavaScript.
:::

### Values

Scalars are written as JavaScript literals: booleans as `true` and `false`,
numbers without quotes, and `null` as `null`. Strings are encoded with
`json_encode()`, which means a `/` in a string is escaped. A closing
`</script>` inside a string value is therefore written as `<\/script>`.

::: warning
The output is JavaScript, not HTML. Place it between `<script>` tags only.
Do not put it inside an HTML attribute or a text node, where it is not
escaped for that context.
:::

### Raw Code

Wrap a value in `RawWrapper` to write it into the output unchanged. This is
the only way to emit a JavaScript function or expression:

```php
use Windwalker\Utilities\Wrapper\RawWrapper;

$js = HTMLHelper::getJSObject([
    'format' => new RawWrapper('(v) => v.toFixed(2)'),
]);
```

::: warning
`RawWrapper` values are written as code. Use it only with code you control.
Never wrap user input in `RawWrapper`, because the value runs in the page.
:::

## Repairing HTML

`HTMLHelper::repair()` closes tags that were left open, for example in a
truncated text field or in old editor output. It is a best-effort fix for
the structure of a fragment, not a way to make HTML safe.

```php
use Windwalker\Html\Helper\HTMLHelper;

$html = HTMLHelper::repair('<div><span>hi');

// <div>
//   <span>hi</span>
// </div>
```

When the Tidy extension is available, `repair()` uses it and returns an
indented XHTML string. The second argument, `$useTidy`, can be set to
`false` to skip Tidy and use the built-in fallback instead.

The fallback does not parse the fragment. It appends the missing closing
tags at the end of the string, in reverse order of the opening tags. For
nested or unusual input, the result may not match the structure you
intended:

```php
HTMLHelper::repair('<p>One<p>Two', false);

// <p>One<p>Two</p></p>
```

::: warning
`repair()` does not remove scripts, event attributes, or other unsafe
markup. Do not use it to clean untrusted HTML. Use an HTML sanitizer for
that purpose.
:::
