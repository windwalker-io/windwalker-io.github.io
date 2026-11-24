---
layout: doc
description: Install Luna into a Windwalker application with Composer, then publish its resources and run its migrations.
---

# Installation

Luna is a CMF layer built on [Windwalker Core](/documentation/framework/index) and [Unicorn](/documentation/unicorn/index). It adds the
admin and front-end modules, the content entities, and the auth system to
your application. Luna does not run on its own, so install it into an
existing [Windwalker application](/documentation/framework/getting-started/installation).

## Requirements

- PHP `>=8.4.6`
- `windwalker/core` `^4.2`
- `windwalker/unicorn` `^1.2`

## Install the Package

Require the package with Composer:

```bash
composer require lyrasoft/luna
```

Composer installs Luna's dependencies, including [Unicorn](/documentation/unicorn/introduction/installation). Luna's `LunaPackage` class registers
itself with Windwalker through its package manifest, so no provider entry
is needed in your config.

## Publish Package Resources

Luna's files are copied into your application (config, routes, views,
languages, migrations, seeders, and modules). Run the install command:

```bash
php windwalker pkg:install lyrasoft/luna
```

To install every package that is registered, use `--all`:

```bash
php windwalker pkg:install --all
```

Add `--dry-run` to preview the file operations without copying anything:

```bash
php windwalker pkg:install lyrasoft/luna --dry-run
```

::: warning
`pkg:install` overwrites existing files only with `--force`. Without it,
files you have already changed are kept. Use `--force` only when you want
Luna's version of a file back.
:::

## Run the Migrations

Luna's migrations create the user, rule, category, article, menu, page,
tag, language, association, and widget tables. Run them with:

```bash
php windwalker mig:go
```

::: warning
Run migrations against a development database first. They create tables and
do not drop existing ones, but they change the schema of your application.
:::

## Import the Seeders

Luna ships a seeder that creates 50 demo users. Import them with:

```bash
php windwalker seed:import
```

::: warning
Seeders insert data. Run `seed:import` only on a fresh database. Use
`seed:clear` to reverse the seeded records.
:::

## Next Steps

Continue with [Getting Started](./getting-started) to sign in to the admin
and publish your first article.
