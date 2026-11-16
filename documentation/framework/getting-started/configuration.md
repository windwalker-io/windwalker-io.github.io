---
layout: doc
title: Configuration
---

# Configuration

## Introduction

A Windwalker application is configured in two layers. Environment
variables hold values that change between machines, such as database
credentials or the debug switch. PHP configuration files hold the
application's structure, such as routing, security, and package
settings. The files read the environment variables, so one codebase
can run in development, staging, and production with different values.

Configuration files return plain PHP arrays. Each application reads
them at boot and exposes them through the `config()` method:

```php
$name = $app->config('app.name');
$debug = $app->config('app.debug');
```

Dotted keys address nested values, so `app.name` reads the `name`
key inside the `app` section.

### The etc Directory

All configuration lives in the `etc/` directory of the project:

- `define.php`: defines the path constants, such as `WINDWALKER_ROOT`
  and `WINDWALKER_ETC`, and loads the `.env` files. The web entry
  point `www/index.php` includes it.
- `runtime.config.php`: runtime settings loaded by `Runtime::loadConfig()`
  before the application starts, such as the path aliases and the
  HTTP server.
- `config.php`: the entry point that merges the files in `conf/`,
  `packages/`, and `di.config.php` into one array.
- `conf/`: the core settings, one file per topic, such as `app`,
  `security`, `routing`, and `logs`. Each file becomes a top-level key.
- `packages/`: one file per installed package, such as `access` or
  `cache`. Every file is merged automatically.
- `app/`: the settings for each application entry point. `main.config.php`
  configures the web application, `console.config.php` configures the
  console application, and `windwalker.config.php` holds the shared
  settings that both files include.
- `di/`: one file per service factory group. The files are merged into
  `di.config.php`, so new services do not require editing a long list.
- `di.config.php`: the dependency injection settings, such as the
  factories, providers, bindings, and aliases. It is stored in the
  `di` configuration key.
- `custom.config.php`: optional, not present by default. When it exists
  in `conf/`, it overrides any section.

The rest of this page explains each part in detail.

## Environment Configuration

Environment variables provide the values that change between machines,
such as database credentials and the debug switch. Windwalker loads
them from `.env` files in the project root, and the configuration files
read them with the `env()` helper. The
[environment variables](/documentation/framework/core-concepts/environment-variables)
page covers the loading order, the `APP_ENV` and `APP_DEBUG` settings,
and the handling of secrets.

## App Configuration

### Configuration Files

Configuration files live in `etc/`. The entry point `etc/config.php`
merges them into one array. Each file is a top-level key:

- `etc/conf/app.config.php` becomes `app`.
- `etc/conf/security.config.php` becomes `security`.
- `etc/conf/routing.config.php` becomes `routing`.
- `etc/di.config.php` becomes `di`.

A file returns an array of settings:

```php
// etc/conf/app.config.php
use Windwalker\Core\Provider\DateTimeProvider;

return [
    'name' => 'Windwalker',
    'timezone' => env('APP_TIMEZONE', 'UTC'),
    'providers' => [
        DateTimeProvider::class,
    ],
];
```

Read a value with its path, such as `$app->config('app.timezone')`.

Files merged last overwrite earlier keys with the same name. A
`conf/custom.config.php` file, when present, is merged after all other
files, so it can override any top-level section.

::: tip
Keep environment-specific values in `.env` files and let configuration
files read them. Avoid editing the arrays for each environment.
:::

### Listeners

The `listeners` key registers event listeners when the app boots. A key
that is an event class registers a listener on the application dispatcher.
A key that is a service class registers the listeners on that service:

```php
// etc/app/main.config.php
use App\Listener\NavLocaleSubscriber;
use Windwalker\Core\Router\Navigator;

return [
    'listeners' => [
        Navigator::class => [
            NavLocaleSubscriber::class,
        ],
    ],
];
```

See [Listeners](/documentation/components/event/listeners) for the
listener types.

### Application Files

The `etc/app/` directory holds one file per application entry point.
Each file returns an array that the application loads at boot:

- `main.config.php`: the web application. `etc/di.config.php` loads it
  when it creates the `main` app. Set the web middlewares, listeners,
  and HTTP proxy settings here.
- `console.config.php`: the console application. It registers the
  commands, listeners, schedules, and scripts from `resources/registry/`.
- `windwalker.config.php`: the settings shared by both applications.
  `main.config.php` and `console.config.php` merge it first.

```php
// etc/app/main.config.php
use Windwalker\Core\Middleware\RoutingMiddleware;

return array_merge(
    require __DIR__ . '/windwalker.config.php',
    [
        'middlewares' => [
            RoutingMiddleware::class,
        ],
    ],
    require __DIR__ . '/../config.php'
);
```

### Packages Configuration

Each installed package can ship its own configuration in
`etc/packages/`. Every `*.php` file in that folder is loaded
automatically, and its array is merged into the top level, so you do
not need to list the files in `etc/config.php`.

A package file often uses the `ConfigModule` attribute to control
when it is loaded:

```php
// etc/packages/cache.config.php
use Windwalker\Core\Attributes\ConfigModule;

return #[ConfigModule(
    name: 'cache',
    enabled: true,
    env: ['dev', 'prod'],
)]
static fn() => [
    'driver' => 'file',
];
```

`ConfigModule` controls the following:

- `enabled`: turns the module on or off.
- `env`: loads the module only in the listed `APP_ENV` values.
- `belongsTo`: loads the module only when the named package or class
  is installed.
- `priority`: sets the merge order when several modules compete.

The `env` filter checks `APP_ENV`, and a missing value is treated as
`prod`. The module's callback is not called until the configuration
is read, so an expensive array does not slow down unrelated requests.

For the settings each bundled package accepts, see the
[package configuration reference](#). <!-- TODO: replace with the page URL -->

::: info
A package's `belongsTo` value can be a Composer package name, such
as `vendor/package`, or a class name. The module is skipped when the
package or class is not available.
:::
