---
layout: doc
title: Writer
component: database
---

# Writer

Writing rows by hand means building an `INSERT` or `UPDATE` statement,
quoting each column, and remembering the generated ID. `WriterManager`
does this work from plain arrays or objects. It is available as
`$db->writer`, and it uses the same connection and platform as the adapter.

## Setup

`$db->writer` is ready to use. Inject the adapter, or call the writer on
the adapter that you already have:

```php
$writer = $db->writer;
```

Each method takes a table name and a row. The row is an associative array
or an object whose public properties match the column names.

## Showcase

A small write cycle for a `posts` table, with an auto-increment `id`:

```php
$post = [
    'title' => 'Hello',
    'author_id' => 3,
    'state' => 1,
];

// Insert and read back the generated ID.
$post = $db->writer->insertOne('posts', $post, 'id');
$postId = $post['id'];

// Update the row by its key.
$db->writer->updateOne(
    'posts',
    ['id' => $postId, 'title' => 'Hello, world'],
    'id',
);

// Update rows that match conditions.
$db->writer->updateWhere(
    'posts',
    ['state' => 0],
    ['author_id' => 3],
);

// Delete rows that match conditions.
$db->writer->delete('posts', ['id' => $postId]);
```

`insertOne()` receives the key name as its third argument. When the key is
given, the generated value is written back to the returned array, or to the
object if you pass an object.

## Insert, Update and Save

The writer has three single-row operations:

- `insertOne()`: inserts a row. Pass the key name to read back the ID.
- `updateOne()`: updates the row identified by the key column or columns.
- `saveOne()`: inserts the row when the key is empty, and updates it
  otherwise.

```php
$user = (object) [
    'id' => null,
    'email' => 'alice@example.com',
    'name' => 'Alice',
];

// Inserted, because id is empty.
$user = $db->writer->saveOne('users', $user, 'id');

// Updated, because id now has a value.
$user->name = 'Alice Smith';
$db->writer->saveOne('users', $user, 'id');
```

::: info
Values that are `null` are written as `NULL` by `updateOne()`. Pass
`updateNulls: false` in the options to skip them.
:::

## Filtering Unknown Fields

By default, every key of the row becomes a column. Pass `filterFields: true`
to drop keys that are not columns of the table. This is useful when the
row comes from a request payload:

```php
$db->writer->insertOne(
    'posts',
    $payload,
    'id',
    ['filterFields' => true],
);
```

::: warning
Column names come from the caller. Validate and whitelist input before you
pass it to the writer, even when `filterFields` is enabled.
:::

## Upsert

`upsert()` inserts a row, or updates the existing row when a conflict
occurs. A conflict means a unique key or primary key already holds the same
value. The method sends one statement that the database resolves against
its unique index, which is the safe way to write counters, caches and
"create or update" records under concurrency.

### Why It Matters for Concurrency

The common alternative is a check-then-write sequence: `SELECT` the row,
then `INSERT` it if missing, otherwise `UPDATE` it. Two requests can both
see no row and both insert, which causes a duplicate-key error, or both
read the same counter value and lose an increment. `upsert()` removes the
gap between the check and the write, because the database decides between
insert and update in a single statement.

::: tip
Use `upsert()` for "insert or update" logic in web requests and workers.
Avoid running the check and the write as separate statements.
:::

Deadlocks are reduced, not eliminated. A single upsert takes fewer locks
than a separate check and write, which is a frequent source of deadlocks.
Two transactions that upsert the same keys in different orders can still
deadlock, so see [Deadlocks](#deadlocks) below.

### Minimal Setup

The conflict columns must be covered by a unique index or the primary key.
Without one, no conflict is detected and every call inserts a new row:

```php
use Windwalker\Database\Schema\Schema;

$db->getTable('page_views')->create(
    static function (Schema $schema) {
        $schema->primary('id');
        $schema->varchar('page')->length(255);
        $schema->integer('views')->defaultValue(0);

        $schema->addUniqueKey(['page'], 'uq_page_views_page');
    },
);
```

### Showcase

A page counter that inserts the first view, then increments on every
later view:

```php
use function Windwalker\raw;

$row = $db->writer->upsert(
    table: 'page_views',
    fata: ['page' => '/home', 'views' => 1],
    keys: 'page',
    updateFields: ['views' => raw('page_views.views + 1')],
    options: ['returningIdField' => 'id'],
);

$id = $row['id'];
```

The data row is inserted with `views = 1`. When `/home` already exists, the
update expression runs instead, and the existing row becomes one higher.

### Parameters

`upsert()` takes five arguments. Each one changes what the statement does:

- `$table`: the table name.
- `$data`: the row, as an array or object. Values are bound as parameters.
- `$keys`: the conflict columns. Those columns are the conflict target on
  PostgreSQL, SQLite, SQL Server and Oracle. MySQL does not use them, as
  described below.
- `$updateFields`: the columns to update on conflict. See the list below.
- `$options`: `updateNulls` and `returningIdField`, described in their own
  sections.

The `$updateFields` argument accepts four forms:

- `null`: every non-key column is updated with the inserted value.
- A list of column names, such as `['views']`: each column is updated with
  the value from the inserted row.
- A map of column to value, such as `['views' => raw('views + 1')]`:
  each column is set to the given value. A plain value is bound as a
  parameter. Use `raw()` for an expression that refers to the existing row.
- A closure that receives `(array $data, array $keys)` and returns one of
  the three forms above. Use it when the update depends on the row:

```php
$db->writer->upsert(
    table: 'page_views',
    fata: ['page' => '/about', 'views' => 1],
    keys: 'page',
    updateFields: static fn (array $data, array $keys) => [
        'views' => raw('page_views.views + 1'),
    ],
);
```

An empty array means "update nothing". The writer then re-assigns the key
columns, so the statement stays valid and the ID can still be returned.

### The updateNulls Option

With `updateNulls` set to `false`, `null` values are removed from the data
before the statement is built. A `NULL` is then neither inserted nor
updated. The column takes its default on insert and keeps its current value
on update:

```php
$db->writer->upsert(
    table: 'profiles',
    fata: ['user_id' => 7, 'bio' => null, 'avatar' => null],
    keys: 'user_id',
    updateFields: null,
    options: ['updateNulls' => false],
);
```

::: info
The default is `true`. Null values are then written, so an existing value
is overwritten with `NULL`.
:::

### Platform Differences

The statement is generated for each platform, and one parameter behaves
differently on MySQL:

- MySQL ignores `$keys`. `INSERT ... ON DUPLICATE KEY UPDATE` triggers on a
  conflict with any unique index or the primary key. Check that the table
  has no other unique index that could cause an unwanted update.
- SQL Server requires version 2008 (10) or later. The writer throws an
  exception on older versions.
- Oracle uses `MERGE`, which has no `RETURNING` clause. See the next
  section for how the ID is read.

::: warning
On MySQL, the `$keys` argument has no effect on which row is updated. A
conflict on any unique index updates the existing row, which can be a
different row than the one you expected.
:::

### Returning the ID

Set `returningIdField` to the name of the column that holds the row ID,
usually an auto-increment column. The writer then returns the data with that
field filled in, whether the row was inserted or updated:

```php
$row = $db->writer->upsert(
    table: 'page_views',
    fata: ['page' => '/home', 'views' => 1],
    keys: 'page',
    updateFields: null,
    options: ['returningIdField' => 'id'],
);

$row['id']; // ID of the inserted or the updated row
```

Each platform reads the ID in its own way:

- PostgreSQL and SQLite: `RETURNING id` in the same statement.
- SQL Server: `OUTPUT INSERTED.id` in the same statement.
- MySQL: sets the ID with `LAST_INSERT_ID(id)` in the same statement, then
  reads it back. This works for updated rows too.
- Oracle: `MERGE` cannot return the ID, so the writer runs a separate
  `SELECT` by the key columns. This extra query is not part of the same
  atomic statement.

::: info
The returned value is the data you passed in, with the ID added. Columns
changed by an update expression are not reloaded, so the `views` value in
the example above stays at the number you passed. To read the stored row,
select it again:
:::

```php
$stored = $db->createQuery()
    ->select('*')
    ->from('page_views')
    ->where('id', $row['id'])
    ->get();

$stored->views; // the incremented count
```

### Deadlocks

Locks taken by an upsert follow the index order of the database. A common
deadlock happens when two transactions upsert overlapping keys in different
orders. To reduce the risk:

- Upsert rows in a consistent order, such as sorted by the key.
- Keep transactions short, so locks are held for less time.
- Retry the whole transaction when the database reports a deadlock.

## Bulk Operations

`insertMultiple()`, `updateMultiple()` and `saveMultiple()` take an
iterable of rows and run one statement per row. `insertBulk()` writes all
rows with a single multi-row `INSERT`:

```php
$db->writer->insertBulk(
    'tags',
    [
        ['name' => 'php'],
        ['name' => 'database'],
    ],
);
```

The writer builds one `INSERT` that lists every row in its `VALUES` clause.
For the example above, a MySQL database receives this statement:

```sql
INSERT INTO `tags` (`name`)
VALUES ('php'), ('database')
```

The columns are taken from the first row. Each following row must have the
same keys, in any order. A row with an extra key, or a missing key, raises an
`InvalidArgumentException`, so a mismatch is never written silently.

To choose the columns yourself, pass the `columns` option. Values are then
read by column name from each row, and keys that are not listed are ignored:

```php
$db->writer->insertBulk(
    'posts',
    [
        ['title' => 'Hello', 'state' => 1, 'note' => 'skip'],
        ['title' => 'World', 'state' => 0, 'note' => 'skip'],
    ],
    ['columns' => ['title', 'state']],
);
```

The statement then lists only `title` and `state`:

```sql
INSERT INTO `posts` (`title`, `state`)
VALUES ('Hello', 1), ('World', 0)
```

`insertBulk()` returns the statement, so `countAffected()` reports the number
of rows inserted. Use it instead of `insertMultiple()` when the row count is
large, because one statement is far faster than one per row.

::: tip
For large imports, wrap the bulk call in `DatabaseAdapter::transaction()`.
The whole import then commits or rolls back together.
:::

## Deleting and Conditions

`delete()` takes a table and an array of conditions. Each key-value pair
becomes an equality check joined by `AND`:

```php
$db->writer->delete('posts', ['state' => 0]);

// DANGER: deletes every row in the table.
$db->writer->delete('posts');
```

::: warning
An empty conditions array deletes every row in the table. Check that the
condition array is not empty before you call `delete()` with values that
come from user input.
:::

## Reading Write Results

The writer keeps the outcome of the most recent statement. Two helpers
read it:

- `countAffected()`: the number of rows changed by the last statement.
- `lastInsertId()`: the ID generated by the last insert.

```php
$db->writer->updateWhere('posts', ['state' => 1], ['state' => 0]);

$updated = $db->writer->countAffected(); // e.g. 2
```

```php
$db->writer->insertOne('posts', ['title' => 'Hello'], 'id');

$newId = $db->writer->lastInsertId(); // e.g. "42"
```

Because the values reflect the last statement only, read them right after
the write they describe:

```php
$db->writer->delete('posts', ['state' => 0]);
$removed = $db->writer->countAffected();
```

::: info
`insertMultiple()` runs one insert per row, so `countAffected()` describes
only the last row after the call returns. Use `insertBulk()` when you need
the count for the whole batch.
:::

::: info
On MySQL, `lastInsertId()` after a multi-row insert returns the first
generated ID of that statement, not the last. Read the IDs from your own
data when the order matters.
:::

`upsert()` with `returningIdField` returns the ID directly in the returned
row, so it does not need `lastInsertId()`. See
[Returning the ID](#returning-the-id).
