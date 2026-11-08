---
layout: doc
title: Elements
part: Components
chapter: DOM
menu: components/dom
component: dom
---

# Elements

Building HTML with string concatenation means every value must be escaped at
the place where it is written. One forgotten `htmlspecialchars()` call is
enough to break the page or open an XSS hole. Building a tree of elements
moves that work into the library. A string added as content becomes a text
node, and attribute values are escaped when the element is rendered. A
reusable component such as a card or a menu can then accept plain values
from the caller without knowing how they will be used.

## Minimal Setup

Elements are created in one of three ways, and they all return an
`HTMLElement`:

```php
use Windwalker\DOM\HTML5Factory;
use Windwalker\DOM\HTMLElement;
use function Windwalker\DOM\h;

$a = h('a', ['href' => '/home'], 'Home');
$b = HTML5Factory::element('a', ['href' => '/home'], 'Home');
$c = HTMLElement::new('a', ['href' => '/home'], 'Home');
```

The first argument is a tag name, optionally followed by an ID and classes
in CSS selector form, as described below. `h()` and `HTML5Factory::element()`
are equivalent. `HTMLElement::new()` calls the same factory method.

## Showcase

The following example builds a card with a title, a link, and a
data attribute. It sets a class and an inline style after creation:

```php
use function Windwalker\DOM\h;

$link = h('a.btn', ['href' => '/posts/1', 'disabled' => false]);
$link->setAttribute('title', 'Read "more"');

$card = h('article.card#post-1', ['data-id' => 1], [
    h('h2.card-title', [], 'Hello <world>'),
    h('p', [], 'Body text'),
    $link,
]);

$card->addClass('is-featured');
$card->dataset->section = 'news';
$card->style->margin = '0';

echo $card;
```

The rendered output is one line. It is wrapped below for readability, and
the line breaks are not part of the output:

```html
<article id="post-1" data-id="1" class="card is-featured"
  data-section="news" style="margin: 0"><h2 class="card-title">Hello
  &lt;world&gt;</h2><p>Body text</p><a href="/posts/1" class="btn"
  title="Read &quot;more&quot;"></a></article>
```

`setAttribute()` returns nothing, so call it on its own line rather than
inside a chain or an array.

## Selectors

The first argument of `h()` follows a small subset of CSS selector syntax:

- `tag`: the tag name.
- `#id`: sets the `id` attribute.
- `.class`: adds one or more classes.

When the selector starts with `#` or `.`, the tag defaults to `div`:

```php
h('div.card#main', [], 'Content');
h('.card', [], 'Content');        // <div class="card">Content</div>
```

Use `HTMLElement::splitCSSSelector()` if you need the parsed parts.

## Attributes

Pass attributes as an associative array, or set them one by one with
`setAttribute()` and `setAttributes()`. The value type decides how the
attribute is written:

- `true`: writes the attribute with an empty value, as in `disabled=""`.
- `false` or `null`: removes the attribute, or does not write it.
- Arrays and objects: encoded as JSON.
- A closure: called to get the value, which allows lazy values.
- Anything else: converted to a string.

```php
$input = h('input', [
    'type' => 'checkbox',
    'checked' => true,
    'disabled' => false,
    'data-filters' => ['tag' => 'news'],
    'value' => fn() => 'lazy',
]);
```

Attributes can also be read and written as array keys, and read with
`getAttribute()` or `getAttributes()`:

```php
$input['name'] = 'agree';

$input->getAttribute('type'); // "checkbox"
$input->getAttributes(true);  // ['type' => 'checkbox', ...]
```

## Content

The content argument of `h()` accepts any of the following:

- A string, which is inserted as escaped text.
- An element or another node, which is appended as a child.
- An array, whose items are each inserted in order. Items can be nested.
- A closure, which is called to produce the content.

```php
h('ul', [], [
    h('li', [], 'Home'),
    h('li', [], fn() => 'Lazy item'),
]);
```

Use `appendChild()` to add a child after creation, and `appendText()` to add
text:

```php
$list = h('ul');
$list->appendChild(h('li', [], 'Home'));
$list->appendText(' ');
```

::: tip
To insert markup that is already a string, such as a fragment from an
editor, parse it into nodes first and append the nodes. See
[Parsing and Rendering](./parsing-and-rendering).
:::

## Classes

`addClass()`, `removeClass()`, and `toggleClass()` work with a
space-separated string. They are thin wrappers around the native
`classList` property, which you can also use directly:

```php
$card = h('div.card');

$card->addClass('is-active is-featured');
$card->removeClass('is-active');
$card->toggleClass('is-open', true);

$card->classList->contains('card'); // true
```

## Inline Styles

The `style` property edits the `style` attribute through a
`CSSStyleDeclaration` object. Assign a property directly, or use
`setProperty()` for a name with a hyphen:

```php
$box = h('div');

$box->style->width = '10px';
$box->style->setProperty('margin-top', '0');

echo $box;
// <div style="width: 10px; margin-top: 0"></div>
```

## Data Attributes

The `dataset` property maps `data-*` attributes to camel case properties.
Setting `userId` writes `data-user-id`:

```php
$row = h('tr');

$row->dataset->userId = 5;

$row->dataset->toArray(); // ['userId' => '5']
```

## Moving and Copying Nodes

`appendChild()` moves a node that already belongs to the same document. The
node is not copied, so changes made to the variable are visible in the tree:

```php
$span = h('span', [], 'orig');
$parent = h('div');
$parent->appendChild($span);

$span->textContent = 'changed';

// <div><span>changed</span></div>
```

::: info
A node that belongs to a different document is copied when it is appended.
Keep a reference to the node that was actually inserted, and not to the
original, when the tree changes later.
:::

## The Shared Document

Elements created by `HTML5Factory` belong to one document per process. The
document is created on first use and returned by
`HTML5Factory::document()`. Its nodes stay in memory as long as they are
referenced.

```php
use Windwalker\DOM\HTML5Factory;

HTML5Factory::reset();
```

::: info
In a long-running worker, such as a Swoole or RoadRunner process, call
`HTML5Factory::reset()` between requests. This starts a new document on the
next factory call and lets the old nodes be freed.
:::

## Escaping

Text content and attribute values are escaped when the tree is rendered.
You do not need `htmlspecialchars()` for values written through this API.

::: warning
Escaping protects the HTML syntax, not the meaning of the value. The
package does not check URL schemes, so a user-supplied `href` such as
`javascript:alert(1)` is written as-is. Allow only expected schemes, such
as `https:` and relative paths, before you set a link from user input.
:::
