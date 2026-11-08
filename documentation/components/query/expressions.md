---
layout: doc
title: Raw SQL and Bindings
component: query
---

# Raw SQL and Bindings

The builder quotes every name and binds every value, so most statements
need no raw text at all. Some SQL cannot be expressed that way: a database
function, an arithmetic expression, or a comparison between two columns. For
these cases the builder provides helpers that mark a piece of SQL as raw,
and placeholders that bind values safely inside raw text.

## Why Raw Text Is Separate

A string passed to `where()` or `select()` is a column name, and the builder
quotes it. A string passed to a raw method is copied into the statement as
written. The two behaviors cannot be mixed by accident:

```php
$query->select('COUNT(*)');           // quoted identifier, invalid
$query->selectRaw('COUNT(*)');        // raw SQL, valid
$query->where('title', 'hello');      // value, bound
$query->whereRaw('title = ?', 'hi');  // raw text with a bound value
```

## Helper Functions

The functions below are in the `Windwalker` and `Windwalker\Query`
namespaces. Each one marks its argument with a specific meaning:

- `raw()` keeps a string as SQL text. It is used for values that should not
  be bound, such as a function call or a column on the other side of a
  comparison.
- `qn()` quotes a name as an identifier, for a column or table that the
  builder should quote with the dialect's style.
- `val()` marks a plain value. It is needed inside join conditions, where a
  bare value would be read as a column name.
- `expr()` builds an expression clause from a name and elements. It is used
  for SQL constructs such as `EXISTS()`.

```php
use function Windwalker\raw;
use function Windwalker\Query\qn;
use function Windwalker\Query\val;

$query->where('created', '<=', raw('NOW()'));

$query->where(qn('owner.id'), 1);

$query->leftJoin(
    'categories',
    'c',
    [
        ['c.id', 'p.category_id'],
        ['c.state', '>', val(0)],
    ]
);
```

`raw()` and `val()` return objects. Passing them where a column is
expected, or passing a bare string where a value is expected, produces
a different statement, so check the output with `render(true)` while you
develop. See [Rendering and Debugging](/documentation/components/query/rendering).

## Showcase

The next function builds a report of posts that have more views than the
average of their category. It combines a column comparison, a raw
expression, and bound values in one statement:

```php
use Windwalker\Data\Collection;
use Windwalker\Database\DatabaseAdapter;
use function Windwalker\raw;

function hotPosts(DatabaseAdapter $db, int $minDays): Collection
{
    return $db->createQuery()
        ->select('p.id', 'p.title')
        ->selectRaw('DATEDIFF(NOW(), p.created) AS age')
        ->from('posts', 'p')
        ->where('p.state', 1)
        ->whereRaw(
            'p.views > (
                SELECT AVG(views) FROM posts o
                WHERE o.category_id = p.category_id
            )'
        )
        ->whereRaw('DATEDIFF(NOW(), p.created) >= :days', days: $minDays)
        ->order('age', 'ASC')
        ->all();
}
```

`DATEDIFF` is MySQL syntax, so this statement runs on MySQL. The value
`$minDays` is bound, and the raw SQL contains no request data.

## Raw Methods

Each raw method takes the text, followed by optional template arguments or
named bindings. The template is processed by [`format()`](/documentation/components/query/expressions#format). The methods are:

- `selectRaw()` for a select expression.
- `whereRaw()` and `havingRaw()` for a condition.
- `setRaw()` for the value of an update.
- `orderRaw()` and `groupRaw()` for sorting and grouping.
- `onRaw()` for a join condition, see [Joins](/documentation/components/query/join).

```php
$query->setRaw('hits = hits + %a', 1);
$query->orderRaw('FIELD(state, %a, %a)', 2, 1);
```

::: warning
Raw text is copied into the statement unchanged, and no escaping is applied.
Never build the text of a raw method from request data. Put values in
bindings or template arguments instead.
:::

## format()

`format()` is the template engine behind the raw methods. It takes a string
with `%` tokens and the values for them, and returns the formatted text. It
does not add anything to a clause, so its result can be passed to a raw method
later:

```php
$text = $query->format('%n = %q', 'title', "It's");
// `title` = 'It\'s'

$query->whereRaw($query->format('created < %t'));
```

::: warning
A raw method formats its text only when it receives arguments. With no
arguments, `whereRaw('created < %t')` and `whereRaw('title LIKE %%')` keep the
tokens as written, and the statement contains `%t` or `%%`. Build the text with
`format()` first, as the last line above does, or pass an argument.
:::

### Token Table

Each row links to the section that describes the token. The date tokens
come in lowercase and uppercase pairs. The lowercase token takes a value, and
the uppercase one takes a column name.

| Token | Writes | Details |
|-------|--------|---------|
| `%n` | Name, a column or table | [`%n`](#token-n) |
| `%q` | Quoted, escaped string | [`%q`](#token-q) |
| `%e` | Escaped value, no quotes | [`%e`](#token-e) |
| `%a` | Number, no quotes | [`%a`](#token-a) |
| `%b` | `true` or `false` | [`%b`](#token-b) |
| `%r` | Value as it is | [`%r`](#token-r) |
| `%%` | Literal `%` | [`%%`](#token-percent) |
| `%y` / `%Y` | `year()` | [Year](#token-y) |
| `%m` / `%M` | `month()` | [Month](#token-m) |
| `%d` / `%D` | `day()` | [Day](#token-d) |
| `%h` / `%H` | `hour()` | [Hour](#token-h) |
| `%i` / `%I` | `minute()` | [Minute](#token-i) |
| `%s` / `%S` | `second()` | [Second](#token-s) |
| `%t` | Current timestamp | [`%t`](#token-t) |
| `%z` / `%Z` | Null date, unquoted or quoted | [`%z`](#token-z) |

### How Arguments Are Consumed

- A value token takes the next argument, from left to right.
- A token with a position, such as `%2$n`, takes that argument. It does not
  move the counter of the tokens that follow.
- A missing argument becomes an empty string. `format('%q %q', 'only')`
  returns `'only' ''`.
- An array is written as a comma-separated list, and each element is formatted
  with the same token:

```php
$query->format('%2$n = %1$q', 'x', 'col');
// `col` = 'x'

$query->format('%n IN (%a)', 'id', [1, 2, 3]);
// `id` IN (1, 2, 3)

$query->format('%n', ['a', 'b']);
// `a`, `b`
```

### Value Tokens

#### `%n` Name {#token-n}

Writes a name, such as a column or a table. A dotted name is split, and each
part is quoted. A JSON path is written as a JSON function call:

```php
$query->format('%n', 'users.name');
// `users`.`name`

$query->format('%n', 'data->a->b');
// JSON_EXTRACT(`data`, '$.a.b')
```

#### `%q` Quoted string {#token-q}

Writes a string value, escaped and wrapped in quotes:

```php
$query->format('%q', "It's");
// 'It\'s'
```

#### `%e` Escaped value {#token-e}

Writes an escaped value without quotes. Put the quotes in the text:

```php
$query->format("title = '%e'", "It's");
// title = 'It\'s'
```

#### `%a` Number {#token-a}

Writes a number without quotes. A value that is not numeric throws a
`CastingException`, which keeps injected text out of the statement:

```php
$query->format('stock = %a', '12');
// stock = 12
```

#### `%b` Boolean {#token-b}

Writes `true` or `false`. It accepts only a real boolean. A string such as
`'1'`, or the integer `0`, throws a `CastingException`:

```php
$query->format('active = %b', true);
// active = true
```

#### `%r` Raw {#token-r}

Writes the value as it is, with no quoting and no escaping. Use it for SQL
text that the builder has already produced or has been checked:

```php
$query->format('%r', 'CASE WHEN 1 THEN 2 END');
// CASE WHEN 1 THEN 2 END
```

::: warning
`%r` copies the value into the statement unchanged. Never pass request data to
`%r`, and never put user input in the text of a format string.
:::

#### `%%` Literal percent {#token-percent}

Writes a single `%`. Use it in text that also contains tokens, such as a
pattern for `LIKE`. It has no effect unless the text is formatted, see the
warning above.

### Date Tokens

The date tokens wrap a value in a call to a function named after the unit.
The lowercase form takes a date value and quotes it. The uppercase form takes a
column name and writes it as a name.

#### `%y` / `%Y` Year {#token-y}

Writes `year()`. Lowercase `%y` takes a date value, uppercase `%Y` takes a
column name:

```php
$query->format('%d', '2025-01-02');
// day('2025-01-02')

$query->format('%Y = %a', 'created', 2025);
// year(`created`) = 2025
```

#### `%m` / `%M` Month {#token-m}

Writes `month()`. `%m` takes a date value, `%M` takes a column name:

```php
$query->format('%m', '2025-01-02');
// month('2025-01-02')
```

#### `%d` / `%D` Day {#token-d}

Writes `day()`. `%d` takes a date value, `%D` takes a column name.

#### `%h` / `%H` Hour {#token-h}

Writes `hour()`. `%h` takes a date value, `%H` takes a column name.

#### `%i` / `%I` Minute {#token-i}

Writes `minute()`. `%i` takes a date value, `%I` takes a column name.

#### `%s` / `%S` Second {#token-s}

Writes `second()`. `%s` takes a date value, `%S` takes a column name.

::: info
The date tokens write generic function names, such as `year()`. Not every
database provides these names. PostgreSQL has no `year()` function, so use
`%r` with the native expression, such as `EXTRACT(YEAR FROM ...)`.
:::

### Constant Tokens

These tokens take no argument, and they do not move the argument counter.

#### `%t` Current timestamp {#token-t}

Writes the current timestamp expression, such as `current_timestamp()` on
MySQL:

```php
$query->format('expires > %t');
// expires > current_timestamp()
```

#### `%z` / `%Z` Null date {#token-z}

Writes the null date of the grammar. `%z` writes it unquoted, and `%Z` writes
it quoted. The value depends on the dialect: MySQL uses `1000-01-01 00:00:00`,
and PostgreSQL uses `1970-01-01 00:00:00`:

```php
$query->format('deleted = %Z');
// deleted = '1000-01-01 00:00:00'
```

## Named Bindings


A named argument becomes a bound parameter. Use `:name` in the text and pass
the value as a named argument. The value is bound, and its placeholder is
replaced when the statement is rendered:

```php
$query->whereRaw(
    'published_at BETWEEN DATE(:start) AND DATE(:end)',
    start: $start,
    end: $end,
);
```

A list of values is bound with `:...name`. Each element gets its own
placeholder, and the list is written as a comma-separated set:

```php
$query->whereRaw('id IN(:...ids)', ids: $ids);
```

::: info
An empty array in `:...name` produces `IN()`. MySQL rejects it as a syntax
error, and SQLite matches no rows. Check the list before you bind it, as shown
on the [Conditions](/documentation/components/query/where) page.

```php
$query->whereRaw('id IN(:...ids)', ids: $ids ?: [0]);
```
:::

The named argument form is supported by [`whereRaw()`](/documentation/components/query/expressions#raw-methods), [`selectRaw()`](/documentation/components/query/expressions#raw-methods),
`setRaw()`, `orderRaw()`, and `groupRaw()`.

::: warning
[`havingRaw()`](#raw-methods) does not replace named bindings. A `:name` placeholder passed
to it stays in the SQL unchanged. Build a `HAVING` condition with
`having()` and the operator helpers instead, or use a positional template
argument with `%a` or `%q` for values.
:::

