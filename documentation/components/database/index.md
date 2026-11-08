---
layout: doc
title: Introduction
part: Components
chapter: Database
menu: components/database
component: database
---

# Introduction

Windwalker Database is a DBAL component. It wraps PDO, MySQLi, PostgreSQL,
SQL Server and SQLite drivers behind one API, and it hides most platform
differences from your code. Use it when you want direct control over SQL,
transactions and schema changes without an object mapper. It is also the
foundation of the ORM component.

The package is built from four parts:

- `DatabaseFactory` creates a `DatabaseAdapter` from a driver name and
  `DriverOptions`.
- `DatabaseAdapter` is the entry point. It exposes a `driver` for
  connections and statements, and a `platform` for SQL dialect, transactions
  and DDL.
- `WriterManager`, available as `$db->writer`, inserts, updates, upserts and
  deletes rows.
- `TableManager`, `SchemaManager` and `DatabaseManager` create, inspect and
  change tables and databases.

## Installation

```bash
composer require windwalker/database ^4.0
```

Windwalker Database 4.x requires PHP 8.4.6 or later.

## Use as Standalone Component

Create an adapter with `DatabaseFactory`. The driver name selects the
driver and the platform, for example `pdo_mysql` or `pdo_sqlite`:

```php
use Windwalker\Database\DatabaseFactory;
use Windwalker\Database\Driver\DriverOptions;

$db = new DatabaseFactory()->create(
    'pdo_mysql',
    new DriverOptions(
        host: 'localhost',
        dbname: 'app',
        user: 'root',
        password: 'secret',
        charset: 'utf8mb4',
    ),
);

$title = $db->prepare('SELECT title FROM posts WHERE id = ?')
    ->execute([1])
    ->result();
```

See [Connections](/documentation/components/database/connections)
for all driver names and options.

## Use in Windwalker

`DatabasePackage` binds `DatabaseAdapter` as a shared service. The adapter
is created from the `database` configuration, and each connection is
available through a tag named after the connection. Use the existing
container or application; do not create a new `Container`.

Inject the adapter as a constructor dependency:

```php
use Windwalker\Database\DatabaseAdapter;

class PostRepository
{
    public function __construct(
        protected DatabaseAdapter $db
    ) {
    }
}
```

Or retrieve it from the container or the application:

```php
use Windwalker\Database\DatabaseAdapter;

$db = $container->get(DatabaseAdapter::class);

$db = $container->get(DatabaseAdapter::class, tag: 'local');

$db = $app->retrieve(DatabaseAdapter::class);
```

The ORM is also available from the adapter as `$db->orm`.

### Configuration

The package ships `etc/database.config.php`. Override it in the host app by
placing a file with the same name in `etc/packages/`:

```php
// etc/packages/database.config.php

use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\Database\DatabasePackage;
use Windwalker\Database\Driver\DriverOptions;

return #[ConfigModule(
    name: 'database',
    enabled: true,
    priority: 100,
    belongsTo: DatabasePackage::class,
)]
static fn() => [
    'default' => 'local',

    'connections' => [
        'local' => [
            'driver' => env('DATABASE_DRIVER'),
            'options' => fn() => new DriverOptions(
                host: env('DATABASE_HOST') ?: 'localhost',
                dbname: env('DATABASE_NAME'),
                user: env('DATABASE_USER'),
                password: env('DATABASE_PASSWORD'),
                prefix: env('DATABASE_TABLE_PREFIX'),
            ),
        ],
    ],
];
```

Each entry under `connections` uses the same keys as the standalone
example. A `pool` key can be added for connection pooling in a Swoole
server. See [Connections](/documentation/components/database/connections).

## Core Concepts

Windwalker Database keeps SQL explicit. You write SQL strings or build
queries with the Query component, then run them through the adapter. The
adapter does not hide the table structure: writers and schema managers work
on plain table and column names.

Platform differences are handled by the platform object. Quoting, schema
introspection, DDL syntax and transaction commands change per database, but
the calling code stays the same.

## Topic Pages

- [Connections](/documentation/components/database/connections): driver
  names, options, read-only mode, reconnects and connection pools.
- [Queries](/documentation/components/database/queries): executing SQL,
  fetching results, hydration and transactions.
- [Writer](/documentation/components/database/writer): inserting, updating,
  upserting and deleting rows.
- [Tables](/documentation/components/database/tables): creating and changing
  tables with the `Schema` builder.
- [Schema Diff](/documentation/components/database/schema-diff): comparing a
  desired table definition with the database, and applying or previewing
  the changes.
- [Databases and Schemas](/documentation/components/database/databases-and-schemas):
  creating and dropping databases, and inspecting schemas.
- [Events](/documentation/components/database/events): query and hydration
  events.

## Related components

- [Query](/documentation/components/query/): the query builder used by
  `DatabaseAdapter::createQuery()`.
- [ORM](/documentation/components/orm/): entity mapping built on top of the
  adapter.
