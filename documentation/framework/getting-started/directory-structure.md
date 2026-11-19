---
layout: doc
title: Directory Structure
description: Explains the directories of a Windwalker project, the resources folder, path aliases and constants, runtime folders, secret handling, and the MVC module layout.
---

# Directory Structure

## Introduction

A Windwalker application keeps its code, configuration, templates,
and public files in separate top-level directories. The split follows
one rule: only the `www` directory is reachable from the web, and
everything else stays outside the document root. Source code,
configuration, and secrets can therefore live next to the application
without being served directly.

The layout also gives every kind of file a predictable home. A route
is always in `routes/`, a template is always in `views/`, and a
migration is always in `resources/migrations/`. Code that reads a file
can rely on these locations, so the application does not need to
search for them.

## The Project Tree

A new project has the following structure:

```text
project/
├── cache/            Generated cache files
├── etc/              Configuration
├── logs/             Application logs
├── resources/        Assets, languages, migrations, seeders
├── routes/           Route definitions
├── src/              Application code
├── tmp/              Temporary files
├── vendor/           Composer packages
├── views/            Templates
├── www/              Public web root
├── .env              Environment variables
├── composer.json
└── windwalker        Console entry point
```

Each directory has a single purpose:

| Directory   | Purpose                                                  |
|-------------|----------------------------------------------------------|
| `etc/`      | All configuration files. See [Configuration](./configuration). |
| `src/`      | Application classes, such as controllers, services, entities, and middleware. |
| `routes/`   | Route files. The main entries are `main.route.php`, `front.route.php`, and `admin.route.php`; the `admin/`, `custom/`, and `packages/` subdirectories group more routes. |
| `views/`    | Templates, grouped by area, such as `admin/`, `global/`, `layout/`, and `mail/`. |
| `resources/`| Non-PHP assets and data, such as `assets/`, `languages/`, `migrations/`, and `seeders/`. |
| `www/`      | Web root, with `index.php` as the web entry point and `dev.php` for development. Built frontend files are published here. |
| `windwalker`| Console entry point. Run commands such as `php windwalker server:start` from the project root. |
| `cache/`, `logs/`, `tmp/` | Runtime files written by the application. They do not belong in version control. |
| `vendor/`   | Composer packages, including the Windwalker packages. |

::: warning
Only point the web server's document root to `www`. If the root is set
to the project directory, the `.env` file and the `etc/` configuration
become reachable by URL.
:::

## The resources Directory

The `resources/` directory holds files that are not application code.
These include front-end sources, language files, database scripts, and
the lists that the console and other services load.

| Subdirectory  | Purpose                                                    |
|---------------|------------------------------------------------------------|
| `assets/`     | Front-end sources, such as SCSS, TypeScript, and images. Vite builds them into `www/assets`. |
| `languages/`  | Translation files, one folder per locale, such as `en-US/main.ini`. |
| `menu/`       | Menu definitions written with `MenuBuilder` in `*.menu.php` files. |
| `migrations/` | Database schema changes, one class per file, prefixed with a timestamp. |
| `registry/`   | PHP files that return arrays, such as console commands, scripts, schedules, queue workers, servers, and generators. |
| `seeders/`    | Seed data. `main.seeder.php` is the entry point that calls the others. |

Edit the sources in `assets/`, not the built output in `www/assets`.
The Vite base is set in `etc/conf/asset.config.php`.

Translation keys are read from `languages/`, and the fallback locale is
used for missing keys. The `@languages` alias points to this folder:

```ini
app.site.title="Windwalker"
```

The admin sidebar is defined in `menu/admin/sidemenu.menu.php`:

```php
$menu->link($lang('luna.article.category.list'))
    ->to($nav->to('category_list', ['type' => 'article']));
```

Each migration file name starts with a timestamp, such as
`2021110708010001_ConfigInit.php`. The `@migrations` alias points to
this folder, and the timestamp keeps the files in creation order.

::: tip
Add a new migration instead of editing one that has already run on
another database. An edited migration is not run again on that
database, so the schemas drift apart.
:::

Each file in `registry/` lists one kind of extra entry. For example,
`commands.php` holds console commands and `scripts.php` holds shell
command batches. The console and queue configuration include these
files, and a script is run by name, such as `php windwalker run prepare`.

The `main.seeder.php` file calls the other seeders, such as
`user.seeder.php` and `article.seeder.php`. The `@seeders` alias points
to this folder.

::: warning
Clearing the migration versions or the seeders can remove data that
the application needs. Do not run `reset` or `seed:clear` against a
database that holds data you want to keep.
:::

## Path Aliases

Code rarely builds paths by hand. Instead, it uses path aliases that
start with `@`, such as `@etc`, `@views`, or `@temp`. The aliases are
defined in `etc/runtime.config.php`, and each one points to a
directory in the project:

- `@root`: the project root.
- `@etc`, `@source`, `@routes`, `@views`: the directories listed above.
- `@resources`, `@languages`, `@migrations`, `@seeders`: the
  subdirectories of `resources/`.
- `@public`: the `www` directory.
- `@cache`, `@logs`, `@temp`: the runtime directories.
- `@vendor`: the Composer directory.
- `@servers`: the server directory, which a project may not include.

Use `path()` on the application object to resolve an alias:

```php
$viewFile = $app->path('@views/front/home.blade.php');
$logDir   = $app->path('@logs');
```

The same aliases are available through the `PathResolver` class in
`Windwalker\Core\Application`, which provides a `resolve()` method.
Code that needs a path without the application object can use it:

```php
$root = $pathResolver->resolve('@root');
```

::: info
The aliases are the stable way to reference a directory. If a
directory is moved, only `etc/runtime.config.php` needs to change.
:::

## Constants

`etc/define.php` defines the following constants. Most of them are
directory paths, and `WINDWALKER_DEBUG` is the debug switch. The
constants are mainly for boot files, which run before the application
object exists. Application code should use the path aliases instead.

| Constant                | Value                                 |
|-------------------------|---------------------------------------|
| `WINDWALKER_ROOT`       | The project root.                     |
| `WINDWALKER_BIN`        | `bin/`                                |
| `WINDWALKER_ETC`        | `etc/`                                |
| `WINDWALKER_LOGS`       | `logs/`                               |
| `WINDWALKER_ROUTES`     | `routes/`                             |
| `WINDWALKER_RESOURCES`  | `resources/`                          |
| `WINDWALKER_SOURCE`     | `src/`                                |
| `WINDWALKER_VIEWS`      | `views/`                              |
| `WINDWALKER_VENDOR`     | `vendor/`                             |
| `WINDWALKER_PUBLIC`     | `www/`                                |
| `WINDWALKER_SERVERS`    | `servers/`                            |
| `WINDWALKER_MIGRATIONS` | `resources/migrations/`               |
| `WINDWALKER_SEEDERS`    | `resources/seeders/`                  |
| `WINDWALKER_LANGUAGES`  | `resources/languages/`                |
| `WINDWALKER_CACHE`      | `cache/`, or the `CACHE_PATH` value.  |
| `WINDWALKER_TEMP`       | `tmp/`, or the `TEMP_PATH` value.     |
| `WINDWALKER_DEBUG`      | Boolean from the `APP_DEBUG` variable. |

```php
$config = require WINDWALKER_ETC . '/config.php';
```

## Runtime Directories

The `cache/`, `logs/`, and `tmp/` directories are written by the
application at runtime. Their locations can be changed with the
`CACHE_PATH` and `TEMP_PATH` environment variables:

```dotenv
CACHE_PATH=/var/cache/my-app
TEMP_PATH=/var/tmp/my-app
```

::: tip
Moving `CACHE_PATH` and `TEMP_PATH` outside the project keeps generated
files out of the deployment directory, and lets you replace the code
without losing the cache.
:::

The `cache/` directory can be cleared with the console command
`cache:clear`, and the contents of `tmp/` can be deleted at any time.
Keep `logs/` when you need to read the history of errors.

## Secrets and Version Control

The `.env` file in the project root holds the environment variables,
such as the database password and the application secret. Keep it out
of version control:

```text
# .gitignore
.env
.env.local
```

::: warning
Never commit `.env` or any file that contains a secret. A committed
secret is exposed to everyone who can read the repository, and it must
be replaced even after the file is removed.
:::

## MVC Structure

Windwalker keeps the MVC classes of an application under `src/Module`.
Each subject is a module with its controller, its views, and its assets.
Two levels organize the module tree: stages and subjects.

### Stages

A stage is a top-level group of entry points, such as the public site,
the administrator, or an API. Each stage has its own folder:

```text
src/Module/
├── Admin/
├── Front/
└── Api/
```

The framework does not fix stage names. The project chooses them, and
the choice shapes the routes and the middleware. Routes are grouped by
stage, and each group attaches its own middleware. The `front` group in
earth is shortened below:

```php
$router->group('front')
    ->namespace('front')
    ->middleware(CsrfMiddleware::class)
    ->middleware(FrontMiddleware::class)
    ->register(function (RouteCreator $router) {
        $router->get('home', '/')
            ->handler(HomeController::class)
            ->view(HomeView::class);
    });
```

::: tip
Choose the stage names at the start of the project. A stage name is
part of the route group and the middleware scope, so renaming it later
means changing the routes and the middleware of every class in it.
:::

The code generators ask for a stage when a name has no stage prefix.
Enter a name such as `Front/Article` to create the classes in
`src/Module/Front/Article`.

### The Vertical Structure

Inside a stage, each subject gets its own folder. The folder holds the
controller, the views, and the assets of that subject. The `Home`
subject in the `Front` stage of earth looks like this:

```text
src/Module/Front/Home/
├── HomeController.php
├── HomeView.php
├── views/
│   └── home.blade.php
└── assets/
    ├── home.scss
    └── home.ts
```

Keeping all code of a subject in one folder makes it easy to find,
change, or delete. A subject can have several controllers and views,
such as the `Form/` subfolder and the `views/` folder of
`Admin/Article` in earth. The same subject name can also appear in
more than one stage, with different controllers and views for each one,
because the stages are separate folders.

### Naming Subjects

Windwalker recommends singular names for subjects and their classes,
such as `Article` instead of `Articles`. A singular name keeps the
class names consistent, for example `ArticleItemView` and
`ArticleListView`. English plurals are also irregular: `Music` has no
plural form, so a plural name can be ambiguous.

This is a recommendation, not a rule. The framework works with
singular names, plural names, or a mix of both.

::: info
Routes are independent of class names. You can give a route a readable
plural path, such as `/articles`, which is friendlier for search
engines and users.
:::

### Shared Classes

Not every class belongs to a subject. A class that several stages use
goes to the top level of `src/`, such as `Entity`, `Enum`, and `Service`
in earth. Keep these shared classes out of the stage folders, so that
no stage depends on another stage's code.


