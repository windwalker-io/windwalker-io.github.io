---
layout: doc
title: Upsert
description: Insert a row or update the existing one when a unique key matches, in a single statement, for counters, caches and latest-value records.
component: query
---

# Upsert

An upsert inserts a row, or updates the existing row when a unique key
already exists, in a single statement. Typical uses are cache tables,
counters and "save the latest value" records. For why this avoids the race of
a separate read and write, see the
[ORM Upsert](/documentation/components/orm/persisting#upsert) section.

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
present in the row. SQL Server and Oracle check this and throw an
`InvalidArgumentException`. MySQL, PostgreSQL, and SQLite do not check it.

Each call to `upsert()` resets the keys, the update columns, and the
`returning()` ID that were set on the builder before.

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
  or UNIQUE index. If no index matches the row, the statement is a plain
  insert.
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

A `Closure` receives a new sub-query, which renders as a `(SELECT ...)`
expression. Build the sub-query inside the closure:

```php
use Windwalker\Query\Query;

$query->upsert('users')
    ->set(['id' => 1, 'post_count' => 0])
    ->onConflict('id')
    ->onConflictUpdateValues(
        'post_count',
        static function (Query $sub): void {
            $sub->select(raw('COUNT(*)'))
                ->from('posts')
                ->where('state', 1);
        },
    );
```

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

// MySQL: the ID is reported by lastInsertId()
$id = $statement->lastInsertId();

// PostgreSQL, SQLite, SQL Server: the ID is the first cell of the result
$id = $statement->result();
```

The way the ID is read depends on the dialect. MySQL reports it through
`lastInsertId()`. PostgreSQL and SQLite return it in a result set, and
SQL Server adds an `OUTPUT` clause. Oracle cannot return the ID from a
`MERGE`, so `returning()` has no effect there. Read the row again by its
conflict keys on Oracle.

## Dialects

Each grammar renders the upsert in its own syntax. The statement below
inserts a row, and it updates the title when `slug` already exists:

```php
$db->createQuery()
    ->upsert('articles')
    ->set(['slug' => 'hello', 'title' => 'Hello'])
    ->onConflict('slug')
    ->onConflictUpdateColumns('title')
    ->returning('id')
    ->execute();
```

The rendered SQL is shown below. Placeholders are shortened to `:p1`, and
the lines are wrapped.

MySQL:

```sql
INSERT INTO `articles` (`slug`,`title`) VALUES (:p1,:p2)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`),
  `id` = LAST_INSERT_ID(`id`)
```

PostgreSQL:

```sql
INSERT INTO "articles" ("slug","title") VALUES (:p1,:p2)
ON CONFLICT ("slug") DO UPDATE SET "title" = EXCLUDED."title"
RETURNING "id"
```

SQLite:

```sql
INSERT INTO `articles` (`slug`,`title`) VALUES (:p1,:p2)
ON CONFLICT (`slug`) DO UPDATE SET `title` = excluded.`title`
RETURNING `id`
```

SQL Server:

```sql
MERGE INTO [articles] WITH (HOLDLOCK)
USING (SELECT 1 AS dummy) AS src ON ([slug] = :p1)
WHEN NOT MATCHED THEN INSERT ([slug],[title]) VALUES (:p2,:p3)
WHEN MATCHED THEN UPDATE SET [title] = :p4
OUTPUT INSERTED.[id];
```

Oracle:

```sql
MERGE INTO "ARTICLES" USING DUAL ON ("SLUG" = :p1)
WHEN NOT MATCHED THEN INSERT ("SLUG","TITLE") VALUES (:p2,:p3)
WHEN MATCHED THEN UPDATE SET "TITLE" = :p4
```

The differences that matter in practice:

- **SQL Server** renders a `MERGE` with `WITH (HOLDLOCK)`, which the grammar
  adds to avoid race conditions between concurrent upserts. `MERGE` requires
  SQL Server 2008 or later. With `incrementField: true`, the statement is
  wrapped in `SET IDENTITY_INSERT ... ON` and `OFF`.
- **Oracle** renders a `MERGE ... USING DUAL`. It never updates the conflict
  keys, so a key given to `onConflictUpdateColumns()` or
  `onConflictUpdateValues()` is left out of the `SET` clause. If no column
  is left to update, the statement has no `WHEN MATCHED` branch, and an
  existing row is not changed.
- **SQL Server** and **Oracle** bind a value again in each place where it is
  used. The `ON` clause, the insert values, and the update value can each get
  their own placeholder. This avoids repeating a named placeholder, which some
  drivers do not accept.

A grammar without upsert support, such as the generic `BaseGrammar`, throws
a `BadMethodCallException`. Only one row can be upserted, and an upsert
cannot take its data from a select (`INSERT ... SELECT`).

## Portable Usage

The dialects match a row in different ways. Use this checklist when the same
code must work on every platform:

1. Make the conflict keys a PRIMARY KEY or a UNIQUE index that has exactly
   those columns.
2. Pass exactly those columns to `onConflict()`, or to `$condFields` in the
   ORM. Do not rely on other unique indexes to trigger the update.
3. Always put the keys in the data. SQL Server and Oracle throw an exception
   without them. MySQL, PostgreSQL, and SQLite do not check it.
4. For an auto-increment ID, either leave the ID out and use a unique business
   key as the conflict key, or use the ID as a key only when it has a value.
5. Pass the update columns explicitly instead of relying on the default, and
   leave the keys out of them.
6. Do not rely on `returning()` alone to read the ID. Oracle ignores it.
   Use the ID returned by `WriterManager::upsert()` or by the ORM, which
   resolve it on each platform.

`WriterManager::upsert()` returns the input data with the ID set. It does not
read the row again, so a value changed by the update (an expression, a column
left out of the update, or a database default) is not reflected. Query the row
again when you need the stored values:

```php
// articles has UNIQUE (slug)
$row = $db->getWriter()->upsert(
    'articles',
    ['slug' => 'hello', 'title' => 'Hello', 'hits' => 0],
    'slug',
    ['title', 'hits' => raw('hits + 1')],
    ['returningIdField' => 'id'],
);

$id = $row['id'];
```

For the ORM, the same rules apply to the conflict keys and update columns:

```php
$orm->upsert(Article::class, $article, ['slug'], ['title']);
```

## WriterManager and ORM

The database writer offers the same operation for one array row, and it also
resolves the ID on every platform. Its behavior is described on the
[Writer](/documentation/components/database/writer#upsert) page of the
database package. Use the builder when the statement needs custom update
expressions, and the writer for a plain row. For entity records, see
[Upsert](/documentation/components/orm/persisting#upsert) in the ORM.
