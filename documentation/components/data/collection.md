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

`Collection` extends the `ArrayObject` class of `windwalker/scalars`, so it
also has every array helper of that class, such as `column()`, `map()`,
`filter()`, and `sum()`. The methods described here add the deep-path and
loading features. The inherited methods are listed in
[Inherited Methods](#inherited-methods) at the end of this page.

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

## Inherited Methods

`Collection` inherits the public methods of `ArrayObject` from
`windwalker/scalars`. Each method below links to its explanation in the
[Array Object](/documentation/components/scalars/array-object) page of the
Scalars component. Methods that return a new object leave the original
unchanged, and methods marked there as in-place change the object.

### Creating and Wrapping

- [`create()`](/documentation/components/scalars/array-object#creating-an-arrayobject)
- [`explode()`](/documentation/components/scalars/array-object#creating-an-arrayobject)
- [`range()`](/documentation/components/scalars/array-object#creating-an-arrayobject)
- [`fillWith()`](/documentation/components/scalars/array-object#creating-an-arrayobject)
- [`fillKeys()`](/documentation/components/scalars/array-object)
- [`wrap()`](/documentation/components/scalars/array-object#wrapping-items)
- [`tryWrap()`](/documentation/components/scalars/array-object#wrapping-items)
- [`unwrap()`](/documentation/components/scalars/array-object#wrapping-items)
- [`wrapAll()`](/documentation/components/scalars/array-object#wrapping-items)
- [`dump()`](/documentation/components/scalars/array-object#wrapping-items)
- [`as()`](/documentation/components/scalars/array-object)
- [`mapAs()`](/documentation/components/scalars/array-object)
- [`reset()`](/documentation/components/scalars/array-object)

### Immutable Updates

- [`with()`](/documentation/components/scalars/array-object#immutable-updates)
- [`withDef()`](/documentation/components/scalars/array-object#immutable-updates)
- [`withRemove()`](/documentation/components/scalars/array-object#immutable-updates)
- [`withReset()`](/documentation/components/scalars/array-object#immutable-updates)

### Changing the Object in Place

- [`set()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`fill()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`bind()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`transform()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`push()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`unshift()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`pop()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`shift()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`takeout()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)
- [`splice()`](/documentation/components/scalars/array-object#methods-that-change-the-object-in-place)

### Reading Values

- [`first()`](/documentation/components/scalars/array-object#reading-values)
- [`last()`](/documentation/components/scalars/array-object#reading-values)
- [`findFirst()`](/documentation/components/scalars/array-object#reading-values)
- [`search()`](/documentation/components/scalars/array-object#reading-values)
- [`indexOf()`](/documentation/components/scalars/array-object#reading-values)
- [`contains()`](/documentation/components/scalars/array-object#reading-values)
- [`keyExists()`](/documentation/components/scalars/array-object#reading-values)
- [`keys()`](/documentation/components/scalars/array-object#reading-values)
- [`values()`](/documentation/components/scalars/array-object#reading-values)
- [`isEmpty()`](/documentation/components/scalars/array-object)
- [`notEmpty()`](/documentation/components/scalars/array-object)
- [`isNull()`](/documentation/components/scalars/array-object)
- [`notNull()`](/documentation/components/scalars/array-object)

### Looping and Transforming

- [`each()`](/documentation/components/scalars/array-object)
- [`walk()`](/documentation/components/scalars/array-object)
- [`walkRecursive()`](/documentation/components/scalars/array-object)
- [`find()`](/documentation/components/scalars/array-object)
- [`query()`](/documentation/components/scalars/array-object)
- [`filter()`](/documentation/components/scalars/array-object#transforming-values)
- [`reject()`](/documentation/components/scalars/array-object#transforming-values)
- [`partition()`](/documentation/components/scalars/array-object#partitioning)
- [`map()`](/documentation/components/scalars/array-object#transforming-values)
- [`mapRecursive()`](/documentation/components/scalars/array-object)
- [`mapWithKeys()`](/documentation/components/scalars/array-object)
- [`flatMap()`](/documentation/components/scalars/array-object#flat-mapping)
- [`reduce()`](/documentation/components/scalars/array-object#transforming-values)
- [`apply()`](/documentation/components/scalars/array-object)
- [`unique()`](/documentation/components/scalars/array-object#transforming-values)
- [`implode()`](/documentation/components/scalars/array-object)
- [`countValues()`](/documentation/components/scalars/array-object)

### Columns, Grouping, and Paging

- [`column()`](/documentation/components/scalars/array-object#columns-and-records)
- [`setColumn()`](/documentation/components/scalars/array-object#columns-and-records)
- [`group()`](/documentation/components/scalars/array-object#grouping-and-keying)
- [`groupBy()`](/documentation/components/scalars/array-object#grouping-and-keying)
- [`groupByPath()`](/documentation/components/scalars/array-object#grouping-and-keying)
- [`keyBy()`](/documentation/components/scalars/array-object#grouping-and-keying)
- [`chunk()`](/documentation/components/scalars/array-object#chunking-and-paging)
- [`page()`](/documentation/components/scalars/array-object#chunking-and-paging)
- [`flatten()`](/documentation/components/scalars/array-object#flattening-nested-data)
- [`collapse()`](/documentation/components/scalars/array-object#flattening-nested-data)

### Aggregation

- [`sum()`](/documentation/components/scalars/array-object#aggregation)
- [`avg()`](/documentation/components/scalars/array-object#aggregation)

### Sorting

- [`sort()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`sortDesc()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`sortKeys()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`sortKeysDesc()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`sortBy()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`natureSort()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`natureSortCaseInsensitive()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`natureSortKeys()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`shuffle()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`rand()`](/documentation/components/scalars/array-object#sorting-and-ordering)
- [`reverse()`](/documentation/components/scalars/array-object#sorting-and-ordering)

### Combining Arrays

- [`merge()`](/documentation/components/scalars/array-object#combining-arrays)
- [`mergeRecursive()`](/documentation/components/scalars/array-object#combining-arrays)
- [`replace()`](/documentation/components/scalars/array-object#combining-arrays)
- [`replaceRecursive()`](/documentation/components/scalars/array-object#combining-arrays)
- [`union()`](/documentation/components/scalars/array-object#combining-arrays)
- [`combine()`](/documentation/components/scalars/array-object#combining-arrays)
- [`diff()`](/documentation/components/scalars/array-object#combining-arrays)
- [`diffKeys()`](/documentation/components/scalars/array-object#combining-arrays)
- [`intersect()`](/documentation/components/scalars/array-object#combining-arrays)
- [`intersectKey()`](/documentation/components/scalars/array-object#combining-arrays)
- [`crossJoin()`](/documentation/components/scalars/array-object#combining-arrays)
- [`only()`](/documentation/components/scalars/array-object#combining-arrays)
- [`except()`](/documentation/components/scalars/array-object#combining-arrays)
- [`flip()`](/documentation/components/scalars/array-object)

### Adding and Padding Items

- [`concat()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`concatStart()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`append()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`prepend()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`insertAfter()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`insertBefore()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`pad()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`leftPad()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`rightPad()`](/documentation/components/scalars/array-object#adding-and-padding-items)
- [`removeFirst()`](/documentation/components/scalars/array-object)
- [`removeLast()`](/documentation/components/scalars/array-object)
- [`slice()`](/documentation/components/scalars/array-object)

### Pipelines and Macros

These helpers come from `windwalker/utilities`, and the Scalars page does
not cover them:

- `pipe()`, `pipeIf()`: pass the object through a callback and use its
  result.
- `tap()`, `tapIf()`: call a callback with the object and keep the object.
- `macro()`, `hasMacro()`, `clearMarco()`, `do()`: register and call
  custom methods for the class.

### Array Access and Iteration

`Collection` implements `ArrayAccess`, `IteratorAggregate`, and `Countable`
through the array base class. Use `$collection['key']`, `foreach`, and
`count()` on any collection. Magic property access such as `$collection->key`
works through `__get()` and `__set()`.
