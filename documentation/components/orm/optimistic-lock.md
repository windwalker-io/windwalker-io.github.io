---
layout: doc
title: Optimistic Locking
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

::: info
An integer is not affected by the precision of a column, and two updates
in the same second still get different versions. A time-based version works
only with a column that stores microseconds, such as `DATETIME(6)` in MySQL
or `timestamp(6)` in PostgreSQL. A column with seconds precision truncates
the value, so the next update fails against the value that was stored.
:::

### Custom Next Value

Pass a callable as `nextHandler` to generate the next value yourself. It
receives the current value.

```php
use Windwalker\ORM\Attributes\OptimisticLock;

#[OptimisticLock(
    nextHandler: fn (mixed $value) => hash('sha256', uniqid()),
)]
public string $hash = '';
```

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
