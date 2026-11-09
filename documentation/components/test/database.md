---
layout: doc
title: Database Tests
part: Components
component: test
---

# Database Tests

Tests for database code need a real database that starts from a known schema.
The `DatabaseTestTrait` provides this setup. It creates a shared
`DatabaseAdapter` for the test class, runs your setup hook before the class
starts, and disconnects after the last test. When no database is configured,
the class is skipped, so the rest of the suite still runs on a machine
without a database.

## Minimal Setup

Use the trait and implement the abstract `setupDatabase()` method. Call
`createDatabase()` with a PDO driver name:

```php
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\DatabaseTestTrait;

class UserTableTest extends TestCase
{
    use DatabaseTestTrait;

    protected static function setupDatabase(): void
    {
        self::createDatabase('pdo_sqlite');
    }
}
```

## Configuring the DSN

The trait reads a DSN from a PHP constant or an environment variable. The
name is `WINDWALKER_TEST_DB_DSN_` followed by the platform name, such as
`MYSQL`, `POSTGRESQL`, `SQLITE`, `ORACLE`, or `SQLSERVER`. The DSN uses
`key=value` pairs separated by semicolons.

Define the constant in `phpunit.xml`:

```xml
<php>
    <const name="WINDWALKER_TEST_DB_DSN_SQLITE"
        value="dbname=tmp/test.db" />
</php>
```

Or set the environment variable before you run PHPUnit:

```bash
export WINDWALKER_TEST_DB_DSN_MYSQL="host=127.0.0.1;port=3306;\
dbname=test;user=root;password=your-password"
```

::: warning
Do not commit a DSN that contains a real password. Keep credentials in an
environment variable on your machine or in your CI secrets, and leave the
committed `phpunit.xml` without them.
:::

## Showcase: Testing a Table

The following class loads a schema from a fixture file once for the class.
Each test then reads and writes through the shared connection:

```php
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\DatabaseTestTrait;

class UserTableTest extends TestCase
{
    use DatabaseTestTrait;

    protected static function setupDatabase(): void
    {
        self::createDatabase('pdo_sqlite');
        self::importFromFile(__DIR__ . '/fixtures/users.sql');
    }

    #[Test]
    public function insertedUserCanBeFound(): void
    {
        self::$db->execute(
            "INSERT INTO users (name, active) VALUES ('Alice', 1)"
        );

        $user = self::$db->select('*')
            ->from('users')
            ->where('name', 'Alice')
            ->get();

        self::assertEquals(1, $user->active);
    }
}
```

## Shared Connection and Captured SQL

The trait stores one connection in the protected static property `$db`, and
tests reach it through `self::$db`. Every statement the connection runs is
recorded in `static::$lastQueries`, which is reset each time `createDatabase()`
is called:

```php
#[Test]
public function insertUsesExpectedStatement(): void
{
    self::$db->execute(
        "INSERT INTO users (name, active) VALUES ('Bob', 0)"
    );

    $sql = end(static::$lastQueries);

    self::assertStringContainsString('INSERT INTO users', $sql);
}
```

## Loading Schemas

`importFromFile()` splits a SQL file into statements and runs each one.
`importIterator()` accepts any iterable of statements, which is useful when
the statements come from a generator. Both methods run the SQL on the shared
connection and rethrow database errors with the failing statement appended.

::: warning
`importFromFile()` runs every statement in the file against the configured
database. Schema files often drop and recreate tables. Point the DSN at a
dedicated test database, never at a database that holds data you need.
:::

## Lifecycle Notes

The trait provides `setUpBeforeClass()` and `tearDownAfterClass()`. These
methods call `setupDatabase()` and disconnect the shared connection. Put your
setup code in `setupDatabase()`, and do not define these two methods again in
the class that uses the trait.
