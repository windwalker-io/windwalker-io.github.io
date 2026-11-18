---
layout: doc
---

# Package Migrations

A package that changes its database schema must ship migrations for the
host app. Windwalker runs these migrations when the package is upgraded.

## Use Case

Version 1.0.0 of a package creates the `portfolio` table. Version 1.1.0
adds a `summary` column. Existing host apps must receive the new column
after they run `composer update`, without losing data.

## Minimal Setup

Override `migrate()` in the package class. Register each version that
has database changes with `addDbMigrate()`:

```php
public function migrate(PackageMigrator $migrator): void
{
    $migrator->addDbMigrate('1.1.0')
        ->migrationFiles(
            'resources/migrations/1.1.0/add_summary.sql'
        );
}
```

## Complete Example

```php
<?php

declare(strict_types=1);

namespace Acme\Portfolio;

use Windwalker\Core\Package\AbstractPackage;
use Windwalker\Core\Package\PackageMigrator;

class PortfolioPackage extends AbstractPackage
{
    public function migrate(PackageMigrator $migrator): void
    {
        $migrator->addDbMigrate('1.0.0')
            ->migrationFiles(
                'resources/migrations/1.0.0/create_portfolio.sql'
            )
            ->checkEntitiesNotOverrides(
                Entity\Portfolio::class
            );

        $migrator->addDbMigrate('1.1.0')
            ->migrationFiles(
                'resources/migrations/1.1.0/add_summary.sql'
            )
            ->checkEntitiesNotOverrides(
                Entity\Portfolio::class
            );
    }
}
```

Migration file paths are relative to the package root.

## Entity Overrides

`checkEntitiesNotOverrides()` lists the entities that the migration
depends on. When the host app has its own class with the same entity
name (for example `App\Entity\Portfolio`), Windwalker skips the package
migration for that version, because the host app owns the table.

::: info
Migrations are skipped for an entity that the host app overrides. Check
that the host app's entity matches the schema your package expects.
:::

## Testing a Migration

Test migrations on the host app before you release. The `--test` option
simulates an upgrade with a fake version range:

```bash
php windwalker pkg:migrate --test acme/portfolio
```

The command copies the migration files to the host app's
`resources/migrations` folder when the version is in range.

::: warning
Without `--test`, `pkg:migrate` runs the real upgrade. It reads the
`upgrade-tmp` file written by `composer update` and deletes it when
it finishes. Run `composer update` again if that file has expired.
:::
