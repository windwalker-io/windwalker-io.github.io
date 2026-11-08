---
layout: doc
title: Cursor Pagination
component: query
---

# Cursor Pagination

Offset paging reads and discards every row before the offset, so later pages
cost more than the first one. Cursor pagination, also called keyset
pagination, avoids this. It remembers the sort key of the last row that was
read, and asks the database for the rows after that key. Every page then costs
about the same, and rows inserted before the cursor do not shift the next page.

The cursor is used in two places:

- A single query, with [`withCursor()`](#single-query-with-withcursor), for an
  API that returns one page per request.
- An iterator, such as `iterateBatched()`, for a background job that reads
  all rows. See [Iteration](/documentation/components/query/iteration).

## Creating a Cursor

`Query::cursorPaginate()` creates a cursor definition. It takes the batch size
and the sort order:

```php
use Windwalker\Query\Query;

$paging = Query::cursorPaginate(20, 'id');
```

The definition holds only the batch size and the sort order. It does not hold
any state, so one definition can be used by many queries and loops.

## Showcase

The next function returns one page of published articles for an API. The
client sends back the last ID it has seen, and the function returns the next
20 rows:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;

function listArticles(DatabaseAdapter $db, ?int $lastId): Collection
{
    $base = $db->createQuery()
        ->select('*')
        ->from('articles')
        ->where('state', 1)
        ->order('id', 'DESC')
        ->limit(20);

    $query = $lastId === null
        ? $base
        : $base->withCursor('id', 'DESC', $lastId);

    return $query->all();
}
```

On the first request, `$lastId` is `null`, and the query returns the first 20
rows. On the next request, the cursor adds a condition on `id`:

```sql
SELECT * FROM `articles`
WHERE `state` = 1 AND `id` < 5
ORDER BY `id` DESC LIMIT 20
```

## Cursor Definitions

The second argument of `cursorPaginate()` takes one of three forms.

A string names one column, sorted ascending:

```php
$paging = Query::cursorPaginate(20, 'id');
```

An array maps columns to directions. The order of the keys is the sort
priority. A direction can be `'ASC'`, `'DESC'`, or a `SortDirection` case:

```php
use Windwalker\Query\Query;

$paging = Query::cursorPaginate(
    20,
    ['created' => 'DESC', 'id' => \SortDirection::Descending],
);
```

A plain list of columns, such as `['created', 'id']`, sorts ascending.

A closure builds the condition for the rows after the last item. It receives
the query and the last item, which is a `Collection` by default, and it returns
the query:

```php
use Windwalker\Query\Query;

$paging = Query::cursorPaginate(
    20,
    fn(Query $query, object $item) => $query
        ->where('id', '>', $item->id)
        ->order('id'),
);
```

Use the closure when the sort order is more complex than a list of columns.

## Single Query with withCursor()

`withCursor()` applies a cursor to one query. It takes the same forms as the
definition, and it accepts the last seen values in place of a definition.

### Immutable Queries

`withCursor()` returns a new query, and the query it was called on is not
changed. Build the base query once, and derive each page from it:

```php
$base = $db->createQuery()
    ->select('*')
    ->from('articles')
    ->where('state', 1)
    ->order('id', 'DESC')
    ->limit(20);

$page = $base->withCursor('id', 'DESC', $lastId);
```

::: warning
Each call to `withCursor()` adds another keyset condition. Calling it on a
page that already has a cursor stacks the conditions, so the page is filtered
by both. The following code returns only the rows below 5, because `id < 8`
and `id < 5` must both hold:

```php
$page = $base->withCursor('id', 'DESC', 8)
    ->withCursor('id', 'DESC', 5);
// id < 8 AND id < 5
```

Derive every page from the base query, never from a previous page.
:::

### Forms of the Cursor

A string takes the column, the direction and the last value. A list takes one
`[column, direction, value]` tuple per column. The first column is the main sort
key, and the list is one composite cursor:

```php
$page = $base->withCursor([
    ['created', 'DESC', $lastCreated],
    ['id', 'DESC', $lastId],
]);
```

```sql
WHERE ((`created` < ?) OR (`created` = ? AND `id` < ?))
ORDER BY `created` DESC, `id` DESC
```

A value can also be a raw expression, which compares the column with a value
computed in the database. Wrap it in `raw()`:

```php
use function Windwalker\raw;

$page = $base->withCursor(
    'id',
    'DESC',
    raw('(SELECT MAX(id) FROM articles WHERE state = 1)'),
);
```

Pass a `CursorPaginate` definition to set the batch size and the order, and
pass the last row, or its values, for the next pages:

```php
use Windwalker\Query\Query;

$paging = Query::cursorPaginate(20, ['created' => 'DESC', 'id' => 'DESC']);

// First page: sets LIMIT 20 and the cursor order.
$page = $base->withCursor($paging);

// Next pages: pass the last row, or an array of its values.
$page = $base->withCursor($paging, [
    'created' => $lastCreated,
    'id' => $lastId,
]);
```

The values are read by column name. Table aliases are removed, so `'a.id'`
reads the key `id`.

### Behaviors

- **Directions** are `'ASC'` or `'DESC'`, in any letter case, or a
  `SortDirection` enum case.
- **Conditions** are added to the `WHERE` clause with `AND`.
- **Order** is replaced by the cursor columns, so the first page and the later
  pages use the same order.

::: warning
A `null` value throws an `InvalidArgumentException`. A `CursorPaginate` built
with a closure cannot read values from an item, so it throws when it is passed
an item.
:::

## Iterators with a Cursor

The iterate methods accept a `CursorPaginate` in place of a batch size. Use
`iterateBatched()`, `iterateChunks()`, `getPaginatedIterator()` and
`getIterator(paginate:)` for this. `iterateWhile()` and `iterateBatchWhile()`
take only a batch length, because they do not page.

```php
$cursor = Query::cursorPaginate(500, ['id' => 'ASC']);

$rows = $db->createQuery()
    ->select('id', 'title', 'created')
    ->from('posts')
    ->where('state', 1)
    ->iterateBatched($cursor);
```

The cursor object holds no state of its own, so one definition can drive several
loops, and each loop keeps its own position. The methods, their connection
types and the examples are described on the
[Iteration](/documentation/components/query/iteration) page.

## Rules

- **Unique order.** The cursor columns must make the order unique. Put the
  primary key last, so that rows with the same sort value keep a stable order.
- **Matching order.** The query's `ORDER BY` must match the cursor. In a test
  with a query sorted `DESC` and a cursor on `id` ascending, the result was
  `5, 4, 5`, with a repeated row.

::: warning
A cursor cannot follow a nullable column. A `NULL` value never matches the
comparison that the cursor uses, so rows with `NULL` in a cursor column can be
skipped. Use cursor columns that are `NOT NULL`.
:::
