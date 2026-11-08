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

Each raw method has the same signature shape: the text, followed by optional
arguments for the template tokens or the named bindings. The methods are:

- `selectRaw()` for a select expression.
- `whereRaw()` and `havingRaw()` for a condition.
- `setRaw()` for the value of an update.
- `orderRaw()` and `groupRaw()` for sorting and grouping.

```php
$query->setRaw('hits = hits + %a', 1);
$query->orderRaw('FIELD(state, %a, %a)', 2, 1);
```

::: warning
Raw text is copied into the statement unchanged, and no escaping is applied.
Never build the text of a raw method from request data. Put values in
bindings or template arguments instead.
:::

## Template Tokens

The raw methods accept a template. Each `%` token takes the next argument
and formats it according to its type:

- `%n` quotes the argument as a name, such as a column.
- `%q` quotes the argument as a string value, with escaping.
- `%a` writes the argument as a number. A value that is not numeric throws
  an exception, which protects the statement from injected text.
- `%%` writes a literal percent sign.

```php
$query->whereRaw('%n > MONTH(%q)', 'date', '2025-03-02');
// WHERE `date` > MONTH('2025-03-02')

$query->whereRaw('%n = %a', 'stock', 0);
// WHERE `stock` = 0
```

The same tokens work with `format()`, which returns the formatted string
without adding it to a clause:

```php
$text = $query->format('%n = %q', 'title', "It's");
// `title` = 'It\'s'
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
An empty array in `:...name` produces `IN()`, which the database rejects.
Check the list before you bind it, as shown on the
[Conditions](/documentation/components/query/where) page.
:::

The named argument form is supported by `whereRaw()`, `selectRaw()`,
`setRaw()`, `orderRaw()`, and `groupRaw()`.

::: warning
`havingRaw()` does not replace named bindings. A `:name` placeholder passed
to it stays in the SQL unchanged. Build a `HAVING` condition with
`having()` and the operator helpers instead, or use a positional template
argument with `%a` or `%q` for values.
:::

