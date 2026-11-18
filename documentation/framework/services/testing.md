---
layout: doc
title: Testing
---

# Testing

The standalone package has its own detailed guide: [Windwalker Test](../../components/test/index.md). This page focuses on using it inside the Windwalker framework.

A framework grows in layers, and each layer needs its own kind of test. A pricing class can be tested alone with plain assertions. A checkout route needs a web application to dispatch a request. A repository needs a real database to prove that its queries return the right rows. Windwalker separates these needs into a small base package, `windwalker/test`, and a set of testing helpers in `windwalker/core` for applications that run on the framework.

This page shows how to set up PHPUnit in any project, how to write tests for each layer, and which helpers to reach for.

## Installing the Test Package

Add the test package and its database and utility dependencies as dev dependencies:

```bash
composer require --dev \
    windwalker/test \
    windwalker/database \
    windwalker/utilities
```

`windwalker/test` provides the base test helpers. It depends on `windwalker/database` for database tests and `windwalker/utilities` for reflection helpers, so install all three together.

::: info
The package ships with PHPUnit 13 as its development target. Add `phpunit/phpunit` yourself if your project does not already have it:

```bash
composer require --dev phpunit/phpunit:^13.0
```
:::

## Environment Setup Example

The following layout works in any PHP project, with or without Windwalker.

```text
your-project/
├── src/
│   └── PriceCalculator.php
├── tests/
│   ├── bootstrap.php
│   └── PriceCalculatorTest.php
├── composer.json
└── phpunit.xml.dist
```

### Configuration File

Create `phpunit.xml.dist` in the project root. Point `bootstrap` at your test bootstrap and `directory` at your test folder:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="tests/bootstrap.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests</directory>
        </testsuite>
    </testsuites>
    <php>
        <env name="APP_ENV" value="testing" />
    </php>
</phpunit>
```

### Bootstrap File

The bootstrap loads Composer's autoloader. Add any project setup that every test needs here:

```php
<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';
```

### A Complete Test

This test uses only PHPUnit. It runs without a database or a web application:

```php
<?php

declare(strict_types=1);

namespace Example\Shop\Tests;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class PriceCalculatorTest extends TestCase
{
    #[Test]
    public function totalAppliesDiscount(): void
    {
        $total = 200 * (1 - 0.1);

        self::assertSame(180.0, $total);
    }
}
```

Run the suite from the project root:

```bash
vendor/bin/phpunit
```

```text
PHPUnit 13.0.0 by Sebastian Bergmann and contributors.

Configuration: .../phpunit.xml.dist

.                                                 1 / 1 (100%)

OK (1 test, 1 assertion)
```

### Using It in an Existing Project

Copy the `phpunit.xml.dist` and `tests/bootstrap.php` files into your project and adjust the `directory` value to match your test folder. Keep your own autoloading in `composer.json` and the test namespace under `autoload-dev`. Do not put machine-specific paths or secrets in `phpunit.xml.dist`. Use `phpunit.xml` for local overrides, and add it to `.gitignore`.

Database tests need a connection that you provide. Use a placeholder in the committed file and set the real value in your environment:

```xml
<php>
    <env name="WINDWALKER_TEST_DB_DSN_MYSQL"
         value="&lt;your-test-dsn&gt;" />
</php>
```

## Test Layers

Use the lightest layer that proves the behavior. The Windwalker testing architecture groups tests into four tiers:

- Unit tests: pure classes with no framework runtime.
- Light integration tests: a few collaborators, often with an in-memory database.
- Application tests: a web application handles a request end to end.
- Database tests: a real database driver, with migrations and seeds.

### Unit Tests

Test pure logic with `PHPUnit\Framework\TestCase`. Keep these tests free of containers and applications:

```php
<?php

declare(strict_types=1);

namespace Example\Shop\Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class DiscountTest extends TestCase
{
    // One test method per behavior; use a data provider for variants.
    #[Test]
    #[DataProvider('discounts')]
    public function discountIsApplied(float $price, float $expected): void
    {
        self::assertSame($expected, round($price * 0.9, 2));
    }

    public static function discounts(): array
    {
        return [
            'regular price' => [100.0, 90.0],
            'small price' => [10.0, 9.0],
        ];
    }
}
```

::: tip
Keep unit tests independent of the database and the network. A failing unit test should point to one class.
:::

### In-Memory Database Tests

For SQL logic that does not need a real server, use `Windwalker\Test\Traits\DatabaseTestTrait` with an SQLite in-memory driver. This test creates its own schema, so it needs no DSN:

```php
<?php

declare(strict_types=1);

namespace Example\Shop\Tests;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\DatabaseTestTrait;

final class OrderRepositoryTest extends TestCase
{
    use DatabaseTestTrait;

    protected function setUp(): void
    {
        // A new in-memory database for every test.
        self::$db = self::createDatabase(
            'pdo_sqlite',
            ['dsn' => 'sqlite::memory:']
        );
    }

    protected function tearDown(): void
    {
        self::$db?->disconnect();
    }

    protected static function setupDatabase(): void
    {
    }

    #[Test]
    public function insertAndCount(): void
    {
        $db = self::$db;
        $db->getDriver()->execute(
            'CREATE TABLE orders (id INTEGER PRIMARY KEY, total REAL)'
        );
        $db->getDriver()->execute(
            'INSERT INTO orders (total) VALUES (180.0)'
        );

        self::assertSame(
            1,
            (int) $db->prepare('SELECT COUNT(*) FROM orders')
                ->execute()
                ->fetch()['COUNT(*)']
        );
    }
}
```

::: info
`createDatabase()` returns a `DatabaseAdapter` and stores it in `self::$db`. The trait's `setupDatabase()` hook is static and abstract, so each test class must implement it, even if it does nothing.
:::

### Real Database Tests

To test against a real server, the framework trait reads a DSN from the constant or environment variable `WINDWALKER_TEST_DB_DSN_<PLATFORM>`, where the platform name is in uppercase, for example `WINDWALKER_TEST_DB_DSN_MYSQL`. Without a DSN, `getTestParams()` returns no parameters and the connection fails, so guard the test:

```php
<?php

declare(strict_types=1);

namespace Example\Shop\Tests;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Windwalker\Database\DatabaseAdapter;
use Windwalker\Test\Traits\DatabaseTestTrait;

final class ProductRepositoryTest extends TestCase
{
    use DatabaseTestTrait;

    protected function setUp(): void
    {
        if (!getenv('WINDWALKER_TEST_DB_DSN_MYSQL')) {
            self::markTestSkipped('No test database DSN is set.');
        }

        self::$db = self::createDatabase('pdo_mysql');
    }

    protected function tearDown(): void
    {
        self::$db?->disconnect();
    }

    protected static function setupDatabase(): void
    {
    }

    #[Test]
    public function connectionWorks(): void
    {
        self::assertInstanceOf(DatabaseAdapter::class, self::$db);
    }
}
```

::: warning
Use a dedicated test database. Never point `WINDWALKER_TEST_DB_DSN_*` at a database that holds data you need to keep.
:::

### Application Tests

Application-level tests use the Windwalker web application. The core helpers in `windwalker/core` cover these cases:

- `Windwalker\Core\Testing\AbstractTestApp` is a base class for an application under test. It builds a test context from the application's context providers.
- `Windwalker\Core\Testing\Traits\ControllerTestTrait` adds a `dispatchController()` method. It sends data to a controller through the application's input pipeline and returns the result.
- `Windwalker\Core\Testing\Traits\InMemoryDatabaseTestTrait` creates an SQLite in-memory database. Override `prepareInMemoryDatabaseSchema()` to create the tables that your test needs.

These helpers belong to an application that uses `windwalker/core`. They are not part of the standalone `windwalker/test` package. See the [request lifecycle](/documentation/framework/core-concepts/applications/request-lifecycle) for how a request moves through the application.

::: info
`ServiceAwareTestTrait` in `windwalker/core` is written for the framework's own test application. Do not use it in an application of your own; create a subclass of `AbstractTestApp` instead.
:::

## Helpers

The main helpers in `windwalker/test` are the following:

- `DatabaseTestTrait::createDatabase()` opens a database for the current test class.
- `DatabaseTestTrait::getTestParams()` reads a DSN from the environment.
- `DatabaseTestTrait::importFromFile()` runs a SQL file, split into statements.
- `DatabaseTestTrait::importIterator()` runs SQL statements from any iterable.

```php
<?php

declare(strict_types=1);

namespace Example\Shop\Tests;

use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\DatabaseTestTrait;

final class SchemaTest extends TestCase
{
    use DatabaseTestTrait;

    protected function setUp(): void
    {
        self::$db = self::createDatabase(
            'pdo_sqlite',
            ['dsn' => 'sqlite::memory:']
        );

        // Load a fixture file of CREATE and INSERT statements.
        self::importFromFile(__DIR__ . '/fixtures/schema.sql');
    }

    protected static function setupDatabase(): void
    {
    }
}
```

::: tip
Keep SQL fixtures in `tests/fixtures/`. Load them in `setUp()` so each test starts from the same state.
:::

For data that belongs in the schema, prefer the framework's [migrations](/documentation/framework/services/database/migrations) and [seeders](/documentation/framework/services/database/seeders). Run them in a test database only. A seeder that inserts sample rows into a shared database can break other tests.

The `windwalker/core` package also provides `Windwalker\Core\Testing\Database\TestDatabaseFixtures`. It can run migrations and seeders for a test database. Its `reset()` method drops and recreates the schema, so only use it on a dedicated test database.

## Reminders

::: tip
Run tests against an in-memory SQLite database when the SQL does not depend on the server. Real-server tests are slower and need a configured DSN.
:::

::: warning
Core testing helpers can drop and recreate a database. `DatabaseTestTrait::bootDb()` in `windwalker/core` calls `TestDatabaseFixtures::initialize()`, and `TestDatabaseFixtures::reset()` drops the schema. Never point a test DSN at a database that holds data you need.
:::

::: warning
Do not commit real DSNs or passwords in `phpunit.xml.dist`. Use placeholders in the committed file, and set real values in `phpunit.xml` (ignored by Git) or in the environment.
:::

The framework test package also contains a `TestHelper` class. It is deprecated in favor of `Windwalker\Utilities\Reflection\ReflectAccessor`, so use the latter in new tests.

## Related Pages

- [Migrations](/documentation/framework/services/database/migrations)
- [Seeders](/documentation/framework/services/database/seeders)
- [ORM](/documentation/framework/services/database/orm)
- [Request Lifecycle](/documentation/framework/core-concepts/applications/request-lifecycle)
