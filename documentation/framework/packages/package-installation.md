---
layout: doc
title: Package Installation
description: Install Windwalker package resources such as config, routes, migrations and MVC modules with pkg:install, using tags, command options and interactive mode.
---

# Package Installation

Windwalker packages, such as Luna, ship their own routes, config,
migrations, views, and MVC source. Installing a package copies those
resources into your project, so you can read and change them.

## Installing a Package

Add the package with Composer first:

```bash
composer require lyrasoft/luna
```

The project's `post-autoload-dump` script runs `pkg:postinstall` after
each Composer change. It copies the `config` tag of every package into
`etc/packages/` and runs the package migrations and asset sync.
Copy other tags with `pkg:install`:

```bash
php windwalker pkg:install lyrasoft/luna --tag config
```

Each package declares named tags. Pass one or more with `-t`:

```bash
php windwalker pkg:install lyrasoft/luna -t config -t routes
```

Without `--tag` or `--all`, the command asks you to choose. See
[Interactive Mode](#interactive-mode).

## Command Options

- `-t, --tag`: Install only the given tags. Repeat for multiple tags.
- `-a, --all`: Install all tags of the named packages.
- `-f, --force`: Overwrite files that already exist in the project.
- `-d, --dry-run`: Show the operations without copying any file.
- `-l, --link`: Create links instead of copying files.
- `--details`: Set the output detail level, from `0` to `3`.

::: tip
Use `--dry-run` first to see which files will be copied.
:::

::: warning
`--force` overwrites existing files in your project without asking.
Back up any customized files before using it.
:::

## Interactive Mode

Omit the name to list the options of every registered package. Pass
several names to list the options of all of them in one menu.

Pass a package name, such as `lyrasoft/luna`, and the command lists
that package's options. Enter numbers separated by commas to select
them. Enter `0` to select `ALL` tags:

```bash
# All packages
php windwalker pkg:install

# One package
php windwalker pkg:install lyrasoft/luna

# Multiple packages
php windwalker pkg:install lyrasoft/luna lyrasoft/feedback ...
```

```text
Please select package or tags, use "," to select multiple options:
  [0 ] lyrasoft/luna ALL
  [1 ] lyrasoft/luna: config
  [2 ] lyrasoft/luna: lang
  [3 ] lyrasoft/luna: migrations
  [4 ] lyrasoft/luna: seeders
  [5 ] lyrasoft/luna: routes
  [6 ] lyrasoft/luna: views
  [7 ] lyrasoft/luna: modules
  ...
```

Entering `5,7` installs the `routes` and `modules` tags. Submitting
an empty answer fails:

```text
// ERROR: Value "" is invalid
```

Use `--tag` to skip the prompt. Repeat `-t` to install several tags:

```bash
php windwalker pkg:install lyrasoft/luna -t config -t routes
```

## Enabling MVC with Routes

Routes are the entry points of an MVC feature. Windwalker enables or
disables a feature through its route files. A route points to the view
class it uses, and by default that class is in the package:

```php
// Route file from lyrasoft/luna
$router->get('article_category', '/articles[/{path:.+}]')
    ->view(ArticleListView::class);
```

Copy the route files with the `routes` tag:

```bash
php windwalker pkg:install lyrasoft/luna -t routes
```

## Overriding MVC Source with Modules

Modules hold the MVC source, such as views and controllers. They
usually replace the package source, and they do not change whether a
route is enabled. Until a route points to a copied class, the route
uses the package source.

Luna groups its MVC source by feature. Each feature has its own tag,
such as `article_admin` or `tag_model`, and the `modules` tag copies
them as a set.

```bash
php windwalker pkg:install lyrasoft/luna -t routes -t modules
```

Copied modules use the `App\Module` namespace instead of
`Lyrasoft\Luna\Module`, so you can edit them in your project. The
`routes` tag copies the route files that connect these modules to URLs.

::: info
Packages are installed in your project, so the package's copy in
`vendor/` no longer controls behavior for the copied files.
:::

## Next Steps

- [Package Override](./package-override): change routes, views, and
  entities of an installed package.
- [Package Development](./package-development): create your own package.
