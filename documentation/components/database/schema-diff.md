---
layout: doc
title: Schema Diff
component: database
---

# Schema Diff

Keeping a database in step with the application is a recurring task. A
release may add a column, widen a `varchar`, or add an index, and the same
change must reach every environment without losing data. Schema diff lets
you describe the desired table once as a `Schema`, compare it with the
real table, and apply only the changes that are needed.

This is the building block for applications that sync their schema at
deploy time, or that generate migration files.

## Setup

The desired definition is a callback that fills a `Schema`. Use the same
callback for every environment:

```php
use Windwalker\Database\Schema\Schema;

$define = static function (Schema $schema) {
    $schema->primary('id');
    $schema->varchar('title')->length(255)->defaultValue('');
    $schema->varchar('subtitle')->defaultValue('');
    $schema->addIndex(['title']);
};

$table = $db->getTable('articles');
```

## Showcase

A typical deploy step previews the changes, logs them, and then applies
them:

```php
$diff = $table->diff($define);

if ($diff->isEmpty()) {
    return;
}

$table->sync($define);
```

`diff()` only compares. `sync()` compares and applies the differences in
one call, and returns the applied `TableDiff`.

## Reading a Diff

A `TableDiff` lists the changes by kind. Each kind is a property keyed by
name:

- `addedColumns`: columns in the definition that the table does not have.
- `modifiedColumns`: columns whose type, length, default or nullability
  differ.
- `droppedColumns`: columns that are dropped by the definition.
- `addedIndexes`, `modifiedIndexes`, `droppedIndexes`: the same three kinds
  for indexes.
- `addedConstraints`, `modifiedConstraints`, `droppedConstraints`: the same
  three kinds for constraints.

`getColumnChanges()` returns the changed properties as `from` (current) and
`to` (desired) values:

```php
$diff = $table->diff($define);

$diff->getColumnChanges();
// ['title' => ['length' => ['from' => '100', 'to' => '255']]]
```

## Preview Without Changes

Use `syncSql()` to get the SQL that `sync()` would run. Nothing is executed:

```php
$sql = $table->syncSql($define);
```

`getDiffSql()` returns the same list from a `TableDiff` you already have.

To preview any DDL flow, including `sync()`, run it inside
`DatabaseAdapter::pretend()`. Write statements are recorded instead of
executed:

```php
$sql = $db->pretend(
    fn () => $table->sync($define),
);
```

::: info
In pretend mode, read statements still run so that introspection works. The
table itself is not changed. On SQLite, some steps depend on earlier steps
having run, so the recorded SQL is a best-effort preview.
:::

## Apply Separately

Use `applyDiff()` when you want to review a diff before applying it:

```php
$diff = $table->diff($define);

// Log, confirm, or inspect $diff here.

$table->applyDiff($diff);
```

## Dropping Missing Parts

By default, a diff keeps columns, indexes and constraints that exist in the
table but are not in the definition. This is the safe behavior for
applications that share a table with other code.

Pass `dropMissing: true` to remove them too:

```php
$table->sync($define, dropMissing: true);
```

::: warning
With `dropMissing` enabled, every column that is not declared in the
definition is dropped, together with its data. Review the diff with
`diff()` first.
:::

Dropping is explicit in the definition as well. Use `dropColumns()`,
`dropIndexes()` or `dropConstraints()` on the `Schema` to remove a named
part without enabling `dropMissing`.

## How Differences Are Found

Columns, indexes and constraints are matched by name. Primary keys are
matched by type, since their name is not fixed.

- Columns are normalized before comparison, so type aliases, lengths and
  default values match the platform's representation.
- Type aliases are equal, such as `numeric` and `decimal`, or `integer`
  and `int`.
- Integer display width is ignored, so `int(10)` and `int(11)` match.
- Numeric defaults compare by value, so `0.000000` matches `0`.
- An index or constraint is modified when its columns, uniqueness, or
  referenced table and columns differ. Applying a modification drops and
  re-creates the key.

::: info
Renames are not detected. A renamed column appears as one dropped column
and one added column, which would lose its data. Use
`TableManager::renameColumn()` for renames.
:::

::: warning
Check constraints are compared by name and type only, not by expression,
because databases rewrite expressions. To change an expression, drop the
constraint and add it again.
:::

## Platform Limits

`applyDiff()` uses the regular `TableManager` operations, so the limits of
each platform still apply. For example, SQLite cannot modify columns or add
constraints to an existing table in every case. A diff that works on MySQL
may need a different approach on SQLite.

## Related Pages

- [Tables](/documentation/components/database/tables): building the table
  definitions that a diff compares.
