---
layout: doc
title: Conditions
component: query
---

# Conditions

Conditions decide which rows a statement reads or changes. The builder turns
each PHP value into a bound parameter, so a search form can add filters at
runtime without concatenating strings into the SQL.

## Basic Condition

A condition is a column, an optional operator and a value. With two
arguments, the operator is `=`:

```php
$query->where('state', 1);
// WHERE `state` = 1 (the value is bound, not written into the SQL)
```

## Showcase

The following function builds a search query from the optional filters that
a request sends. Each filter adds a condition only when it is present:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;

function searchPosts(DatabaseAdapter $db, array $filters): Collection
{
    $query = $db->createQuery()
        ->select('id', 'title', 'state', 'created')
        ->from('posts');

    if (isset($filters['state'])) {
        $query->where('state', $filters['state']);
    }

    if (!empty($filters['ids'])) {
        $query->whereIn('id', $filters['ids']);
    }

    if (($filters['keyword'] ?? '') !== '') {
        $query->whereLike('title', '%' . $filters['keyword'] . '%');
    }

    if (isset($filters['from'], $filters['to'])) {
        $query->whereBetween('created', $filters['from'], $filters['to']);
    }

    return $query->order('id', 'DESC')->limit(50)->all();
}
```

Every value above is bound. The statement does not change when the filter
contains quotes or SQL keywords.

::: warning
The `LIKE` pattern is built from user input here, so `%` and `_` in the
keyword act as wildcards. Escape them before you add the wildcards if the
search must match them literally.
:::

## Operators

The operator is written in the middle of the call. The builder normalizes
the case, so `'like'` and `'LIKE'` are the same:

```php
$query->where('created', '>=', '2025-01-01');

$query->where('state', '!=', 0);
```

Some operators take a value of a particular shape:

- `IN` takes an array. A plain array value is shorthand for `IN`, and `!=`
  with an array is `NOT IN`:

  ```php
  $query->where('id', [1, 2, 3]);
  // `id` IN (1, 2, 3)

  $query->where('id', 'not in', [1, 2, 3]);
  // `id` NOT IN (1, 2, 3)
  ```

- `BETWEEN` takes exactly two values:

  ```php
  $query->where('id', 'between', [10, 50]);
  // `id` BETWEEN 10 AND 50
  ```

- `LIKE` takes a pattern:

  ```php
  $query->where('title', 'like', '%wind%');
  ```

- `NULL` is written as `null`. `=` with `null` becomes `IS NULL`, and `!=`
  becomes `IS NOT NULL`:

  ```php
  $query->where('deleted_at', null);
  // `deleted_at` IS NULL

  $query->where('deleted_at', '!=', null);
  // `deleted_at` IS NOT NULL
  ```

- Booleans are rendered as `true` or `false`:

  ```php
  $query->where('is_featured', true);
  ```

Each operator has a helper method that reads more clearly in code. The
helpers are `whereIn()`, `whereNotIn()`, `whereBetween()`,
`whereNotBetween()`, `whereLike()` and `whereNotLike()`:

```php
$query->whereIn('id', $ids)
    ->whereNotBetween('id', 10, 50)
    ->whereNotLike('title', '%draft%');
```

::: warning
`where()` with the `in` operator and `whereIn()` do not check the list. An
empty array renders `IN ()`, which MySQL rejects with a syntax error, so the
statement fails at runtime. SQLite accepts it and matches no rows. The builder
does not fill in a default for you, so check the type and the content of the
value before you build the condition. Use one of these two patterns:

```php
// Skip the query when there is nothing to match.
if ($ids !== []) {
    $query->whereIn('id', $ids);
}

// Or pass a placeholder that matches no row.
$query->whereIn('id', $ids ?: [0]);
```

The placeholder `[0]` is safe only when no row has the ID `0`. Skipping the
query is the clearer choice when the empty list means "no result".
:::

## Array Conditions

Pass an array to add several conditions at once. A string key is a column
with an equal value, and a numeric key holds a list with the column,
operator and value in the same order:

```php
$query->where([
    'state' => 1,
    ['created', '>=', '2025-01-01'],
    ['id', 'in', [1, 2, 3]],
]);
```

## Nested Groups

A closure starts a group of conditions wrapped in parentheses. The
conditions in the group are joined by the method that receives the closure:

```php
$query->where('state', 1)
    ->andWhere(function (Query $q) {
        $q->where('created_by', 42)
            ->where('state', 0);
    });
// WHERE `state` = 1 AND (`created_by` = 42 AND `state` = 0)
```

`andWhere()` joins the group's conditions with `AND`, and `orWhere()`
joins them with `OR`:

```php
$query->where('state', 1)
    ->orWhere(function (Query $q) {
        $q->where('created_by', 42)
            ->where('state', 0);
    });
// WHERE `state` = 1 AND (`created_by` = 42 OR `state` = 0)
```

Arrays work the same way, using the same glue for every element:

```php
$query->where('state', 1)
    ->orWhere([
        ['created_by', 5],
        ['state', 3],
    ]);
```

::: warning
The parenthesized group is always joined to the preceding conditions with
`AND`, even when it was added with `orWhere()`. The method name controls
the join inside the group only. The builder has no top-level `OR` between
two conditions. To express `a OR (b AND c)`, write that part with
[`whereRaw()`](/documentation/components/query/expressions#raw-methods) and bound values:

```php
$query->where('published', 1)
    ->whereRaw(
        '(state = :a OR (created_by = :b AND state = :c))',
        a: 1,
        b: 42,
        c: 0,
    );
```
:::

## Having

`having()` filters groups after `GROUP BY`. It accepts the same forms as
`where()`, and it has the same helpers, such as `havingIn()` and
`havingBetween()`:

```php
$query = $db->createQuery()
    ->select('author_id')
    ->selectRaw('COUNT(*) AS total')
    ->from('posts')
    ->group('author_id')
    ->having('total', '>', 10);
```

Use [`havingRaw()`](/documentation/components/query/expressions#raw-methods) for an aggregate expression that the builder should not
quote, such as `COUNT(id) > 10`.

## Exists

`whereExists()` and `whereNotExists()` take a `Query` or a closure that
receives a new query. Use `selectRaw('1')` in the subquery, because
`select('1')` quotes the number:

```php
use function Windwalker\raw;

$query = $db->createQuery()
    ->select('*')
    ->from('authors', 'a')
    ->whereExists(function (Query $q) {
        $q->selectRaw('1')
            ->from('posts', 'p')
            ->where('p.author_id', raw('a.id'));
    });
```

The `raw()` helper keeps `a.id` as a column reference instead of a value.
See [Raw SQL and Bindings](/documentation/components/query/expressions).

## Raw Conditions

[`whereRaw()`](/documentation/components/query/expressions#raw-methods) and [`havingRaw()`](/documentation/components/query/expressions#raw-methods) add the SQL text as written. They are the
right tool for a condition that uses a database function, and they are
covered with their placeholder syntax on the
[Raw SQL and Bindings](/documentation/components/query/expressions) page.

::: warning
Never build the text of a raw condition from request data. Put the values
in named bindings instead, as shown on the expressions page.
:::
