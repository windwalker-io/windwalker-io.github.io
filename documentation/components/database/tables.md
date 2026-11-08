---
layout: doc
title: Tables
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

## Databases and Schemas

Work at the database level through `getDatabase()` on the adapter, and at the
schema level through `getSchema()` on the adapter:

```php
$db->getDatabase('app_archive')->create(ifNotExists: true);

$tables = $db->getSchema()->getTables();
```

`listTables()` and `listDatabases()` on the adapter return plain names,
without loading table metadata.
