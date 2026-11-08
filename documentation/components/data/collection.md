---
layout: doc
title: Collection
part: Components
chapter: Data
menu: components/data
component: data
---

# Collection

Most data in an application is nested. An API response contains an order,
the order contains a customer and a list of items, and each item contains
its own fields. `Collection` wraps such an array so that you can read,
change, and copy any part of it with a path string such as
`order.customer.name`. The same object also gives you a way to load data
from a string or a file, and to convert it back into a format.

`Collection` extends the `ArrayObject` class of `windwalker/scalars`. It
therefore keeps the array helpers of that class, such as `column()`,
`map()`, `filter()`, and `sum()`. The methods described here add the
deep-path and loading features.

## Creating a Collection

Use the constructor for an array, `collect()` as a short helper, or
`Collection::from()` for a string or a file:

```php
use Windwalker\Data\Collection;
use function Windwalker\collect;

$a = new Collection(['flower' => 'sakura']);
$b = collect(['flower' => 'sakura']);
$c = Collection::from('{"flower":"sakura"}', 'json');
```

`Collection::from()` returns the same instance when you pass a
`Collection` into it. It does not copy the data.

## Showcase

The following example reads a fictional order response, calculates a
value from its items, and creates a changed copy. The original object is
not changed by the last step:

```php
use Windwalker\Data\Collection;

$json = <<<JSON
{
    "order": {
        "id": 1001,
        "customer": {"name": "Rose", "tier": "gold"},
        "items": [
            {"sku": "SAK-01", "qty": 2, "price": 12.5},
            {"sku": "ROS-03", "qty": 1, "price": 8.0}
        ]
    }
}
JSON;

$order = Collection::from($json, 'json');

echo $order->getDeep('order.customer.name'); // Rose

$units = $order->extract('order.items')->column('qty')->sum();

echo $units; // 3

$shipped = $order->withDeep('order.status', 'shipped');

echo $shipped->getDeep('order.status'); // shipped
echo $order->hasDeep('order.status') ? 'yes' : 'no'; // no
```

`getDeep()` and `withDeep()` both take the path as the first argument.
The path is split by `.` unless you give another delimiter.

## Deep Paths

The deep-path methods let you address nested values by a single string:

- `getDeep()` reads a value and returns `null` when the path is missing.
- `hasDeep()` checks whether a path exists.
- `setDeep()` writes a value. It creates the missing intermediate arrays,
  and it changes the current object.
- `removeDeep()` deletes a value from the current object.

Each of these methods accepts a delimiter as the last argument, so a
path can use another separator:

```php
$config = collect(['database' => ['host' => 'localhost']]);

echo $config->getDeep('database/host', '/'); // localhost

$config->setDeep('cache/driver', 'redis', '/');

echo $config->getDeep('cache/driver', '/'); // redis
```

::: tip
Use a delimiter other than `.` only when the keys themselves contain
dots, such as hostnames or file names used as keys.
:::

### Immutable Copies

Each mutating method has a `with` variant that works on a copy:
`withDeep()` and `withRemoveDeep()`. The `with()` method from the
array base class follows the same rule for a top-level key. Use these
methods when the object is shared, such as a base configuration that
several services read:

```php
$base = collect(['debug' => false, 'name' => 'app']);

$local = $base->withDeep('debug', true);

var_dump($base->getDeep('debug')); // false
var_dump($local->getDeep('debug')); // true
```

## Loading Data

`load()` reads a string or an array into the current object.
`loadFile()` reads a file, and `withLoad()` does the same on a copy.
The format is detected from the file extension, or you pass it
explicitly. See [Formats](/documentation/components/data/formats) for
the supported formats.

```php
$settings = new Collection();

$settings->loadFile(__DIR__ . '/settings.json');
$settings->load('{"theme":"dark"}', 'json');
```

::: warning
`load()` merges the new data into the existing data with a recursive
merge. A list in the new data is appended to the existing list, not
used to replace it. The merge succeeds without an error, but the result
is often not what you expected:

```php
$config = collect(['tags' => ['red']]);

$config->load(['tags' => ['blue']]);

// ['tags' => ['red', 'blue']]
```

To replace a list, use `setDeep()` instead:

```php
$config->setDeep('tags', ['blue']);
```
:::

## Proxies

A proxy is a `Collection` that writes its changes back into the parent
object. There are two ways to get a sub-tree:

- `extract($path)` returns a copy. Changes to the copy do not affect the
  parent.
- `extract($path, true)`, or its alias `proxy($path)`, returns a view.
  Changes to the view are written into the parent.

```php
$order = Collection::from($json, 'json');

$items = $order->proxy('order.items');

$items->push(['sku' => 'LIL-02', 'qty' => 1, 'price' => 4.0]);

echo count($order->getDeep('order.items')); // 3
```

::: info
When the path does not exist, a proxy creates an empty array at that path
in the parent. The parent gains a key even though you only asked to read
it. A proxy also requires the target to be an array. Otherwise, the call
throws an exception.
:::

## Mapping a Column

`mapProxy()` applies a change to every item of a list. It returns a new
collection and leaves the original unchanged.

Pass a column name to change one field of each item:

```php
$order = Collection::from($json, 'json');

$items = $order->extract('order.items');

$doubled = $items->mapProxy('qty')->map(
    fn(int $qty): int => $qty * 2
);

echo $doubled->column('qty')->sum(); // 6
echo $items->column('qty')->sum(); // 3
```

The method called after `mapProxy('qty')` must return a `Collection`,
for example `map()` or `filter()`. Calling a method such as `sum()` in
this mode throws an `InvalidArgumentException`.

When you omit the column name, the proxy calls a method on each item.
This works for list items that are objects:

```php
$labels = collect([new Label('one'), new Label('two')]);

$labels->mapProxy()->text(); // ['one!', 'two!']
```

## Converting Back to a String

`toString()` dumps the data with the given format. It uses JSON when you
do not pass a format. `toStringObject()` returns a `StringObject` from
`windwalker/scalars`, and the `to*()` shortcuts, such as `toYaml()` and
`toXml()`, call `toString()` with the matching format:

```php
$order = Collection::from($json, 'json');

echo $order->toString('json');
echo $order->toXml();
```

Format-specific options and the dependencies they need are described on
the [Formats](/documentation/components/data/formats) page.
