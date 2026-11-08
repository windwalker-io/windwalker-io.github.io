---
layout: doc
title: Introduction
component: query
---

# Introduction

Windwalker Query is a SQL query builder. It assembles `SELECT`, `INSERT`,
`UPDATE`, `DELETE` and `UPSERT` statements from chained method calls,
renders them for the target database, and keeps every value as a bound
parameter. Use it when a fixed SQL string is too rigid, for example when a
search form adds conditions at runtime, but the statement must still be
built safely and run on more than one database.

The package is built from four parts:

- `Query` is the builder. Each method adds a clause to the statement and
  returns the same object, so calls can be chained.
- Grammar classes render the clauses for a dialect. `MySQLGrammar`,
  `PostgreSQLGrammar`, `SQLiteGrammar`, `SQLServerGrammar` and
  `OracleGrammar` cover the supported databases, and `BaseGrammar` is used
  when no dialect is chosen. The grammar decides how identifiers are
  quoted, how `LIMIT` is written and how an upsert is rendered.
- `Escaper` gives the grammar a connection, so values can be escaped when
  the statement is shown as text.
- Helper functions such as `raw()`, `val()`, `qn()` and `expr()` mark a
  value as SQL text, a plain value, an identifier or an expression.

The builder does not run anything by itself. A query is executed through a
`DatabaseAdapter` from the [Database](/documentation/components/database/)
package, or through an `ORM` instance. Without one of these, a `Query` can
still render SQL and hand it to PDO.

## Installation

```bash
composer require windwalker/query ^4.0
```

Windwalker Query 4.x requires PHP 8.4.6 or later.

## Use as Standalone Component

Pass a PDO connection and a grammar to the constructor. The query renders
the SQL with `?` placeholders, and `forPDO()` returns the values in the
same order:

```php
use Windwalker\Query\Grammar\MySQLGrammar;
use Windwalker\Query\Query;

$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

$query = (new Query($pdo, new MySQLGrammar()))
    ->select('id', 'title')
    ->from('posts')
    ->where('state', 1)
    ->order('id', 'DESC')
    ->limit(10);

$sql = $query->forPDO($bounded);

$stmt = $pdo->prepare($sql);
$stmt->execute($bounded);

$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

Declare `$bounded` without assigning a value first, as in the example.
`forPDO()` fills it only when it is `null`.

::: warning
The escaper keeps only a weak reference to the connection. Keep the PDO in
a variable for as long as the query is used. A PDO created inline, such as
`new Query(new PDO(...))`, is destroyed after the constructor returns, and
the next call that needs to quote a value throws
`UnexpectedValueException`. See [Grammars and Escaper](/documentation/components/query/grammars).
:::

A standalone query cannot fetch rows. Calling `get()`, `all()` or `result()`
without a `DatabaseAdapter`, driver or `ORM` throws a
`BadMethodCallException`. Run the SQL through PDO, as shown above, or use
the database package.

## Use in Windwalker Application

Inside a Windwalker application, the builder comes from the
`DatabaseAdapter` that the host app has already configured. Do not create a
new connection. Inject the adapter, then call `createQuery()`:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;

class PostRepository
{
    public function __construct(
        protected DatabaseAdapter $db
    ) {
    }

    public function findPublished(): Collection
    {
        return $this->db->createQuery()
            ->select('id', 'title')
            ->from('posts')
            ->where('state', 1)
            ->all();
    }
}
```

The same object can be retrieved from the container or the application:

```php
$db = $container->get(DatabaseAdapter::class);

$db = $app->retrieve(DatabaseAdapter::class);

$query = $db->createQuery();
```

`createQuery()` returns a builder whose escaper is the adapter, so
`get()`, `all()`, `result()` and `count()` run the statement directly.
The ORM builds its selectors on the same class: `$orm->from(Post::class)`
returns a `SelectorQuery`, which extends `Query`.

## Core Concepts

A query object is mutable. Every builder method changes the same object
and returns it. To reuse a base query for two different results, clone it
before adding the conditions for each branch:

```php
$base = $db->createQuery()->select('*')->from('posts');

$published = clone $base;
$published->where('state', 1);

$drafts = clone $base;
$drafts->where('state', 0);
```

Values and SQL text are kept apart. A value passed to `where()`, `set()` or
`values()` is bound as a parameter and never copied into the SQL string.
Text enters the statement only through an explicit helper, such as
`raw()`, `whereRaw()` or `selectRaw()`. The
[Raw SQL and Bindings](/documentation/components/query/expressions) page
explains the difference.

## Topic Pages

- [Selecting Data](/documentation/components/query/select): columns, tables
  and aliases, joins, ordering, grouping, limits, locks and combined
  queries.
- [Conditions](/documentation/components/query/where): `where()`, nested
  groups, `having()`, operators, `NULL`, `IN` and `EXISTS`.
- [Writing Data](/documentation/components/query/writing): inserts, updates
  and deletes built with the query builder.
- [Upsert](/documentation/components/query/upsert): insert a row, or update
  it when a unique key already exists.
- [Raw SQL and Bindings](/documentation/components/query/expressions): the
  helper functions, template tokens and named bindings.
- [JSON](/documentation/components/query/json): JSON paths, casts, existence
  checks and partial updates.
- [Common Table Expressions](/documentation/components/query/cte): `WITH`
  and recursive queries.
- [Iteration](/documentation/components/query/iteration): processing large
  result sets, and cursor pagination.
- [Rendering and Debugging](/documentation/components/query/rendering): the
  SQL text, the bound values and the PDO form.
- [Grammars and Escaper](/documentation/components/query/grammars): the
  dialects, quoting, and how the builder reaches a connection.

## Related components

- [Database](/documentation/components/database/): connections, fetching
  rows, transactions, the writer and the schema tools. Start with
  [Queries](/documentation/components/database/queries) to see how a
  built query is executed.
- [ORM](/documentation/components/orm/): entity mapping that builds on the
  same query objects.
