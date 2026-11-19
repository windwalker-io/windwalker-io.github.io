---
layout: doc
title: Optimistic Locking
description: Prevent silent overwrites when two requests change the same row, using a version column that is checked on every update.
component: orm
---

# Optimistic Locking

Two requests often load the same row, change it, and save it. Without a
check, the second save silently overwrites the first one. Optimistic
locking prevents this with a version column. Each update checks that the
row still has the version that was loaded, and it writes the next version.
When another request has already changed the row, the update fails with an
`OptimisticLockException` instead of overwriting the data.

No lock is held in the database while the user is editing, so the approach
suits web forms, where the time between the read and the write can be long.

## Minimal Setup

Add a property with `#[OptimisticLock]`. The integer version is the
recommended type.

```php
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\OptimisticLock;

#[Column('version')]
#[OptimisticLock]
public int $version = 0;
```

## Showcase

Two editors open the same article. The first save succeeds. The second save
fails, because its version is out of date:

```php
use Windwalker\ORM\Exception\OptimisticLockException;

$first = $orm->mustFindOne(Article::class, 1);
$second = $orm->mustFindOne(Article::class, 1);

$first->title = 'Changed by the first editor';
$orm->updateOne($first);

$second->title = 'Changed by the second editor';

try {
    $orm->updateOne($second);
} catch (OptimisticLockException $e) {
    // Reload the row, show the conflict, and let the user retry.
}
```

The first update writes version `1`. The second update finds version `1`
in the row, but it still holds version `0`, so it changes nothing and throws
the exception.

## Version Types

The next value depends on the type of the property:

- `int` adds `1` to the previous value.
- `float` adds `1.0` to the previous value.
- `string` generates a new value with `uid()`.
- `DateTimeInterface` is set to the current time.

Other types throw a `RuntimeException`, unless you provide a `nextHandler`.
Use the `int` type in most cases.

```php
#[Column('version')]
#[OptimisticLock]
public int $version = 0;
```

A date version needs a date column. `Schema` accepts any type name as the
column type. Some platforms map a type to their own name, for example
`datetime` becomes `datetime2` on SQL Server and `timestamp` on PostgreSQL.

```php
$schema->datetime('updated');
$schema->timestamp('updated');
```

::: warning
The ORM formats date values with the database date format,
`Y-m-d H:i:s`. The stored time has second precision, even in a column with
fractional seconds. A write in the same second as the previous one leaves the
version unchanged, so a stale update in that second is not rejected. Use an
`int` version when writers can change the same row within one second.
:::

SQLite has no native date type, so use an `int` version there.

### Date and Time Columns

A `DateTimeInterface` property takes the current time, with microseconds.
A column without fractional seconds, such as a plain `DATETIME`, stores the
value truncated. The next update then no longer matches the value held in
memory, so the check fails.

::: warning
A time-based lock is reliable only with a microsecond column, such as
`DATETIME(6)` on MySQL or `timestamp(6)` on PostgreSQL. Two writes in the
same microsecond still cannot be told apart, so use an integer version when
the lock must be strict. SQLite has no real date type, so use an integer
version there.
:::

### Custom Next Value

Pass a callable as `nextHandler` to generate the next value yourself. It
receives the current value and returns the next one. The handler replaces
the type check, so it works for any property type.

PHP attribute arguments must be constant expressions, so a closure or an
arrow function cannot be used here. Refer to a `public static` method with a
callable array, using `self::class` for the class that declares the
property:

```php
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\OptimisticLock;

class Article
{
    #[Column('hash')]
    #[OptimisticLock(nextHandler: [self::class, 'nextHash'])]
    public string $hash = '';

    public static function nextHash(mixed $value): string
    {
        return hash('sha256', uniqid());
    }
}
```

::: warning
The method must be `public static`. It receives the current value and must
return the next value. A closure or an arrow function in the attribute is a
fatal error when the class is loaded.
:::

## How the Check Works

On update, the ORM adds a condition on the version column to the `WHERE`
clause, and it writes the next version. If no row matches, the exception is
thrown. A version of `0` is a valid value, and it is included in the
condition. Only `null` skips the check.

::: warning
The check applies only when the version is part of the data being written.
An array update without the version column is not checked, and it overwrites
the row. Load the entity, or include the version in the array, so the lock
is applied.
:::

Inserts are not checked. When an entity is new, the version is written as
it is.

## Disabling the Check

Pass `optimisticLock: false` in `ORMOptions` for one write when the check
must be skipped, for example in a background job that owns the row.

```php
use Windwalker\ORM\ORMOptions;

$orm->updateOne(
    $article,
    options: new ORMOptions(optimisticLock: false),
);
```

The write then overwrites any change made by another request, so use this
option only when no other writer can change the row.
