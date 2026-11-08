---
layout: doc
title: Selecting Data
component: query
---

# Selecting Data

Reading rows is the most common use of the builder. Naming the columns,
joining the tables and sorting in the database keeps the statement small
and lets the database do the filtering. Pulling a whole table into PHP and
filtering it there is slower and uses more memory.

## Basic Select

A select query needs a column list and a table. Both are methods on the
builder, and they can be called in any order before the query runs:

```php
$query = $db->createQuery()
    ->select('id', 'title')
    ->from('posts');
```

## Showcase

The following function lists one page of published posts, with the author
name from a joined table. It runs as a complete read operation:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;

function listPosts(DatabaseAdapter $db, int $page): Collection
{
    return $db->createQuery()
        ->select('p.id', 'p.title', 'p.created')
        ->select('u.name AS author_name')
        ->from('posts', 'p')
        ->leftJoin('users', 'u', 'u.id', 'p.user_id')
        ->where('p.state', 1)
        ->order('p.created', 'DESC')
        ->limit(20)
        ->offset(($page - 1) * 20)
        ->all();
}
```

`all()` runs the statement and returns a `Collection` of rows. Each row is a
`Collection` too. Pass a class name to `all()` to hydrate the rows into
objects. See [Queries](/documentation/components/database/queries) in the
database package for the fetch methods.

## Columns and Expressions

`select()` treats each string as a column name. The builder quotes it for
the current dialect, and a dotted name is split into table and column:

```php
$query->select('p.id', 'p.title');
// SELECT `p`.`id`, `p`.`title`
```

To add an alias, write `AS` in the string, or call `selectAs()`:

```php
$query->select('u.name AS author_name');

$query->selectAs('u.name', 'author_name');
```

Expressions such as functions, arithmetic and literals are not column
names. Pass them to [`selectRaw()`](/documentation/components/query/expressions#raw-methods), which keeps the text unchanged:

```php
$query->selectRaw('COUNT(*) AS total');

$query->selectRaw('1');
```

::: info
A string passed to `select()` is always quoted. `select('COUNT(*)')` and
`select('1')` produce a quoted identifier, which the database reads as a
column name and rejects. Use [`selectRaw()`](/documentation/components/query/expressions#raw-methods) for every expression.
:::

## Tables and Aliases

Pass an alias as the second argument of `from()` to refer to the table with
a short name in the rest of the query:

```php
$query->from('posts', 'p');
// FROM `posts` AS `p`
```

`from()` also accepts a `Query` object, which is useful when the source
is itself a query:

```php
$recent = $db->createQuery()
    ->select('*')
    ->from('posts')
    ->where('created', '>', $since);

$query = $db->createQuery()
    ->select('*')
    ->from($recent, 'recent');
```

## Joins

Joins read related rows from other tables in the same statement. The
`leftJoin()`, `rightJoin()` and `innerJoin()` methods take the table, its
alias and the condition. See [Joins](/documentation/components/query/join)
for the join types, the condition forms, and the rules for filtering a
joined table.

```php
$query->leftJoin('users', 'u', 'u.id', 'p.user_id');
// LEFT JOIN `users` AS `u` ON `u`.`id` = `p`.`user_id`
```

::: info
Once a query has a joined table, an unqualified column in `where()` gets the
alias of the `FROM` table. `where('state', 1)` becomes `p`.`state` when the
`FROM` table is `posts AS p`. A column that already contains a dot is left
as written.
:::


## Ordering

`order()` takes a column and an optional direction. The direction can be a
string, `'ASC'` or `'DESC'`, or a `SortDirection` enum case:

```php
$query->order('created', 'DESC');

$query->order('created', SortDirection::Descending);
```

Every argument that takes a direction accepts both forms. That includes the
pairs in a list passed to `order()`, the direction of `orderByField()`, and
the directions of a `CursorPaginate` definition.

::: info
`SortDirection` is a PHP 8.6 enum. Windwalker Query installs
`symfony/polyfill-php86`, which provides the enum on earlier PHP versions.
:::

To sort by several columns, pass a list of pairs. Each pair is a column
and its direction:

```php
$query->order([
    ['state', SortDirection::Descending],
    ['id', 'ASC'],
]);
```

::: warning
Do not pass a map such as `['state' => 'DESC']`. The key is ignored and the
value is read as a column name, so the statement becomes
`ORDER BY DESC` without an error. Use the list of pairs shown above.
:::

Other ordering helpers:

- `orderByField()` sorts by a list of values, in the order given. Values not
  in the list are placed after the listed ones. An optional third argument
  sets the direction, as `'ASC'`, `'DESC'`, or a `SortDirection` case.
- `orderByRandom()` sorts randomly. Each dialect uses its own function, for
  example `RAND()` on MySQL.
- [`orderRaw()`](/documentation/components/query/expressions#raw-methods) takes an expression, as shown in
  [Raw SQL and Bindings](/documentation/components/query/expressions).

```php
$query->orderByField('state', [2, 1, 0]);
```

## Grouping

`group()` adds a `GROUP BY` clause. Combine it with [`selectRaw()`](/documentation/components/query/expressions#raw-methods) for
aggregates. Conditions on aggregates belong in `having()`, which is covered
on the [Conditions](/documentation/components/query/where#having) page:

```php
$stats = $db->createQuery()
    ->select('author_id')
    ->selectRaw('COUNT(*) AS total')
    ->from('posts')
    ->group('author_id')
    ->all();
```

## Limit and Offset

`limit()` and `offset()` take integers, or `null` to remove the clause:

```php
$query->limit(20)->offset(40);
```

::: info
`OFFSET` pagination still reads and discards the skipped rows, so later
pages cost more than early pages. For a large table, use cursor pagination
as described below.
:::

## Cursor Pagination

To page through rows with a cursor, pass the last seen values to `withCursor()`.
The page size comes from `limit()`, or from a `CursorPaginate` definition:

```php
$query = $query->withCursor('id', 'DESC', $lastSeenId);
```

`withCursor()` returns a new query, and the original query is not changed. The
forms of the cursor, the rules for unique and matching sort orders, and the
examples are described on the
[Cursor Pagination](/documentation/components/query/cursor-pagination) page.

## Row Locks

Use `forUpdate()` and `forShare()` to lock the selected rows until the
transaction ends. The lock options are passed as text, such as
`'SKIP LOCKED'` or `'NOWAIT'`:

```php
$db->transaction(function (DatabaseAdapter $db) {
    $query = $db->createQuery()
        ->select('*')
        ->from('posts')
        ->where('id', 10)
        ->forUpdate('SKIP LOCKED');

    $post = $query->get();

    // Update the row while it is locked.
});
```

Locks are held until the transaction ends. Outside a transaction, the
statement runs in autocommit mode and the lock is released at once, so the
locks only protect the work when the query runs inside one. See
[Transactions](/documentation/components/database/queries#transactions) in
the database package.

## Subqueries

A `Query` object or a closure can be used as a value. The builder wraps it
in parentheses:

```php
$query->where(
    'category_id',
    fn(Query $q) => $q->select('id')->from('categories')
        ->where('state', 1)
);
// WHERE `category_id` = (SELECT `id` FROM `categories` WHERE ...)
```

The subquery must return one value. For a list of values, use `whereIn()`
with a list, as shown on the [Conditions](/documentation/components/query/where)
page.

## Combining Queries

`union()`, `unionAll()` and `unionDistinct()` join other queries into one
result. Each argument is a `Query` object:

```php
$query = $db->createQuery()
    ->unionAll($db->createQuery()->select('id', 'title')->from('posts'))
    ->unionAll($db->createQuery()->select('id', 'title')->from('pages'));
```

::: warning
Calling `union()` on a query that already has `select()` or `from()` renders
invalid SQL, because the union is written before the `FROM` clause. Build the
union from an empty query, as shown above. To combine a union with other
clauses, such as an `ORDER BY` or a join, put it in a
[common table expression](/documentation/components/query/cte) and select
from that name.
:::
