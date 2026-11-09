---
layout: doc
title: Assertions
part: Components
component: test
---

# Assertions

Framework tests often compare generated text: SQL statements, HTML
fragments, and rendered strings. Two values can be correct and still differ
in spacing, quoting, line endings, or attribute order. A plain `assertEquals()`
fails on such differences and hides the real result. The assertion traits
normalize both sides first, so a test fails only when the meaning changes.

## Enabling the Traits

Choose the trait that matches the output you check:

- `BaseAssertionTrait` for strings, arrays, exceptions, and dumps.
- `DOMTestTrait` for HTML and XML markup.
- `QueryTestTrait` for SQL statements.

`DOMTestTrait` and `QueryTestTrait` already include `BaseAssertionTrait`, so
you do not need to add it separately. Add only the trait you need:

```php
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\DOMTestTrait;

class ButtonTest extends TestCase
{
    use DOMTestTrait;
}
```

## Showcase: Comparing SQL

The following test checks a SQL string produced by code under test. It
replaces the identifier quotes in the expected SQL with the quote style of the
target database, and it compares both sides after formatting:

```php
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\QueryTestTrait;

class ActiveUserSqlTest extends TestCase
{
    use QueryTestTrait;

    protected static array $nameQuote = ['`', '`'];

    public function testSelectsActiveUsers(): void
    {
        $sql = <<<SQL
        SELECT
          `id`, `name`
        FROM `users`
        WHERE `active` = 1
        SQL;

        self::assertSqlFormatEquals(
            'SELECT "id", "name" FROM "users" WHERE "active" = 1',
            $sql
        );
    }
}
```

Set `$nameQuote` when your database quotes identifiers differently from
double quotes. The expected SQL keeps the double quotes, which the trait
replaces. The actual value can be a SQL string or a `Query` object.

## SQL Assertions

Two methods compare SQL, and each one normalizes the text differently:

- `assertSqlFormatEquals($expected, $actual)` formats both sides with
  `SqlFormatter`. Use it for multi-line SQL, where the layout is useful when
  a test fails.
- `assertSqlEquals($expected, $actual)` compresses both sides into one line.
  Use it when only the statement matters.

```php
self::assertSqlEquals(
    'SELECT "id" FROM "users" WHERE "id" = 1',
    $query->render(true)
);
```

## DOM and HTML Assertions

Use the DOM methods for markup that comes from a template or a renderer:

- `assertDomStringEqualsDomString()` minifies both values before the
  comparison.
- `assertDomFormatEquals()` formats both values with `DOMFormatter`.
- `assertHtmlFormatEquals()` formats both values with `HTMLFormatter`.

```php
self::assertDomStringEqualsDomString(
    '<div><span class="badge">New</span></div>',
    $html
);

self::assertHtmlFormatEquals(
    '<ul><li>One</li><li>Two</li></ul>',
    $html
);
```

## String and Array Assertions

- `assertStringDataEquals()` collapses runs of whitespace and trims both
  strings, so indentation and line breaks do not matter.
- `assertStringSafeEquals()` unifies `\r\n` line endings and trims both
  strings. Use it when the test runs on several operating systems.

```php
self::assertStringDataEquals(
    "Hello    World",
    "Hello World"
);
```

- `assertArraySimilar()` compares arrays without respect to key order. It
  sorts keys recursively for an associative array.

```php
self::assertArraySimilar(
    ['b' => 2, 'a' => 1],
    ['a' => 1, 'b' => 2]
);
```

::: info
When the expected array is a list, its values are sorted before the
comparison, so their order does not matter. For an associative array, only
keys are sorted, and nested lists keep their order. Assert the order
separately when it is part of the behavior.
:::

## Exception Assertions

`assertExpectedException()` runs a closure and checks the thrown exception.
The class is required, and the message prefix and the code are optional:

```php
self::assertExpectedException(
    fn () => $parser->parse(''),
    InvalidArgumentException::class,
    'Empty input'
);
```

The message check uses the start of the message, not the full text. The
helper fails the test when the closure does not throw.

## Dumping Arrays

`dumpArray()` prints an array as PHP code, which helps when you write the
expected value for a test. Pass `true` as the third argument to receive the
string instead of printing it:

```php
$code = self::dumpArray($result, [], true);
```

::: tip
Remove dump calls before you commit the test. The output appears in the test
run and makes the results harder to read.
:::
