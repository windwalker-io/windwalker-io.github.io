---
layout: doc
title: Joins
component: query
---

# Joins

A normalized schema keeps posts, authors and categories in separate tables.
A join reads the related rows in the same statement. The application then
does not need one extra query for each row, which is a common cause of slow
pages. Joins are also where column names collide, and where a condition in
the wrong place silently changes the result.

## Basic Usage

Call a join method with the table, its alias, and the condition. The simplest
condition compares two columns:

```php
$query = $db->createQuery()
    ->select('p.id', 'p.title', 'u.name AS author_name')
    ->from('posts', 'p')
    ->leftJoin('users', 'u', 'u.id', 'p.user_id');
```

```sql
SELECT `p`.`id`, `p`.`title`, `u`.`name` AS `author_name`
FROM `posts` AS `p`
LEFT JOIN `users` AS `u` ON `u`.`id` = `p`.`user_id`
```

## Showcase

The next function lists published posts with the author name and the
category title. The author is required, so an inner join is used. The
category is optional, so a left join is used, and its condition sits in the
`ON` clause:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;
use function Windwalker\Query\val;

function listPublished(DatabaseAdapter $db): Collection
{
    return $db->createQuery()
        ->select('p.id', 'p.title')
        ->select('u.name AS author_name')
        ->select('c.title AS category_title')
        ->from('posts', 'p')
        ->innerJoin('users', 'u', 'u.id', 'p.user_id')
        ->leftJoin(
            'categories',
            'c',
            [
                ['c.id', 'p.category_id'],
                ['c.state', val(1)],
            ],
        )
        ->where('p.state', 1)
        ->order('p.id', 'DESC')
        ->all();
}
```

Each post keeps its row when its category is missing or unpublished. The
`category_title` is `NULL` for those posts.

## Join Types

Each join method names its type. Pass the table, the alias and the
condition to every one of them:

- `leftJoin()` keeps every row of the `FROM` table, and fills the joined
  columns with `NULL` when no row matches.
- `rightJoin()` keeps every row of the joined table instead.
- `innerJoin()` keeps only the rows that match on both sides.

```php
$query->innerJoin('users', 'u', 'u.id', 'p.user_id');

$query->rightJoin('users', 'u', 'u.id', 'p.user_id');
```

The generic `join()` takes the type as its first argument, which is useful
for a type that has no method of its own:

```php
$query->join('LEFT', 'users', 'u', 'u.id', 'p.user_id');
```

### Cross Join

A `CROSS JOIN` has no condition. Pass `true` as the condition, which renders
`ON TRUE`:

```php
$query->join('CROSS', 'categories', 'c', true);
```

`true` works for every join type, as a condition that always matches.

### Lateral Join

`joinLateral()` writes a `LATERAL` join. A lateral source can refer to the
columns of the tables that come before it in the `FROM` clause. A plain table
name cannot do that, so a lateral join is almost always used with a subquery.
The typical case is "the latest row of the related table for each row":

```php
$query->joinLateral(
    'LEFT',
    fn(Query $q) => $q->select('body', 'created')
        ->from('comments', 'c')
        ->whereRaw('c.post_id = p.id')
        ->order('created', 'DESC')
        ->limit(1),
    'cm',
);
// LEFT JOIN LATERAL (
//   SELECT `body`, `created` FROM `comments` AS `c`
//   WHERE c.post_id = p.id
//   ORDER BY `created` DESC LIMIT 1
// ) AS `cm` ON TRUE
```

The `p.id` in the subquery is the outer column. It is written with
[`whereRaw()`](/documentation/components/query/expressions#raw-methods), because the text must reach the statement as a column
reference. Logically, the subquery runs once for each row of the outer table,
and `LIMIT 1` keeps only the latest comment.

### Why the Condition Is Raw

A subquery's `where()` treats its right-hand value as data. A string is bound
as a parameter, so `->where('c.post_id', 'p.id')` compares the column with the
text `'p.id'`, not with the outer column. Wrap the outer column in `raw()`
instead:

```php
use function Windwalker\raw;

$subquery = fn(Query $q) => $q->select('body')
    ->from('comments', 'c')
    ->where('c.post_id', raw('p.id'))
    ->limit(1);
```

[`whereRaw()`](/documentation/components/query/expressions#raw-methods) is the usual choice when the condition has more than one part,
or when it calls a function. Use `raw()` when the condition is a single
comparison.

### Join Condition

A lateral join without a condition uses `ON TRUE`, because the subquery
already holds the whole condition. Pass an explicit `true` to write the same
thing yourself. The same `true` works for a regular join.

::: info
Choose `LEFT` when an outer row without a match must still appear. Choose
`INNER` when such rows should be left out.
:::

### Support

`LATERAL` is supported by PostgreSQL and by MySQL 8.0.14 and later. SQLite
does not support it, and the join fails on that database. Check the version
before you use a lateral join in code that runs on more than one database.

::: warning
Inside the subquery, write a reference to an outer column as raw SQL. A plain
string in `where()` is bound as a value. The query runs without an error and
compares against the text of the column name, so it returns the wrong rows.
:::


## Join Sources

A joined source can be a table name, or a subquery. A subquery is useful for an
aggregate that has to be joined as one row per key. Pass a closure that
receives a new query, and give the subquery an alias, because the join
conditions refer to it:

```php
$query = $db->createQuery()
    ->select('u.name', 's.total')
    ->from('users', 'u')
    ->leftJoin(
        fn(Query $q) => $q->select('user_id')
            ->selectRaw('COUNT(*) AS total')
            ->from('posts')
            ->group('user_id'),
        's',
        's.user_id',
        'u.id',
    );
```

Authors without posts appear with a `NULL` total.

A `Query` object built beforehand works too. It is useful when the same
subquery is shared by several joins:

```php
$totals = $db->createQuery()
    ->select('user_id')
    ->selectRaw('COUNT(*) AS total')
    ->from('posts')
    ->group('user_id');

$query->leftJoin($totals, 's', 's.user_id', 'u.id');
```


## Conditions

The condition can take four forms. Choose the one that fits the number of
parts in the condition.

### Two Columns

The arguments are the left column, an optional operator, and the right
column. With two arguments the operator is `=`:

```php
$query->leftJoin('users', 'u', 'u.id', 'p.user_id');

$query->leftJoin('users', 'u', 'u.id', '!=', 'p.user_id');
```

### Several Conditions

Pass an array of conditions. Each element is one condition, written as the
same arguments that `on()` takes:

```php
use function Windwalker\Query\val;

$query->leftJoin(
    'categories',
    'c',
    [
        ['c.id', 'p.category_id'],
        ['c.state', '>', val(0)],
    ],
);
```

A bare value in a join condition is read as a column name, so a value must
be wrapped in `val()`. Without it, `c.state = 1` tries to quote `1` as a
column name, and PHP throws a `TypeError` while the statement is built.

### Closure

A closure receives a `JoinClause`. Use it when the condition has an `OR`, or
when it needs raw SQL:

```php
use Windwalker\Query\Clause\JoinClause;
use function Windwalker\Query\val;

$query->leftJoin(
    'categories',
    'c',
    function (JoinClause $join) {
        $join->on('c.id', 'p.category_id');
        $join->on('c.state', val(1));
    },
);
```

The clause offers three methods:

- `on()` adds a condition. The conditions are joined by `AND`.
- `orOn()` adds a group, written as a closure or an array. The conditions
  inside the group are joined by `OR`, and the group is joined to the rest of
  the `ON` clause by `AND`.
- `onRaw()` adds SQL text. Its template tokens and named bindings work as they
  do in [`whereRaw()`](/documentation/components/query/expressions#raw-methods), see
  [Raw SQL and Bindings](/documentation/components/query/expressions).

```php
use Windwalker\Query\Clause\JoinClause;
use function Windwalker\Query\val;

$query->leftJoin(
    'categories',
    'c',
    function (JoinClause $join) {
        $join->on('c.id', 'p.category_id');

        $join->orOn(
            fn(JoinClause $or) => $or->on('c.title', 'p.title')
                ->on('c.state', val(0)),
        );
    },
);
// ON `c`.`id` = `p`.`category_id`
//   AND (`c`.`title` = `p`.`title` OR `c`.`state` = 0)

$query->leftJoin(
    'categories',
    'c',
    fn(JoinClause $join) => $join->onRaw(
        '%n = %n',
        'c.id',
        'p.category_id',
    ),
);
```

::: warning
As in `where()`, the group added by `orOn()` is always joined with `AND`.
The method name controls the join inside the group only. To express
`a OR (b AND c)` in an `ON` clause, write that part with [`onRaw()`](/documentation/components/query/expressions#raw-methods) and bound
values.
:::

## Aliases and Column Names

Once a query has a join, an unqualified column in `where()` is qualified with
the alias of the `FROM` table. `where('state', 1)` becomes `p`.`state` when
the `FROM` table is `posts AS p`. Other clauses do not get this treatment.
Qualify every column in `select()`, `order()` and `group()` yourself.

Two tables can have a column with the same name, such as `id`. The statement
then returns two columns with the same name, and the row keeps one of them:

```php
$query->select('p.*', 'u.*')
    ->from('posts', 'p')
    ->leftJoin('users', 'u', 'u.id', 'p.user_id');
// The row holds one `id`: the value of `u`.`id` wins.
```

::: warning
The result is not an error. The `id` of the post is replaced silently. Select
explicit aliases for every column that the joined tables share, as shown
below:

```php
$query->select('p.id AS post_id', 'u.id AS user_id', 'u.name')
    ->from('posts', 'p')
    ->leftJoin('users', 'u', 'u.id', 'p.user_id');
```
:::

## Filtering a Joined Table

A condition in `where()` runs after the join. On the joined table of a left
join, it removes the rows whose joined part is missing, because those rows
have `NULL` for the column. The join then behaves like an inner join:

```php
// Removes posts whose category is missing or unpublished.
$query->leftJoin('categories', 'c', 'c.id', 'p.category_id')
    ->where('c.state', 1);
```

To filter the joined table and keep the posts, move the condition into the
`ON` clause, as the showcase does with `val(1)`.

::: tip
Read the `ON` clause as the rule for finding the joined row, and the `WHERE`
clause as the rule for keeping the result. Put a condition on the joined
table in `ON` when the rows of the first table must stay.
:::
