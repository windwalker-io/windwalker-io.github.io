---
layout: doc
title: MVC Concepts
description: Learn the Subject, Stage, Module, and list and item groups that organize Unicorn applications.
---

# MVC Concepts

[MVC (Model-View-Controller)](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) is a pattern that separates data, presentation, and request handling. Unicorn applies it to the things it manages, such as products, articles, or users. Each thing has a list page and a single-item page, and each area of the site, such as the back end or the public front end, shows them in its own way. The terms on this page name these parts, and the rest of the documentation uses them throughout.

## Subject

A subject is an entity or domain object that the application manages, such as `Product`. Each subject maps to one database table, one entity class, and one repository. The generator creates the pair with `unicorn:model`:

```text
src/Entity/Product.php
src/Repository/ProductRepository.php
```

The entity describes the data, and the repository loads and stores it. A subject is defined once, and every stage that shows it reuses the same entity and repository.

## Stage

A stage is the first segment of a module name. It separates the parts of the site that serve different audiences, such as `Admin` for the back end and `Front` for the public site. Names look like this:

```text
Admin/Product
Front/Product
```

The stage becomes both a folder name and a namespace segment. A subject can appear in several stages, and each stage keeps its own controllers and views.

## Module

A module is the directory of one subject in one stage. It is a vertical slice of the application: everything the stage needs for that subject lives in one place.

```text
src/Module/Admin/Product/
    ProductController.php
    ProductGridForm.php
    ProductListView.php
    ProductEditForm.php
    ProductEditView.php
    assets/
    views/
```

Each module contains its controllers, views, forms, and assets. The module is the unit that the generator creates and that you customize. Older Windwalker documentation calls this a subsystem.

## MVC Groups: List and Item

Every module has two MVC groups. The list group handles many records at once, and the item group handles one record. Each group has its own view and its own controller methods.

- List group: a page that shows many records. Its controller handles filtering, ordering, batch actions, and copying.
- Item group: a page that shows or edits one record. Its controller handles saving and deleting one record.

The two groups have different names in the back end and the front end. The concept is the same in both, and the documentation sometimes uses "list" and "item" for both.

| Stage | List page | Item page |
| --- | --- | --- |
| Admin | Grid page | Edit page |
| Front | List page | Item page |

## Grid Page and Edit Page

In the back end, the list group is a grid page. A grid is a table with search, filters, sorting, pagination, and bulk actions. The generator creates it with `unicorn:view-grid`, and the view class ends with `ListView`.

The item group is an edit page. It renders a form for one record, and the generator creates it with `unicorn:view-edit`. The view class ends with `EditView`.

Both pages are served by the routes that the generator writes to `routes/admin/`. The list route is `product_list` and the edit route is `product_edit`:

```php
$router->group('product')
    ->register(function (RouteCreator $router) {
        $router->any('product_list', '/product/list')
            ->controller(
                ProductController::class,
                post: 'copy',
                put: 'filter',
                patch: 'batch',
            )
            ->view(ProductListView::class);

        $router->any('product_edit', '/product/edit[/{id}]')
            ->controller(ProductController::class)
            ->view(ProductEditView::class);
    });
```

The `{id}` segment is optional. Without it, the edit page creates a new record.

## List Page and Item Page

On the front end, the list group is a list page that shows many records, such as the articles in a category. The item group is an item page that shows one record, such as a single article. The generator creates them with `unicorn:mvc-simple`, and the `--list` and `--item` options create only one of the two.

Front-end pages do not include the grid or the edit form. They show records to visitors and do not provide management actions.

## How the Parts Fit Together

A single subject with an admin module connects these pieces:

```text
src/Entity/Product.php                  Subject: entity
src/Repository/ProductRepository.php    Subject: repository
src/Module/Admin/Product/               Module: Admin stage
    ProductListView.php                 List group: grid page
    ProductEditView.php                 Item group: edit page
routes/admin/product.route.php          Routes for both groups
```

Adding a front-end module for the same subject creates a second module, `src/Module/Front/Product/`. It reuses the entity and the repository but has its own controllers, views, and routes.

::: info
Names are consistent across the parts. The subject `Product` produces `ProductController`, `ProductListView`, `ProductEditView`, and the routes `product_list` and `product_edit`.
:::

## Related

- [Core Concepts](../introduction/core-concepts)
- [Code Generation](./code-generation)
