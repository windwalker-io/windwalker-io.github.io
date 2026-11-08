---
layout: doc
title: JSON
component: query
---

# JSON

Many applications store flexible settings or metadata in a JSON column. The
builder reads values inside that column with a path expression, filters and
sorts on them, and updates a single key without rewriting the whole document.
The same code runs on MySQL, PostgreSQL, SQLite, SQL Server and Oracle, and
each grammar compiles it to the native JSON function of its database.

## Selecting a Path

A path starts with the column name and uses `->` for an object key or an
array index. Use `->>` for the last step when the value should be returned
as text:

```php
$query = $db->createQuery()
    ->select('id', 'params->seo->title AS seo_title')
    ->from('articles');
```

The result is a `Collection` of rows, as with any other select.

The next function lists published articles that have a custom SEO title,
ordered by the views stored inside the same JSON column. It filters on a path
that exists, and sorts by a typed value:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;

function seoArticles(DatabaseAdapter $db): Collection
{
    return $db->createQuery()
        ->select('id', 'title')
        ->select('params->seo->title AS seo_title')
        ->from('articles')
        ->where('state', 1)
        ->whereJsonExists('params->seo->title')
        ->whereJsonNotExists('params->legacy')
        ->order('params->views::int', 'DESC')
        ->all();
}
```

The result is a `Collection` of rows, as with any other select.

The same path works in `where()`, `select()`, and in the `%n` token of a raw
template. In a `where()` condition, the path is compared as a value:

```php
$query->where('foo -> bar ->> yoo', 'YOOOO');

$query->whereRaw('%n = 123', 'foo -> bar ->> yoo');
```

## Cast Suffix

A value read from JSON is text on most platforms, so `'100' < '20'` is true.
Append `::type` after the last path segment to compare or sort the value as a
typed value:

```php
$query->where('data->stock::int', '>', 10);

$query->order('data->created::datetime', 'DESC');
```

Supported types, case-insensitive:

- `int` and `integer`
- `float` and `double`
- `decimal` and `numeric`
- `string` and `text`
- `datetime`
- `date`

Any other type name throws an `InvalidArgumentException`.

::: info
A cast requires at least one path segment, and it must be the last part of
the expression. `a->b::int->c` throws. To use a key that contains `::`, wrap
it in quotes: `data->'a::int'`.
:::

## Path Existence

`whereJsonExists()` checks that a path is present, even when its value is
`null`. `whereJsonNotExists()` checks the opposite:

```php
$query->whereJsonExists('params->seo->title');

$query->whereJsonNotExists('params->legacy');
```

`havingJsonExists()` and `havingJsonNotExists()` are the `HAVING` versions.
To match any of several paths, group them in an `orWhere()` closure, with
the paths written as separate conditions inside the group. Each condition
inside the group is joined by `OR`:

```php
$query->orWhere(function (Query $q) {
    $q->whereJsonExists('params->a')
        ->whereJsonExists('params->b');
});
```

## Comparing Arrays

`whereJsonContainsAll()` checks that a JSON array contains every value that is
passed. A scalar checks one value, and a list checks each of its elements. The
values are joined with `AND`:

```php
$query->whereJsonContainsAll('tags', 'php');

$query->whereJsonContainsAll('tags', ['php', 'json']);
// The array must contain both 'php' and 'json'.
```

For `OR`, put each condition in an `orWhere()` group. The group is joined to
the rest of the `WHERE` clause with `AND`, as described on the
[Conditions](/documentation/components/query/where#nested-groups) page:

```php
$query->where('state', 1)
    ->orWhere(function (Query $q) {
        $q->whereJsonContainsAll('tags', 'php')
            ->whereJsonContainsAll('tags', 'json');
    });
// state = 1 AND (tags contains 'php' OR tags contains 'json')
```

The negated form is `whereJsonNotContainsAll()`. Each method has a `having`
version.

::: info
`whereJsonContains()`, `whereJsonNotContains()`, `havingJsonContains()` and
`havingJsonNotContains()` are deprecated. They keep the earlier behavior, and
take a single value as a string. Use the `ContainsAll` methods in new code.
:::

### Raw JSON Text

When a JSON value is built with `json_encode()`, pass the text through `%q`.
The following example uses MySQL's `JSON_CONTAINS()` directly:

```php
$query->whereRaw(
    'JSON_CONTAINS(`foo`, %q)',
    json_encode(['這是中文'], JSON_UNESCAPED_UNICODE),
);
```

::: warning
Encode the JSON with `JSON_UNESCAPED_UNICODE` when it holds non-ASCII text.
Without the flag, `json_encode()` writes escapes such as `\u9019`. MariaDB
does not match these escapes against the stored text, and the query returns no
rows and no error. Raw `JSON_CONTAINS()` also works only on MySQL and MariaDB.
:::


## Updating a Value

`setJson()` changes one path in an `UPDATE`, without rewriting the document.
The value is encoded as JSON, so a scalar, an array or an object can be
given:

```php
$db->createQuery()
    ->update('articles')
    ->setJson('params->views', 100)
    ->setJson('params->tags', ['php', 'json'])
    ->where('id', 1)
    ->execute();
```

`setJsonRemove()` deletes a key or an array element:

```php
$db->createQuery()
    ->update('articles')
    ->setJsonRemove('params->legacy')
    ->where('id', 1)
    ->execute();
```

`jsonSet()` and `jsonRemove()` return the same expression as a value. Use
them with `set()` when the source and the target column differ, or when one
update needs to nest another:

```php
$query = $db->createQuery()->update('articles');

$query->set('params', $query->jsonSet('params->views', 100))
    ->set('backup', $query->jsonSet('other->n', 5));
```

::: warning
Calling `setJson()` or `setJsonRemove()` more than once for the same column
in one `UPDATE` produces repeated assignments, such as
`SET params = ..., params = ...`. MySQL accepts this, but PostgreSQL and SQL
Server reject it. Change different columns in one statement, or run separate
statements for the same column.
:::

### Empty Values

`whereJsonLength()` compares the number of elements in a JSON array or object.
The generated SQL uses `IFNULL()`, so a `NULL` column counts as length 0. One
condition therefore finds all three cases:

```php
// NULL, an empty array, or an empty object
$query->whereJsonLength('params', 0);

// Arrays with more than two elements
$query->whereJsonLength('params', '>', 2);
```

::: warning
SQLite does not provide JSON length in this package. `whereJsonLength()` throws
a `LogicException` on SQLite, so check the empty case in PHP there.
:::

## Methods

The JSON methods are listed below. Each one is also available in the
[Method Index](/documentation/components/query/methods). The `having` variants
take the same arguments as their `where` counterparts.

| Method | Purpose |
|--------|---------|
| `jsonSelector()` | Builds the expression of a JSON path, for use in a clause. |
| `selectJsonLength()` | Selects the length of a JSON array, with an optional alias. |
| `whereJsonContains()` | Deprecated. Use `whereJsonContainsAll()`. |
| `whereJsonContainsAll()` | Filters rows whose JSON array contains all the values. |
| `whereJsonNotContains()` | Deprecated. Use `whereJsonNotContainsAll()`. |
| `whereJsonNotContainsAll()` | Filters rows where not all the values are in the array. |
| `whereJsonLength()` | Compares the length of a JSON array with a value. |
| `whereJsonExists()` | Filters rows where a JSON path exists. |
| `whereJsonNotExists()` | Filters rows where a JSON path does not exist. |
| `havingJsonContains()` | Deprecated. `HAVING` version of `whereJsonContains()`. |
| `havingJsonContainsAll()` | `HAVING` version of `whereJsonContainsAll()`. |
| `havingJsonNotContains()` | Deprecated. `HAVING` version of `whereJsonNotContains()`. |
| `havingJsonNotContainsAll()` | `HAVING` version of `whereJsonNotContainsAll()`. |
| `havingJsonExists()` | `HAVING` version of `whereJsonExists()`. |
| `havingJsonNotExists()` | `HAVING` version of `whereJsonNotExists()`. |
| `jsonSet()` | Returns an expression that sets a JSON path, for a `set()` value. |
| `jsonRemove()` | Returns an expression that removes a JSON path, for a `set()` value. |
| `setJson()` | Sets a JSON path of a column in an `UPDATE`. |
| `setJsonRemove()` | Removes a JSON path of a column in an `UPDATE`. |

## Platform Notes

- **MySQL** uses `JSON_EXTRACT`, `JSON_SET` and `JSON_CONTAINS_PATH`.
- **PostgreSQL** casts the column to `jsonb` for updates. `jsonb_set` creates
  only the last missing key, so intermediate keys are not created.
- **SQL Server** needs SQL Server 2022 or later for `whereJsonExists()`,
  because it uses `JSON_PATH_EXISTS`. `setJson()` with `null` removes the key.
- **Oracle** uses `JSON_TRANSFORM` for updates and requires Oracle 19c or
  later.

::: info
Path segments in double quotes cannot contain an escaped quote (`\"`). Use a
key name without quotes, or store that key in a different column.
:::
