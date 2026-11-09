---
layout: doc
title: Priority Queue
component: utilities
---

# Priority Queue

Many systems run a list of handlers in an order that is not the order they
were registered: authentication before parsing, logging after everything,
and cleanup last. A priority queue stores items with a number and returns
the highest priority first. Items with the same priority keep the order in
which they were added, so registrations of equal weight behave predictably.

`PriorityQueue` extends PHP's `SplPriorityQueue` and adds named priority
constants, batch insertion, and a non-destructive `toArray()`.

## Minimal Setup

Create the queue, insert items with a priority, then read them back. The
highest priority comes out first:

```php
use Windwalker\Utilities\Iterator\PriorityQueue;

$queue = new PriorityQueue();

$queue->insert('save', PriorityQueue::NORMAL);
$queue->insert('validate', PriorityQueue::HIGH);

$queue->extract(); // 'validate'
```

## Showcase: Running Request Hooks

The following example registers hooks with different priorities, then runs
them in order. Hooks with equal priority run in the order they were
registered:

```php
use Windwalker\Utilities\Iterator\PriorityQueue;

$hooks = new PriorityQueue();

$hooks->insert('logRequest', PriorityQueue::LOW);
$hooks->insert('authenticate', PriorityQueue::HIGH);
$hooks->insert('parseBody', PriorityQueue::NORMAL);
$hooks->insert('parseRoute', PriorityQueue::NORMAL);

foreach ($hooks->toArray() as $hook) {
    echo $hook, PHP_EOL;
}

// authenticate
// parseBody
// parseRoute
// logRequest
```

`toArray()` returns the items in the order they would be extracted. The
queue itself is not changed.

## Priority Constants

The class defines seven named priorities, from `MIN` to `MAX`:

- `MIN` (-300), `LOW` (-200), `BELOW_NORMAL` (-100).
- `NORMAL` (0), the default.
- `ABOVE_NORMAL` (100), `HIGH` (200), `MAX` (300).

Any integer works. The constants make the intent of a registration clear
and keep the numbers consistent across the codebase.

## Inserting Items

`insert()` takes a value and a priority. `join()` inserts many items with
the same priority:

```php
$queue = new PriorityQueue(['a', 'b'], PriorityQueue::LOW);

$queue->join(['c'], PriorityQueue::HIGH);
```

`insertArray()` takes an array whose keys are the priorities and whose
values are the items:

```php
$queue->insertArray([
    PriorityQueue::MAX => 'first',
    PriorityQueue::MIN => 'last',
]);
```

::: tip
Keep the priority of an item in one place, such as a constant on the class
that registers the hook. A number typed inline is easy to misplace.
:::

## Iteration Consumes the Queue

`SplPriorityQueue` removes an item each time it is read. A `foreach` loop
over the queue itself empties it:

```php
foreach ($hooks as $hook) {
    // Each item is removed as it is read.
}

// $hooks is now empty.
```

Use `toArray()` when you need the items and want to keep the queue. It
reads a copy of the queue, so the original is unchanged.

::: warning
Do not iterate a queue that other code still needs. Use `toArray()` or
iterate a `clone` of the queue.
:::

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `__construct()` | `array\|SplPriorityQueue $items = [], mixed $priority = NORMAL` | Creates a queue, optionally filled with items. |
| `insert()` | `mixed $value, mixed $priority` | Adds one item with a priority. |
| `join()` | `iterable $items = [], mixed $priority = NORMAL` | Adds many items with the same priority. |
| `insertArray()` | `array $items` | Adds items keyed by their priority. |
| `toArray()` | None | Returns the items in extraction order, without changing the queue. |

## Related

- [Iterators](./iterators): other iterator classes in this package.
