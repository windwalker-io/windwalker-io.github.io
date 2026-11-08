---
layout: doc
title: Parsing and Rendering
part: Components
chapter: DOM
menu: components/dom
component: dom
---

# Parsing and Rendering

Not all markup starts as element calls. Templates, rich-text editor output,
and responses from other services arrive as strings. Parsing turns such a
string into nodes, so you can change parts of it with the same API you use
for elements built from scratch. Rendering then turns the tree back into a
string. Changes can be made to a fragment that you did not write, without
manipulating the string by hand with regular expressions.

## Minimal Setup

`HTML5Factory::parse()` parses a string and returns the first top-level
node. Use `parseAsFragment()` when the string holds several nodes:

```php
use Windwalker\DOM\HTML5Factory;

$node = HTML5Factory::parse('<p class="lead">Intro</p>');

$fragment = HTML5Factory::parseAsFragment('<li>1</li><li>2</li>');
```

Both methods return nodes that belong to the factory's shared document, so
they can be appended to elements created by the same factory.

## Showcase

The following example parses a navigation list, adds a class to each link,
marks the list as sticky, and renders the result:

```php
use Windwalker\DOM\HTML5Factory;

$html = <<<HTML
<ul class="nav">
    <li><a href="/home">Home</a></li>
    <li><a href="/docs">Docs</a></li>
</ul>
HTML;

$nav = HTML5Factory::parse($html);

foreach ($nav->querySelectorAll('a') as $link) {
    $link->addClass('nav-link');
}

$nav->addClass('is-sticky');

echo $nav->render();
```

The output keeps the original structure and whitespace, with the new classes
added:

```html
<ul class="nav is-sticky">
    <li><a href="/home" class="nav-link">Home</a></li>
    <li><a href="/docs" class="nav-link">Docs</a></li>
</ul>
```

The query uses the native `querySelectorAll()` method from PHP's DOM
extension. It searches the descendants of the node, not the node itself.

## Parsing

`parse()` returns a single node, and the rest of the string is discarded.
Leading text is returned as a text node, so the result can differ from what
you expect:

```php
$node = HTML5Factory::parse('Hello <b>world</b>');

get_class($node); // Dom\Text
```

Use `parseAsFragment()` for any string with more than one top-level node or
with leading text. The fragment contains all of them, in order:

```php
$fragment = HTML5Factory::parseAsFragment(
    'Hello <b>world</b> and <i>you</i>'
);

$fragment->childNodes->length; // 4
```

A fragment can be appended to an element, which moves its children into the
element:

```php
$list = HTML5Factory::element('ul');
$list->appendChild(
    HTML5Factory::parseAsFragment('<li>1</li><li>2</li>')
);
```

Parsing follows the HTML5 rules, so malformed markup is corrected in the same
way a browser would correct it.

::: warning
Parsing does not sanitize markup. Scripts, event attributes such as
`onerror`, and `javascript:` URLs are kept in the tree and in the rendered
output. If the markup comes from a user, sanitize it with a dedicated HTML
sanitizer before parsing or rendering it.
:::

## Full Documents

`HTML5Factory::createFromString()` parses a complete HTML document, including
`<html>`, `<head>`, and `<body>`. It returns a `Dom\HTMLDocument`, which is
separate from the shared document:

```php
use Windwalker\DOM\HTML5Factory;

$doc = HTML5Factory::createFromString(
    '<html><body><p id="intro">Hi</p></body></html>'
);

$doc->getElementById('intro')->textContent; // "Hi"
```

Use `HTML5Factory::document()` for elements that you build in code, and
`createFromString()` only when you need a whole document.

## Querying

Elements offer two query styles:

- `querySelector()` and `querySelectorAll()` use the native DOM API.
  Every element from this package supports them without extra packages.
- `getCrawler()` returns a Symfony `Crawler` for the element. It needs
  `symfony/dom-crawler`, which is a development dependency of this package
  and is not installed automatically in a project.

```php
$nav->querySelector('a.nav-link')?->textContent; // "Home"

// Requires symfony/dom-crawler.
$nav->getCrawler()->filter('li')->count(); // 2
```

## Rendering

Every element can be rendered with `render()`. Casting it to a string calls
the same method:

```php
echo $nav;
echo $nav->render();
```

To render a node that is not an element, such as a text node or a fragment
child, pass it to `HTML5Factory::saveHtml()`:

```php
$fragment = HTML5Factory::parseAsFragment('<b>1</b> and <i>2</i>');

echo HTML5Factory::saveHtml($fragment->firstChild);
// <b>1</b>
```

`saveHtml()` also accepts a `Dom\HTMLDocument`, and renders the whole
document, including the `<html>` tags.

## Moving a Node to Another Document

`with()` copies an element into another document and returns the copy. The
original element is not changed:

```php
$element = HTML5Factory::element('p', [], 'Hi');
$other = HTML5Factory::createFromString('<html><body></body></html>');

$copy = $element->with($other);

$copy->ownerDocument === $other; // true
```

Use `with()` when a node must belong to a document that you created
yourself. Appending a node from another document to a tree does the same
copy automatically.
