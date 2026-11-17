---
layout: doc
title: ChronosService
---

# ChronosService

`ChronosService` converts date-times between the application time zone
and the server time zone. Most applications store dates in the server
time zone, usually UTC, and show them in the user's local zone.
`ChronosService` does both conversions in one place.

It reads two settings from the configuration.

- `app.timezone`: the local time zone shown to users.
- `app.server_timezone`: the time zone used for storage.

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

## Creating Values

The `create*` methods build a `Chronos` in the zone named by the
method. Their names describe the input zone and the output zone.

```php
// Build a Chronos from a local wall-clock string
$localDate = $this->chronos->createLocal('2024-03-15 18:30:00');

// Build a Chronos from a server wall-clock string
$serverDate = $this->chronos->createServerAs('2024-03-15 09:30:00');

// Build a Chronos in the server zone from the current time
$now = $this->chronos->createLocalAsServer();
```

## Time Zone Settings

Read the configured zones directly.

```php
$this->chronos->getTimezone();       // Asia/Tokyo
$this->chronos->getServerTimezone(); // UTC
```

## Null Dates

Databases often store an empty date as a sentinel value. Use
`isNullDate()` to check for it, and `getNullDate()` to get the value
for your database adapter. Both need `windwalker/database` installed.

```php
if ($this->chronos->isNullDate($row->deleted_at)) {
    // Not deleted
}
```

## Storing Dates in Entities

Use `ServerTimeCast` to convert entity fields automatically, so you do
not need to call `toServer()` in each service.

```php
use Windwalker\Core\DateTime\ServerTimeCast;
use Windwalker\ORM\Attributes\CastNullable;

class Order
{
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

See [Temporal Types](./temporal-types.md) for the cast that handles
calendar dates without time zone conversion.
