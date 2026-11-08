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

`iterateBatched()` is the most common iterator. It runs the query once per
batch, and yields the rows one by one. The loop sees a single stream of rows:

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

The first argument is the batch size, an integer. Each batch is a new statement
with a `LIMIT` of that size, and an `OFFSET` that moves forward. The optional
second argument is the class to hydrate each row into. Without a class, each
row is a `Collection`.

The batches are stable only when the query has an `ORDER BY`. Without one,
rows can repeat or be skipped between batches.

Each batch costs more than the one before it, because the database still reads
the rows that the `OFFSET` skips. On a large table, the last batches are slow.
[CursorPaginate](/documentation/components/query/cursor-pagination) avoids this cost.
It is described on the Cursor Pagination page.

::: warning
The iterate methods require a Windwalker `DatabaseAdapter`, driver or `ORM`.
With a `Query` that uses PDO or another library, they throw a
`BadMethodCallException`. See [Without Windwalker Database](#without-windwalker-database).
:::

## Showcase

The next function exports every published post to a file. It reads the posts
in batches of 500, ordered by ID, and writes each row to a CSV handle:

```php
use Windwalker\Database\DatabaseAdapter;

function exportPosts(DatabaseAdapter $db, $handle): int
{
    $count = 0;

    $rows = $db->createQuery()
        ->select('id', 'title', 'created')
        ->from('posts')
        ->where('state', 1)
        ->order('id')
        ->iterateBatched(500);

    foreach ($rows as $row) {
        fputcsv($handle, [$row->id, $row->title, $row->created]);

        $count++;
    }

    return $count;
}
```

The `ORDER BY` keeps the batches in the same order, so each batch is a stable
slice of the result. The later batches still skip the rows before them, which
is the cost described above.

## Limits

When the query has a `LIMIT`, the iteration methods stop after that many rows.
The limit applies to the whole stream, not to each batch. An `OFFSET` is the
starting point of the first batch.

```php
$rows = $db->createQuery()
    ->select('id')
    ->from('posts')
    ->order('id')
    ->offset(100)
    ->limit(250)
    ->iterateBatched(100);
// Reads rows 101 to 350, in batches of 100.
```

The rows read by an iterator are not held by the builder. Batched methods keep
only the current batch in memory.

## Long and Short Connections

The iterate methods differ in how they use the database connection. The
connection limit is often the constraint that decides the choice, so compare
the connection type before the memory use.

- **Long connection:** one cursor stays open for the whole loop. The rows are
  streamed, so PHP holds only the current row. The connection is busy until
  the last row is read.
- **Short connections:** each batch is a separate statement. The connection is
  released before the rows of that batch are processed, so it is free between
  batches. PHP holds one batch at a time.

The methods that use a cursor per batch or per page are short in the sense that
the connection is returned between batches. The cursor stays open while its
own rows are read, so the connection is busy for longer than in the fully
short methods.

Long connection, for background data processing:

- `getIterator()` is the only method with one connection for the whole loop.
- It uses the least memory, because nothing is held in a batch.
- A long job holds the connection until it ends. Server timeouts, idle limits
  and a shared connection pool can end the job early.

Short connections, for environments with a limited connection count:

- `iterateBatched()`, `iterateChunks()` and `iterateBatchWhile()` release the
  connection before the rows are processed.
- They suit serverless functions, web requests and a small connection pool.
- Memory is one batch, so the batch size is the main setting.

Choose the method by the target environment:

| Environment | Recommended | Reason |
|-------------|-------------|--------|
| Background worker with one connection | `getIterator()` | One stream, and the lowest memory |
| Long export that should not hold one connection | `getPaginatedIterator()` | The connection returns after each page |
| Web request or serverless function | `iterateBatched()` or `iterateChunks()` | The connection is released after each batch |
| Serverless job that moves rows to another state | `iterateBatchWhile()` | Short connections, and the same loop as `iterateWhile()` |
| Background job that moves rows to another state | `iterateWhile()` | One cursor per batch, with the loop from the first row |

## Iterator Methods

Six methods read a large result. They differ in how many statements they run,
how many rows they hold in PHP, and which connection type they use. The table
compares them, and each method has its own section below.

| Method | Statements | Rows in PHP | Connection type | Paging | Typical use |
|--------|------------|-------------|-----------------|--------|-------------|
| [`getIterator()`](#get-iterator) | One | Read as the loop goes | Long: one cursor for the whole loop | None | One pass over a result, in a worker |
| [`getIterator(paginate:)`](#get-paginated-iterator) | One per page | One page, read by a cursor | Short per page: a cursor open while the page is read | `OFFSET` | Long export where one open cursor is risky |
| [`getPaginatedIterator()`](#get-paginated-iterator) | One per page | One page, read by a cursor | Short per page: a cursor open while the page is read | `OFFSET` | The same, with the page size as an argument |
| [`iterateBatched()`](#iterate-batched) | One per batch | One batch, loaded in full | Short: released after each batch | `OFFSET` | Row by row, in web or serverless code |
| [`iterateChunks()`](#iterate-chunks) | One per batch | One batch, as a `Collection` | Short: released after each batch | `OFFSET` | Work on a group of rows at once |
| [`iterateWhile()`](#iterate-while) | One per batch | One batch, read by a cursor | Short per batch: a cursor open while the batch is read | None, always from the first row | Drain rows that the loop moves to another state |
| [`iterateBatchWhile()`](#iterate-batch-while) | One per batch | One batch, loaded in full | Short: released after each batch | None, always from the first row | The same as `iterateWhile()`, in short connections |

### getIterator() {#get-iterator}

**Connection: long.** One cursor stays open for the whole loop.

`getIterator()` runs the query once and returns a cursor over its result. The
rows are read while the loop runs, and the connection stays busy until the loop
ends. Use it for a single pass over a result, when the job runs alone:

```php
$rows = $db->createQuery()
    ->select('id', 'title')
    ->from('posts')
    ->where('state', 1)
    ->order('id')
    ->getIterator();

foreach ($rows as $row) {
    // Process one row at a time.
}
```

The first argument is the class to hydrate each row into. Without a class, each
row is a `Collection`.

::: info
Each open cursor holds a database connection. A long-running job on a worker
is a good fit. Many concurrent web requests that each open a cursor can exhaust
the connection limit, so use the batched methods in web requests.
:::

### getIterator(paginate:) and getPaginatedIterator() {#get-paginated-iterator}

**Connection: short per page.** A cursor is open while each page is read, and
it is released before the next page.

These two methods read a large result in pages. Each page is a new statement,
with its own `LIMIT` and `OFFSET` condition. The loop still sees one
stream of rows, and each page is read through `getIterator()`:

```php
$rows = $query->getIterator(null, [], 500);

$rows = $query->getPaginatedIterator(null, 500);
```

The `offset()` of the query is the starting point of the first page, and the
`limit()` applies to all pages together. A query with `offset(1)` and
`limit(3)`, read in pages of 2, yields rows 2, 3 and 4.

::: info
Pages use `OFFSET`, so later pages cost more. For a large table, a
[CursorPaginate](/documentation/components/query/cursor-pagination) avoids this.
Rows that are inserted or
deleted during the loop shift the later pages. Use a cursor, or a stable
`ORDER BY`, for a loop that runs for a long time.
:::

### iterateBatched() {#iterate-batched}

**Connection: short.** Each batch is loaded with `all()`, and the connection is
released before the rows are processed.

`iterateBatched()` runs the query once per batch. It loads each batch in full
with `all()`, and yields its rows one at a time. Between batches the connection
is released. The loop sees a single stream of rows:

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

The first argument is the batch size. The optional second argument is the
class to hydrate each row into.

::: info
The batch size is the amount of memory the loop holds at once. A batch of
10,000 rows of wide data can use much more memory than a batch of 100.
:::

The loop stops when a batch is empty or shorter than the batch size.

### iterateChunks() {#iterate-chunks}

**Connection: short.** Each batch is loaded with `all()`, and the connection is
released before the chunk is processed.

`iterateChunks()` also runs the query once per batch, but it yields each batch
as a whole `Collection`. The loop has two levels: the outer loop over the
batches, and the inner loop over the rows of each batch:

```php
foreach ($query->iterateChunks(500) as $chunk) {
    foreach ($chunk as $row) {
        // ...
    }
}
```

Use it when the work is done per group, such as one bulk request to an external
API for every 500 rows. The last chunk can be shorter than the batch size. An
empty result yields no chunk at all.

### iterateWhile() {#iterate-while}

**Connection: short per batch.** A cursor is open while each batch is read, and
it is released before the next batch.

`iterateWhile()` suits a job that moves rows from one state to another. Each
pass runs the same query from the first row, with no `OFFSET`. The loop stops
when a pass returns no rows. The method takes only a batch length, not a
cursor. Each batch is read through a cursor:

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
The rows must leave the selection as they are processed. If the loop does not
change the state of each row, the same rows are read again, and the loop never
ends. Update the row, or delete it, before the next batch is requested.
:::

### iterateBatchWhile() {#iterate-batch-while}

**Connection: short.** Each batch is loaded with `all()`, and the connection is
released before the rows are processed.

`iterateBatchWhile()` works like `iterateWhile()`. The difference is that each
batch is loaded in full with `all()`, and the connection is released before the
rows are yielded. Use it in web requests and serverless code, where a long
cursor is not allowed:

```php
$rows = $db->createQuery()
    ->select('id', 'state')
    ->from('jobs')
    ->where('state', 'pending')
    ->iterateBatchWhile(100);

foreach ($rows as $job) {
    $db->createQuery()
        ->update('jobs')
        ->set('state', 'running')
        ->where('id', $job->id)
        ->execute();
}
```

::: warning
The same rule applies as for `iterateWhile()`. The rows must leave the
selection as they are processed, or the loop never ends.
:::


## Cursor Pagination

Integer batches read every row before the `OFFSET`, so later batches cost more.
A cursor avoids this. Pass a `CursorPaginate` to the iterate methods in place of
the batch size: `iterateBatched()`, `iterateChunks()`, `getPaginatedIterator()`
and `getIterator(paginate:)`. `iterateWhile()` and `iterateBatchWhile()` take
only a batch length, because they do not page.

The cursor definitions, `withCursor()` for a single query, and the rules for
unique and matching sort orders are described on the
[Cursor Pagination](/documentation/components/query/cursor-pagination) page.
The cursor object holds no state of its own, so one definition can drive several
loops.

### Single Query with withCursor() {#with-cursor}

The single-query use of a cursor is described on the
[Cursor Pagination](/documentation/components/query/cursor-pagination#single-query-with-withcursor)
page.

## Without Windwalker Database

The iterate methods run through a `DatabaseAdapter`, a driver or an `ORM`.
They call `all()`, `getIterator()` and `prepareStatement()`, so they need that
connection. On a standalone query that uses PDO or another library, every
iterate method throws a `BadMethodCallException`.

::: warning
The iterate methods work only with a Windwalker `DatabaseAdapter`, driver or
`ORM`. A `Query` created with PDO or another library cannot use them, even when
the SQL is valid.
:::

The paging logic does not depend on the connection. A loop can be written by
hand with the cursor handler of a `CursorPaginate`, and `forPDO()` for the
statement:

```php
use Windwalker\Query\Query;

$cursor = Query::cursorPaginate(500, 'id');

$last = null;

while (true) {
    $query = clone $base;
    $query->limit($cursor->length);

    if ($last !== null) {
        $query = ($cursor->cursorHandler)($query, $last) ?? $query;
    }

    $bounded = null;
    $sql = $query->forPDO($bounded);

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bounded);

    $rows = $stmt->fetchAll(PDO::FETCH_OBJ);

    if ($rows === []) {
        break;
    }

    foreach ($rows as $row) {
        // Process one row at a time.
    }

    $last = end($rows);

    if (count($rows) < $cursor->length) {
        break;
    }
}
```

Two details matter in this loop:

- Set `$bounded = null` on every pass. `forPDO()` fills the array only when
  it is `null`, so a value kept from the previous pass leaves the new
  statement without its values.
- The cursor handler reads the last row by its column names. The test used
  `PDO::FETCH_OBJ`, so each row is an object.

For another library, call `render()` instead of `forPDO()`, and bind each
entry of `$bounded` by its `value`. See
[Rendering and Debugging](/documentation/components/query/rendering).

The connection between the pages is then under your control. The loop above
opens one statement per batch, and it closes the statement when the batch is
read.

The rows read by an iterator are not held by the builder. Batched methods keep
only the current batch in memory.

## Related Pages

- [Queries](/documentation/components/database/queries#iterating-large-results):
  the iterator methods of the adapter, with a short example.
- [Querying](/documentation/components/orm/querying#iterating-large-results):
  the same methods on ORM entity queries.
- [Cursor Pagination](/documentation/components/query/cursor-pagination): a
  keyset cursor for these iterators.
