---
layout: doc
description: How HtmlFrame holds page-level head data for a view, such as the title, description, Open Graph tags, and body classes.
---

# HTML Frame

`HtmlFrame` holds the page-level head data of a view. It stores the
title, the description, Open Graph tags, links, robots directives, and
the classes of the `<html>` and `<body>` elements.

Use the frame for data that belongs in `<head>` or on the `<html>` and
`<body>` elements. Use the [Renderer](./renderer) for the page markup.

Windwalker keeps one frame per request. Each view writes into that
shared frame, and the layout prints it once.

## Minimal Usage

Inject `HtmlFrame` into a method marked with `#[ViewMetadata]`:

```php
use Windwalker\Core\Attributes\ViewMetadata;
use Windwalker\Core\Html\HtmlFrame;

class DashboardHtml
{
    #[ViewMetadata]
    public function prepareMetadata(HtmlFrame $htmlFrame): void
    {
        $htmlFrame->setTitle('Dashboard');
    }
}
```

The method runs when the view renders, before the layout is output.

## Obtaining the Frame

There are two ways to get the frame:

- Inject `HtmlFrame` into a `#[ViewMetadata]` method. Windwalker
  resolves the parameter by its type.
- Call `getHtmlFrame()` on the view in any method that has the view.

```php
$view->getHtmlFrame()->setTitle('Dashboard');
```

The view also forwards `setTitle()` to the frame. Use
`configureHtmlFrame()` to pass the frame to a callback:

```php
$view->configureHtmlFrame(function (HtmlFrame $frame) {
    $frame->setTitle('Dashboard');
});
```

::: tip
Set page metadata in a `#[ViewMetadata]` method. This keeps the
metadata in the view model, not in the template.
:::

## Complete Example

This example sets the head data for an article page. The `item`
parameter receives the view data with the same name.

```php
use Windwalker\Core\Attributes\ViewMetadata;
use Windwalker\Core\Html\HtmlFrame;

class ArticleItemHtml
{
    #[ViewMetadata]
    public function prepareMetadata(
        HtmlFrame $htmlFrame,
        array $item,
    ): void {
        $htmlFrame->setTitle($item['title']);
        $htmlFrame->setDescription(
            $item['summary'],
            truncate: 160,
        );
        $htmlFrame->setCoverImages($item['image']);
        $htmlFrame->addCanonical(
            'https://example.com/articles/' . $item['alias'],
        );
        $htmlFrame->addOpenGraph('og:type', 'article', replace: true);
        $htmlFrame->addBodyClass('page-article');
    }
}
```

## Title and Site Name

`setTitle()` sets the page title, and `getTitle()` returns it. Calling
`setTitle()` again replaces the previous value.

```php
$htmlFrame->setTitle('Products');

$title = $htmlFrame->getTitle(); // 'Products'
```

`setSiteName()` sets the site name. `getPageTitle()` joins the title and
the site name with the separator you pass:

```php
$htmlFrame->setSiteName('Example Shop');

$htmlFrame->getPageTitle(' | '); // 'Products | Example Shop'
```

`renderTitle()` returns a `<title>` element built from the same page
title. Its default separator is `|`.

## Description and Cover Images

`setDescription()` strips HTML tags, collapses whitespace, and adds the
`description` meta tag and the `og:description` tag. Pass `truncate` to
shorten the text.

```php
$htmlFrame->setDescription(
    '<p>Compare plans and choose the right one.</p>',
    truncate: 160,
);
```

`setCoverImages()` sets the `og:image` tags. It replaces the existing
images, so pass every image in one call:

```php
$htmlFrame->setCoverImages(
    '/images/products/cover.jpg',
    '/images/products/cover-square.jpg',
);
```

Each image is converted to a full URL with the site host. Paths that
are already full URLs, such as `https://cdn.example.com/cover.jpg`, are
kept as is. The example above therefore outputs a URL that starts with
the site host, such as `https://<host>/images/...`.

Use `setDescriptionIfNotEmpty()` and `setCoverImagesIfNotEmpty()` when
the value can be empty. They skip the call instead of adding empty tags.

## Favicon

`setFavicon()` sets the icon path. Windwalker passes the path through the
asset handler, so the path resolves the same way as other assets.

```php
$htmlFrame->setFavicon('/assets/images/favicon.png');
```

`renderFavicon()` returns the `<link>` tag, or `null` when no favicon is
set.

## Links

`addLink()` adds a `<link>` tag. Pass the relation, the href, and optional
attributes:

```php
$htmlFrame->addLink('stylesheet', '/assets/css/print.css', [
    'media' => 'print',
]);
```

These helpers cover common link types:

```php
$htmlFrame->addCanonical('https://example.com/products');

$htmlFrame->addHreflang('fr', 'https://example.com/fr/products');
```

`addPreload()` adds a preload hint. The `$as` argument is required and
must be a resource type such as `image`, `script`, `style`, or `font`:

```php
$htmlFrame->addPreload(
    'font',
    '/assets/fonts/inter.woff2',
    type: 'font/woff2',
    attrs: ['crossorigin' => 'anonymous'],
);
```

## Robots and Indexing

`setRobotsMeta()` sets the `robots` meta tag. It joins the values with a
comma and always replaces the existing tag.

```php
$htmlFrame->setRobotsMeta(['noindex', 'nofollow']);
```

`setNoindex()` is a shortcut for `setRobotsMeta('noindex')`:

```php
$htmlFrame->setNoindex();
```

::: warning
A `noindex` tag removes the page from search results. Use it only for
pages that should not be found, such as internal tools or drafts.
:::

## Metadata and Open Graph

`addMetadata()` adds a `<meta>` tag by name. `addOpenGraph()` adds an
Open Graph tag by its property, such as `og:title`. Pass `true` as the
last argument to replace an existing tag with the same name or property.

```php
$htmlFrame->addMetadata('author', 'Windwalker Team');

$htmlFrame->addOpenGraph('og:title', 'Products', replace: true);
```

The `renderMetadata()` method outputs the `<meta>` tags first, followed
by the Open Graph tags.

## Body and HTML Classes

`addBodyClass()` adds a class to the `<body>` element. `addHtmlClass()`
adds a class to the `<html>` element:

```php
$htmlFrame->addBodyClass('page-dashboard');

$htmlFrame->addHtmlClass('dark');
```

The view also adds classes to the body automatically. These classes are
derived from the view's namespace, module, view name, and layout:

- `module-*` for the module name.
- `view-*` for the view name, without the `View` suffix.
- `layout-*` for the layout name.
- `stage-*` for the namespace levels below the module, when present.

::: info
Automatic classes are added only to the main view, not to child views.
:::

## Custom Tags

Use `addCustomTag()` for tags that have no helper. The first argument is
a tag name, an `HTMLElement`, or a `LinkInterface`. Pass the content and
attributes for a tag name:

```php
$htmlFrame->addCustomTag(
    'meta',
    attribs: [
        'name' => 'theme-color',
        'content' => '#1a73e8',
    ],
);
```

::: warning
The content of a custom tag is printed into `<head>` as written. Do not
pass user input or unescaped HTML to `addCustomTag()`, because it can
inject script into every page.
:::

## Output

The frame exposes render methods that return strings. Print them in the
layout's `<head>` section:

- `renderTitle()` returns the `<title>` element.
- `renderFavicon()` returns the icon `<link>`, or `null`.
- `renderMetadata()` returns the meta and Open Graph tags.
- `renderCustomTags()` returns the custom tags.

See [Renderer](./renderer) for how the layout output is built.

## Related

- [Views](./views): how a view is rendered and when the frame is
  printed.
- [Asset Management](./asset-management): loading the CSS and JS for a
  page.
