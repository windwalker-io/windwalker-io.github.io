---
layout: doc
description: Overview of the DateTime package, which keeps time zones explicit and covers the current time, zone conversion, and date storage.
---

# DateTime

The DateTime package provides time handling for Windwalker applications.
It replaces ad-hoc `DateTime` usage with a small set of classes that
keep time zones explicit.
Application code can read the current time, convert between the
server and local time zones, and store dates without manual offset math.

## Overview

The DateTime area has four main parts:

- **Chronos**: an immutable date-time object that extends `DateTimeImmutable`.
- **Clock**: a static source of "now", which can be replaced in tests.
- **ChronosService**: a service that knows the application's local and
  server time zones.
- **Temporal-like types**: `PlainDate`, `PlainTime`, `PlainDateTime`,
  and `Instant`, modeled after the TC39 Temporal proposal.

`Chronos` is the object you will use most.
`ChronosService` decides which time zone a value should be shown in.
`Clock` decides what "now" means.

## Topics

- [Chronos](./datetime/chronos)
- [Clock](./datetime/clock)
- [ChronosService](./datetime/chronos-service)
- [Temporal Like API](./datetime/temporal-like-api)

## Use as Standalone Component

`Chronos` and `Clock` do not depend on the framework container.
Create a value with the static `Chronos::wrap()` method.

```php
use Windwalker\Core\DateTime\Chronos;

$date = Chronos::wrap('2026-05-01 10:00:00', 'Asia/Taipei');

echo $date->format('Y-m-d H:i:s'); // 2026-05-01 10:00:00
```

## Use in Windwalker

In a Windwalker application, `ChronosService` reads the
`app.timezone` and `app.server_timezone` configuration values.
Obtain it from the container or inject it into a constructor.
See [ChronosService](./datetime/chronos-service) for details.
