---
layout: doc
title: Queries
component: database
---

# Queries

Most work with the database is reading and writing rows. The adapter runs
SQL through a statement object, which binds parameters, executes the query
and returns the result in the shape you ask for. Queries can be plain SQL
strings or objects built with the Query component.

## Setup

Assume `$db` is a `DatabaseAdapter`, obtained as described in the
[Introduction](/documentation/components/database/).

`execute()` runs a query and returns the statement. `prepare()` creates a
statement without running it, which lets you bind values or fetch rows
later:

```php
$stmt = $db->prepare('SELECT * FROM posts WHERE state = ?');

$posts = $stmt->execute([1])->all();
```

Table prefixes are covered in
[Connections](/documentation/components/database/connections#table-prefix).

## Showcase

A typical read and write sequence, using positional placeholders:

```php
// Read a single value.
$count = (int) $db->prepare(
    'SELECT COUNT(*) FROM posts WHERE author_id = ?'
)->execute([$authorId])->result();

// Read rows as arrays.
$rows = $db->prepare(
    'SELECT id, title FROM posts WHERE author_id = ? ORDER BY id'
)->execute([$authorId])->all();

// Run a write statement.
$db->execute(
    'UPDATE posts SET state = ? WHERE id = ?',
    [0, 10],
);
```

Each placeholder is bound to the value at the same position in the array.
Always pass values as parameters, not as string fragments in the SQL.

## Fetching Results

A statement offers several ways to read the result. Pick the one that
matches the shape you need:

- `all()`: every row, returned as a `Collection`.
- `get()`: the first row, or `null` when there is none.
- `fetch()`: the next row each time it is called, or `null` at the end.
- `result()`: the first column of the first row, or `null`.
- `loadColumn()`: one column across all rows, as a `Collection`.
- `getIterator()`: iterates over the rows without loading them all.

Without a class argument, rows are returned as arrays. The result methods
`all()`, `get()`, `fetch()` and `getIterator()` take an optional class name
as their first argument.

### Hydrating Rows into Objects

Pass a class name, and each row is hydrated into a new instance of that
class. Columns are matched to properties by name:

```php
use App\Entity\Post;

$posts = $db->prepare('SELECT * FROM posts')
    ->execute()
    ->all(Post::class);

$post = $db->prepare('SELECT * FROM posts WHERE id = ?')
    ->execute([1])
    ->get(Post::class);
```

The same argument works with `fetch()` and `getIterator()`:

```php
$stmt = $db->prepare('SELECT * FROM posts')->execute();

while ($post = $stmt->fetch(Post::class)) {
    // ...
}
```

::: info
The class is created with `new`, without constructor arguments. The class
must be constructible without any arguments, and the hydrator writes the
row values to its properties afterwards.
:::

### Iterating Large Results

`getIterator()` yields one hydrated row at a time, so a large table can be
processed without holding every row in memory:

```php
$logs = $db->prepare('SELECT * FROM logs')
    ->getIterator(Log::class);

foreach ($logs as $log) {
    // ...
}
```

`result(true)` throws an exception when no row is found, instead of
returning `null`. Use it when a missing value is an error.

## Query Builder

`createQuery()` returns a `Query` object bound to the adapter's platform,
so the generated SQL follows the current database dialect. Build the query
with chained calls, then run it with the same fetch methods as a statement:

```php
$posts = $db->createQuery()
    ->select('id', 'title')
    ->from('posts')
    ->where('state', 1)
    ->order('id', 'DESC')
    ->all(Post::class);

$post = $db->createQuery()
    ->select('*')
    ->from('posts')
    ->where('id', 1)
    ->get(Post::class);
```

Each builder method returns the query, so the chain can continue until a
fetch method ends it. `get()`, `all()`, `result()`, `loadColumn()` and
`execute()` run the query directly. `getIterator()` and `count()` are
available as well.

A query can also be passed to `prepare()` or `execute()` like a string,
when you need to bind values through the statement first:

```php
$stmt = $db->prepare($query);
```

`getQuery()` returns the last query the adapter has used for building, and
`getLastQuery()` returns the last query executed. Both are useful for
debugging.

## Transactions

`transaction()` runs a callback inside a transaction. If the callback
returns normally, the transaction is committed. If it throws, the
transaction is rolled back and the exception is rethrown. The callback
receives the adapter and the platform:

```php
use Windwalker\Database\DatabaseAdapter;

$postId = $db->transaction(function (DatabaseAdapter $db) use ($data) {
    $db->writer->insertOne('posts', $data, 'id');

    $db->writer->insertOne(
        'post_logs',
        ['post_id' => $data['id'], 'action' => 'created'],
    );

    return $data['id'];
});
```

Use `isInTransaction()` to check whether a transaction is open.

Pass `autoCommit: false` to keep the transaction open after the callback
returns. The commit or rollback is then your code's responsibility, and
the platform provides both:

```php
$db->transaction(
    function (DatabaseAdapter $db) use ($data) {
        $db->writer->insertOne('posts', $data, 'id');
    },
    autoCommit: false,
);

// Later, when the rest of the work has succeeded:
$db->getPlatform()->transactionCommit();
```

::: info
Exceptions still roll back an open transaction, even with
`autoCommit: false`. Call `transactionCommit()` only after the work is
complete.
:::

Pass `enabled: false` to run the callback without a transaction. The
callback receives the same arguments, which keeps one code path for
environments where transactions are not wanted, such as some test setups:

```php
$db->transaction(
    fn (DatabaseAdapter $db) => $db->writer->insertOne(
        'posts',
        $data,
        'id',
    ),
    enabled: $useTransactions,
);
```

::: warning
The database rollback does not undo effects outside the database. Do not
send an email or call an external API inside the callback and assume it can
be reverted; run such work after the transaction returns.
:::

::: tip
Keep transactions short. A long transaction holds locks and keeps a
connection busy, which matters most when a connection pool is in use.
:::

## Counting Rows

`countWith()` returns the number of rows a query would return. It wraps the
query in a count, so the query's own columns are not fetched. Use it for
pagination when the query contains `GROUP BY`:

```php
$total = $db->countWith(
    $db->createQuery()
        ->select('author_id')
        ->from('posts')
        ->group('author_id'),
);
```

The query builder is also supports chaining `count()` directly:

```php
$total = $db->createQuery()
    ->select('author_id')
    ->from('posts')
    ->group('author_id')
    ->count();
```
