---
layout: doc
title: ChronosService
description: Use ChronosService, the service-aware counterpart of Chronos that reads the application time zone and must be injected before use.
---

# ChronosService

`ChronosService` is the service-aware counterpart of `Chronos`. Unlike
`Chronos`, it must be injected before use, because it reads global
state from the application:

- `app.timezone`: the local time zone shown to users.
- `app.server_timezone`: the time zone used for storage.
- The database date format and null date, from the database adapter.
- The active language, used to translate `relative()` strings.

Because of this, it fits automatic time zone conversion and translated
strings. Use `Chronos` when the zone is known in the code itself.

## Injecting the Service

Use `ChronosAwareTrait` in a class managed by the container. The
`$chronos` property is injected automatically.

```php
use Windwalker\Core\DateTime\ChronosAwareTrait;

class OrderService
{
    use ChronosAwareTrait;

    public function getCreatedAt(string $stored): string
    {
        return $this->chronos->toLocalFormat($stored);
    }
}
```

::: info
The `$chronos` property is `protected`. Access it from the class that
uses the trait, not from outside.
:::

You can also obtain the service from the container with
`$container->get(ChronosService::class)`.

## Converting for Storage

`toServer()` converts a local value to the server zone. `toLocal()`
does the reverse. Both return `null` for a `null` or empty input.

```php
// Config: app.timezone = Asia/Tokyo
//         app.server_timezone = UTC

$local = '2024-03-15 18:30:00';

$server = $this->chronos->toServerFormat($local);
// 2024-03-15 09:30:00

$display = $this->chronos->toLocalFormat('2024-03-15 09:30:00');
// 2024-03-15 18:30:00
```

`toServerFormat()` and `toLocalFormat()` return an empty string for
empty input instead of `null`.

`mustToServer()` and `mustToLocal()` are aliases of `toServer()` and
`toLocal()`. They also return `null` for empty input.

```php
$this->chronos->mustToServer('2024-03-15 18:30:00');
// Chronos 2024-03-15T09:30:00+00:00

$this->chronos->mustToLocal('2024-03-15 09:30:00');
// Chronos 2024-03-15T18:30:00+09:00
```

## Creating Values

The `create*` methods build a `Chronos`. The name shows the input zone
first and the output zone after `As`. `Local` means `app.timezone` and
`Server` means `app.server_timezone`. Omit the date to use the current
time.

```php
// Input is app.timezone (Asia/Tokyo) when no zone is given
$this->chronos->createLocal('2024-03-15 18:30:00');
// 2024-03-15T18:30:00+09:00

// Input is the zone you pass, output is app.timezone
$this->chronos->createAsLocal('2024-03-15 09:30:00', 'UTC');
// 2024-03-15T18:30:00+09:00

// Input is the zone you pass, output is the zone you pass
$this->chronos->createAs(
    '2024-03-15 09:30:00',
    'UTC',
    'America/New_York'
);
// 2024-03-15T05:30:00-04:00

// Input is app.server_timezone (UTC), output is app.timezone
$this->chronos->createServerAsLocal('2024-03-15 09:30:00');
// 2024-03-15T18:30:00+09:00

// Input is app.server_timezone, output is the zone you pass
$this->chronos->createServerAs(
    '2024-03-15 09:30:00',
    'America/New_York'
);
// 2024-03-15T05:30:00-04:00

// Input is app.timezone, output is app.server_timezone
$this->chronos->createLocalAsServer('2024-03-15 18:30:00');
// 2024-03-15T09:30:00+00:00

// Input is app.timezone, output is the zone you pass
$this->chronos->createLocalAs(
    '2024-03-15 18:30:00',
    'Europe/London'
);
// 2024-03-15T09:30:00+00:00

// Input is the zone you pass, output is the zone you pass
$this->chronos->create('2024-03-15 10:00:00', 'Asia/Tokyo');
// 2024-03-15T10:00:00+09:00

// No date: current time in the server zone
$now = $this->chronos->createLocalAsServer();
```

## Comparing Dates

`compare()` checks two values for the same instant. It accepts strings,
`DateTimeInterface`, and `ChronosInterface` values.

```php
use Windwalker\Core\DateTime\ChronosService;

$a = '2024-03-15T01:00:00Z';
$b = '2024-03-15T09:00:00+08:00';

// Without an operator, returns an int. 0 means equal.
ChronosService::compare($a, $b); // 0

ChronosService::compare($a, $b, '=');   // true
ChronosService::compare($a, $b, '!=');  // false
ChronosService::compare($a, $b, '>');   // false
ChronosService::compare($a, $b, 'gt');  // false
ChronosService::compare($a, $b, '>=');  // true
ChronosService::compare($a, $b, 'gte'); // true
ChronosService::compare($a, $b, '<');   // false
ChronosService::compare($a, $b, 'lt');  // false
ChronosService::compare($a, $b, '<=');  // true
ChronosService::compare($a, $b, 'lte'); // true

// ERROR: InvalidArgumentException: Invalid operator: xx
ChronosService::compare($a, $b, 'xx');
```

::: warning
A string with no offset is parsed as UTC, not as `app.timezone`.
Pass a `Chronos` value with its zone, or add an explicit offset.

```php
$tokyo = Chronos::create('2024-03-15 09:00:00', 'Asia/Tokyo');

// 09:00 Tokyo is 00:00 UTC, so this is equal
ChronosService::compare($tokyo, '2024-03-15 00:00:00'); // 0
```
:::

`Plain*` types, such as `PlainDate`, have no instant. Comparing two
different `Plain*` classes throws a `TypeError`.

```php
use Windwalker\Core\DateTime\PlainDate;
use Windwalker\Core\DateTime\PlainTime;

ChronosService::compare(
    PlainDate::parse('2024-03-15'),
    PlainDate::parse('2024-03-16'),
    '<'
); // true

// ERROR: TypeError: Cannot compare
// Windwalker\Core\DateTime\PlainDate with
// Windwalker\Core\DateTime\PlainTime.
ChronosService::compare(
    PlainDate::parse('2024-03-15'),
    PlainTime::parse('10:00:00')
);
```

## Formatting and the Current Time

`toFormat()` and `now()` are static shortcuts to `Chronos`. Both take
an optional time zone.

```php
use Windwalker\Core\DateTime\ChronosService;

ChronosService::toFormat(
    '2024-03-15T01:00:00Z',
    'Y-m-d H:i'
); // 2024-03-15 01:00

// Current year in UTC
ChronosService::now('Y', 'UTC'); // 2024
```

## Relative Time

`relative()` returns a human-readable string such as `3 hours ago`.
The second argument is the date, the third is the reference time, and
the reference defaults to now.

```php
$created = '2024-03-15 10:00:00';

$this->chronos->relative($created, null, '2024-03-15 10:00:20');
// Less than a minute ago

$this->chronos->relative($created, null, '2024-03-15 10:05:00');
// 5 minutes ago

$this->chronos->relative($created, null, '2024-03-15 13:00:00');
// 3 hours ago

$this->chronos->relative($created, null, '2024-03-18 10:00:00');
// 3 days ago

$this->chronos->relative($created, null, '2024-03-29 10:00:00');
// 2 weeks ago

// Older than 4 weeks: the formatted date is returned
$this->chronos->relative($created, null, '2024-04-26 10:00:00');
// 2024-03-15 10:00:00

// Pass a format for the fallback date
$this->chronos->relative(
    $created,
    null,
    '2024-04-26 10:00:00',
    'Y/m/d'
);
// 2024/03/15
```

Pass a unit constant as the second argument to stop at that unit.

```php
use Windwalker\Core\DateTime\ChronosService;

$this->chronos->relative(
    $created,
    ChronosService::UNIT_MINUTE,
    '2024-03-15 12:00:00'
);
// 120 minutes ago

// The day unit is reached only if the value is not already
// shown in hours
$this->chronos->relative(
    $created,
    ChronosService::UNIT_DAY,
    '2024-03-15 12:00:00'
);
// 2 hours ago
```

::: tip
The unit is a minimum precision, not a conversion. A value below that
unit's threshold is still shown in a smaller unit.
:::

## Testing with a Fixed Clock

`setClock()` replaces the clock used by `now()` with any PSR-20
`ClockInterface`. Use it in tests to fix the current
time.

```php
use Psr\Clock\ClockInterface;
use Windwalker\Core\DateTime\ChronosService;

$clock = new class () implements ClockInterface {
    public function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable(
            '2024-03-15 10:00:00',
            new \DateTimeZone('UTC')
        );
    }
};

ChronosService::setClock($clock);

ChronosService::now('Y-m-d H:i:s', 'UTC');
// 2024-03-15 10:00:00
```

## Time Zone Settings

Read the configured zones directly.

```php
$this->chronos->getTimezone();       // Asia/Tokyo
$this->chronos->getServerTimezone(); // UTC
```

## Null Dates

Some databases use a sentinel value instead of `NULL` for an empty
date. `ChronosService` reads that value from the active database
adapter, so your code does not hard-code it. Both methods need
`windwalker/database` installed. They throw `DomainException` otherwise.

- `getNullDate()`: the sentinel value for the adapter.
- `getSqlFormat()`: the date format the adapter uses for SQL.
- `isNullDate()`: `true` when a value equals the sentinel.

```php
$this->chronos->getNullDate();    // 0000-00-00 00:00:00

if ($this->chronos->isNullDate($row->deleted_at)) {
    // Not deleted
}

// Pass another adapter to check its sentinel
$this->chronos->isNullDate($value, $otherDb);
```

`isNullDate()` also treats `null`, `''`, and the zero date as empty.
It accepts a timestamp, a string, or a `DateTimeInterface`.

```php
$this->chronos->isNullDate(null);                 // true
$this->chronos->isNullDate('');                   // true
$this->chronos->isNullDate('0000-00-00 00:00:00'); // true
$this->chronos->isNullDate('2024-03-15 09:00:00'); // false
```

The sentinel depends on the database. These values come from the
query grammar of each platform:

- MySQL: `1000-01-01 00:00:00`
- PostgreSQL: `1970-01-01 00:00:00`
- SQL Server: `1900-01-01 00:00:00`
- SQLite, Cubrid, and the default: `0000-00-00 00:00:00`
- Oracle: `RRRR-MM-DD HH24:MI:SS`, a format mask, not a date value

::: warning
The Oracle value is a format mask in the source. Do not rely on
`isNullDate()` to match an Oracle sentinel until you have checked the
value your schema actually stores.
:::

Do not compare against the sentinel string directly. Use `isNullDate()`
so the check follows the active database.

## Storing Dates in Entities

Use `ServerTimeCast` to convert entity fields automatically, so you do
not need to call `toServer()` in each service.

```php
use Windwalker\Core\DateTime\ServerTimeCast;
use Windwalker\ORM\Attributes\CastNullable;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\Table;

#[Table('orders')]
class Order
{
    #[Column('id')]
    public ?int $id = null;

    #[Column('created_at')]
    #[CastNullable(ServerTimeCast::class)]
    public ?\Windwalker\Core\DateTime\Chronos $createdAt = null;
}
```

::: warning
With `toLocal: true`, the cast reads the local zone from
`ChronosService`. When no service is available, hydrating the value
throws `LogicException`. Pass a timezone string instead, such as
`toLocal: 'Asia/Tokyo'`, to avoid the dependency.
:::

See [Temporal Like API](./temporal-like-api.md) for the cast that handles
calendar dates without time zone conversion.
