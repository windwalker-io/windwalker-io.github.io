---
layout: doc
title: Installation
description: Install Windwalker Unicorn with Composer and publish its configuration and language files.
---

# Installation

Unicorn is a Composer package for Windwalker 4. It adds admin CRUD, grids, forms, and code generators to a Windwalker application. You can install it into any Windwalker application, or use the Starter, which prepares the surrounding stack for you.

Requirements:

- PHP 8.4.6 or later.
- Windwalker Core 4.2 or later, installed automatically as a dependency.
- A database supported by Windwalker Database.
- Node.js 20 or later with Yarn 4, for the frontend assets.

To create a new application with the Starter, follow the [Installation guide](../../guides/start/).

## Install the Package

Require the package in your application root:

```bash
composer require windwalker/unicorn:^1.2
```

Unicorn registers its service provider through the `extra.windwalker.packages` entry in its `composer.json`. You do not need to register it by hand.

## Install the Supporting Packages

Unicorn's code uses the ORM, Database, and Form packages, but its `composer.json` does not declare them. Install them alongside the package:

```bash
composer require \
  windwalker/database:^4.0 \
  windwalker/orm:^4.0 \
  windwalker/form:^4.0
```

::: info
The Starter already includes these three packages. Install them yourself only when you start from a plain Windwalker Core application.
:::

## Publish the Resources

Copy the package configuration and language files into your application:

```bash
php windwalker pkg:install windwalker/unicorn --tag config
php windwalker pkg:install windwalker/unicorn --tag lang
```

The `config` tag installs `etc/unicorn.config.php`. Edit that file to change
Unicorn's behavior, such as file upload profiles, instead of editing the
package in `vendor/`.

The `routes` tag copies the admin routes from `routes/admin/` into your
application, so you can edit them:

```bash
php windwalker pkg:install windwalker/unicorn --tag routes
```

::: warning
The package routes include `POST /file/upload`, which handles file uploads.
Keep an authentication middleware on this route. Do not expose it without one,
and remove the route if your application does not need uploads.
:::

## Verify the Installation

List the console commands. The Unicorn generators appear in the list:

```bash
php windwalker g
```

The output includes commands such as `unicorn:controller`, `unicorn:view-grid`,
and `unicorn:view-edit`. The generator commands are registered only in the
console client, so they do not load during web requests.

## Related

- [Getting Started](./getting-started)
- [Core Concepts](./core-concepts)
