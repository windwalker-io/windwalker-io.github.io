---
layout: doc
title: Getting Started
description: Generate a complete admin CRUD for an entity with Unicorn's code generator and run it.
---

# Getting Started

A typical admin feature repeats the same structure for every entity: an [ORM entity](/documentation/components/orm/entities), a [migration](/documentation/framework/services/database/migrations), a repository, a controller, a list view, an edit form, and routes. Writing these by hand takes time and invites small inconsistencies. Unicorn's generator creates all of them in a few commands, so you can start from a working list and editor and focus on the business rules.

## Prerequisites

Install Unicorn and configure a database first. See [Installation](./installation).

## Complete Example

Generate the admin CRUD for a `Product` entity, apply its migration, and start the local server:

```bash
php windwalker g unicorn:mvc-admin Admin/Product
php windwalker mig:go
php windwalker server:start php:main --host localhost --port 8080
```

Open the list page in your browser:

```text
http://localhost:8080/admin/product/list
```

The list page URL depends on the admin route prefix of your application. The [Starter](/documentation/guides/start/) uses `/admin`.

::: tip
The full walkthrough, including the product table, seeders, and grid features, is in the [Rapid Application Development guide](../../guides/rad/).
:::

## What the Generator Creates

`unicorn:mvc-admin` runs the smaller generators in sequence:

- `unicorn:model` creates the `App\Entity\Product` ORM entity and the
  `App\Repository\ProductRepository` repository.
- `mig:create` creates a migration for the new table.
- `seed:create` creates a seeder.
- `unicorn:controller` creates the `ProductController` controller.
- `unicorn:view-grid` creates the list view and its grid form.
- `unicorn:view-edit` creates the edit view and its edit form.
- `unicorn:route` registers the list and edit routes.

Each part can also be generated alone. Use `--grid` or `--edit` to limit `unicorn:mvc-admin` to one view:

```bash
php windwalker g unicorn:mvc-admin Admin/Product --grid
```

Run `php windwalker g` to list every generator command.

## Apply the Migration

The generator writes the migration but does not run it. Apply it with `mig:go`:

```bash
php windwalker mig:go
```

::: warning
`mig:go -f` skips the confirmation prompt. Run it without `-f` on any database that holds data you need.
:::

## Re-generating Code

Generated files are not overwritten by default. The `--force` option replaces existing files:

```bash
php windwalker g unicorn:mvc-admin Admin/Product --force
```

::: warning
`--force` overwrites entity, controller, view, and route files that you may have edited. Commit your changes before using it.
:::

## Related

- [Core Concepts](./core-concepts)
- [Rapid Application Development guide](../../guides/rad/)

