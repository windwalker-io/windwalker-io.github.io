---
layout: doc
title: Querying
component: orm
---

# Querying

Reading data is the most common use of the ORM. To load one row, pass a
primary key or a condition array to a find method. For anything more
complex, start a query with `from()` or `select()`. Both return a
`SelectorQuery`, a query builder that knows about entity classes. It can
return entities directly, so you do not have to map rows yourself.

## Minimal Setup

No setup is needed beyond the ORM instance and the entity class.

```php
$sakura = $orm->findOne(Sakura::class, 1);
```

## Showcase

The following example loads the ten newest published items:

```php
$sakuras = $orm->from(Sakura::class)
    ->where('state', 1)
    ->where('published_at', '<=', date('Y-m-d H:i:s'))
    ->order('published_at', 'DESC')
    ->limit(10)
    ->all(Sakura::class);

foreach ($sakuras as $sakura) {
    echo $sakura->title;
}
```

`all()` returns a `Collection` of entities because the entity class is
passed as its argument. Without the argument, the rows are returned as
plain collections.

## Finding by Key or Condition

Find methods accept either a primary key value or a condition array.

- `findOne()` returns an entity, or `null` when no row matches.
- `mustFindOne()` throws `NoResultException` when no row matches.
- `findList()` returns a `ResultIterator`. Call `all()` on it to get a
  `Collection`.

```php
$sakura = $orm->findOne(Sakura::class, 1);

$sakura = $orm->findOne(Sakura::class, ['no' => 'S00001']);

$sakura = $orm->mustFindOne(Sakura::class, ['state' => 1]);
```

Condition arrays support operators as tuples. The keys can be property
names, such as `locationId`, or column names, such as `location_id`.

```php
$items = $orm->findList(Sakura::class, [
    'state' => 1,
    ['created', '>', '2025-01-01'],
    ['type', 'in', ['A', 'B']],
])->all();
```

To read a single column or a single value, use `findColumn()` and
`findResult()`:

```php
$ids = $orm->findColumn(Sakura::class, 'id', ['state' => 1]);

$title = $orm->findResult(Sakura::class, 'title', ['id' => 1]);
```

::: tip
Read only the column you need with `findColumn()` or `findResult()`.
Loading whole rows only to keep one value wastes memory.
:::

### Locking Reads

`ORMOptions` controls row locks for the find methods. Use `forUpdate` to
lock the rows that you intend to change, and `forShare` to prevent
concurrent changes while you read them.

```php
use Windwalker\ORM\ORMOptions;

$sakura = $orm->mustFindOne(
    Sakura::class,
    1,
    options: new ORMOptions(forUpdate: true),
);
```

Pass `ORMOptions::NOWAIT` or `ORMOptions::SKIP_LOCKED` as the value of
`forUpdate` or `forShare` to change how the lock waits. Locks are useful
only inside a transaction. See [Persisting Data](./persisting#transactions).

## Query Builder Through the ORM

`from()` and `select()` on the ORM start a `SelectorQuery`. The builder
methods, such as `where()`, `order()`, and `limit()`, are the same as in
the [Query component](/documentation/components/query/). The ORM adds the
entity class as the result type.

### Grouping OR Conditions

Wrap the alternatives of an OR in a closure. The closure receives a query
that holds the grouped conditions.

```php
$items = $orm->from(Sakura::class)
    ->where('state', 1)
    ->orWhere(
        function ($query) {
            $query->where('created_by', 42)
                ->where('state', 0);
        }
    )
    ->all(Sakura::class);
```

The closure keeps the grouping explicit. Each group is wrapped in
parentheses, so the conditions do not depend on SQL operator precedence.

### Raw Conditions

`whereRaw()` inserts SQL as written. Its placeholders are `%n` for a
column name and `%q` for a quoted value.

```php
$items = $orm->from(Sakura::class)
    ->whereRaw('%n > %q', 'created', '2025-01-01')
    ->all(Sakura::class);
```

::: warning
Never place user input directly in the SQL string of `whereRaw()`. Pass
values as arguments with `%q` or `%a` so that the query builder quotes
them.
:::

### Joins

A join adds the columns of a related table. Joined columns that share a
name collide, so select the columns you need, or let `groupByJoins()`
group the columns of each joined table under its alias.

```php
$articles = $orm->from(Article::class, 'article')
    ->leftJoin(
        Category::class,
        'category',
        'category.id',
        'article.category_id',
    )
    ->groupByJoins()
    ->all(Article::class);

foreach ($articles as $article) {
    $category = $article->category;
}
```

In this example, `$article->category` holds the joined columns of the
`category` table. Use an alias that describes the table, such as
`category`, rather than a short name such as `c`.

## Iterating Large Results

Loading every row into an array at once fails when a result set is large,
such as in an export or a migration. The iteration methods read the rows
in parts. Choose the method by how the rows must be processed:

- `getIterator()` keeps one open cursor. Pass `paginate` to read the rows
  in pages, so that the database does not hold the whole result at once.
- `iterateBatched()` runs one query per batch and yields each row.
- `iterateChunks()` runs one query per batch and yields a `Collection`
  for each batch.
- `iterateWhile()` repeats the same query, in batches, until no rows
  match.
- `iterateBatchWhile()` works like `iterateWhile()`, but it loads each
  batch with `all()`.

```php
$query = $orm->from(Sakura::class)
    ->where('state', 1);

foreach ($query->iterateBatched(500, Sakura::class) as $sakura) {
    // Process one row at a time
}

foreach ($query->iterateChunks(500, Sakura::class) as $chunk) {
    foreach ($chunk as $sakura) {
        // Process the rows of one batch
    }
}
```

`getIterator()` with `paginate` works the same way:

```php
$items = $query->getIterator(Sakura::class, paginate: 500);
```

::: info
A cursor from `getIterator()` holds a database connection while it is
open. Use it in batch jobs such as imports and exports. In web requests,
prefer `iterateBatched()`, which opens a new query for each batch.
:::

::: warning
`iterateWhile()` and `iterateBatchWhile()` run the same conditions again
after each batch. Change the rows in the loop so that they no longer match
the conditions. Otherwise the loop never ends.
:::

For the complete reference of the builder, see the
[Query component](/documentation/components/query/), especially
[Iteration](/documentation/components/query/iteration).
