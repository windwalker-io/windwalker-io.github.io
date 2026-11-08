---
layout: doc
title: Grammars and Escaper
component: query
---

# Grammars and Escaper

A builder describes a statement without knowing the target database. The
grammar supplies the database-specific parts when the statement is rendered:
the identifier quotes, the paging syntax, the upsert and the JSON functions.
The escaper gives the builder access to a connection, so that quoting and
escaping use the connection's own rules. Both are set when the builder is
created.

## Grammar Classes

Each supported dialect has a grammar class. Pass an instance to the query
constructor:

- `MySQLGrammar` quotes names with backticks, and writes `LIMIT offset, count`.
- `SQLiteGrammar` quotes names with backticks, and uses the same paging as MySQL.
- `PostgreSQLGrammar` quotes names with double quotes, and writes
  `LIMIT count OFFSET offset`.
- `SQLServerGrammar` quotes names with square brackets, and pages with
  `TOP` and `ROW_NUMBER()`.
- `OracleGrammar` quotes names with double quotes and upper-cases them, and
  pages with `OFFSET ... FETCH`.
- `BaseGrammar` is the generic grammar. It quotes names with double quotes
  and is used when no dialect is given.

The same builder renders the statement for each grammar:

```php
use Windwalker\Query\Grammar\PostgreSQLGrammar;
use Windwalker\Query\Grammar\SQLServerGrammar;
use Windwalker\Query\Query;

$query = fn($grammar) => (new Query(null, $grammar))
    ->select('id')
    ->from('posts')
    ->order('id')
    ->limit(10)
    ->offset(20);

$query(new PostgreSQLGrammar())->render(true);
// SELECT "id" FROM "posts" ORDER BY "id" LIMIT 10 OFFSET 20

$query(new SQLServerGrammar())->render(true);
// SELECT * FROM (SELECT *, ROW_NUMBER() OVER ...) AS A
//   WHERE RowNumber > 20
```

::: info
`DatabaseAdapter::createQuery()` creates the builder with the grammar of the
adapter's platform, so code inside a Windwalker application does not need to
choose a grammar.
:::

## Escaper

The escaper holds the connection that the builder uses to escape and quote
values. Use it with `render(true)`, and with any method that needs the
database's own rules. The connection can be:

- a `PDO` instance
- a `DatabaseAdapter` or a database driver
- an `ORM` instance
- a callable that receives the value and returns the escaped text
- `null`, which uses the grammar's built-in escaping

```php
$escaper = fn(string $value, callable $strip) => str_replace(
    "'",
    "\\'",
    $value,
);

$query = new Query($escaper, new MySQLGrammar());
```

::: warning
The escaper keeps only a weak reference to the connection. The builder does
not own the object, so the object must be kept alive by a variable or another
owner. A connection created inline, such as `new Query(new PDO(...))`, is
freed when the constructor returns. The next call that quotes a value throws
`UnexpectedValueException: Escaper connection is NULL`. Store the connection
in a variable, and keep it in scope as long as the query is in use. The
same rule applies to a closure passed as the escaper.
:::

### Without a Connection

A builder created with `null` as the escaper can still render SQL. Values are
escaped with the rules built into the grammar, so the statement looks right
in a test or a log. Those rules do not replace a real connection's quoting
rules, so run the statement through a connection, and use this mode for
rendering only.

```php
$query = new Query(null, new MySQLGrammar());

$query->select('*')
    ->from('posts')
    ->where('title', "O'Reilly")
    ->render(true);
// SELECT * FROM `posts` WHERE `title` = 'O\'Reilly'
```

A query without a connection cannot fetch rows. Calling `get()`, `all()`,
`result()` or `execute()` throws a `BadMethodCallException`, because the
builder needs a `DatabaseAdapter`, a driver or an `ORM` to run the statement.
See [Queries](/documentation/components/database/queries) in the database
package.

## Default Grammar and Escaper

When `new Query()` is created with no arguments, the builder uses the default
connection. The `DefaultConnection` class holds the default escaper and
grammar as static values. Set them once during bootstrap, so that every
builder created with no arguments uses them:

```php
use Windwalker\Query\DefaultConnection;
use Windwalker\Query\Grammar\MySQLGrammar;

DefaultConnection::setGrammar(new MySQLGrammar());
```

The default escaper is held by `DefaultConnection` as a strong reference, so it
stays alive for the whole process. Set the defaults during bootstrap:

## Platform-Specific Behavior

Some features depend on the dialect, and the builder renders each one
accordingly. Each feature has its own page with the details:

- [Upsert](/documentation/components/query/upsert): `ON DUPLICATE KEY
  UPDATE`, `ON CONFLICT`, and `MERGE`.
- [JSON](/documentation/components/query/json): each database has its own
  JSON functions, and each has its own version requirements.
- [Common Table Expressions](/documentation/components/query/cte): the
  `RECURSIVE` keyword is omitted for SQL Server and Oracle.
- [Writing Data](/documentation/components/query/writing): `set()` in an
  insert is valid on MySQL only.
