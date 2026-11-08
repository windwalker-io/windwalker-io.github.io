---
layout: doc
title: Events
component: database
---

# Events

The adapter emits events while a query runs and when rows are fetched.
Listeners use them for query logging, timing, profiling, and for changing
results before the caller receives them. Events are the extension point of
the package.

## Subscribing

`DatabaseAdapter` uses the event system of the Event component. Register a
listener with `on()`, giving the event class and a callable:

```php
use Windwalker\Database\Event\QueryEndEvent;

$db->on(
    QueryEndEvent::class,
    function (QueryEndEvent $event) use ($logger) {
        $logger->debug($event->sql);
    },
);
```

Listeners are attached to the adapter, so queries run through that adapter
emit to them.

## Query Events

Each statement emits events in this order:

- `QueryStartEvent`: before a query is sent. It carries the SQL, the bound
  parameters in `params`, and the statement.
- `QueryEndEvent`: after a query succeeds. It carries the SQL, the
  statement, and the `result` flag.
- `QueryFailedEvent`: when a query fails. It carries the exception, which a
  listener may replace before it is thrown.

Use the start and end events together to measure duration:

```php
use Windwalker\Database\Event\QueryEndEvent;
use Windwalker\Database\Event\QueryStartEvent;

$started = null;

$db->on(
    QueryStartEvent::class,
    function () use (&$started) {
        $started = hrtime(true);
    },
);

$db->on(
    QueryEndEvent::class,
    function (QueryEndEvent $event) use (&$started) {
        $ms = (hrtime(true) - $started) / 1_000_000;

        echo sprintf("%.2fms: %s\n", $ms, $event->sql);
    },
);
```

::: warning
The start event exposes bound parameters. They can contain passwords,
tokens or personal data. Do not write them to shared logs without
filtering.
:::

## Fetch Events

When rows are read from a statement, the fetch events let you adjust each
row or the whole result:

- `ItemFetchedEvent`: after one row is read. The row is available as a
  reference through `getItem()`, so a listener can change it.
- `FullFetchedEvent`: after all rows are read, for `all()` and similar
  methods.
- `HydrateEvent`: before a row is converted to a class instance. It carries
  the target class and the row.

```php
use Windwalker\Database\Event\ItemFetchedEvent;

$db->on(
    ItemFetchedEvent::class,
    function (ItemFetchedEvent $event) {
        $item = &$event->getItem();

        $item['title'] = trim($item['title']);
    },
);
```

::: info
Fetch events run for every row read through the adapter, so keep listeners
light. Heavy work per row slows large result sets noticeably.
:::

## Debugging

Enable the `debug` option to append the executed SQL to query error
messages. This is useful during development. It is not a logging system, so
use the query events for logs and metrics.
