---
layout: doc
title: Breadcrumbs
description: Build and render breadcrumb trails with the Unicorn Breadcrumb class.
---

# Breadcrumbs

Breadcrumbs show where the current page sits in the site and link back to its parent pages. Writing that trail by hand in every view repeats markup, and the links and the active item drift apart over time. `Unicorn\Html\Breadcrumb` keeps the trail in PHP. A controller or view model builds it once, and the theme renders it.

## Enabling It

Unicorn registers `Breadcrumb` as a shared object, so every page, middleware, and service gets the same trail within one app instance. Get it by injecting it into a constructor, or with `$app->retrieve(Breadcrumb::class)`. Its only dependency is `RendererService`, which the container provides.

Because the instance is shared, no extra binding is needed. Build the trail in the shared instance, then pass it to the view.

For a separate trail on the same page, use a tag:

```php
$articleBreadcrumb = $app->retrieve(Breadcrumb::class, tag: 'article');

$orgBreadcrumb = $app->retrieve(Breadcrumb::class, tag: 'org');
```

::: info
Every service will be new instances in each request, so these items are not shared across requests.
:::

## Complete Example

A middleware creates the shared trail for every article page. It clears the trail first, so each request starts with the same two items.

```php
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Unicorn\Html\Breadcrumb;

final class ArticleBreadcrumbMiddleware implements MiddlewareInterface
{
    public function __construct(
        protected Breadcrumb $breadcrumb,
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ): ResponseInterface {
        $this->breadcrumb->setItems([])
            ->push('Home', '/')
            ->push('Articles', '/articles');

        return $handler->handle($request);
    }
}
```

Attach it to the article routes with `->middleware(ArticleBreadcrumbMiddleware::class)`. The view model then adds the category and the article. It requires the shared registration described above.

```php
use Unicorn\Html\Breadcrumb;

final class ArticleViewModel
{
    public function __construct(
        protected Breadcrumb $breadcrumb,
    ) {
    }

    public function prepare(string $category, string $title): void
    {
        $this->breadcrumb
            ->push($category, '/articles/' . $category)
            ->push($title, null, true);
    }
}
```

In the Blade view, render the same instance:

Use the `<x-breadcrumb>` component in Blade. It renders the theme's breadcrumb view. Its `items` prop overrides the trail for that view only.

```blade
<x-breadcrumb :breadcrumb="$breadcrumb" />

<x-breadcrumb :breadcrumb="$breadcrumb" :items="$customItems" />
```

`render()` calls the same view from PHP.

## Managing the Trail

Each item is an array with `title`, `link`, `active`, and `attrs` keys. The methods below read and change the trail.

```php
use Unicorn\Html\Breadcrumb;
use Windwalker\Core\Router\Navigator;

$breadcrumb = $app->make(Breadcrumb::class);
$nav = $app->make(Navigator::class);

// push() appends an item. Link, active flag and attrs are optional.
// Navigator::to() builds a link from a route name.
$breadcrumb->push('Home', $nav->to('home'));
$breadcrumb->push(
    'Articles',
    $nav->to('article_list'),
    attrs: ['data-role' => 'nav'],
);
$breadcrumb->push('Edit', active: true);

// get() and set() read and replace an item by index or key.
$first = $breadcrumb->get(0);
$breadcrumb->set(1, [
    'title' => 'Members',
    'link' => '/members',
    'active' => false,
    'attrs' => [],
]);

// pop() removes the last item and returns it, or null when empty.
$last = $breadcrumb->pop();

// map() returns a new Breadcrumb. The original is not changed.
$upper = $breadcrumb->map(
    fn (array $item): array => array_merge(
        $item,
        ['title' => strtoupper($item['title'])],
    )
);

// getItems() and setItems() expose the raw item arrays.
$items = $breadcrumb->getItems();
$breadcrumb->setItems([]);

// Iterate with getIterator(); Breadcrumb itself is not iterable.
foreach ($breadcrumb->getIterator() as $item) {
    echo $item['title'];
}
```

::: warning
`foreach ($breadcrumb as $item)` runs zero times, because `Breadcrumb`
is not an `IteratorAggregate` and its items are protected. Always call
`getIterator()` or `getItems()`.
:::

## Rendering

`render()` passes the instance and your parameters to the theme view
`@theme::components.breadcrumb`. `__toString()` calls `render()` with no
parameters, so `echo $breadcrumb;` produces the same markup.

An item with a `null` link renders without an `href`. Mark the current
page with `active: true` so it gets the `active` class and
`aria-current="page"`.

Passing `items` to `render()` replaces the trail for that call:

```php
echo $breadcrumb->render(['items' => $customItems]);
```

The default view does not print the `attrs` array. A custom theme view
must read `$path['attrs']` itself.
