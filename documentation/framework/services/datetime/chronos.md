---
layout: doc
title: Chronos
---

# Chronos

`Chronos` is the time-zone-aware date-time class of Windwalker. It extends PHP's `DateTimeImmutable`, so every
modifier returns a new object and the original value never changes.

`Chronos` is the Windwalker counterpart of the `ZonedDateTime` type in
the JavaScript Temporal API. Each value holds one instant, one time
zone, and the wall-clock reading in that zone.

Use it when you need a full date and time that carries its own time
zone.

## Creating a Chronos

Use `Chronos::wrap()` to convert a string or `DateTimeInterface` into
a `Chronos`. Use `Chronos::create()` to build one from the current
clock. Both accept an optional time zone.

```php
use Windwalker\Core\DateTime\Chronos;

// Parse a string in the default time zone
$date = Chronos::wrap('2024-03-15 09:30:00');

// Parse a string in a specific time zone
$tokyo = Chronos::wrap('2024-03-15 09:30:00', 'Asia/Tokyo');

// Wrap an existing DateTimeInterface
$wrapped = Chronos::wrap(new \DateTime('2024-03-15'));

// Current time from the active clock
$now = Chronos::create();
```

Use `Chronos::tryWrap()` when the input may be invalid. It returns
`null` instead of throwing.

```php
$date = Chronos::tryWrap('not a date');
// null
```

## Time Zones

`withTimezone()` keeps the same instant and changes the wall clock.
`withTimezoneKeepingLocal()` keeps the same wall clock and changes the
instant.

```php
$date = Chronos::wrap('2024-03-15 09:30:00', 'UTC');

// Same instant, displayed in Tokyo
$tokyo = $date->withTimezone('Asia/Tokyo');
echo $tokyo->format('Y-m-d H:i:s'); // 2024-03-15 18:30:00

// Same wall clock, now interpreted in Tokyo
$local = $date->withTimezoneKeepingLocal('Asia/Tokyo');
echo $local->format('Y-m-d H:i:s'); // 2024-03-15 09:30:00
```

::: info
When a DST gap removes the wall-clock time, `withTimezoneKeepingLocal()`
moves the result forward past the gap.
:::

## Modifying Values

`plus()` and `minus()` take a `DateInterval`, a `Duration`, or a
string. Calendar units move the wall clock. Time units move the
instant.

```php
$date = Chronos::wrap('2024-01-31 12:00:00', 'UTC');

echo $date->plus('1 month')->format('Y-m-d'); // 2024-03-02
```

The optional `DateOverflow` argument controls out-of-range results.

- `DateOverflow::Constrain`: the default. Clamps to the last valid day.
- `DateOverflow::Reject`: throws `RangeException`.
- `DateOverflow::Native`: lets PHP roll the date over.

```php
use Windwalker\Core\DateTime\DateOverflow;

$date = Chronos::wrap('2024-01-31 12:00:00', 'UTC');

echo $date->plus('1 month', DateOverflow::Constrain)
    ->format('Y-m-d'); // 2024-02-29

echo $date->plus('1 month', DateOverflow::Native)
    ->format('Y-m-d'); // 2024-03-02
```

## Comparing Values

`compareTo()` compares instants and ignores the time zone. The
`isBefore()` and `isAfter()` methods use the same rule.

```php
$a = Chronos::wrap('2024-03-15 09:30:00', 'UTC');
$b = Chronos::wrap('2024-03-15 18:30:00', 'Asia/Tokyo');

echo $a->compareTo($b); // 0, the same instant
echo $a->isBefore($b) ? 'yes' : 'no'; // no
```

## Converting to Other Types

Chronos converts to the value objects described in
[Temporal Types](./temporal-types.md).

```php
$date = Chronos::wrap('2024-03-15 09:30:00', 'Asia/Tokyo');

$instant = $date->toInstant();          // Instant
$day = $date->toPlainDate();            // PlainDate
$time = $date->toPlainTime();           // PlainTime
$dateTime = $date->toPlainDateTime();   // PlainDateTime
```

## Formatting

`toISO8601()` returns an RFC 3339 string. Pass `true` to include
microseconds.

```php
$date = Chronos::wrap('2024-03-15 09:30:00', 'UTC');

echo $date->toISO8601(); // 2024-03-15T09:30:00+00:00
```

Use the standard `format()` method for any other pattern.

```php
echo $date->format(Chronos::FORMAT_YMD_HIS); // 2024-03-15 09:30:00
```

## Calendar Fields

Calendar fields are available as methods.

```php
$date = Chronos::wrap('2024-03-15 09:30:00', 'UTC');

$date->getDayOfTheYear(); // 75, 1-based
$date->getDayOfYear();    // 74, 0-based
$date->getWeekOfYear();   // 11
$date->isInLeapYear();    // true
```

::: tip
Use `getDayOfTheYear()` when you need the human-facing day number.
`getDayOfYear()` follows PHP's `z` format and starts at 0.
:::

## Chronos and DateTime

`Chronos` extends `DateTimeImmutable`, so any API that accepts a
`DateTimeInterface` also accepts a `Chronos`. The difference is the
extra Windwalker methods. Use them when you need values that compare,
diff, and round the same way across the framework.

```php
use Windwalker\Core\DateTime\Chronos;

$a = Chronos::wrap('2024-03-15 09:00:00');
$b = Chronos::wrap('2024-03-20 09:00:00');

echo $a->compareTo($b) < 0 ? 'earlier' : 'later';

// Diff in the PHP style, with the day count in `days`
$diff = $a->diff($b);
echo $diff->days; // 5
```

## Helper Functions

Windwalker ships global helpers in the `Windwalker` namespace. Import
them with `use function`. Most types have three forms, named by prefix.

- `must_`: strict. Invalid input throws.
- `to_`: `null` and `''` return `null`. Invalid input throws.
- `try_`: invalid input returns `null` instead of throwing.

```php
use function Windwalker\must_chronos;
use function Windwalker\to_chronos;

// must_: strict, throws on invalid input
$date = must_chronos('2024-03-15 09:00:00', 'Asia/Tokyo');

// to_: null and empty string return NULL
$date = to_chronos(null); // NULL
$date = to_chronos('');   // NULL

$date = to_chronos('2024-03-15 09:00:00');

// ERROR: DateMalformedStringException:
//   Failed to parse time string (not a date) at position 0 (n):
//   The timezone could not be found in the database

$date = try_chronos('not a date'); // NULL
```

`Instant` has no `must_` form. `to_instant()` and `try_instant()` both
return `NULL` for `null` or an empty string.

```php
use function Windwalker\to_instant;
use function Windwalker\try_instant;

$instant = to_instant('2024-03-15T09:00:00+08:00');
echo $instant->toIso(); // 2024-03-15T01:00:00Z

$instant = to_instant(''); // NULL

// ERROR: DateMalformedStringException:
//   Invalid instant "nope", expect ISO 8601 with time zone.
$instant = to_instant('nope');

$instant = try_instant('nope'); // NULL
```

Plain date and time types use the same three forms. They use the
wall-clock value without time zone conversion.

```php
use function Windwalker\must_plain_date;
use function Windwalker\to_plain_date;
use function Windwalker\try_plain_date;

$date = must_plain_date('2024-03-15'); // PlainDate

// ERROR: TypeError: Cannot convert null to PlainDate.
$date = must_plain_date(null);

$date = to_plain_date(''); // NULL

// ERROR: DateMalformedStringException:
//   Invalid date "2024-13-45", expect Y-m-d.
$date = to_plain_date('2024-13-45');

$date = try_plain_date('2024-13-45'); // NULL
```

```php
use function Windwalker\must_plain_time;
use function Windwalker\to_plain_time;
use function Windwalker\try_plain_time;

$time = must_plain_time('09:00:00'); // PlainTime

$time = to_plain_time(''); // NULL

$time = try_plain_time('25:00:00'); // NULL
```

```php
use function Windwalker\must_plain_datetime;
use function Windwalker\to_plain_datetime;
use function Windwalker\try_plain_datetime;

$dateTime = must_plain_datetime('2024-03-15 09:00:00');

// ERROR: DateMalformedStringException:
//   Invalid date time "nope", expect Y-m-d\TH:i[:s[.f]].
$dateTime = to_plain_datetime('nope');

$dateTime = try_plain_datetime('nope'); // NULL
```

## Using Chronos in Entities

Store a Chronos in an entity with `ServerTimeCast`, which converts
between the server time zone and the database value. See
[ChronosService](./chronos-service.md#storing-dates-in-entities).

```php
use Windwalker\Core\DateTime\Chronos;
use Windwalker\Core\DateTime\ServerTimeCast;
use Windwalker\ORM\Attributes\CastNullable;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\Table;

#[Table('posts')]
class Post
{
    #[Column('id')]
    public ?int $id = null;

    #[Column('published_at')]
    #[CastNullable(ServerTimeCast::class)]
    public ?Chronos $publishedAt = null;
}
```

For calendar-only columns, use the `Temporal` types instead. See
[Temporal Types](./temporal-types.md).

## Using Chronos in Your Code

Inject `ChronosService` when you need application-level time zone
handling. See [ChronosService](./chronos-service.md). Use `Clock` to
read the current time in tests. See [Clock](./clock.md).
