---
layout: doc
title: Migrations
description: Version and apply database schema changes with migration files that run up and down in order, so every environment reaches the same schema.
---

# Migrations

Migrations are versioned PHP files that change your database schema over time. Each file describes how to apply a change (`up`) and how to revert it (`down`). Windwalker runs them in version order, so every environment reaches the same schema.

Without migrations, schema changes are applied by hand. Each developer, staging server, and production server can drift apart, and a deployment can fail on a missing column. Migrations keep the schema in source control next to the code that depends on it.

Windwalker records every applied version in a log table. The default table name is `migration_log`. You can change it with the `db.migration.table_name` config value. The log table is created or updated automatically the first time a migration command runs.

## Creating a Migration

Generate a new migration file with the `mig:create` command:

```bash
php windwalker mig:create CreateProducts
```

The file is named `{version}_{name}.php`, for example `202601011200_CreateProducts.php`. It is placed in the migration folder, which defaults to the `@migrations` path. When you run the command, it also asks whether the migration targets an entity and whether it creates or updates a table.

### Writing a Migration

A migration file returns an anonymous instance of a class that extends `AbstractMigration`. Mark the `up` method with `#[MigrateUp]` and the `down` method with `#[MigrateDown]`:

The file creates the table with the Schema callback. See
[Tables](/documentation/components/database/tables) for the schema syntax.

```php
<?php

declare(strict_types=1);

use Windwalker\Core\Migration\AbstractMigration;
use Windwalker\Core\Migration\MigrateDown;
use Windwalker\Core\Migration\MigrateUp;
use Windwalker\Database\Schema\Schema;

return new class extends AbstractMigration {
    #[MigrateUp]
    public function up(): void
    {
        // Create a new table with the Schema callback.
        $this->createTable(
            'products',
            function (Schema $schema) {
                $schema->primaryBigint('id');
                $schema->varchar('title')->length(191);
                $schema->varchar('alias')->length(191);
                $schema->decimal('price')->length('20,6');
                $schema->integer('stock')->nullable(true);
                $schema->json('params')->nullable(true);
                $schema->timestamp('created')->defaultCurrent();

                $schema->addUniqueKey('alias');
            }
        );
    }

    #[MigrateDown]
    public function down(): void
    {
        // Remove the table when rolling back.
        $this->dropTables('products');
    }
};
```

The `createTable()` method accepts a table name or an entity class name, such as `Product::class`. Use `updateTable()` to change an existing table, and `dropTableColumns()` to remove columns:

```php
#[MigrateUp]
public function up(): void
{
    // Add a column to an existing table.
    $this->updateTable(
        'products',
        function (Schema $schema) {
            $schema->varchar('subtitle')->length(191)->nullable(true);
        }
    );

    // Remove columns in the down step.
    $this->dropTableColumns('products', 'subtitle');
}
```

::: warning
`dropTables()` and `dropTableColumns()` delete data. Check the `down` method before you roll back in a database that holds real data.
:::

### Injecting the DatabaseAdapter, ORM and Services

Each migration exposes these properties:

- `$this->db`: the `DatabaseAdapter` of the active connection.
- `$this->orm`: the ORM instance created from `$this->db`.

Migration handlers are called through the application container, so you can also type-hint any service in the method parameters:

```php
use Windwalker\Database\DatabaseAdapter;
use Windwalker\ORM\ORM;

#[MigrateUp]
public function up(
    DatabaseAdapter $db,
    ORM $orm,
    ProductSlugger $slugger,
): void {
    // Use the injected objects for custom SQL or data changes.
    $db->prepare('UPDATE products SET state = 1')->execute();
}
```

The class `ProductSlugger` is only an example here. Any service that the container can build is injected in the same way.

Column types, lengths, indexes, and keys are defined with the `Schema` object. See [Tables](/documentation/components/database/tables) for the full list of column types and table options. For databases and schemas, see [Databases and Schemas](/documentation/components/database/databases-and-schemas).

## Running Migrations

Run `mig:go` to apply all pending migrations:

```bash
php windwalker mig:go
```

To migrate to a specific version, pass the version or the migration name:

```bash
# Migrate up to this version (inclusive)
php windwalker mig:go 202601011200

# Migrate up to the migration with this name
php windwalker mig:go CreateProducts

# Roll back every migration
php windwalker mig:go 0
```

The command runs the migrations up or down, depending on the current version. Down migrations run in reverse order, and only for versions recorded in the log table.

Use `-f` or `--force` to skip the confirmation prompt in scripts:

```bash
php windwalker mig:go -f
```

### Migration Directory

The default directory is the `@migrations` path. Use `-d` or `--dir` to read migrations from another folder:

```bash
php windwalker mig:go -d ./resources/migrations
```

### Backup Before Running

Before running migrations, Windwalker creates a database backup with `DatabaseExportService`. Disable it with `--no-backup`:

```bash
php windwalker mig:go --no-backup
```

You can also disable the backup for every run with the environment variable `DB_BACKUP_DISABLED`.

::: warning
The backup is your only copy when a migration drops data. Keep it enabled for production databases.
:::

For backup settings and manual exports, see [Backup and Export](/documentation/framework/services/database/backup-and-export).

### Creating the Database

Migrations create the target database or schema if it does not exist. Use `--no-create-db` to skip this step:

```bash
php windwalker mig:go --no-create-db
```

::: tip
Use `--no-create-db` when the database user has no permission to create databases, and the database is provisioned by another tool.
:::

To run against another connection, pass `--connection` with a connection name from your database config:

```bash
php windwalker mig:go --connection=analytics
```

### Migration SQL Log

Use `--log` to save every executed query to a file. Without a value, the file is written to `@temp/db/last-migration-logs.sql`. Pass a path to choose another location:

```bash
php windwalker mig:go --log
php windwalker mig:go --log=./logs/migrate.sql
```

The log lists each query. Failed migrations are written as `-- ERROR:` lines. The file is overwritten on every run.

::: tip
Read the SQL log before you run a migration on a production database. It shows the exact `ALTER` statements that will run.
:::

### Ignoring Errors

By default, a failed migration stops the run and rethrows the exception. Use `--ignore-errors` (or `-e`) to continue with the next migration. Each ignored failure is printed as `[IGNORED]`:

```bash
php windwalker mig:go -e
```

::: warning
Ignoring errors can leave the schema half-migrated and the log table out of sync with the real schema. Use this option only for development.
:::

## Checking Migration Status

Use `mig:status` to list every migration with its state (`up` or `down`), version, and name:

```bash
php windwalker mig:status
```

Filter the output with the `current` or `last` argument. Add `-N` (or `--show-name`) to print names instead of versions:

```bash
php windwalker mig:status current
php windwalker mig:status last -N
```

## Rolling Back and Resetting

Use `mig:back` to roll back the latest migration. Pass a step count to roll back more than one:

```bash
# Roll back the last migration
php windwalker mig:back

# Roll back the last three migrations
php windwalker mig:back 3
```

Use `reset` to roll back every migration and then migrate to the latest version:

```bash
php windwalker reset
```

::: warning
`reset` drops the tables created by your migrations and deletes their data. It asks for confirmation unless you pass `-f`. Never run it against a production database.
:::

## Seeding With Migrations

Use `-s` or `--seed` with `mig:go` or `reset` to run seeders after the migrations finish:

```bash
# Use the default seeder file in @seeders/
php windwalker mig:go -s

# Use a custom seeder file or folder
php windwalker mig:go -s=./resources/seeders/demo.php
```

The default seeder is `main.seeder.php` or `main.php` in the `@seeders/` folder. For writing seeders, see [Seeders](/documentation/framework/services/database/seeders).

## Squashing Migrations

Use `mig:squash` to generate migration files from the current database schema. This is useful when you have many small migrations and want a clean starting point:

```bash
# Group tables by the first part of their name (default)
php windwalker mig:squash

# Write everything to a single file
php windwalker mig:squash --one

# Skip the backup
php windwalker mig:squash --no-backup
```

Use `--no-group` to turn off the grouping by table name prefix.

## Related Topics

- [Getting Started](/documentation/framework/services/database/getting-started)
- [Entities](/documentation/framework/services/database/entities)
- [Tables](/documentation/components/database/tables)
- [Seeders](/documentation/framework/services/database/seeders)
- [Backup and Export](/documentation/framework/services/database/backup-and-export)
- [Connection Pool](/documentation/framework/services/database/connection-pool)
