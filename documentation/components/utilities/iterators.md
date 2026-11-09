---
layout: doc
title: Iterators
component: utilities
---

# Iterators

Lists of rows are often transformed in several steps: filter the active
ones, map each to a view model, take the first few. With plain arrays,
each step builds a new array in memory. The iterators in this package
run the same steps lazily, one item at a time, so a long source such as
a database cursor or a paginated API does not have to be loaded in full.
This page covers four iterator classes: `NestedIterator` for pipelines,
`RewindableGenerator` for re-runnable generators, `PaginateIterator` for
page-by-page sources, and `UniqueIterator` for removing duplicates. It also
describes `PriorityQueue`, an ordered queue that is not an iterator but is
read in the same way.

## Minimal Setup

The classes are plain PHP objects. Wrap an array or any `Traversable`,
then chain the methods you need:

```php
use Windwalker\Utilities\Iterator\NestedIterator;

$names = (new NestedIterator(['alice', 'bob']))
    ->map(fn (string $name) => ucfirst($name));

foreach ($names as $name) {
    echo $name, PHP_EOL;
}
// Alice
// Bob
```

## Showcase: Building a Mailing List

The following pipeline selects active users, builds a display name for
each, and keeps the first two. Nothing runs until the result is read:

```php
use Windwalker\Utilities\Iterator\NestedIterator;

$users = new NestedIterator([
    ['name' => 'alice', 'active' => true],
    ['name' => 'bob', 'active' => false],
    ['name' => 'carol', 'active' => true],
    ['name' => 'dave', 'active' => true],
]);

$list = $users
    ->filter(fn (array $user) => $user['active'])
    ->map(fn (array $user) => ucfirst($user['name']))
    ->slice(0, 2)
    ->implode(', ')
    ->getString();

// Alice, Carol
```

`filter()`, `map()`, and `slice()` each return a new iterator that adds one
step to the pipeline. `implode()` reads the pipeline and returns a
`StringObject`, so `getString()` gives the native string.

## NestedIterator

Most methods that add a step return a new instance, so a base pipeline can
be reused safely. `wrap()` and `each()` return the same instance:

```php
$base = new NestedIterator([1, 2, 3]);

$doubled = $base->map(fn (int $n) => $n * 2);
$shifted = $base->map(fn (int $n) => $n + 1);

// $base is unchanged; $doubled and $shifted are independent.
```

The main steps are these:

- `map()` changes each value. `mapWithKey()` also changes the key.
- `filter()` keeps the items for which the callback returns a truthy value.
- `flatMap()` maps each item to an iterable and flattens the results.
- `slice()` and `limit()` take a range of items.
- `chunk()` groups items into arrays of a given size.
- `reduce()` folds the items into one value, and it runs immediately.
- `concat()` and `chain()` append other iterables.
- `keys()` and `values()` return only the keys or the values.

`explode()` is a static constructor. It splits a string into a pipeline:

```php
NestedIterator::explode('|', 'a|b|c', 2);
// yields 'a' and 'b|c'
```

::: info
`each()` runs a callback for every item and then returns the pipeline. It
is useful for side effects, such as logging, and it does not change the
values.
:::

## Extending a Pipeline with a Callback

`with()` adds a callback that receives the whole inner iterable and returns
a new iterable. Use it when a step needs to see more than one item at a
time, such as deduplicating or grouping:

```php
$pipeline = (new NestedIterator([3, 1, 2]))
    ->with(function (iterable $items) {
        $values = iterator_to_array($items, false);
        sort($values);

        yield from $values;
    });

iterator_to_array($pipeline, false); // [1, 2, 3]
```

`wrap()` adds a callback to the same object. Use it only when you want to
change this instance, because it does not create a copy.

## RewindableGenerator

A generator can only be read once. `RewindableGenerator` wraps a factory
that creates a generator, and calls the factory again when the iterator
is rewound:

```php
use Windwalker\Utilities\Iterator\RewindableGenerator;

$lines = new RewindableGenerator(function () {
    yield 'first';
    yield 'second';
});

iterator_to_array($lines); // ['first', 'second']
iterator_to_array($lines); // ['first', 'second'] again
```

Pass the result to `NestedIterator` when you need the pipeline methods on
a generator.

## PaginateIterator

`PaginateIterator` reads a source one page at a time. The callback receives
the page number and the page size, and returns the items of that page. The
iteration ends when a page is empty:

```php
use Windwalker\Utilities\Iterator\PaginateIterator;

$rows = range(1, 7);

$all = new PaginateIterator(
    fn (int $page, int $perPage) => array_slice(
        $rows,
        ($page - 1) * $perPage,
        $perPage,
    ),
    3,
);

iterator_to_array($all, false); // [1, 2, 3, 4, 5, 6, 7]
```

The third constructor argument, `$limit`, caps the total number of items.
Choose a limit that is a multiple of the page size, so the last page is
complete.

::: tip
Use `PaginateIterator` with an API client that returns one page per
request. Each page is requested only when the loop reaches it.
:::

## UniqueIterator

`UniqueIterator` skips values that have already been seen. It compares
values as strings by default, so `1` and `'1'` count as the same value:

```php
use Windwalker\Utilities\Iterator\UniqueIterator;

$unique = new UniqueIterator(
    new ArrayIterator([1, '1', 2, 2, 3]),
);

iterator_to_array($unique, false); // [1, 2, 3]
```

Pass `SORT_NUMERIC` as the second argument to compare values as numbers.
The iterator remembers every value it has returned, so it uses memory in
proportion to the number of unique values.

## Priority Queue

Many systems run a list of handlers in an order that is not the order they
were registered: authentication before parsing, logging after everything,
and cleanup last. A priority queue stores items with a number and returns
the highest priority first. Items with the same priority keep the order in
which they were added, so registrations of equal weight behave predictably.

`PriorityQueue` extends PHP's `SplPriorityQueue` and adds named priority
constants, batch insertion, and a non-destructive `toArray()`.

### Priority Queue Minimal Setup

Create the queue, insert items with a priority, then read them back. The
highest priority comes out first:

```php
use Windwalker\Utilities\Iterator\PriorityQueue;

$queue = new PriorityQueue();

$queue->insert('save', PriorityQueue::NORMAL);
$queue->insert('validate', PriorityQueue::HIGH);

$queue->extract(); // 'validate'
```

### Showcase: Running Request Hooks

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

### Priority Constants

The class defines seven named priorities, from `MIN` to `MAX`:

- `MIN` (-300), `LOW` (-200), `BELOW_NORMAL` (-100).
- `NORMAL` (0), the default.
- `ABOVE_NORMAL` (100), `HIGH` (200), `MAX` (300).

Any integer works. The constants make the intent of a registration clear
and keep the numbers consistent across the codebase.

### Inserting Items

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

### Iteration Consumes the Queue

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

| Class and method | Parameters | Description |
|------------------|------------|-------------|
| `NestedIterator::__construct()` | `iterable\|callable $iterator` | Creates a pipeline from an iterable or a generator factory. |
| `map()` | `callable $callback` | Maps each value. |
| `mapWithKey()` | `callable $callback` | Maps each value and its key. |
| `filter()` | `callable $callback, int $flags = 0` | Keeps items the callback accepts. |
| `flatMap()` | `callable $callback` | Maps each item to an iterable and flattens. |
| `slice()` | `int $start, ?int $length = null` | Takes a range of items. |
| `limit()` | `int $offset, int $limit` | Takes a range, by offset and count. |
| `chunk()` | `int $size, bool $preserveKeys = false` | Groups items into chunks. |
| `reduce()` | `callable $callback, mixed $initial = null` | Folds the items into one value. |
| `concat()` / `chain()` | `iterable ...$iterables` | Appends other iterables. |
| `keys()` / `values()` | None | Returns only the keys or only the values. |
| `implode()` | `string $separator` | Joins the values into a `StringObject`. |
| `explode()` | `string $separator, string $str, ?int $limit = null` | Static; splits a string into a pipeline. |
| `each()` | `callable $callback` | Runs a callback for each item, for side effects. |
| `with()` / `withSelf()` | `callable $callback` | Returns a copy with one more step. |
| `wrap()` | `callable $callback` | Adds a step to this instance. |
| `RewindableGenerator` | `callable $callable` | Re-creates a generator on each rewind. |
| `PaginateIterator` | `Closure $callback, Closure\|int $perPage, ?int $limit = null` | Reads pages until one is empty. |
| `UniqueIterator` | `Iterator $iterator, int $flags = SORT_STRING` | Skips repeated values. |
| `PriorityQueue::__construct()` | `array\|SplPriorityQueue $items = [], mixed $priority = NORMAL` | Creates a queue, optionally filled with items. |
| `PriorityQueue::insert()` | `mixed $value, mixed $priority` | Adds one item with a priority. |
| `PriorityQueue::join()` | `iterable $items = [], mixed $priority = NORMAL` | Adds many items with the same priority. |
| `PriorityQueue::insertArray()` | `array $items` | Adds items keyed by their priority. |
| `PriorityQueue::toArray()` | None | Returns the items in extraction order, without changing the queue. |

## Related

- [Text Transforms](./text-transforms): other text helpers in this package.
