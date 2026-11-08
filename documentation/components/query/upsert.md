---
layout: doc
title: Upsert
component: query
---

# Upsert

An upsert inserts a row, or updates the existing row when a unique key
already exists. It removes the read-then-write step from application code,
which is racy when two requests write the same key at once. Typical uses are
cache tables, counters and "save the latest value" records.

## Basic Usage

Call `upsert()` with the table name. Provide the row with `set()`, then
declare the unique key with `onConflict()`:

```php
$db->createQuery()
    ->upsert('cache_items')
    ->set([
        'key' => 'settings',
        'payload' => $payload,
    ])
    ->onConflict('key')
    ->execute();
```

`columns()` and `values()` can be used instead of `set()`, with the same
result:

```php
$db->createQuery()
    ->upsert('cache_items')
    ->columns('key', 'payload')
    ->values(['settings', $payload])
    ->onConflict('key')
    ->execute();
```

Only one row is upserted per statement. When `values()` receives more than
one row, only the first is used. Every key given to `onConflict()` must be
present in the row, or an `InvalidArgumentException` is thrown.

## Showcase

The next function counts how many times a page is viewed per day. The first
view of the day creates the counter row. Later views add one to the stored
count, in the same statement:

```php
use Windwalker\Database\DatabaseAdapter;
use function Windwalker\raw;

function countView(DatabaseAdapter $db, string $path): void
{
    $db->createQuery()
        ->upsert('page_views')
        ->set([
            'path' => $path,
            'day' => date('Y-m-d'),
            'views' => 1,
        ])
        ->onConflict('path', 'day')
        ->onConflictUpdateValues('views', raw('views + 1'))
        ->execute();
}
```

The table needs one unique index over `path` and `day`. The update reads the
stored count on the database side, so two requests that arrive together
both count.

## Conflict Keys

`onConflict()` names the columns that identify a row. It accepts column
names as arguments or as an array, and it can be called more than once. The
keys are added together without duplicates.

What the keys do depends on the dialect:

- **MySQL** ignores them. `ON DUPLICATE KEY UPDATE` fires for any PRIMARY
  or UNIQUE index.
- **PostgreSQL** and **SQLite** require the keys to match a unique index.
- **SQL Server** and **Oracle** use the keys as the `MERGE ... ON` condition,
  and they reject an upsert without keys.

::: warning
On MySQL, a conflict on another unique index updates that row instead, and
no error is raised. A table with several unique indexes can update the wrong
row. Keep one unique key that matches the keys in `onConflict()`, and check
the table definition before you rely on an upsert.
:::

## Updating Columns

By default, every inserted column except the conflict keys is updated. Two
methods change that choice:

- `onConflictUpdateColumns()` updates columns with the values that were
  inserted.
- `onConflictUpdateValues()` updates columns with custom values.

```php
use function Windwalker\raw;

$query->upsert('articles')
    ->set(['id' => 1, 'title' => 'Hello', 'hits' => 0])
    ->onConflict('id')
    ->onConflictUpdateColumns('title', 'state')
    ->onConflictUpdateValues('hits', raw('hits + 1'));
```

`onConflictUpdateValues()` also accepts a map of columns and values:

```php
$query->onConflictUpdateValues([
    'hits' => raw('hits + 1'),
    'state' => 1,
]);
```

Custom values follow the same rules as `set()`. A scalar is bound as a
parameter, and `raw()` is written as given.

::: info
If the row has no columns besides the keys, the keys themselves are updated.
This keeps the statement valid, and the update changes nothing.
:::

## Returning the ID

`returning()` names the ID column to read back after the upsert. The
`incrementField` argument has the same meaning as for `insert()`. It only
affects SQL Server, where the `MERGE` is wrapped in `IDENTITY_INSERT`:

```php
$statement = $db->createQuery()
    ->upsert('articles', incrementField: true)
    ->set(['slug' => 'hello', 'title' => 'Hello'])
    ->onConflict('slug')
    ->returning('id')
    ->execute();

$id = $statement->lastInsertId();
```

The way the ID is read depends on the dialect. MySQL reports it through
`lastInsertId()`, PostgreSQL and SQLite return it in a result set, and
SQL Server adds an `OUTPUT` clause. Oracle cannot return the ID from a
`MERGE`, so `returning()` has no effect there. Read the row again by its
conflict keys on Oracle.

## Dialects

Each grammar renders the upsert in its own syntax:

- MySQL: `INSERT ... ON DUPLICATE KEY UPDATE`
- PostgreSQL and SQLite: `INSERT ... ON CONFLICT (...) DO UPDATE`
- SQL Server and Oracle: `MERGE` statements

A grammar without upsert support, such as the generic `BaseGrammar`, throws
a `BadMethodCallException`. Only one row can be upserted, and an upsert
cannot take its data from a select (`INSERT ... SELECT`).

## Upsert Through the Writer

The database writer offers the same operation for one array row, and it also
resolves the ID on every platform. Its behavior is described on the
[Writer](/documentation/components/database/writer#upsert) page of the
database package. Use the builder when the statement needs custom update
expressions, and the writer for a plain row.
