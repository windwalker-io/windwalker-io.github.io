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

## Mapper and the ORM Proxy

Every operation of the ORM runs on an `EntityMapper`. A mapper belongs to one
entity class, and it holds the metadata and the logic for that entity. The
ORM keeps one mapper per entity class, and it offers a proxy with the same
methods. The proxy takes the entity class as its first argument:

```php
$mapper = $orm->mapper(Sakura::class);

$sakura = $mapper->findOne(1);

// The same call through the ORM proxy
$sakura = $orm->findOne(Sakura::class, 1);
```

The pattern for every operation is:

- `$mapper->find*(conditions)` on the mapper.
- `$orm->find*(Entity::class, conditions)` on the ORM.

A method that the ORM does not declare is forwarded to the mapper. A method
that neither of them declares raises a `BadMethodCallException`.

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

## Finder Methods

The finders follow the pattern described in
[Mapper and the ORM Proxy](#mapper-and-the-orm-proxy). The examples on this
page use the ORM form.

The table lists the finders. Each method is described in its own section
below. The query-level methods `all()`, `get()`, `loadColumn()`, and
`result()` are part of the [Query component](/documentation/components/query/).

| Method | Returns | Use it to |
| --- | --- | --- |
| [findOne](#findone) | entity or `null` | load one row, or check that it exists |
| [mustFindOne](#mustfindone) | entity | load one row, and fail when it is missing |
| [findList](#findlist) | `ResultIterator` | loop over the matching rows |
| [findResult](#findresult) | value or `null` | read one value of the first matching row |
| [findColumn](#findcolumn) | `Collection` | read one column of all matching rows |
| [countColumn](#countcolumn) | `int` | count the non-null values of a column |
| [sumColumn](#sumcolumn) | `float` | add up a numeric column |
| [findOneOrCreate](#findoneorcreate) | entity | load one row, or insert it when missing |
| [countWith](#countwith) | `int` | count the rows of a query, on the ORM |

### Conditions

Most finders take a `$conditions` argument. It accepts three forms:

- A primary key value, such as `1`. The ORM uses the main key of the
  entity. An entity without a key cannot be searched this way.
- An array of column values, such as `['no' => 'S00001', 'state' => 1]`.
- An array that contains tuples with an operator, such as
  `['created', '>', '2025-01-01']`. The syntax is the same as in the
  [Query component](/documentation/components/query/where).

The keys can be property names, such as `locationId`, or column names, such
as `location_id`. A camelCase key is converted to its column name when the
entity has no column with that exact name. This lets you pass the variables
of a method straight into the conditions with `compact()`:

```php
public function find(int $locationId, int $state): array
{
    return $this->orm->findList(
        Sakura::class,
        compact('locationId', 'state'),
    )->all()->dump();
}
```

The same conversion applies to the conditions of the write methods. See
[Conditions](./persisting#conditions) in Persisting Data.

### findOne

`findOne()` returns the first row that matches the conditions as an entity,
or `null` when no row matches.

```php
$sakura = $orm->findOne(Sakura::class, ['no' => 'S00001']);

if ($sakura === null) {
    // No row was found
}
```

The third argument changes the returned class. Pass `Collection::class` to
get the raw row as a `Collection`, with the column names as keys.

```php
use Windwalker\Data\Collection;

$row = $orm->findOne(Sakura::class, 1, Collection::class);
```

::: warning
`findOne()` returns the first matching row, and it does not report that more
rows match. Use a condition that identifies one row, such as a unique key,
when only one row is expected. With the default `[]`, no condition is applied,
and the first row of the table is returned.
:::

### mustFindOne

`mustFindOne()` works like `findOne()`, but it throws
`Windwalker\Query\Exception\NoResultException` when no row matches. Use it
where a missing row is an error, such as a detail page with a known ID.

```php
use Windwalker\Query\Exception\NoResultException;

try {
    $sakura = $orm->mustFindOne(Sakura::class, $id);
} catch (NoResultException $e) {
    // Return a 404 response, for example
}
```

### findList

`findList()` returns a `ResultIterator`. The rows are read while you loop
over it, so a large result does not have to fit in memory at once.

```php
$items = $orm->findList(Sakura::class, ['state' => 1]);

foreach ($items as $sakura) {
    // Each row is an entity
}
```

To keep the rows, call `all()`. The result is a `Collection` that can be
used more than once.

```php
$items = $orm->findList(Sakura::class, ['state' => 1])->all();

$titles = $items->column('title');
```

::: info
`ResultIterator` implements `ArrayAccess`, so `$items[0]` works. The read
calls `all()` internally, which loads every row, so it does not save
memory. For large results, see [Iterating Large Results](#iterating-large-results).
:::

### findResult

`findResult()` returns the value of one column from the first matching row,
or `null` when no row matches. The column can be an expression, passed as a
`raw()` wrapper.

```php
use function Windwalker\raw;

$title = $orm->findResult(Sakura::class, 'title', ['id' => 1]);

$lastCreated = $orm->findResult(
    Sakura::class,
    raw('MAX(created)'),
);
```

::: warning
`findResult()` takes no `ORDER BY`. Without an order, the first row is the one
that the database returns first, and that is not guaranteed to be the newest.
To choose the row, use a query with `order()` and `result()`:

```php
$title = $orm->select('title')
    ->from(Sakura::class)
    ->where('state', 1)
    ->order('created', 'DESC')
    ->result();
```
:::

### findColumn

`findColumn()` returns a `Collection` with the values of one column for all
matching rows. Use it to collect IDs, and then load the rows with them.

```php
$sakuraIds = $orm->findColumn(Sakura::class, 'id', ['state' => 1])
    ->dump();

$items = $orm->findList(
    Sakura::class,
    ['id' => $sakuraIds],
)->all();
```

Read only the column you need. Loading whole rows to keep one column wastes
memory.

### countColumn

`countColumn()` returns the number of rows where the column is not `NULL`.
It returns `0` when no row matches.

```php
$count = $orm->countColumn(Sakura::class, 'id', ['state' => 1]);
```

Count a column that cannot be `NULL`, such as the primary key. The count of a
nullable column skips the rows where it is `NULL`.

::: warning
The `$groups` argument only adds a `GROUP BY`. The method still returns one
`int`, which is the count of the first group that the database returns, not
one count per group. To get counts for every group, use a query with
`group()` and `all()`.
:::

### sumColumn

`sumColumn()` adds up a column and returns a `float`. It returns `0.0` when
no row matches.

```php
$total = $orm->sumColumn(Order::class, 'amount', ['state' => 1]);
```

The same caveat about `$groups` applies. The method returns the sum of the
first group only.

### findOneOrCreate

`findOneOrCreate()` returns the matching row. When no row matches, it
creates one and returns it. The new row takes the values of the conditions,
merged with `$initData`.

```php
use Windwalker\ORM\ORMOptions;

$enrollment = $orm->findOneOrCreate(
    Enrollment::class,
    ['user_id' => $userId, 'lesson_id' => $lessonId],
    ['progress' => 0],
    options: new ORMOptions(transaction: true),
);
```

- `$mergeConditions` controls whether the condition values are copied into
  the new row. The default is `true`.
- `$initData` is an array of values, or a callable. The array entries with a
  `null` value are skipped.
- `transaction: true` in `ORMOptions` runs the find and the insert in one
  transaction, and it locks the found row. Without it, no transaction is
  started.

The callable is called only when a row is created. It receives the new row
data and the conditions, and it returns the row data. Return `null` to keep
the data unchanged. The row data holds the condition values only when
`$mergeConditions` is `true`.

```php
$enrollment = $orm->findOneOrCreate(
    Enrollment::class,
    ['user_id' => $userId, 'lesson_id' => $lessonId],
    function (array $data, array $conditions) use ($userId) {
        $data['progress'] = 0;
        $data['created_by'] = $userId;
        $data['started_at'] = date('Y-m-d H:i:s');

        return $data;
    },
    options: new ORMOptions(transaction: true),
);
```

::: warning
Two requests can both find no row and both insert one, unless a `UNIQUE`
index on the conditions prevents the second insert. Add the index, and
handle the duplicate-key error, when the row must be unique.
:::

### countWith

`countWith()` is available on the ORM only. It counts the rows that a query
returns, and it accepts a `Query` object or a SQL string.

```php
$query = $orm->from(Sakura::class)
    ->where('state', 1);

$total = $orm->countWith($query);
```

The method works on a copy of the query, so the original query is unchanged.
Without `GROUP BY` or `HAVING`, it counts with `COUNT(*)`. Otherwise it counts
the rows of the query through a subquery.

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
entity class as the result type. The clauses are described on the pages
[Selecting Data](/documentation/components/query/select),
[Joins](/documentation/components/query/join),
[Conditions](/documentation/components/query/where) and
[Raw SQL and Bindings](/documentation/components/query/expressions).

The ORM query is an advanced `SelectorQuery`. In addition to the methods of
the Query component, it provides:

- Entity results. `all()` and `get()` return entities when given an entity
  class.
- Automatic `ON` conditions for joins that are declared by entity class.
- `autoSelections()`, which selects the columns of every table in the query.
- `groupByJoins()`, which groups the joined columns under the alias of each
  joined table.

The table indexes the query-level methods that the ORM query uses most. The
methods come from the Query component, unless the table says otherwise. The
links go to the description in this page or in the Query component.

| Method | Use it to |
| --- | --- |
| [from](#starting-a-select) | set the table of the query |
| [select](#starting-a-select) | start a SELECT with columns |
| [selectRaw](#starting-a-select) | start a SELECT with an expression |
| [where](/documentation/components/query/where) | add a condition |
| [whereRaw](#raw-conditions) | add a raw SQL condition |
| [orWhere](#grouping-or-conditions) | add a grouped OR condition |
| [join](#joins) | join another table, with or without `ON` |
| [leftJoin](#automatic-on-conditions) | left join, with the `ON` built from the entities |
| [groupByJoins](#automatic-selections-and-grouped-joins) | select the joined columns, grouped by alias |
| [autoSelections](#automatic-selections-and-grouped-joins) | select the columns of every table in the query |
| [withCursor](/documentation/components/query/cursor-pagination#single-query-with-withcursor) | page through rows with a keyset cursor |
| [all](/documentation/components/query/methods#execution) | fetch every row, as a `Collection` |
| [get](/documentation/components/query/methods#execution) | fetch the first row |
| [loadColumn](/documentation/components/query/methods#execution) | fetch the values of the first column |
| [result](#findresult) | fetch one value of the first row |
| [getIterator](#iterating-large-results) | read the rows through one cursor |
| [iterateBatched](#iterating-large-results) | read the rows in batches, one query each |
| [iterateChunks](#iterating-large-results) | read the batches as collections |
| [iterateWhile](#iterating-large-results) | repeat a query until no rows match |
| [iterateBatchWhile](#iterating-large-results) | repeat a batch query until no rows match |

### Starting a SELECT

`select()` and `selectRaw()` start a query of the SELECT type. Unlike the
mapper's `select()`, the ORM's `select()` does not set a table. Add the table
with `from()`, or the query has no source.

```php
$titles = $orm->select('title')
    ->from(Sakura::class)
    ->where('state', 1)
    ->loadColumn();
```

`selectRaw()` accepts an expression. It supports the same placeholders as
`whereRaw()`, so a column name is passed as `%n` and a value as `%q`.

```php
$total = $orm->selectRaw('COUNT(%n) AS total', 'id')
    ->from(Sakura::class)
    ->where('state', 1)
    ->result();
```

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

### Automatic ON Conditions

When the entity of the joined table is passed as a class name, the ORM can
build the `ON` clause itself. The join then needs no conditions:

```php
$articles = $orm->from(Article::class)
    ->leftJoin(Category::class)
    ->groupByJoins()
    ->all(Article::class);

foreach ($articles as $article) {
    $category = $article->category;
}
```

The ORM builds the condition from the column names, in this order:

- **Relation**: if the entity of the `FROM` table defines a relation to
  the joined table, the keys of that relation are used.
- **Many-to-one**: the `FROM` table has a column named `{alias}_id`, where
  `{alias}` is the alias of the joined table. The condition matches that
  column with the primary key of the joined table. In the example above,
  `articles.category_id` is matched with `categories.id`.
- **One-to-many**: the joined table has a column named `{alias}_id`, where
  `{alias}` is the alias of the `FROM` table. The condition matches the
  primary key of the `FROM` table with that column.

The default alias of a joined table is the singular form of its table name,
such as `category` for `categories`. You can pass another alias, and the
column names follow it.

```php
$orm->from(Article::class)
    ->leftJoin(Category::class, 'cat')
    ->all(Article::class);
```

::: warning
Automatic conditions depend on the names of the aliases and columns. With
the alias `cat` above, the ORM looks for `cat_id` and finds no match, so
the join needs explicit conditions. When no rule matches, the ORM builds no
`ON` clause, and the query may fail or return unexpected rows. Check the
generated SQL with `debug()` when you rely on this feature.
:::

For a relation-based join or a join with custom conditions, use the forms
below.

### Joins With Several Conditions

Pass an array of conditions as the `ON` clause when the join depends on
more than one column. Each item is a pair of columns, or a column, an
operator, and a value.

```php
use function Windwalker\Query\val;

$articles = $orm->from(Article::class, 'article')
    ->leftJoin(
        Category::class,
        'category',
        [
            ['article.category_id', 'category.id'],
            ['category.type', val('article')],
        ],
    )
    ->all(Article::class);
```

::: warning
Wrap a literal value in `val()`. A plain string in the `ON` clause is read
as a column name, and the query compares two columns instead of the value.
:::

## Automatic Selections and Grouped Joins

A join normally needs a column list, and columns with the same name in two
tables collide unless each one gets an alias. `autoSelections()` writes that
list for you, and `groupByJoins()` separates the joined columns into an
object per table.

```php
$articles = $orm->from(Article::class)
    ->leftJoin(Category::class)
    ->where('state', 1)
    ->groupByJoins()
    ->all(Article::class);

foreach ($articles as $article) {
    echo $article->title;

    $category = $orm->tryEntity(Category::class, $article->category);
    echo $category?->title;
}
```

`autoSelections()` looks at every table of the query, the `FROM` table and
each joined table, and selects their columns. The columns of the `FROM`
table keep their names. The columns of the other tables get the alias of
their table as a prefix, separated by `:`. For the query above, the select
list contains entries such as:

```sql
`article`.`title` AS `title`,
`category`.`title` AS `category:title`
```

`groupByJoins()` calls `autoSelections()` and sets the divider used to split
the result. When the rows are fetched, every column with a prefix is moved
into a `Collection` under that prefix. The main entity receives the
`category` key, which holds a `Collection` with the columns of the category.
Pass the collection to `tryEntity()` or `toEntity()` to get a `Category`
entity.

::: info
`SelectorQuery::$emptyCollectionAsNull` is `true` by default. When every
column of a joined table is `NULL`, which happens with a `LEFT JOIN` that
finds no row, the sub-collection is `null`. Set the flag to `false` to get
an empty `Collection` instead.
:::

### Call It Last

`autoSelections()` reads the tables that the query contains at the moment
it is called. Call `groupByJoins()` or `autoSelections()` after every
`join()` and `leftJoin()`. A join added after the call has no columns in the
select list, so its object is missing from the result.

```php
$query = $orm->from(Article::class)
    ->leftJoin(Category::class)
    ->groupByJoins();

// Author is not in the select list, because it was added after the call
$query->leftJoin(Author::class);
```

::: warning
Call `groupByJoins()` after the last join. Otherwise the joined object is
missing from the result, and no error is raised.
:::

### Where the Columns Come From

The column list is built from the entity metadata, which means the entities
must match the database. A property with no `#[Column]`, or a column that
was added to the table without changing the entity, is not selected or not
hydrated. To read the real columns of the table instead, pass
`loadColumnsFromDb: true` to `groupByJoins()`, or mark the entity class
with `#[UseRealColumns]`.

```php
$articles = $orm->from(Article::class)
    ->leftJoin(Category::class)
    ->groupByJoins(loadColumnsFromDb: true)
    ->all(Article::class);
```

### Cost

The select list grows with every column of every table in the query. Wide
tables and several joins produce long SQL, and every row carries all the
columns, even those the page does not use. Use these helpers for
administration pages and for queries that run rarely. For a hot path, such
as a public listing, write the select list by hand with `select()`.

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
