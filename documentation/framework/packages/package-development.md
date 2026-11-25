---
layout: doc
description: Create a Windwalker Composer package with a package class and installer methods that copy config, routes, migrations, languages and MVC modules into a host app.
---

# Package Development

A Windwalker package is a Composer package that ships reusable parts of
an application, such as MVC classes, entities, routes, migrations, and
configuration. A host app installs the package and Windwalker wires its
parts into the app.

Package development lets you move a feature out of the host app and into
its own repository. You can then reuse it across projects, version it
independently, and distribute it through Packagist or a private
repository.

## Overview

A package has three main parts:

- **Composer package**: a `composer.json` with type `windwalker-package`.
- **Package class**: extends `AbstractPackage` and implements `install()`
  to copy files and register resources.
- **Resources**: the files the package installs into the host app, such
  as controllers, views, routes, migrations, and config.

The host app discovers the package class through
`extra.windwalker.packages` in the package's `composer.json`.

## Creating a Package

A package starts as a Composer package. Its entry class tells Windwalker
what to install when the package is added to a host app.

Suppose a portfolio feature (entity, repository, controllers, views, and
routes) is used by several projects. Instead of copying these files into
each app, put them in one package and install it everywhere.

Declare the package type and register the package class in
`composer.json`:

```json
{
    "name": "acme/portfolio",
    "type": "windwalker-package",
    "autoload": {
        "psr-4": {
            "Acme\\Portfolio\\": "src/"
        }
    },
    "extra": {
        "windwalker": {
            "packages": [
                "Acme\\Portfolio\\PortfolioPackage"
            ]
        }
    }
}
```

Create the package class. `install()` receives a `PackageInstaller` and
copies the package's resources into the host app.

```php
<?php

declare(strict_types=1);

namespace Acme\Portfolio;

use Windwalker\Core\Package\AbstractPackage;
use Windwalker\Core\Package\PackageInstaller;

class PortfolioPackage extends AbstractPackage
{
    public function install(PackageInstaller $installer): void
    {
        $installer->installConfig(
            static::path('resources/config/*.php'),
            'config',
        );

        $installer->installRoutes(
            static::path('resources/routes/*.php'),
            'routes',
        );

        $installer->installMigrations(
            static::path('resources/migrations/*.sql'),
            'migrations',
        );

        $installer->installLanguages(
            static::path('resources/languages/*.ini'),
            'languages',
        );

        $installer->installMVCModules(
            'Portfolio',
            ['Front', 'Admin'],
            true,
        );
    }
}
```

Install the package into the host app. `pkg:install` runs `install()`
and copies the resources.

```bash
php windwalker pkg:install acme/portfolio --all
```

::: info
Without `--all` or `--tag`, `pkg:install` asks which resources to
install.
:::

## Writing a Config File

A package ships its default settings as config files in
`resources/config/`. `installConfig()` copies them to the host app's
`etc/packages/` folder, where Windwalker loads them with the rest of
the configuration. The user can then change a value without editing
the package in `vendor/`.

Name the file `{name}.config.php`. Windwalker uses the part before
`.config` as the module name, so `portfolio.config.php` becomes the
`portfolio` module.

```php
<?php
// resources/config/portfolio.config.php

declare(strict_types=1);

namespace App\Config;

use Acme\Portfolio\PortfolioPackage;
use Windwalker\Core\Attributes\ConfigModule;

return #[ConfigModule(
    name: 'portfolio',
    enabled: true,
    priority: 100,
    belongsTo: PortfolioPackage::class,
)]
static fn() => [
    // Items shown per page. Overridable with an env variable.
    'per_page' => (int) env('PORTFOLIO_PER_PAGE', 12),

    // Upload folder, relative to the public folder.
    'upload_dir' => 'images/portfolio',
];
```

The file has three parts:

- **`return #[ConfigModule(...)]`**: Attaches the module options to the
  file. The attribute must be on the `return` line.
- **`static fn() => [...]`**: A callback that returns the settings
  array. Windwalker calls it only when it reads the configuration.
- **The settings array**: Plain keys and values. Read them with the
  module name as the first segment of the path.

```php
// In a controller, service, or any class with the app instance
$perPage = $app->config('portfolio.per_page');   // 12
$folder  = $app->config('portfolio.upload_dir'); // images/portfolio
```

`ConfigModule` options:

- `name`: The module name. Used as the first segment of the config path.
- `enabled`: Turns the module on or off.
- `priority`: Sets the merge order when several modules compete.
- `env`: Loads the module only for the listed `APP_ENV` values, such as
  `env: 'dev'`.
- `belongsTo`: Loads the module only when the package or class is
  installed. Use `PortfolioPackage::class` so the file is skipped if the
  package is removed.

::: tip
Use `env()` for values that differ between machines, such as keys or
paths. Keep fixed defaults as literal values.
:::

::: info
The callback is not called until the configuration is read, so an
expensive value does not slow down unrelated requests.
:::

::: warning
Do not put secrets, such as API keys or passwords, as literal values
in a package config file. Installed files are readable in the host app
and may be committed to the project repository. Read them from `env()`
instead.
:::

For the merge rules and all the `ConfigModule` options, see
[Configuration](../getting-started/configuration).

## Installer Methods

`install()` receives a `PackageInstaller`. Each method copies one group
of files from the package into the host app. Path arguments accept a
glob or an array of globs. Use `static::path()` to build absolute paths
from the package root.

The examples below assume this package layout:

```
acme/portfolio
├── resources/
│   ├── config/
│   ├── languages/
│   ├── migrations/
│   ├── routes/
│   ├── seeders/
│   └── views/
└── src/
    ├── Entity/Portfolio.php
    ├── Module/Front/Portfolio/
    └── Repository/PortfolioRepository.php
```

Most methods accept the same optional arguments:

- `$tags`: A tag name or array of tag names. Tags let users install only
  part of a package. See [Installing by Tag](#installing-by-tag).
- `$callback`: Runs for each file copied by the tags you pass. It
  receives `$src` and `$dest`.

### installConfig()

Copies config files to the host app's `etc/packages/` folder.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installConfig(
        static::path('resources/config/*.php'),
        'config',
    );
}
```

### installRoutes()

Copies route files to the host app's `routes/packages/` folder.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installRoutes(
        static::path('resources/routes/*.php'),
        'routes',
    );
}
```

### installMigrations()

Copies migration files to the host app's `@migrations` folder. To run
database changes on upgrade, see
[Package Migrations](./package-migration).

```php
public function install(PackageInstaller $installer): void
{
    $installer->installMigrations(
        static::path('resources/migrations/*.sql'),
        'migrations',
    );
}
```

### installLanguages()

Copies language files to the host app's `@languages` folder.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installLanguages(
        static::path('resources/languages/*.ini'),
        'languages',
    );
}
```

### installViews()

Copies view templates to the host app's `@views/` folder.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installViews(
        static::path('resources/views/*.php'),
        'views',
    );
}
```

### installSeeders()

Copies seeder classes to the host app's `@seeders` folder.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installSeeders(
        static::path('resources/seeders/*.php'),
        'seeders',
    );
}
```

### installFiles()

Copies any files to a folder you choose, relative to the host app root.
Use it for assets or other files that do not fit the methods above.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installFiles(
        static::path('resources/assets/**/*'),
        'public/vendor/acme/portfolio',
        'assets',
    );
}
```

### installModules()

Copies files to the paths you map, and rewrites text in each copied
file. Use it when package code needs its namespace changed in the host
app.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installModules(
        [
            static::path('src/Module/Front/Portfolio/**/*')
                => '@source/Module/Front/Portfolio',
        ],
        [
            'Acme\\Portfolio\\Module' => 'App\\Module',
        ],
        'modules',
    );
}
```

::: warning
`installModules()` reads every copied file as text and writes it back
with the replacements applied. Do not copy binary files, such as images
or fonts, through this method. Use `installFiles()` for those.
:::

### installMVCModules()

Copies the MVC classes for one entity. It copies the module folders
under `src/Module/{Module}/{Entity}/`, and with `$model` set to `true`
it also copies the entity and repository. The namespaces are rewritten
from the package namespace to `App\`.

```php
public function install(PackageInstaller $installer): void
{
    // Front and Admin modules, plus the entity and repository.
    $installer->installMVCModules(
        'Portfolio',
        ['Front', 'Admin'],
        true,
    );

    // Only the Front module, without the entity and repository.
    $installer->installMVCModules(
        'Portfolio',
        ['Front'],
        false,
    );
}
```

Entity and repository files are copied to the host app's `App\Entity`
and `App\Repository` namespaces. The method builds the source paths from
the entity name, so the files must be `src/Entity/Portfolio.php` and
`src/Repository/PortfolioRepository.php`.

### installCallback()

Registers a callback without copying files. It runs for each file
copied by the tags you pass, and it is useful for post-install tasks
such as printing a message or changing a file that another method
copied.

```php
public function install(PackageInstaller $installer): void
{
    $installer->installConfig(
        static::path('resources/config/*.php'),
        'config',
    );

    $installer->installCallback(
        'config',
        function (string $src, string $dest): void {
            // Runs for each config file copied under the "config" tag.
            echo "Installed: $dest\n";
        },
    );
}
```

::: tip
Pass at least one tag to `installCallback()`. The callback is attached
to the tags you pass, so a call without tags does not register it.
:::

### Installing by Tag

Each method registers its files under the tags you pass. Users then
install only the tags they need:

```bash
php windwalker pkg:install acme/portfolio --tag=config
php windwalker pkg:install acme/portfolio --tag=views --tag=routes
```

The `--tag` option can be repeated. Without `--tag` or `--all`, the
command asks which resources to install. Use `--all` to install every
resource of the listed packages.
