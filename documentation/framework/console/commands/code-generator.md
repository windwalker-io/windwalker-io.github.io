---
layout: doc
description: Generate controllers, views, models, entities, forms and routes from the console, revise generated files, and build entities and enums from tables.
---

# Code Generator

The generator creates project files from a short command. It writes
controllers, views, models, entities, forms, routes, and other classes
that follow the framework conventions.

## Generating Files

Run `make` (or its alias `g`) and choose a subcommand:

```bash
php windwalker g controller Article
php windwalker generate:make entity Article
php windwalker g route Article
```

Use `--help` to see the arguments of a subcommand:

```bash
php windwalker g controller --help
```

## Available Subcommands

The subcommands come from the `generator.commands` configuration, which
the host app loads from `etc/app/console.config.php`.

- `controller`
- `view`
- `model`
- `entity`
- `data`
- `form`
- `route`
- `enum`
- `component`
- `field`
- `policy`
- `middleware`
- `job`
- `subscriber`
- `command`

## Revising Generated Files

`generate:revise` updates files that the generator created earlier, so
you can regenerate them after changing the template or the input
definition.

```bash
php windwalker generate:revise
```

::: tip
Generate a file first, then edit it. Running the generator again on a
file you changed may overwrite your edits, so keep changes under version
control before you regenerate.
:::

## Building from the Database

Two commands build classes from existing database tables:

```bash
php windwalker build:entity
php windwalker build:enum
```

Use `build:entity` to create an entity for each table, and
`build:enum` to create enum classes. Review the output before you commit
it.

