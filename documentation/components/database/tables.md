---
layout: doc
title: Tables
component: database
---

# Tables

Tables are created and changed through a `TableManager`. Instead of writing
`CREATE TABLE` by hand for each database, you describe the columns, indexes
and constraints with the `Schema` builder, and the platform converts that
description into the correct DDL. The same definition works on MySQL,
PostgreSQL, SQL Server, Oracle and SQLite.

## Setup

Get a table manager from the adapter. The name is not checked until you
call a method that needs the table:

```php
$table = $db->getTable('posts');

// Equivalent:
$table = $db->getTableManager('posts');
```

Pass a callback to `create()`. It receives a `Schema` object to describe
the table:

```php
use Windwalker\Database\Schema\Schema;

$db->getTable('posts')->create(
    static function (Schema $schema) {
        $schema->primary('id');
        $schema->varchar('title')->length(255);
    }
);
```

## Showcase

A complete table with a primary key, a default, a nullable column, an
index, a unique key and a check constraint:

```php
use Windwalker\Database\Schema\Schema;

$db->getTable('posts')->create(
    static function (Schema $schema) {
        $schema->primary('id');
        $schema->integer('author_id');
        $schema->varchar('title')->length(255);
        $schema->text('body')->nullable(true);
        $schema->integer('state')->defaultValue(0);
        $schema->decimal('score')->length('8,2');

        $schema->addIndex(['author_id'], 'idx_posts_author');
        $schema->addUniqueKey(['title', 'author_id'], 'uq_posts_title');
        $schema->addCheck('score >= 0', 'ck_posts_score');
    },
);
```

::: info
`create()` returns without changes when the table already exists. Use
`update()` or `sync()` to bring an existing table in line with a definition.
:::

## Column Types

Each method on `Schema` adds a column with the data type of the same name,
and returns a `Column` object for further settings. Common methods include
`integer()`, `varchar()`, `text()`, `decimal()` and `datetime()`. The
platform maps each name to its native type.

`primary()` creates an auto-increment integer primary key. Columns are not
nullable by default, except for `json()`, `datetime()` and `date()`, which
are nullable.

Column settings are chained on the returned object:

- `length()`: the size of a `varchar()` or the precision of a `decimal()`,
  such as `'8,2'`.
- `nullable(true)`: allows `NULL`.
- `defaultValue()`: the default value written into the DDL.
- `unsigned()`: marks an integer column as unsigned, where supported.
- `comment()`: a column comment, where supported.

```php
$schema->varchar('slug')
    ->length(120)
    ->comment('URL segment');
```

## Indexes and Constraints

Indexes and constraints are declared on the schema by the columns they
cover:

- `addIndex()`: a non-unique index.
- `addUniqueKey()`: a unique constraint.
- `addPrimaryKey()`: a primary key for a composite key. Single columns can
  use `primary()`.
- `addCheck()`: a check constraint, given as an SQL expression.

Pass a name as the last argument to keep names predictable. Without a
name, the package generates one from the table and columns.

```php
$schema->addIndex(['state', 'created'], 'idx_posts_state_created');
```

::: warning
A check expression is written into the DDL as-is. Never build it from user
input.
:::

::: info
SQLite supports check constraints only when the table is created. Adding a
check to an existing SQLite table raises a `LogicException`.
:::

## Generated Columns

A generated column is computed by the database from an expression on the
same row. Use `virtual()` for a column computed on read, and `stored()`
for a column computed on write and kept on disk:

```php
use Windwalker\Database\Schema\Schema;

$db->getTable('products')->create(
    static function (Schema $schema) {
        $schema->primary('id');
        $schema->integer('price');

        $schema->integer('price_with_tax')->virtual('price * 1.05');
        $schema->integer('double_price')->stored('price * 2');
    },
);
```

Pass a `raw()` value for an expression that should not be quoted. The
expression is written into the DDL as-is, so use trusted code only.

::: info
A generated column never gets a `DEFAULT` clause, even when you set a
default value.
:::

## Functional Indexes

A functional index covers an expression instead of a plain column. It is
useful for case-insensitive lookups. Wrap each expression with `raw()` and
pass a name:

```php
use function Windwalker\raw;

$schema->addFunctionalIndex(
    [raw('LOWER(email)')],
    'idx_users_email_lower',
);
```

Columns and expressions can be mixed in the same index. Plain strings are
treated as column names:

```php
$schema->addFunctionalIndex(
    ['country', raw('LOWER(email)')],
    'idx_users_country_email',
);
```

## Changing an Existing Table

Once a table exists, use the table manager to change it. Each method
issues the matching `ALTER` statement for the platform:

```php
$table = $db->getTable('posts');

$table->addColumn('subtitle', 'varchar', true, '');
$table->renameColumn('body', 'content');
$table->dropColumn('legacy_flag');
$table->addIndex(['subtitle'], 'idx_posts_subtitle');
$table->dropIndex('idx_posts_subtitle');
```

Other useful methods are:

- `hasColumn()`, `getColumns()`, `getColumn()`: inspect the columns.
- `hasIndex()`, `getIndexes()`: inspect the indexes.
- `rename()`: rename the table.
- `exists()`: check whether the table is present.
- `update()`: apply a `Schema` definition to an existing table. See
  [Schema Diff](/documentation/components/database/schema-diff) for a
  safer approach.

::: warning
`drop()` deletes the table and all of its data, and `truncate()` deletes
every row. Neither asks for confirmation. Run them only on tables that you
can recreate.
:::

::: info
SQLite cannot modify columns or add constraints to an existing table in
every case. Check the result on SQLite before you rely on an alteration.
:::

## Databases and Schemas

Work at the database level through `getDatabase()`, and at the schema
level through `getSchema()`:

```php
$db->getDatabase('app_archive')->create(ifNotExists: true);

$tables = $db->getSchema()->getTables();
```

`listTables()` and `listDatabases()` on the adapter return plain names,
without loading table metadata.
