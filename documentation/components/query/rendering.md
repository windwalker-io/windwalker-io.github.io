---
layout: doc
title: Rendering and Debugging
component: query
---

# Rendering and Debugging

A builder object is a description of a statement. Before it runs, the
description has to be turned into SQL text and a list of values. Rendering
does that step, and it is useful in three situations: when the SQL must be
passed to PDO, when a bug report needs the exact statement, and when a test
checks the output of a builder.

## Forms of the SQL

The same query can be rendered in several forms. Each form suits a different
job:

- `(string) $query` or `__toString()` returns the SQL with named placeholders
  such as `:wqp__1`. The values are not included.
- `render()` returns the same SQL. The optional array argument receives the
  bound parameters, keyed by the placeholder names. Each entry holds the
  value and its data type.
- `render(true)` returns the SQL with the values written in, escaped for the
  dialect. It is meant for reading.
- `forPDO()` returns the SQL with `?` positional placeholders. The values
  come back in the second argument, in the order of the placeholders.

```php
$query = $db->createQuery()
    ->select('id', 'title')
    ->from('posts')
    ->where('state', 1)
    ->where('id', [1, 2]);

$query->render(true);
// SELECT `id`, `title` FROM `posts` WHERE `state` = 1 AND `id` IN (1, 2)

$sql = $query->forPDO($bounded);
// SELECT `id`, `title` FROM `posts` WHERE `state` = ? AND `id` IN (?, ?)
// $bounded is [1, 1, 2]
```

## Showcase

The next function runs a query through PDO without the database package. It
renders the statement in the form PDO expects, runs it with the values, and
returns the rows. The connection is kept in a variable, as the escaper needs
it for the lifetime of the query:

```php
use Windwalker\Query\Grammar\MySQLGrammar;
use Windwalker\Query\Query;

function fetchPosts(PDO $pdo, int $state): array
{
    $query = (new Query($pdo, new MySQLGrammar()))
        ->select('id', 'title')
        ->from('posts')
        ->where('state', $state)
        ->order('id', 'DESC')
        ->limit(20);

    $sql = $query->forPDO($bounded);

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bounded);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
```

When the query runs through `DatabaseAdapter`, the adapter performs the same
steps, so the `render()` output is what a log of the statement would show.

## Logging the Statement

To log a statement, use the form that matches the log. A log of the raw
statement with the values written in is easy to read. A log that must
reproduce the statement exactly uses the bound values:

```php
$logger->debug('Posts query', [
    'sql' => $query->render(),
    'bound' => $query->getMergedBounded(),
]);
```

`getMergedBounded()` returns the values of the whole query, and its keys match
the placeholders in `render()`.

## Debug Output

`debug()` renders the statement with the values written in, formats it, and
prints it. Pass `asString: true` to get the text back instead. Pass a closure
to receive the text without printing it:

```php
$query->debug();

$sql = $query->debug(asString: true);

$query->debug(function (string $sql) use ($logger) {
    $logger->debug($sql);
});
```

::: warning
`debug()` writes to the output by default. In a web response, that output is
sent to the client, and it can expose table names and values. Use the closure
or `asString: true` in code that serves requests, and remove the calls before
the code is deployed.
:::

## Notes on Binding

Declare `$bounded` without a value when you pass it to `forPDO()` or
`render()`. The method fills the variable only when it is `null`. An array
that is already set is kept as it is, so no values are collected into it:

```php
// Correct: $bounded is filled by the call.
$sql = $query->forPDO($bounded);

// Wrong: the empty array is kept, and no values are collected.
$bounded = [];
$sql = $query->forPDO($bounded);
```

::: info
`render(true)` writes the values into the SQL text. It is not a statement that
bypasses binding, so use it for reading. Run the form returned by `forPDO()` or
by the database adapter instead.
:::

## Placeholders in Raw Text

A placeholder inside a raw method, such as `:days` in [`whereRaw()`](/documentation/components/query/expressions#raw-methods), is part of
the same binding system. It appears in `render()` output, and its value is
written in by `render(true)`. The rules for raw placeholders are described on
the [Raw SQL and Bindings](/documentation/components/query/expressions) page.

## Related Pages

- [Queries](/documentation/components/database/queries): the adapter that
  runs a rendered statement.
- [Events](/documentation/components/database/events): query events for
  logging the statement that runs.
