---
layout: doc
title: Tables
description: Create, change, inspect and drop tables with TableManager and the Schema builder, using one API across major database platforms.
component: database
---

# Tables

Tables are created and changed through a `TableManager`. Instead of writing
`CREATE TABLE` and `ALTER TABLE` by hand for each database, you describe the
columns, indexes and constraints with the `Schema` builder, and the platform
converts that description into the correct DDL. Inspection methods read the
current structure back from the database, so the same code can check,
change and drop tables on MySQL, PostgreSQL, SQL Server, Oracle and SQLite.

## Setup

Get a table manager from the adapter. The table is not checked until you
call a method that needs it:

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

        $schema->addIndex(['author_id']);
        $schema->addUniqueKey(['title', 'author_id']);
        $schema->addCheck('score >= 0');
    },
);
```

::: info
`create()` returns without changes when the table already exists. Use
`save()`, `update()` or `sync()` to bring an existing table in line with a
definition.
:::

## Creating and Saving Tables

`create()` makes a table from a definition. `save()` decides by itself: it
creates the table when it is missing, and updates it when it exists:

```php
$db->getTable('posts')->save(
    static function (Schema $schema) {
        $schema->primary('id');
        $schema->varchar('title')->length(255);
    },
);
```

Use `save()` for schema definitions that run on every deploy, because the
same call works on a new database and on an existing one. Its update path is
described in [Updating a Table with a Schema](#updating-a-table-with-a-schema).

::: tip
Reuse one definition callback for `save()`, `diff()` and `sync()`. Keeping
the definition in one place prevents the code and the database from
drifting apart.
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

## Indexes and Constraints in a Definition

Indexes and constraints are declared on the schema by the columns they
cover:

- `addIndex()`: a non-unique index.
- `addUniqueKey()`: a unique constraint.
- `addPrimaryKey()`: a primary key for a composite key. Single columns can
  use `primary()`.
- `addCheck()`: a check constraint, given as an SQL expression.

Names are generated when you omit them, so most definitions need only the
columns:

```php
$schema->addIndex(['state', 'created']);
```

The generated names follow a fixed pattern:

- Indexes and unique keys: `idx_{table}_{columns}`, such as
  `idx_posts_state_created`.
- Check constraints: `ck_{table}_{hash}`, where the hash comes from the
  expression.

Pass a name as the second argument when you need one, for example to keep a
name that other tools refer to. A name is required for functional indexes,
which are described below.

```php
$schema->addIndex(['state'], 'idx_posts_visible');
```

Generated names are predictable for indexes and unique keys, so you can drop
them later by the same pattern. See
[Adding and Dropping Indexes and Constraints](#adding-and-dropping-indexes-and-constraints).

::: warning
A check expression is written into the DDL as-is. Never build it from user
input.
:::

::: info
SQLite supports check constraints only when the table is created. Adding a
check to an existing SQLite table raises a `LogicException`.
:::

::: warning
MySQL before 8.0.16 and MariaDB before 10.2.1 accept a check constraint but
do not enforce it. Rows that break the rule are stored without an error.
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

`generated()` takes the expression and a flag. `virtual()` and `stored()`
call it with `false` and `true`:

```php
$schema->integer('double_price')->generated('price * 2', true);
```

The expression can also be a `raw()` value. The framework inserts it into
the DDL in the same way as a string.

::: warning
The expression is written into the DDL as-is. Never build it from user
input.
:::

To add a generated column to an existing table, pass a `Column` object to
`addColumn()`:

```php
use Windwalker\Database\Schema\Ddl\Column;

$table = $db->getTable('products');

$table->addColumn(
    new Column('price_with_tax', 'integer')
        ->virtual('price * 1.05'),
);
```

On MySQL, the expression and the stored flag are read back from an existing
column. `renameColumn()` therefore keeps the generated definition.

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

The framework wraps each expression in parentheses, which MySQL requires for
functional key parts. To add a functional index to an existing table, pass
an `Index` object to `addIndex()`, as shown in
[Adding and Dropping Indexes and Constraints](#adding-and-dropping-indexes-and-constraints).

## Platform Support

Generated columns and functional indexes depend on the platform:

| Platform   | Generated column                       | Functional index       |
|------------|----------------------------------------|------------------------|
| MySQL      | `VIRTUAL` and `STORED`                 | MySQL 8.0.13 and later |
| PostgreSQL | `STORED`; `VIRTUAL` needs version 18+  | Supported              |
| SQLite     | `VIRTUAL` and `STORED`                 | Supported              |
| SQL Server | Non-persisted and `PERSISTED`          | Not supported          |
| Oracle     | `VIRTUAL` only                         | Supported              |

Unsupported definitions raise a `LogicException` when the DDL is built. On
PostgreSQL before version 18, use `stored()` instead of `virtual()`:

```php
$schema->integer('price_with_tax')->virtual('price * 1.05');

// ERROR: LogicException: VIRTUAL generated columns require
//        PostgreSQL 18+, use STORED instead.
```

SQL Server does not support functional indexes. Create a computed column
and index it instead:

```php
$schema->addFunctionalIndex([raw('LOWER(email)')], 'idx_lower');

// ERROR: LogicException: SQL Server does not support functional
//        index, add a computed column and index it instead.
```

```php
$schema->varchar('email_lower')->stored('LOWER(email)');
$schema->addIndex('email_lower');
```

::: info
SQLite documents that `ADD COLUMN` cannot add a `STORED` column. Define it
in `create()` instead.
:::

::: warning
Oracle creates every generated column as `VIRTUAL`. `stored()` has no effect
on Oracle, so the value is computed on read.
:::

## Inspecting a Table

Inspection methods read the table from the database. The results are cached
for the lifetime of the manager, so they are cheap to call repeatedly.

- `exists()`: `true` when the table is present.
- `getDetail()`: the raw table information reported by the platform, as an
  array.
- `getColumnNames()`: the column names, in table order.
- `hasColumn()`: `true` when a column with that name exists.

```php
$table = $db->getTable('posts');

if ($table->exists() && $table->hasColumn('subtitle')) {
    // The table already has the column.
}

$names = $table->getColumnNames(); // ['id', 'title', 'state']
```

::: info
`exists()` also returns `true` for a view with the same name, because the
check includes views.
:::

### Columns

`getColumns()` returns every column keyed by its name. `getColumn()` returns
one column, or `null` when it does not exist:

```php
$column = $db->getTable('posts')->getColumn('title');

$column->getColumnName();      // 'title'
$column->getDataType();        // 'varchar'
$column->getCharacterMaximumLength(); // 255
$column->getIsNullable();      // false
$column->getColumnDefault();   // '' when the column has no default
```

Pass `syncKeys: true` to `getColumn()` or `getColumns()` to attach the
indexes and constraints that include the column. Use it when you need to know
which keys a column belongs to:

```php
$column = $table->getColumn('state', syncKeys: true);
```

### Indexes

`getIndexes()` returns the indexes keyed by name, `getIndex()` returns one,
and `hasIndex()` checks for one:

```php
$table = $db->getTable('posts');

if ($table->hasIndex('idx_posts_state')) {
    $index = $table->getIndex('idx_posts_state');

    $index->getColumnNames(); // ['state']
    $index->isUnique;         // false
}
```

::: warning
MariaDB and MySQL before 8.0.13 do not report the expression of a functional
index. The key part is listed as `(expression 1)`, so `sync()` sees a
different index and rebuilds it on every run. On MySQL 8.0.13 and later, the
reported text can differ in form from the text you wrote, and `sync()`
compares the two strings.
:::

### Constraints

`getConstraints()`, `getConstraint()` and `hasConstraint()` work the same
way for unique, primary, foreign key and check constraints:

```php
$constraint = $table->getConstraint('ck_posts_score');

if ($constraint?->isCheck()) {
    $constraint->checkClause; // the expression as the database stores it
}
```

::: info
SQLite does not report check constraints, so the lookup returns `null` there.
Expressions that the database does report may come back formatted
differently from what you wrote, for example with added parentheses.
:::

### Refreshing the Cache

The manager caches the column, index and constraint lists. If another
process changes the table, pass `true` as the first argument of the getter,
such as `getColumns(true)`, or call `reset()` to clear the cache for every
later call:

```php
$table->reset();

$table->hasColumn('subtitle'); // reads the table again
```

## Adding and Changing Columns

`addColumn()` adds a column. The arguments are the name, the data type, the
nullable flag, the default value, and the column options. The method does
nothing when the column already exists:

```php
$table = $db->getTable('posts');

$table->addColumn('subtitle', 'varchar', true, '');

// The options array sets the same properties as the Column methods.
$table->addColumn(
    'slug',
    'varchar',
    false,
    '',
    ['length' => 120],
);
```

`modifyColumn()` replaces the definition of an existing column. Pass the
same arguments as `addColumn()`:

```php
$table->modifyColumn(
    'subtitle',
    'varchar',
    false,
    '',
    ['length' => 200],
);
```

When you need only one change, read the column and modify it with
`modifyColumnCallback()`. The callback receives the current `Column` and the
table manager. Change the column in place, or return a new one:

```php
use Windwalker\Database\Schema\Ddl\Column;
use Windwalker\Database\Manager\TableManager;

$table->modifyColumnCallback(
    'title',
    static function (Column $column, TableManager $table) {
        $column->length(500);
    },
);
```

`renameColumn()` renames a column. Nothing happens when the source column
does not exist:

```php
$table->renameColumn('body', 'content');
```

`dropColumn()` removes one or more columns by name:

```php
$table->dropColumn('legacy_flag');

$table->dropColumn(['old_a', 'old_b']);
```

::: info
Before dropping a column, `dropColumn()` drops every constraint that
includes it, so a unique key on that column is removed too.
:::

::: warning
`dropColumn()` deletes the column data without asking for confirmation. Check
the column name before you call it, especially when the name comes from
configuration.
:::

::: info
SQLite cannot rename or modify a column in every case. Check the result on
SQLite before you rely on these changes.
:::

## Adding and Dropping Indexes and Constraints

`addIndex()` creates an index from a list of column names. The name is
generated, so the call needs only the columns:

```php
$table->addIndex(['subtitle']); // idx_posts_subtitle
```

For expressions, pass an `Index` object. The object needs a name, because an
expression has no column name to generate one from:

```php
use Windwalker\Database\Schema\Ddl\Index;

$table->addIndex(
    new Index('idx_users_email_lower')->expression('LOWER(email)'),
);
```

`dropIndex()` removes indexes by name. Generated index names are
predictable, so the same name works for dropping:

```php
$table->dropIndex('idx_posts_subtitle');

$table->dropIndex(['idx_posts_state', 'idx_posts_title']);
```

`addConstraint()` adds a constraint. The type defaults to
`Constraint::TYPE_UNIQUE`, and the name is generated from the table and the
columns:

```php
$table->addConstraint(['slug']); // ct_posts_slug
```

`addCheck()` adds a check constraint from an SQL expression. Its generated
name is a hash of the expression, so the name is not easy to predict:

```php
$table->addCheck('state IN (0, 1)');
```

Pass a name when you need to drop or replace the check later:

```php
$table->addCheck('state IN (0, 1)', 'ck_posts_state');

// The name exists, so this call changes nothing:
$table->addCheck('state IN (0, 1, 2)', 'ck_posts_state');
```

::: warning
`addCheck()` returns without changes when a constraint with the same name
already exists, even if its expression is different. The table keeps the old
rule. Drop the constraint first when the rule must change.
:::

`dropConstraint()` removes constraints by name:

```php
$table->dropConstraint('ct_posts_slug');
```

::: info
To drop a check constraint later, give it a name when you create it, as
described in [Indexes and Constraints in a Definition](#indexes-and-constraints-in-a-definition).
:::

::: info
SQLite cannot add constraints to an existing table in every case. Check the
result on SQLite before you rely on these operations.
:::

## Updating a Table with a Schema

`update()` applies a definition to a table that already exists. It works
through the columns, indexes and constraints in the definition:

- A column that exists is changed with `modifyColumn()`, so its type,
  length, default and nullability match the definition.
- A column that is missing is added with `addColumn()`.
- An index or constraint with the same name is dropped and added again.
- Columns, indexes and constraints are dropped only when the definition lists
  them with `dropColumns()`, `dropIndexes()` or `dropConstraints()`.

```php
use Windwalker\Database\Schema\Schema;

$table->update(
    static function (Schema $schema) {
        $schema->primary('id');
        $schema->varchar('title')->length(255);
        $schema->varchar('slug')->length(120);

        $schema->dropColumns('legacy_flag');
    },
);
```

::: warning
`update()` rewrites the definition of every existing column in the Schema.
A wrong type or length in the definition changes the stored column, and
existing data may be truncated or converted. Review the change with `diff()`
first, as described in [Schema Diff](/documentation/components/database/schema-diff).
:::

::: info
On SQLite, `update()` fails when a column that already exists must be
modified, because SQLite does not support modifying columns. It works when
the definition only adds new columns.
:::

To change a table and keep it in sync with the definition in one step, see
[Schema Diff](/documentation/components/database/schema-diff).

### Changing a Check Expression

`diff()` and `sync()` compare a check constraint by its name and type only.
They do not compare the expression, because the database rewrites it. Use
`update()` to change the expression. It drops and adds again every constraint
in the Schema that has the same name:

```php
$table->update(
    static function (Schema $schema) {
        $schema->addCheck('state IN (0, 1, 2)', 'ck_posts_state');
    },
);
```

Or drop the constraint and add it again:

```php
$table->dropConstraint('ck_posts_state');
$table->addCheck('state IN (0, 1, 2)', 'ck_posts_state');
```

::: warning
`sync()` reports no change when only the expression differs, so the table
keeps the old rule.
:::

::: info
On SQLite, a check cannot be changed in place, because checks cannot be added
to an existing table.
:::

## Building a Schema Manually

`createSchemaObject()` returns an empty `Schema` bound to the table. Use it
when the definition is built in several steps, for example in a loop:

```php
$schema = $table->createSchemaObject();

$schema->primary('id');

foreach (['title', 'subtitle'] as $name) {
    $schema->varchar($name)->length(255);
}

$table->save($schema);
```

## Renaming, Truncating and Dropping

`rename()` renames the table. By default it returns a manager for the new
name, so the code can keep using the result:

```php
$articles = $table->rename('articles');

$articles->getName(); // 'articles'
```

Pass `false` as the second argument to rename the current manager in place
instead.

`truncate()` removes every row and keeps the table structure. `drop()`
removes the table:

```php
$table->truncate();

$table->drop();
```

::: warning
`drop()` deletes the table and all of its data, and `truncate()` deletes
every row. Neither asks for confirmation. Run them only on tables that you
can recreate.
:::

## Schema and Database Access

A table manager knows its database and schema. Use these methods to move up
a level:

```php
$tables = $table->getSchema()->getTables();

$table->getDatabase()->exists();
```

`setName()` accepts a name with a schema prefix. The part before the dot
becomes the schema, and the rest becomes the table name:

```php
$table->setName('reporting.posts');
```

For managing databases and inspecting schemas, see
[Databases and Schemas](/documentation/components/database/databases-and-schemas).

To compare a table definition with the database before changing it, see
[Schema Diff](/documentation/components/database/schema-diff).
