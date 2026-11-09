---
layout: doc
title: Introduction
part: Components
component: test
---

# Introduction

Windwalker Test is a set of PHPUnit traits for testing Windwalker code.
It does not replace PHPUnit. You add a trait to your test class and get
helpers for comparing SQL and HTML, preparing a database, reading private
members, and skipping tests when an optional service is not available.

## Why Test

Framework output is often correct but written in different ways. Two SQL
statements can differ only in spacing or identifier quoting, and two HTML
fragments can differ only in whitespace. A plain string comparison fails on
these differences, so the test breaks for a reason that has nothing to do
with behavior.

The package normalizes both sides before it compares them. Each trait is
small and independent, so a test class uses only the helpers it needs.

## Installation

```bash
composer require --dev windwalker/test ^4.0
```

Windwalker Test 4.x requires PHP 8.4.6 or later. The package itself requires
only PHP.

::: info
The traits call classes from other Windwalker packages, such as
`windwalker/utilities`, `windwalker/dom`, `windwalker/query`, and
`windwalker/database`. Composer does not install them for you, so install
the packages whose helpers you use.
:::

## Use as Standalone Component

Add a trait to any PHPUnit test case. The following example uses the base
assertion trait, which needs no database or container:

```php
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\BaseAssertionTrait;

class ParserTest extends TestCase
{
    use BaseAssertionTrait;

    public function testIgnoresLineEndingStyle(): void
    {
        self::assertStringSafeEquals(
            "Hello\r\nWorld\n",
            "Hello\nWorld"
        );
    }
}
```

## Use in Windwalker

The package does not register services in the DI container, so there is
nothing to inject or retrieve. Use the traits in the test classes of your
application or package, as shown above. The framework's own packages do the
same. For example, the queue and renderer test suites use
`DatabaseTestTrait` and `DOMTestTrait`.

## Core Concepts

- **Traits, not base classes.** Each helper is a trait, so you can keep your
  own base test class and add only the traits you need.
- **Normalize, then compare.** Assertions reduce both sides to a canonical
  form, such as collapsed whitespace, unified line endings, or formatted SQL,
  before they compare them.
- **Skip when a service is missing.** Database and Swoole helpers skip the
  test when the database or extension is not configured, instead of failing.

## Topic Pages

- [Assertions](/documentation/components/test/assertions): string, array,
  exception, SQL, and HTML comparison helpers.
- [Database Tests](/documentation/components/test/database): a shared
  database connection for test classes, configured through a DSN.
- [Accessing Members](/documentation/components/test/accessors): read, write,
  and call private members through reflection.
- [Swoole Tests](/documentation/components/test/swoole): optional helpers for
  tests that run asynchronous code on the Swoole event loop.

## Related components

- [Database](/documentation/components/database/)
- [DOM](/documentation/components/dom/)
- [Data](/documentation/components/data/)
- [Utilities](/documentation/components/utilities/)
