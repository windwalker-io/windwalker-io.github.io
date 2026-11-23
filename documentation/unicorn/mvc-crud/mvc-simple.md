---
layout: doc
title: MVC Simple
description: Generate a public list and item page for a module with unicorn:mvc-simple, and learn how the generated files fit together.
---

# MVC Simple

A public module, such as a product catalog, shows records to visitors. It
needs a list page and an item page, but no grid, filters, or edit form. The
simple MVC template gives you that structure with one command. It generates
the entity, the controller, a list view, an item view, and a front-end route.
For back-office screens with grids and edit forms, see
[MVC Admin](./mvc-admin/list-management).

## Generating the Module

`unicorn:mvc-simple` does not require a particular stage. Use `Front` for
public pages, `Admin` for back-office pages, or any custom stage name. The
first segment of the name is the stage, and the last segment is the entity
name. Without a stage, the command stops and asks you to re-enter the name.

Run `unicorn:mvc-simple` with the stage and the entity name:

```bash
php windwalker g unicorn:mvc-simple Front/Product
```

Add `--list` or `--item` to generate only one of the two views.

## How the Parts Fit Together

The generator creates a route group and two routes. Each route points to
one controller and one view:

```php
// The generated route group, with its two routes.
$router->group('product')
    ->register(function (RouteCreator $router) {
        // List page: GET renders the list view.
        $router->any('product_list', '/product/list')
            ->controller(
                ProductController::class,
                post: 'copy',
                put: 'filter',
                patch: 'batch',
            )
            ->view(ProductListView::class);

        // Item page: GET renders the item view for one record.
        $router->any('product_item', '/product/item[/{id}]')
            ->controller(ProductController::class)
            ->view(ProductItemView::class);
    });
```

A GET request has no `index()` method in the generated controller. The
controller attribute handles that case and renders the route's view. The
other HTTP methods call the controller method that the route maps to them.

## Showcase: A Product Page

The list view loads a page of products. Each row links to the item route,
built from the route name:

```blade
<ul>
    @foreach ($items as $item)
        <li>
            <a href="{{ $nav->to('product_item')->id($item->id) }}">
                {{ $item->title }}
            </a>
        </li>
    @endforeach
</ul>

<x-pagination :pagination="$pagination"></x-pagination>
```

The item view loads one record by the `id` route variable. An unknown
`id` stops the request with a not-found response:

```php
// ProductItemView.php
$id = $app->input('id');

/** @var Product $item */
$item = $this->repository->mustGetItem($id);

$view[$item::class] = $item;

return compact('item');
```

Visitors open `/product/list`, click a product, and reach
`/product/item/{id}`. The item view title is the product title.

## Customizing the List

The list view takes its page size from the `limit` input, which defaults to
30. Its default ordering is `product.id DESC`. Change the ordering in the
`getDefaultOrdering()` method:

```php
// ProductListView.php
public function getDefaultOrdering(): string
{
    return 'product.created DESC';
}
```

To show only some records, change the query before it runs. The
`modifyQuery()` method receives the underlying query:

```php
// ProductListView.php
use Windwalker\Query\Query;

$items = $this->repository->getListSelector()
    ->modifyQuery(
        function (Query $query): void {
            $query->where('product.state', 1);
        }
    )
    ->ordering($ordering)
    ->page($page)
    ->limit($limit)
    ->setDefaultItemClass(Product::class);
```

::: tip
Filter in the view, not in the template. The pagination total then counts
only the records that the page shows.
:::

## Write Actions

The generated controller also has `save()` and `delete()` methods. The
routes map them to HTTP methods:

- `POST`, `PUT`, and `PATCH` on the item route call `save()`.
- `DELETE` on the item route calls `delete()`.
- `POST`, `PUT`, and `PATCH` on the list route call `copy()`, `filter()`,
  and `batch()`.

The `save()` method reads its form from a class named `ProductEditForm`.
`unicorn:mvc-simple` does not create that class, so a write request fails
until you add the form. Run `unicorn:mvc-admin` to generate one, or write
your own form class.

::: warning
The generated routes have no access control. The `DELETE` route, the
`batch()` action, and the `save()` action change data, so anyone who can
reach them can use them. Add authentication or permission checks before
you expose these routes to visitors.
:::

## Related

- [Code Generation](./code-generation)
- [MVC Concepts](./mvc-concepts)
- [List Management](./mvc-admin/list-management)
