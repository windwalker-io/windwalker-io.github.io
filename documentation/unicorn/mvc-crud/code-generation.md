---
layout: doc
title: Code Generation
description: Generate Unicorn admin and front-end MVC modules, forms, and routes from the console.
---

# Code Generation

Unicorn's generator writes the parts of a CRUD module for you: the entity and repository, the controller, the grid and edit views, the forms, the routes, the migration, and the seeder. A module spans many files that must agree on class names, namespaces, and route names. The generator writes them from templates, so every module follows the same layout, and you can spend your time on fields and business rules.

## Recommended Workflow

In a normal MVC workflow, create the entity and migration first, then generate the whole admin module. The module reads the entity's columns, so define the table before you generate the views.

```bash
php windwalker g entity Product
php windwalker mig:create ProductInit
# Define the columns in the migration, then:
php windwalker mig:go -f
php windwalker build:entity Product
php windwalker g unicorn:mvc-admin Admin/Product
```

When you run `unicorn:mvc-admin` after this, the model step keeps the existing entity and repository, and the migration step shows a warning because `ProductInit` already exists. The generator then continues with the remaining steps.

::: info
`g entity` creates an empty entity class. Run `build:entity` before you generate the module, so the entity has its properties.
:::

For the full walkthrough, see [Entities, Migrations and Seeders](/documentation/guides/rad/modeling).

## Generating an Admin Module

Run `unicorn:mvc-admin` with a stage and a name to generate a complete admin module in one command. The `g` command is the alias of `generate:make`.

`unicorn:mvc-admin` does not require a particular stage. You can generate
into `Front`, `Admin`, or any custom stage name. Admin modules run many
database operations, so place them under `Admin/` and protect them with
permission control.

::: warning
Windwalker does not include a user or permission system. The `/admin`
directory is not protected by default. Set up authentication and permission
control before you generate an admin module.
:::

```bash
php windwalker g unicorn:mvc-admin Admin/Product
```

The command runs these steps in order:

- Creates the entity and repository with `unicorn:model`.
- Creates a migration named `ProductInit` and a seeder named `product`.
- Creates the controller, the grid view, the edit view, and the route.

In a standard host app, the result looks like this:

```text
src/Entity/Product.php
src/Repository/ProductRepository.php
resources/migrations/      ProductInit migration
resources/seeders/         product.seeder.php
src/Module/Admin/Product/
    ProductController.php
    ProductGridForm.php
    ProductListView.php
    ProductEditForm.php
    ProductEditView.php
    assets/
    views/
routes/admin/product.route.php
```

The generated classes import `App\Entity\Product` and `App\Repository\ProductRepository`, so the module assumes the default namespaces. The generator does not run the migration or the seeder for you. The generated route file under `routes/` is loaded automatically, so it needs no registration. Continue with the steps in [After Generating](#after-generating).

## Generating Parts Separately

Generate parts one at a time when you want to regenerate or customize a single part, or add a view to a module that already exists.

```bash
php windwalker g unicorn:controller Admin/Product --model
php windwalker g unicorn:view-grid Admin/Product
php windwalker g unicorn:view-edit Admin/Product
php windwalker g unicorn:route admin/product
```

- `unicorn:controller` creates the controller. Add `--model` to also create the entity and repository. Without the flag, the command asks.
- `unicorn:view-grid` creates the list view, the grid form, and the list templates.
- `unicorn:view-edit` creates the edit view, the edit form, and the edit templates.
- `unicorn:route` creates the route group with the list and edit routes.

`unicorn:mvc-admin` accepts `--grid` or `--edit` to generate only one of the two views. The controller, the model, and the route are still generated.

```bash
php windwalker g unicorn:mvc-admin Admin/Product --edit
```

## Naming Conventions

The first segment of the name is the stage, such as `Admin`. It becomes both a folder and a namespace segment. The rest of the name becomes the class prefix.

- Write the entity name in PascalCase, such as `Product` or `BlogPost`.
- Write the route path in kebab-case, such as `admin/blog-post`.

The generator derives the other names from these two, as shown below for `Admin/BlogPost`:

```php
// Class names:  BlogPostController, BlogPostListView
// Route names:  blog_post_list, blog_post_edit
// Route paths:  /blog-post/list, /blog-post/edit[/{id}]
// File names:   blog-post-list.blade.php
```

::: info
A name without a stage triggers a confirmation prompt. Answer `y` to
generate the module at the module root, or re-run the command with a
stage such as `Admin/Product`.
:::

## Command Options

The generator commands share these options:

- `-d, --dir`: the root directory for the generated files, relative to the host app root.
- `--ns`: the base namespace. The default is `App\Module`.
- `-p, --pkg`: the package whose namespace and directory the files use. Not available on `unicorn:mvc-admin` and `unicorn:mvc-simple`.
- `-f, --force`: overwrite the existing files.
- `-y, --yes-all`: answer yes to every prompt.

```bash
php windwalker g unicorn:mvc-admin Admin/Product --ns "Shop\Module"
```

The `--ns` option changes only the namespace of the module classes. The entity and repository imports in the templates still point to `App\Entity` and `App\Repository`. Adjust those imports when you move the module to another namespace.

## Existing Files

The generator keeps any file that already exists and reports it as `EXISTS`. New files are reported as `CREATE`.

```text
[CREATE] src/Module/Admin/Product/ProductListView.php
[EXISTS] src/Module/Admin/Product/ProductController.php
```

Add `--force` to replace the existing files with the fresh templates.

::: warning
`--force` discards your edits in the controller, the views, and the forms.
Commit your changes before you regenerate a module.
:::

## Generating Form Fields from a Table

A generated edit form has no fields for the table columns yet. Run `build:form` to add them:

```bash
php windwalker build:form Admin/Product/ProductEditForm product
```

See [Field Generation](/documentation/unicorn/form-fields/field-generation) for the field types, the label translation, and the warnings about rewriting the file.

## Front-End MVC

Use `unicorn:mvc-simple` for a public-facing module, such as a product catalog. It generates the entity, the controller, a list view, an item view, and a front-end route, with no grid or edit form.

```bash
php windwalker g unicorn:mvc-simple Front/Product
php windwalker g unicorn:mvc-simple Front/Product --list
php windwalker g unicorn:mvc-simple Front/Product --item
```

The `--list` and `--item` options generate only one of the two views. The route file is placed in `routes/front/`.

## Module Command Reference

The `unicorn:mvc-admin` and `unicorn:mvc-simple` commands run the individual generators in sequence. They accept `--dir`, `--ns`, `--force`, and `--yes-all`, and pass them on to the sub-commands. Neither accepts `--pkg`.

### unicorn:mvc-admin

Generates the complete admin module described above.

- `--grid`: generates only the grid view. The controller, model, and route are still generated.
- `--edit`: generates only the edit view. The same parts are still generated.
- `--dir`: passed to the model, controller, views, and route. The migration and seeder ignore it.
- `--ns`: passed to the same sub-commands and changes the module namespace.
- `--force`: passed to the same sub-commands and overwrites their existing files.
- `--yes-all`: always passed, so the sub-commands never prompt.

Using both `--grid` and `--edit` generates both views.

```bash
php windwalker g unicorn:mvc-admin Admin/Product --grid --force
```

::: info
`unicorn:mvc-admin` always passes `-y` to its sub-commands, so you do not need `--yes-all`.
:::

### unicorn:mvc-simple

Generates the front-end module: the model, migration, seeder, controller, list and item views, and a front-end route. It has no grid or edit form.

- `--list`: generates only the list view.
- `--item`: generates only the item view.
- `--dir`, `--ns`, `--force`, `--yes-all`: passed to the sub-commands, with the same effects as in `unicorn:mvc-admin`.

Using both `--list` and `--item` generates both views.

```bash
php windwalker g unicorn:mvc-simple Front/Product --item --dir src/Shop
```

::: info
The controller comes from the core `controller` command, not from `unicorn:controller`. The module's controller is therefore a plain Windwalker controller.
:::

## After Generating

The generated module runs, but it contains placeholder data and code. Finish it with these steps.

Define the table columns in the migration, run the migration, and then sync the entity properties. See [Entities, Migrations and Seeders](/documentation/guides/rad/modeling).

```bash
php windwalker build:entity Product
```

The generated grid searches `product.id`, `product.title`, and `product.alias`, and it sorts by `product.id DESC`. Change `getSearchFields()` and `getDefaultOrdering()` in the list view to match your columns, or the search fails.

The generated `.ts` and `.scss` files under `assets/` are compiled by the host app's Yarn build. The list and edit pages need the compiled scripts to work. Run one of these commands in the host app after you generate a module:

```bash
# Compile once after generating
yarn build

# Or keep the dev server running while you work
yarn dev
```

::: warning
The page renders its HTML before the scripts are compiled, so the layout looks
complete. The buttons, filters, and other dynamic features do nothing until the
build runs. If a generated page looks correct but does not respond, run the
build first.
:::

The generated controller contains empty `prepareSave` and `afterSave` callbacks in `save()`. Put custom save logic there. See [Edit Forms and Saving](/documentation/guides/rad/edit-forms).

## Related

- [Admin Grid](/documentation/guides/rad/admin-grid)
- [Code Generator](/documentation/framework/console/commands/code-generator)
