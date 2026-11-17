---
layout: doc
title: Clock
---

# Clock

`Clock` is the single source of "now" for Windwalker. Code that asks
for the current time through `Clock` can be tested by replacing the
clock with a fixed value.

Calling `new \DateTime()` or `time()` directly makes tests depend on
the real time. Reading time through `Clock` lets a test set a known
moment and assert the result.

## Reading the Current Time

`Clock` provides static methods for each value type.

```php
use Windwalker\Core\DateTime\Clock;

$now = Clock::now();                       // Chronos
$now = Clock::now('Asia/Tokyo');           // Chronos in Tokyo

$instant = Clock::instant();               // Instant
$date = Clock::plainDate('Asia/Tokyo');    // PlainDate
$time = Clock::plainTime('Asia/Tokyo');    // PlainTime
$dateTime = Clock::plainDateTime();        // PlainDateTime
```

## Fixing the Time in Tests

`Clock::set()` replaces the active clock. Pass a string, a timestamp,
a `DateTimeInterface`, or a `ClockInterface`. Pass `null` to restore
the system clock.

```php
use Windwalker\Core\DateTime\Clock;

Clock::set('2024-03-15 09:30:00');

echo Clock::now()->format('Y-m-d H:i:s');
// 2024-03-15 09:30:00

Clock::set(null); // Restore the system clock
```

`Clock::reset()` does the same thing and is the usual call in test
teardown.

```php
protected function tearDown(): void
{
    Clock::reset();

    parent::tearDown();
}
```

::: warning
The fixed clock stays active until you reset it. Call
`Clock::reset()` in teardown so later tests do not inherit the frozen
time.
:::

## Clock Implementations

The clock is an object that implements `ClockInterface`. Windwalker
ships three implementations.

- `SystemClock`: returns the real current time. This is the default.
- `MockClock`: returns a fixed time that you set.
- `OffsetClock`: wraps another clock and shifts its time.

```php
use Windwalker\Core\DateTime\Clock;
use Windwalker\Core\DateTime\MockClock;

$clock = new MockClock('2024-03-15 09:30:00');

Clock::set($clock);

echo Clock::now()->format('Y-m-d H:i:s');
// 2024-03-15 09:30:00
```

`MockClock::set()` changes the fixed time without replacing the clock
object. Use it when one test moves time forward.

```php
$clock->set('2024-03-16 09:30:00');
```

`OffsetClock::addSeconds()` moves the base clock forward without
freezing it.

```php
use Windwalker\Core\DateTime\OffsetClock;

$clock = new OffsetClock(Clock::get());
$clock->addSeconds(3600); // one hour ahead

Clock::set($clock);
```
