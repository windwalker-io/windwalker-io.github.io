---
layout: doc
title: Installation
description: Install Windwalker Unicorn with Composer and publish its configuration and language files.
---

# Installation

Unicorn is a Composer package for Windwalker 4. It adds admin CRUD, grids, forms, and [code generators](/documentation/framework/console/commands/code-generator) to a Windwalker application. You can install it into any Windwalker application, or use the Starter, which prepares the surrounding stack for you.

Requirements:

- PHP 8.4.6 or later.
- Windwalker Core 4.2 or later, installed automatically as a dependency.
- A database supported by [Windwalker Database](/documentation/components/database/index).
- Node.js 20 or later with Yarn 4, for the frontend assets.

To create a new application with the Starter, follow the [Installation guide](../../guides/start/).

## Install the Package

Require the package in your application root:

```bash
composer require windwalker/unicorn:^1.2
```

Unicorn registers its service provider through the `extra.windwalker.packages` entry in its `composer.json`. You do not need to register it by hand.

## Install the Frontend Package

Unicorn's grids, forms, and messages run in the browser. Install the matching
JavaScript package with Yarn in your application root:

```bash
yarn add @windwalker-io/unicorn-next
```

Then build the frontend assets:

```bash
yarn install
yarn build
```

About Frontend package, please see [Unicorn JS](../javascript-frontend/unicorn-js) for more details.

::: tip
If `package.json` already lists the package, run `yarn install` instead of
adding it again. Use `yarn build:prod` for a production build when your
project defines it.
:::

## Install the Supporting Packages

Unicorn's code uses the [ORM](/documentation/components/orm/index), [Database](/documentation/components/database/index), and [Form](/documentation/components/form/index) packages, but its `composer.json` does not declare them. Install them alongside the package:

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
Unicorn's behavior, such as [file upload profiles](/documentation/unicorn/services/uploader/upload-service), instead of editing the
package in `vendor/`.

The `routes` tag copies the [admin routes](/documentation/framework/core-concepts/http-routing/routing) from `routes/admin/` into your
application, so you can edit them:

```bash
php windwalker pkg:install windwalker/unicorn --tag routes
```

::: warning
The package routes include `POST /file/upload`, which handles file uploads.
Windwalker does not provide a user or permission system on its own, and the
`/admin` scope is not protected by default. Set up [authentication](/documentation/framework/core-concepts/security/authentication) and
permission control before you install Unicorn. Keep an authentication
middleware on this route, or remove the route if your application does not
need uploads. Without one, anyone who can reach your site can upload files.
:::

## Verify the Installation

List the console commands. The Unicorn generators appear in the list:

```bash
php windwalker g
```

The output includes commands such as `unicorn:controller`, `unicorn:view-grid`,
and `unicorn:view-edit`. The generator commands are registered only in the
[console](/documentation/framework/console/console-basics) client, so they do not load during web requests.

## Related

- [Getting Started](./getting-started)
- [Core Concepts](./core-concepts)
