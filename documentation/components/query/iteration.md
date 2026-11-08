---
layout: doc
title: Iteration
component: query
---

# Iteration

Some jobs read far more rows than fit in memory. An export, a data migration
or a batch recalculation should process the rows one by one, or in small
groups, without loading the whole result. The iteration methods on the
builder do this, and they split the work into several statements when that
is safer for the database.

## Basic Usage

`iterateBatched()` runs the query several times, one batch at a time, and
yields the rows one by one. The loop sees a single stream of rows:

```php
$rows = $db->createQuery()
    ->select('id', 'title')
    ->from('posts')
    ->where('state', 1)
    ->order('id')
    ->iterateBatched(500);

foreach ($rows as $row) {
    // Process one row at a time.
}
```

The first argument is the batch size, and the optional second argument is
the class to hydrate each row into. Without a class, each row is a
`Collection`.

## Showcase

The next function exports every published post to a file. It reads the posts
with cursor pagination, so each batch starts after the last ID read. The
output stays correct even when posts are added during the export:

```php
use Windwalker\Database\DatabaseAdapter;
use Windwalker\Query\Query;

function exportPosts(DatabaseAdapter $db, $handle): int
{
    $cursor = Query::cursorPaginate(500, 'id');

    $count = 0;

    $rows = $db->createQuery()
        ->select('id', 'title', 'created')
        ->from('posts')
        ->where('state', 1)
        ->iterateBatched($cursor);

    foreach ($rows as $row) {
        fputcsv($handle, [$row->id, $row->title, $row->created]);

        $count++;
    }

    return $count;
}
```

The cursor is defined once and reused. Each batch asks the database for the
rows after the last ID of the previous batch, so the database never scans
the rows already exported.

## Offset or Cursor

`iterateBatched()` and `getPaginatedIterator()` page with `OFFSET` when they
receive a plain number. Each later batch then skips over the rows already
read, which costs more as the export goes on. Pass a `CursorPaginate` to
page by key instead. A `CursorPaginate` takes the batch size and the cursor
columns:

```php
use Windwalker\Query\Query;

// Single column, ascending.
$cursor = Query::cursorPaginate(500, 'id');

// Several columns, each with its own direction.
$cursor = Query::cursorPaginate(
    500,
    ['created' => 'DESC', 'id' => 'DESC'],
);
```

Columns used by a cursor must make the order unique. Put the primary key
last in the list, so that rows with the same sort value keep a stable order.

::: warning
A cursor cannot follow a nullable column. A `NULL` value never matches the
comparison that the cursor uses, so rows with `NULL` in a cursor column are
skipped. Use cursor columns that are `NOT NULL`.
:::

The `cursorPaginate()` factory accepts a closure as well. It receives the
query and the last item, and it returns the query that continues the walk.
Use it when the sort order is more complex than a list of columns.

## Iterator Methods

The builder has several iteration methods. Each suits a different job:

- `getIterator()` returns a single cursor over the database connection. The
  rows are fetched while the loop runs. This keeps one connection open for
  the whole loop.
- `getIterator(paginate: 500)`, or `getPaginatedIterator()`, runs a new
  statement for each page, with its own `LIMIT` and `OFFSET` or cursor
  condition. Each page is read through `getIterator()`.
- `iterateBatched()` runs the query for each batch. It returns the rows one
  at a time.
- `iterateChunks()` runs the query for each batch, and yields each batch as
  a `Collection`. The loop has two levels: the outer loop over the batches,
  and the inner loop over the rows.
- `iterateWhile()` runs the same query again and again, always from the
  first row, until the query returns no rows.
- `iterateBatchWhile()` works like `iterateWhile()`, but it loads each batch
  in full before yielding its rows.

```php
foreach ($query->iterateChunks(500) as $chunk) {
    foreach ($chunk as $row) {
        // ...
    }
}
```

::: info
Use `getIterator()` for a long-running job that runs alone, such as an import
on a worker. Each open cursor holds a database connection, so many concurrent
requests that use `getIterator()` can exhaust the connection limit. Use the
batched methods in web requests.
:::

## Work Until Nothing Is Left

`iterateWhile()` suits a job that moves rows from one state to another. It
always reads from the beginning, so each row must leave the selection as it
is processed. Otherwise the loop never ends:

```php
$rows = $db->createQuery()
    ->select('id', 'state')
    ->from('jobs')
    ->where('state', 'pending')
    ->iterateWhile(100);

foreach ($rows as $job) {
    $db->createQuery()
        ->update('jobs')
        ->set('state', 'running')
        ->where('id', $job->id)
        ->execute();
}
```

::: warning
`iterateWhile()` and `iterateBatchWhile()` stop only when a query returns no
rows. If the loop does not change the state of each row, the same rows are
read again forever. Update the row, or delete it, before the next batch is
requested.
:::

## Limits

When the query has a `LIMIT`, the iteration methods stop after that many rows.
The limit applies to the whole stream, not to each batch. An `OFFSET` is the
starting point of the first batch.

```php
$rows = $db->createQuery()
    ->select('id')
    ->from('posts')
    ->offset(100)
    ->limit(250)
    ->iterateBatched(100);
// Reads rows 101 to 350, in batches of 100.
```

The rows read by an iterator are not held by the builder. Batched methods keep
only the current batch in memory.
