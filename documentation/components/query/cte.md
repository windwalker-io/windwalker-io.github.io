---
layout: doc
title: Common Table Expressions
component: query
---

# Common Table Expressions

A common table expression (CTE) names an intermediate result and lets the
main query read from it, as if it were a table. Use one when a query has
a subquery that is needed in more than one place, or when the statement reads
better as a series of named steps. A recursive CTE walks a hierarchy, such as
categories with parents, or a tree of comments.

## Basic Usage

`with()` adds the CTE before the main statement. The second argument is a
`Query` object, a closure that receives a new query, or a raw SQL string:

```php
$query = $db->createQuery()
    ->with(
        'recent',
        fn(Query $q) => $q->select('*')
            ->from('articles')
            ->where('created', '>', $since)
    )
    ->select('*')
    ->from('recent')
    ->where('state', 1);
```

```sql
WITH `recent` AS (SELECT * FROM `articles` WHERE `created` > ?)
SELECT * FROM `recent` WHERE `state` = ?
```

Call `with()` several times to define several CTEs. They are written in the
order they were added, separated by commas. The bound values of each CTE are
merged into the statement, so they do not need to be bound again.

## Showcase

The next function lists the articles of a category tree, including the
articles in its subcategories. The first CTE walks the tree, and the main
query joins the articles to it:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;

function articlesInTree(DatabaseAdapter $db, int $rootId): Collection
{
    $anchor = $db->createQuery()
        ->select('id', 'parent_id')
        ->from('categories')
        ->where('id', $rootId);

    $walk = $db->createQuery()
        ->select('c.id', 'c.parent_id')
        ->from('categories', 'c')
        ->join('INNER', 'tree', 't', 'c.parent_id', '=', 't.id');

    $tree = $db->createQuery()
        ->unionAll($anchor)
        ->unionAll($walk);

    return $db->createQuery()
        ->withRecursive('tree', $tree, ['id', 'parent_id'])
        ->select('a.id', 'a.title')
        ->from('articles', 'a')
        ->join('INNER', 'tree', 't', 'a.category_id', '=', 't.id')
        ->where('a.state', 1)
        ->order('a.id')
        ->all();
}
```

The recursive part refers to the name of the CTE, `tree`. The statement
stops when the recursive part returns no new rows.

## Recursive CTEs

Use `withRecursive()` for a recursive CTE. Its body is a union of two parts:

- The first part is the anchor, which selects the starting rows.
- The second part is the recursive step, which reads the CTE by name.

```php
$tree = $db->createQuery()
    ->unionAll($anchor)
    ->unionAll($step);

$query = $db->createQuery()
    ->withRecursive('tree', $tree, ['id', 'parent_id'])
    ->select('*')
    ->from('tree');
```

The first `unionAll()` or `union()` decides the union type for the whole
CTE body. The list of column names in the third argument is optional, but it
fixes the column order and names for the recursive part.

If any CTE in a query is recursive, the whole `WITH` clause is written as
`WITH RECURSIVE`. `with()` also accepts a `$recursive` argument, which is what
`withRecursive()` passes.

## Column List

Pass the column names as the third argument to `with()` when the CTE should
name its columns:

```php
$query->with(
    'cats',
    'SELECT id, title FROM categories',
    ['id', 'title'],
);
```

```sql
WITH `cats` (`id`, `title`) AS (SELECT id, title FROM categories)
```

## Materialization

Pass `materialized` to give the database a hint about whether the CTE result
should be computed once and stored:

```php
// AS MATERIALIZED (...)
$query->with('a', $subQuery, materialized: true);

// AS NOT MATERIALIZED (...)
$query->with('b', $subQuery, materialized: false);
```

`null`, the default, writes no hint. The hint has an effect on PostgreSQL 12
and later, and on SQLite 3.35 and later. Other dialects ignore it.

## Dialects

- `WITH` is supported by MySQL 8.0 and later, PostgreSQL, SQLite, SQL Server
  and Oracle.
- SQL Server and Oracle do not use the `RECURSIVE` keyword. The builder omits
  it for these dialects.
- The `WITH` clause is also added to `insert`, `update` and `delete`
  statements. Whether the statement is valid depends on the database.

::: info
`clear('with')` removes all CTEs and the recursive flag from the query.
:::
