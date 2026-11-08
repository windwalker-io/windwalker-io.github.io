---
layout: doc
title: DOM
part: Components
chapter: DOM
menu: components/dom
component: dom
---

# DOM

Windwalker DOM builds, parses, and renders HTML as a tree of element objects.
Instead of concatenating strings, you create elements, set their attributes
and content, and render the tree at the end. Text and attribute values are
escaped when the tree is rendered, which prevents a common class of
markup errors and injection bugs.

The element classes extend PHP's native `Dom\HTMLElement`, so they can be
queried and changed with the standard DOM API.

::: info
The package has two generations of classes:

- Current: `HTML5Factory`, `HTMLElement`, and the `h()` function. They are
  based on PHP's `Dom\HTMLDocument`. This page documents them.
- Legacy: `DOMFactory`, `HTMLFactory`, and `DOMElement`, based on
  `DOMDocument`. `HTMLFactory` is deprecated; use `HTML5Factory` in new code.
:::

## Installation

Install via composer

```bash
composer require windwalker/dom ^4.0
```

The package requires PHP 8.4.6 or later, with the `dom` and `json`
extensions. The `getCrawler()` method additionally needs
`symfony/dom-crawler`, which is not installed by default.

## Use as Standalone Component

Use the `h()` function to create an element. Its arguments are the
selector, the attributes, and the content:

```php
use function Windwalker\DOM\h;

$card = h('article.card#post-1', ['data-id' => 1], [
    h('h2.card-title', [], 'Hello <world>'),
    h('p', [], 'Body text'),
]);

echo $card;

// <article id="post-1" data-id="1" class="card">...</article>
```

The `h()` function is a shortcut for `HTML5Factory::element()`. Both return
an `HTMLElement`, and calling `render()` or casting to a string produces the
HTML.

## Use in Windwalker

The package does not register services in the DI container. Use the
factory directly, or call `h()`, from the code that needs the markup:

```php
use Windwalker\DOM\HTML5Factory;

class ButtonRenderer
{
    public function render(string $label, string $url): string
    {
        return HTML5Factory::element(
            'a.btn',
            ['href' => $url],
            $label
        )->render();
    }
}
```

## Core Concepts

- **Factory**: `HTML5Factory` creates elements and parses strings. Elements
  created by the factory share one document, which
  `HTML5Factory::document()` returns.
- **Element**: an `HTMLElement` node. It offers fluent helpers such as
  `addClass()`, plus the `style` and `dataset` properties.
- **Content**: a string is inserted as text and escaped. A node is
  inserted as a child element.
- **Rendering**: `render()` and `__toString()` serialize the element to HTML.

## Topic Pages

- [Elements](./elements): Creating elements, attributes, content, classes,
  styles, and data attributes.
- [Parsing and Rendering](./parsing-and-rendering): Converting HTML strings
  into nodes, querying the tree, and rendering documents.

## Related components

- [HTML](../html/): A table builder that writes content without escaping.

