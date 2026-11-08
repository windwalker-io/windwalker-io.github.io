---
layout: doc
title: Databases and Schemas
component: database
---

# Databases and Schemas

A database server holds several databases, and each database holds one or
more schemas, which hold the tables. `DatabaseManager` creates, checks and
drops whole databases. `SchemaManager` lists and inspects the tables of a
schema without working on one table at a time. Both are available from the
adapter, so the code does not need a table manager to use them.

## Setup

`getDatabase()` returns a `DatabaseManager` for a database name. `getSchema()`
returns a `SchemaManager` for the schema that holds the tables:

```php
$archive = $db->getDatabase('app_archive');

$schema = $db->getSchema();
```

A table manager also exposes both managers through `getDatabase()` and
`getSchema()`, which return the managers for its own database and schema.

## Showcase

A deploy step that prepares an archive database, then checks the tables that
already exist in the main schema:

```php
$archive = $db->getDatabase('app_archive');

$archive->create(ifNotExists: true);

$schema = $db->getSchema();

if (!$schema->hasTable('posts')) {
    // The table has not been created yet.
}

$tables = $schema->getTables();
```

## Managing Databases

`DatabaseManager::create()` creates the database. Pass `true` as
`ifNotExists` to skip the call when the database is already present.
`exists()` reports whether it is present, and `drop()` removes it:

```php
$archive = $db->getDatabase('app_archive');

$archive->create(ifNotExists: true);

if ($archive->exists()) {
    // The database is present.
}

$archive->drop(ifExists: true);
```

::: warning
Dropping the database that the adapter is connected to first closes the
connection, and clears the database name from the driver options. Run further
queries on a new adapter for another database.
:::

::: info
`DatabaseManager::exists()` checks the names returned by `listDatabases()`.
On SQLite that list holds attached files, so the name must match the path
that SQLite reports. See [SQLite](#sqlite) below.
:::

## Inspecting Schemas

`SchemaManager` answers questions about the tables in a schema. `exists()`
checks the schema itself, and `hasTable()` checks one table by name:

```php
$schema = $db->getSchema();

$schema->exists();

$schema->hasTable('posts');
```

`getTables()` and `getViews()` return the table information keyed by name.
Pass `true` as the first argument of `getTables()` to include views:

```php
$tables = $schema->getTables();

$tablesAndViews = $schema->getTables(true);

$views = $schema->getViews();
```

`getTableDetail()` describes one table. Check `hasTable()` before you call
it:

```php
if ($schema->hasTable('posts')) {
    $detail = $schema->getTableDetail('posts');
}
```

## Listing Names

The adapter also lists objects directly. `listDatabases()`, `listSchemas()`
and `listTables()` return the names of each object type. `listTables()`
returns table information keyed by name, the same as `getTables()`:

```php
$databases = $db->listDatabases();

$schemas = $db->listSchemas();

$tables = $db->listTables();
```

## Platform Differences

The word "database" means different things on each platform. The same
manager methods work everywhere, but what `create()` and `drop()` do to the
server differs. `getCurrentDatabase()` on the platform returns the database
that the connection is using.

### MySQL and MariaDB

A database and a schema are the same object. `listSchemas()` and
`listDatabases()` return the same names, without the system schemas such as
`information_schema`.

`create()` uses the `charset` and `collation` options, with `utf8mb4` and
`utf8mb4_unicode_ci` as defaults:

```php
$db->getDatabase('app_archive')->create(
    options: [
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
    ],
);
```

### PostgreSQL

A database contains schemas, and `public` is the default schema. The
database list does not include templates. `create()` accepts the
`lc_collate`, `lc_type` and `tablespace` options:

```php
$db->getDatabase('app_archive')->create(
    options: [
        'lc_collate' => 'C',
        'lc_type' => 'C',
    ],
);
```

::: info
PostgreSQL does not allow dropping the database that the connection is
using. Connect to another database first, such as `postgres`, and drop the
target from there.
:::

### SQL Server

A database contains schemas, and `dbo` is the default schema. `drop()` puts
the database into single-user mode and rolls back immediately, which ends the
other sessions and their open transactions:

```php
$db->getDatabase('app_archive')->drop(ifExists: true);
```

::: warning
Dropping a SQL Server database disconnects every other session that uses it,
and rolls back their uncommitted work. Confirm that no other process uses the
database before you drop it.
:::

### Oracle

A database is a user. `create()` runs `CREATE USER` with unlimited quota on
the `USERS` tablespace, and `drop()` runs `DROP USER ... CASCADE`, which
removes every object that the user owns. Schemas and databases share the same
name, and `listDatabases()` returns names in lowercase.

Pass the `password` option when you create the user. Without it, the user
name is used as the password:

```php
$db->getDatabase('app_archive')->create(
    options: [
        'password' => $archivePassword,
    ],
);
```

::: warning
Without the `password` option, the account gets its own name as its
password. Always pass a strong password, and read it from the environment.
:::

::: warning
Dropping an Oracle "database" deletes the user and all of its tables and
data. Only call `drop()` on accounts that are meant to be removed.
:::

### SQLite

SQLite has no server-side database. `create()` attaches a database file to
the connection with `ATTACH DATABASE`. The name is the file name without its
extension, and queries use that name:

```php
$path = realpath('/var/data/archive.sqlite');

$db->getDatabase($path)->create(ifNotExists: true);

$db->execute('SELECT * FROM archive.posts');
```

`drop()` runs `DETACH DATABASE`, which disconnects the file and keeps it on
disk.

::: info
`exists()` compares the name with the path that SQLite reports. Pass the path
from `realpath()` so the check matches. A relative or symlinked path can make
`exists()` return `false` for a database that is attached.
:::

Use `listDatabases()` to see the attached files. The main database is listed
with an empty path.

## Related Pages

- [Tables](/documentation/components/database/tables): creating and changing
  a single table with a table manager.
- [Schema Diff](/documentation/components/database/schema-diff): comparing a
  definition with the real table.
