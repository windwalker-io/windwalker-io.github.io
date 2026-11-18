---
layout: doc
title: Temporal Like API
---

# Temporal Like API

Windwalker provides value objects for dates and times that do not need
a time zone. They follow the Temporal model: each type holds one
concept and nothing else.

- `PlainDate`: a calendar date, such as a birthday.
- `PlainTime`: a wall-clock time, such as opening hours.
- `PlainDateTime`: a date and a time, without a zone.
- `ZonedDateTime` (`Chronos`): a date and time with a zone, such as a meeting time.
- `PlainYearMonth`: a year and month, such as a billing period.
- `PlainMonthDay`: a month and day, such as an annual holiday.
- `Instant`: a fixed point on the timeline, stored in UTC.

Windwalker implements these types as an approximation of the JavaScript
Temporal API. PHP's `DateTime` covers many cases in one class, which
makes it hard to work with one time unit at a time. These types split
dates and times into finer parts and expose the unit you need.

The API is not a strict port of the JavaScript API. It follows PHP
naming and behavior where they differ. Its validation is much stricter
than `DateTime`.

Use these types when a value should not shift when the time zone
changes. Use [Chronos](./chronos.md) when the value needs a zone.

## PlainDate

`PlainDate::of()` builds a date from its parts. An invalid date throws
by default. Pass `DateOverflow::Constrain` to clamp instead.

```php
use Windwalker\Core\DateTime\DateOverflow;
use Windwalker\Core\DateTime\PlainDate;

$birthday = PlainDate::of(1990, 5, 20);
echo $birthday->toIso(); // 1990-05-20

PlainDate::of(2023, 2, 29);
// ERROR: RangeException: Day 29 is out of range 1-28.

$date = PlainDate::of(2023, 2, 29, DateOverflow::Constrain);
echo $date->toIso(); // 2023-02-28
```

Parse a string with `parse()`, or read today's date with `today()`.

```php
$date = PlainDate::parse('2024-03-15');
$today = PlainDate::today('Asia/Tokyo');
```

Compare dates with `compareTo()`.

```php
$a = PlainDate::parse('2024-03-15');
$b = PlainDate::parse('2024-03-20');

// Negative when $a is earlier, zero when equal, positive when later
echo $a->compareTo($b) < 0 ? 'earlier' : 'later';
```

Adding a period follows the same overflow rule. `plus()` and `with()`
default to `DateOverflow::Constrain`, so the day is clamped instead of
rolling into the next month.

```php
$jan31 = PlainDate::of(2026, 1, 31);

echo $jan31->plus('P1M')->toIso(); // 2026-02-28

// The same clamp, written out explicitly
echo $jan31->plus('P1M', DateOverflow::Constrain)->toIso();
// 2026-02-28
```

## PlainTime

`PlainTime::of()` takes an hour, minute, second, and microsecond. All
parts are optional and default to zero.

```php
use Windwalker\Core\DateTime\PlainTime;

$open = PlainTime::of(9, 30);
echo $open->toIso(); // 09:30:00

$close = PlainTime::parse('18:00:00');
echo $close->compareTo($open) > 0 ? 'after' : 'before';
```

Arithmetic on `PlainTime` wraps around midnight. It never moves to the
next day, because a time has no date.

```php
echo PlainTime::of(23, 30)->plus('PT1H')->toIso();
// 00:30:00
```

::: info
`PlainTime::parse()` accepts fractions, such as `10:30:00.5`, and the
short form `10:30`.
:::

## PlainDateTime

`PlainDateTime` joins a date and a time without a zone.

```php
use Windwalker\Core\DateTime\PlainDate;
use Windwalker\Core\DateTime\PlainDateTime;
use Windwalker\Core\DateTime\PlainTime;

$meeting = PlainDateTime::of(2024, 3, 15, 9, 30);

// Keep the date, replace the time
$lunch = $meeting->withPlainTime(PlainTime::of(12));
echo $lunch->toIso(); // 2024-03-15T12:00:00

// Keep the date, reset the time to midnight
$start = $meeting->startOfDay();
echo $start->toIso(); // 2024-03-15T00:00:00

// Split into parts
$date = $meeting->toPlainDate();  // PlainDate
$time = $meeting->toPlainTime();  // PlainTime
```

`withPlainTime(null)` removes the time and returns the start of the
day.

::: info
`PlainDateTime::parse()` does not accept a `Z` suffix. It expects a
wall-clock value such as `2024-03-15T09:30:00`. Use `Instant` for values
that carry a zone.
:::

## PlainYearMonth

`PlainYearMonth` holds a year and month, with no day. Use it for periods
such as a billing cycle.

```php
use Windwalker\Core\DateTime\PlainYearMonth;

$billing = PlainYearMonth::of(2024, 3);

// The first day of the period
$start = $billing->toPlainDate();
echo $start->toIso(); // 2024-03-01
```

## PlainMonthDay

`PlainMonthDay` holds a month and day that repeat each year, such as a
public holiday.

```php
use Windwalker\Core\DateTime\PlainMonthDay;

$holiday = PlainMonthDay::of(12, 25);

// The same holiday in a given year
$christmas = $holiday->toPlainDate(2024);
echo $christmas->toIso(); // 2024-12-25

// Feb 29 has no year to stay in; it is constrained by default
echo PlainMonthDay::of(2, 29)->toPlainDate(2026)->toIso();
// 2026-02-28
```

::: info
`PlainMonthDay` has no year, so it cannot be compared with `compareTo()`
or moved with `plus()`. Use `equals()` to test whether two values match.
:::

## Instant

`Instant` is a point on the timeline. Use it for event timestamps and
ordering, because it does not depend on a time zone.

```php
use Windwalker\Core\DateTime\Instant;

// A zone designator is required
$instant = Instant::parse('2024-03-15T08:30:00+08:00');
echo $instant->toIso(); // 2024-03-15T00:30:00Z

echo $instant->toEpochMilliseconds();

// Show it in a specific zone
$tokyo = $instant->toDateTime('Asia/Tokyo');
echo $tokyo->format('Y-m-d H:i:s');

// Convert to a Chronos for further work
$chronos = $instant->toChronos('Asia/Tokyo');
```

`Instant::now()` returns the current instant.

## Shared Operations

The operations below work across the Plain types and `Instant`. Each
subsection names the class it applies to.

### Converting Values

`from()` reads the wall-clock fields of a `Chronos`, without changing
the time zone. `Instant::from()` keeps the point in time instead.

```php
use Windwalker\Core\DateTime\Chronos;
use Windwalker\Core\DateTime\Instant;
use Windwalker\Core\DateTime\PlainDate;
use Windwalker\Core\DateTime\PlainDateTime;
use Windwalker\Core\DateTime\PlainTime;

$chronos = Chronos::create('2026-03-05 23:30:00', 'Asia/Taipei');

echo PlainDate::from($chronos)->toIso(); // 2026-03-05
echo PlainTime::from($chronos)->toIso(); // 23:30:00
echo Instant::from($chronos)->toIso();   // 2026-03-05T15:30:00Z
```

Convert back with `toChronos()`. The time zone defaults to UTC, not to
the application's zone, so pass the zone you need.

```php
$dateTime = PlainDateTime::of(2026, 3, 5, 10, 30);

echo $dateTime->toChronos('Asia/Taipei')->format('c');
// 2026-03-05T10:30:00+08:00

echo $dateTime->toChronos()->getTimezone()->getName();
// UTC
```

The global helpers in the `Windwalker` namespace convert arbitrary input.
They are strict and do not call `strtotime()`.

```php
use function Windwalker\to_plain_date;

echo to_plain_date('2026-03-05')->toIso(); // 2026-03-05
```

#### Strict, Nullable, and Try Conversions

Each helper comes in three forms. `must_*` is strict, `to_*` returns
`null` for `null` or an empty string, and `try_*` returns `null` for
an invalid value instead of throwing.

```php
use function Windwalker\must_plain_date;
use function Windwalker\to_plain_date;
use function Windwalker\try_plain_date;

echo must_plain_date('2026-03-05')->toIso(); // 2026-03-05

var_dump(to_plain_date(null)); // NULL

echo try_plain_date('2026-03-05 10:00:00')->toIso();
// 2026-03-05

var_dump(try_plain_date('2026-13-45')); // NULL

// ERROR: DateMalformedStringException:
//   Invalid date "2026-13-45", expect Y-m-d.
must_plain_date('2026-13-45');

// ERROR: TypeError: Cannot convert null to PlainDate.
must_plain_date(null);
```

`to_instant()` and `try_instant()` need a time zone designator.
A `PlainDate` is rejected because it has no zone.

```php
use function Windwalker\to_instant;

echo to_instant('2026-03-05T10:00:00+08:00')->toIso();
// 2026-03-05T02:00:00Z

// ERROR: DateMalformedStringException:
//   Invalid instant "2026-03-05 10:00:00", expect ISO 8601 with time zone.
to_instant('2026-03-05 10:00:00');

// ERROR: TypeError: Cannot convert PlainDate to Instant.
to_instant(PlainDate::of(2026, 3, 5));
```

#### Parsing Strings

Plain types parse strings strictly. `PlainDateTime` rejects a `Z`
suffix, and `PlainDate` ignores any time part.

```php
use Windwalker\Core\DateTime\PlainDate;
use Windwalker\Core\DateTime\PlainDateTime;

echo PlainDate::parse('2026-03-05 10:00')->toIso();
// 2026-03-05

// ERROR: DateMalformedStringException:
//   Invalid date time "2026-03-05T10:00:00Z", expect Y-m-d\TH:i[:s[.f]].
PlainDateTime::parse('2026-03-05T10:00:00Z');
```

`Instant::parse()` requires a designator, such as `Z` or an offset.

### Current Time

`Clock` returns the current value. It follows the clock set with
`Clock::set()`, so tests can replace it with a `MockClock`.

```php
use Windwalker\Core\DateTime\Clock;

echo Clock::instant()->toIso();
echo Clock::plainDate('Asia/Taipei')->toIso();
echo Clock::plainTime('Asia/Taipei')->toIso();
echo Clock::plainDateTime('Asia/Taipei')->toIso();
```

Each type also has its own `now()` or `today()` method, such as
`PlainDate::today()` and `Instant::now()`.

### Reading Fields

Fields are available as properties and as getter methods.

- Properties return zero-padded strings, which suit output.
- Getter methods return integers, which suit calculations.

```php
$dateTime = PlainDateTime::of(2026, 3, 5, 9, 5, 7);

echo $dateTime->month;       // 03
echo $dateTime->getMonth();  // 3
echo $dateTime->getHour();   // 9
echo $dateTime->getDayOfWeek();   // 4
echo $dateTime->getDaysInMonth(); // 31
```

`PlainDate` and `PlainDateTime` also expose `dayOfTheYear`, which
starts at 1, and `weekOfYear`. `dayOfYear` starts at 0, to match
`Chronos`. Prefer `dayOfTheYear` in new code.

### Changing Dates and Times

`plus()` and `minus()` accept an ISO 8601 duration string, a `Duration`,
or a `DateInterval`. `with()` replaces named fields. Each call returns a
new object.

```php
$date = PlainDate::of(2026, 1, 31);

echo $date->plus('P1M')->toIso();          // 2026-02-28
echo $date->minus('P1D')->toIso();         // 2026-01-30
echo $date->with(month: 2)->toIso();       // 2026-02-28
```

`plus()`, `minus()`, and `with()` take a `DateOverflow` value that
decides what happens when a day does not exist in the target month.

- `DateOverflow::Constrain`: clamps to the last valid day. This is the
  default for `plus()`, `minus()`, and `with()`.
- `DateOverflow::Reject`: throws. This is the default for `of()`.
- `DateOverflow::Native`: lets PHP roll over into the next month.

```php
$date = PlainDate::of(2026, 1, 31);

echo $date->plus('P1M')->toIso();
// 2026-02-28

echo $date->plus('P1M', DateOverflow::Native)->toIso();
// 2026-03-03

// ERROR: RangeException: Day 31 does not exist in 2026-02.
$date->plus('P1M', DateOverflow::Reject);

// ERROR: RangeException: Day 30 is out of range 1-28.
PlainDate::of(2026, 2, 30);
```

`PlainTime` arithmetic wraps around midnight. `PlainYearMonth` accepts
only year and month units.

```php
echo PlainTime::of(23, 30)->plus('PT1H')->toIso();
// 00:30:00

// ERROR: InvalidArgumentException:
//   PlainYearMonth does not support the interval unit "d".
PlainYearMonth::of(2024, 2)->plus('P1D');
```

### Comparing and Measuring Differences

`compareTo()`, `equals()`, `isBefore()`, and `isAfter()` compare values of
the same type. Use `PlainDate::compare()` as a sort callback.

```php
$dates = [
    PlainDate::of(2026, 3, 1),
    PlainDate::of(2026, 1, 31),
];

usort($dates, PlainDate::compare(...));
```

`until()` and `since()` return a `DateInterval`. `since()` measures
backwards from the other value. Pass a unit name as the second argument
to choose the largest unit.

Each type has its own default largest and smallest units:

- `PlainDate`: largest `Year`, smallest `Day`.
- `PlainYearMonth`: largest `Year`, smallest `Month`.
- `PlainDateTime`: largest `Year`, smallest `Microsecond`.
- `PlainTime`: largest `Hour`, smallest `Microsecond`.
- `Instant`: largest `Hour`, smallest `Microsecond`.

Weeks are not a supported unit.

```php
$start = PlainDate::of(2026, 1, 31);
$end = PlainDate::of(2026, 3, 1);

echo $start->diff($end, absolute: true)->days; // 29
echo $start->until($end, 'month')->format('%m months %d days');
// 1 months 1 days
```

### Rounding

`PlainTime`, `PlainDateTime`, and `Instant` provide `round()`. It takes
three arguments: the smallest unit, the increment, and the rounding
mode. `PlainDate` has no `round()`, because it has no unit smaller than
a day.

```php
// round(DateTimeUnit|string $smallestUnit,
//       int $roundingIncrement = 1,
//       RoundingMode $roundingMode = RoundingMode::HalfAwayFromZero)

echo PlainTime::parse('23:59:59.6')->round('second')->toIso();
// 00:00:00

echo PlainTime::parse('10:07:30')->round('minute', 15)->toIso();
// 10:15:00

echo PlainDateTime::parse('2026-01-31T13:00')->round('day')->toIso();
// 2026-02-01T00:00:00
```

`RoundingMode` is PHP's built-in enum (PHP 8.4+). It decides which
neighbor to pick when the value falls between two multiples. The
default, `HalfAwayFromZero`, rounds a tie upward.

```php
use RoundingMode;

$time = PlainTime::parse('10:07:30');

$time->round('minute', 15)->toIso();
// 10:15:00  (default HalfAwayFromZero, 7.5 min is a tie)

$time->round('minute', 15, RoundingMode::HalfTowardsZero)->toIso();
// 10:00:00

$time->round('minute', 15, RoundingMode::HalfEven)->toIso();
// 10:00:00  (10:00 is the even multiple)

$time->round('minute', 15, RoundingMode::TowardsZero)->toIso();
// 10:00:00

$time->round('minute', 15, RoundingMode::AwayFromZero)->toIso();
// 10:15:00
```

The modes that work on a tie are:

- `HalfAwayFromZero`: ties go to the larger magnitude. This is the default.
- `HalfTowardsZero`: ties go to the smaller magnitude.
- `HalfEven`: ties go to the even multiple, as in banker's rounding.
- `HalfOdd`: ties go to the odd multiple.

The modes that ignore ties are:

- `TowardsZero`: always truncate toward zero.
- `AwayFromZero`: always move away from zero.
- `NegativeInfinity`: always round down.
- `PositiveInfinity`: always round up.

`HalfEven` gives the least bias when you round many values, such as
totals. Use `NegativeInfinity` or `PositiveInfinity` when a slot must
never end past its boundary, such as a booking that must not overrun.

::: info
`Instant` rounds relative to the Unix epoch. `PlainTime` wraps around
midnight, so `23:59:59.6` rounds to `00:00:00`.
:::

The increment must divide the next larger unit evenly, such as 15 for
minutes. `round('day')` accepts only an increment of 1.

```php
// ERROR: InvalidArgumentException: Rounding increment of "day" must be 1.
PlainDateTime::parse('2026-01-31T13:00')->round('day', 2);
```

### Changing Time Zones

Use `withTimezone()` to show the same instant in another zone. Use
`withTimezoneKeepingLocal()` to keep the wall-clock time and change the
instant.

```php
$taipei = Chronos::create('2026-03-05 10:00:00', 'Asia/Taipei');

echo $taipei->withTimezone('UTC')->format('c');
// 2026-03-05T02:00:00+00:00

echo $taipei->withTimezoneKeepingLocal('UTC')->format('c');
// 2026-03-05T10:00:00+00:00
```

::: info
A wall-clock time that does not exist in the target zone, such as a DST
gap, is moved forward by PHP's rules.
:::

```php
$ny = Chronos::create('2026-03-08 02:30:00', 'America/New_York');

echo $ny->format('c');
// 2026-03-08T03:30:00-04:00
```

### JSON and Strings

Every temporal type implements `JsonSerializable` and `Stringable`.
Both output the `toIso()` format. `Chronos` is the exception: its JSON
output is the PHP `format()` string with milliseconds and an offset.

```php
echo json_encode(Chronos::create('2026-03-05 10:00:00', 'Asia/Taipei'));
// "2026-03-05T10:00:00.000+08:00"
```

```php
echo json_encode(PlainDate::of(2026, 3, 5));
// "2026-03-05"

echo json_encode(PlainDateTime::parse('2026-03-05T10:30:00.123456'));
// "2026-03-05T10:30:00.123456"

echo json_encode(Instant::parse('2026-03-05T10:30:00+08:00'));
// "2026-03-05T02:30:00Z"
```

`PlainMonthDay` outputs `MM-DD`.

## Entity Casts

Use `PlainDateCast` for a `date` column that should hold a
`PlainDate`. It hydrates `null`, an empty string, and the MySQL
`0000-00-00` sentinel to `null`.

```php
use Windwalker\Core\DateTime\PlainDate;
use Windwalker\Core\DateTime\PlainDateCast;
use Windwalker\ORM\Attributes\CastNullable;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\Table;

#[Table('members')]
class Member
{
    #[Column('id')]
    public ?int $id = null;

    #[Column('birthday')]
    #[CastNullable(PlainDateCast::class)]
    public ?PlainDate $birthday = null;
}
```

::: info
`PlainDateCast` does no time zone conversion. A `date` column stores
the same calendar date that the code reads.
:::

Use `PlainTimeCast` for a `time` column that should hold a
`PlainTime`. It accepts values from `00:00:00` to `23:59:59`.

```php
use Windwalker\Core\DateTime\PlainTime;
use Windwalker\Core\DateTime\PlainTimeCast;
use Windwalker\ORM\Attributes\CastNullable;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\Table;

#[Table('shifts')]
class Shift
{
    #[Column('id')]
    public ?int $id = null;

    #[Column('starts_at')]
    #[CastNullable(PlainTimeCast::class)]
    public ?PlainTime $startsAt = null;
}
```

::: warning
`PlainTimeCast` throws `InvalidArgumentException` for values such as
`838:59:59`, which MySQL `TIME` columns can contain. Check the column
range before you hydrate.
:::

For values that need a time zone, use `ServerTimeCast`, described in
[ChronosService](./chronos-service.md).

### Generated Entities

The entity generator maps date and time columns to these types, always
nullable, with a default of `null`:

- `datetime` → `?Chronos` with `#[CastNullable(ServerTimeCast::class)]`
- `date` → `?PlainDate` with `#[CastNullable(PlainDateCast::class)]`
- `time` → `?PlainTime` with `#[CastNullable(PlainTimeCast::class)]`

```php
#[Column('birthday')]
#[CastNullable(PlainDateCast::class)]
public ?PlainDate $birthday = null;
```

Edit the generated type if a column must hold a non-null value.
