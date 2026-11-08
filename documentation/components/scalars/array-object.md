---
layout: doc
title: Array Object
component: scalars
---

# Array Object

`ArrayObject` wraps a native array and provides methods for filtering,
mapping, sorting, grouping, and summarizing its values. It fits data that
passes through several steps before it is used. A typical case is a list of
database rows that must be filtered, reshaped, and totaled before it reaches
a template or an API response.

Plain PHP needs one function call per step, and each call takes its
arguments in a different order. An object lets each step read as the next
line of a pipeline. A sub-result can also be reused without copying the
array by hand.

## Method Summary

Methods that return **New object** leave the original unchanged. Methods
marked **Mutates** change the object in place. Methods with a link have a
section below that explains them.

| Method | Returns | Description |
|--------|---------|-------------|
| [`create()`](#creating-an-arrayobject) | New object | Static factory, same as the constructor. |
| [`explode()`](#creating-an-arrayobject) | New object | Static; builds a list from `explode()`. |
| [`range()`](#creating-an-arrayobject) | New object | Static; builds a numeric range. |
| [`fillWith()`](#creating-an-arrayobject) | New object | Static; builds a list of one repeated value. |
| [`wrap()`](#wrapping-items) | Object | Static; returns the given ArrayObject or wraps an array. |
| [`tryWrap()`](#wrapping-items) | Object or `null` | Static; like `wrap()`, but returns `null` for `null`. |
| [`unwrap()`](#wrapping-items) | Native value | Static; converts an ArrayObject to an array. |
| [`wrapAll()`](#wrapping-items) | New object | Wraps each nested item in an ArrayObject. |
| `mapAs()` | New object | Maps each item to an instance of the given class. |
| `as()` | Object | Creates an instance of another class from the storage. |
| [`dump()`](#wrapping-items) | Array | Returns the native array. |
| [`with()`](#immutable-updates) | New object | Copy with one key set. |
| [`withDef()`](#immutable-updates) | New object | Copy with a default set for a missing key. |
| [`withRemove()`](#immutable-updates) | New object | Copy without the given key. |
| [`withReset()`](#immutable-updates) | New object | Copy with new storage. |
| [`set()`](#methods-that-change-the-object-in-place) | Self | Mutates. Sets one value. |
| [`fill()`](#methods-that-change-the-object-in-place) | Self | Mutates. Sets many values; skips `null` by default. |
| [`bind()`](#methods-that-change-the-object-in-place) | Self | Mutates. Links storage to an array by reference. |
| [`transform()`](#methods-that-change-the-object-in-place) | Self | Mutates. Replaces storage with a callback result. |
| [`push()`](#methods-that-change-the-object-in-place) | Count (int) | Mutates. Appends values. |
| [`unshift()`](#methods-that-change-the-object-in-place) | Count (int) | Mutates. Prepends values. |
| [`pop()`](#methods-that-change-the-object-in-place) | Value | Mutates. Removes the last value. |
| [`shift()`](#methods-that-change-the-object-in-place) | Value | Mutates. Removes the first value. |
| [`takeout()`](#methods-that-change-the-object-in-place) | Value | Mutates. Removes a key and returns its value. |
| [`splice()`](#methods-that-change-the-object-in-place) | Removed items | Mutates. Removes a slice; returns it as an object. |
| [`first()`](#reading-values) | Value | First value, optionally matched by a callback. |
| [`last()`](#reading-values) | Value | Last value, optionally matched by a callback. |
| [`findFirst()`](#reading-values) | Value | First value that matches a callback. |
| [`search()`](#reading-values) | Key or `false` | Key of a value or of a callback match. |
| [`indexOf()`](#reading-values) | int | Key of a value, or `-1` when missing. |
| [`contains()`](#reading-values) | bool | Whether a value exists. |
| [`keyExists()`](#reading-values) | bool | Whether a key exists. |
| `isEmpty()` | bool | Whether the storage is empty. |
| `notEmpty()` | bool | Whether the storage is not empty. |
| [`keys()`](#reading-values) | New object | Keys, optionally filtered by a value. |
| [`values()`](#reading-values) | New object | Values, reindexed from `0`. |
| [`sum()`](#aggregation) | int or float | Sum of numeric values. |
| [`avg()`](#aggregation) | int, float, or `null` | Average; `null` for an empty array. |
| [`reduce()`](#transforming-values) | Wrapped value | Reduces the list; scalar results are wrapped. |
| `implode()` | StringObject | Joins the values with a glue string. |
| [`partition()`](#partitioning) | Array of two ArrayObjects | Splits items into matching and other groups. |
| `each()` | Object | Calls a callback for each item. |
| `walk()` | Object | Calls a callback for each item. |
| `walkRecursive()` | Object | Calls a callback for each item, recursively. |
| `find()` | New object | Items that match a callback. |
| `query()` | New object | Items that match query conditions. |
| [`filter()`](#transforming-values) | New object | Keeps items that match a callback. |
| [`reject()`](#transforming-values) | New object | Drops items that match a callback. |
| [`map()`](#transforming-values) | New object | Maps each value and keeps the keys. |
| `mapRecursive()` | New object | Maps values recursively. |
| [`mapWithKeys()`](#mapping-to-new-keys) | New object | Builds new keys and values from each item. |
| [`flatMap()`](#flat-mapping) | New object | Maps each item and merges the returned keys. |
| `apply()` | New object | Passes the storage to a callback. |
| [`unique()`](#transforming-values) | New object | Removes duplicate values. |
| [`column()`](#columns-and-records) | New object | Extracts one field from each item. |
| [`setColumn()`](#columns-and-records) | New object | Sets one field on each item. |
| [`group()`](#grouping-and-keying) | New object | Groups items by a field or callback. |
| [`groupBy()`](#grouping-and-keying) | New object | Groups items by a field or callback. |
| [`groupByPath()`](#grouping-and-keying) | New object | Groups items by a nested path. |
| [`keyBy()`](#grouping-and-keying) | New object | Indexes items by a field. |
| [`chunk()`](#chunking-and-paging) | New object | Splits the list into chunks. |
| [`page()`](#chunking-and-paging) | New object | Returns one page of items. |
| [`flatten()`](#flattening-nested-data) | New object | Flattens nested arrays into dotted keys. |
| [`collapse()`](#flattening-nested-data) | New object | Flattens one level of nested arrays. |
| `countValues()` | New object | Counts the occurrences of each value. |
| [`sort()`](#sorting-and-ordering) | New object | Sorts by value, keeping keys. |
| [`sortDesc()`](#sorting-and-ordering) | New object | Sorts by value in descending order. |
| [`sortKeys()`](#sorting-and-ordering) | New object | Sorts by key. |
| [`sortKeysDesc()`](#sorting-and-ordering) | New object | Sorts by key in descending order. |
| [`sortBy()`](#sorting-and-ordering) | New object | Sorts items by a field or callback. |
| [`natureSort()`](#sorting-and-ordering) | New object | Natural-order sort by value. |
| [`natureSortCaseInsensitive()`](#sorting-and-ordering) | New object | Natural-order sort, case-insensitive. |
| [`natureSortKeys()`](#sorting-and-ordering) | New object | Natural-order sort by key. |
| [`shuffle()`](#sorting-and-ordering) | New object | Returns the items in random order. |
| [`rand()`](#sorting-and-ordering) | New object | Picks random items. |
| [`reverse()`](#sorting-and-ordering) | New object | Reverses the order. |
| [`merge()`](#combining-arrays) | New object | Merges arrays; renumbers numeric keys. |
| [`mergeRecursive()`](#combining-arrays) | New object | Merges arrays recursively. |
| [`replace()`](#combining-arrays) | New object | Replaces values by key; keeps key positions. |
| [`replaceRecursive()`](#combining-arrays) | New object | Replaces values by key, recursively. |
| [`union()`](#combining-arrays) | New object | Adds items whose keys are missing from the storage. |
| [`combine()`](#combining-arrays) | New object | Uses the storage as keys and the argument as values. |
| [`diff()`](#combining-arrays) | New object | Removes values that exist in other arrays. |
| [`diffKeys()`](#combining-arrays) | New object | Removes keys that exist in other arrays. |
| [`intersect()`](#combining-arrays) | New object | Keeps values that exist in other arrays. |
| [`intersectKey()`](#combining-arrays) | New object | Keeps keys that exist in other arrays. |
| [`crossJoin()`](#combining-arrays) | New object | Builds the Cartesian product of arrays. |
| [`only()`](#combining-arrays) | New object | Keeps the given keys. |
| [`except()`](#combining-arrays) | New object | Drops the given keys. |
| [`concat()`](#adding-and-padding-items) | New object | Appends values to the end. |
| [`concatStart()`](#adding-and-padding-items) | New object | Adds values to the start. |
| [`append()`](#adding-and-padding-items) | New object | Returns a copy with values appended. |
| [`prepend()`](#adding-and-padding-items) | New object | Returns a copy with values prepended. |
| [`insertAfter()`](#adding-and-padding-items) | New object | Inserts values after a key. |
| [`insertBefore()`](#adding-and-padding-items) | New object | Inserts a value before a key. |
| [`pad()`](#adding-and-padding-items) | New object | Pads the list to a size. |
| [`leftPad()`](#adding-and-padding-items) | New object | Pads at the start to a size. |
| [`rightPad()`](#adding-and-padding-items) | New object | Pads at the end to a size. |
| `removeFirst()` | New object | Returns a copy without the first items. |
| `removeLast()` | New object | Returns a copy without the last items. |
| `slice()` | New object | Returns a slice of the list. |
| `flip()` | New object | Swaps keys and values. |
| `fillKeys()` | New object | Builds an array with the given keys and one value. |

## Creating an ArrayObject

Use the `arr()` helper as the usual entry point. Static factory methods
such as `range()` and `explode()` create the object from other inputs:

```php
use Windwalker\Scalars\ArrayObject;

use function Windwalker\arr;

$a = arr(['a' => 1, 'b' => 2]);
$b = arr([1, 2, 3]);
$c = ArrayObject::range(1, 5);
$d = ArrayObject::explode(',', 'red,green,blue');
```

`ArrayObject::wrap()` returns the given value unchanged when it already is
an `ArrayObject`, and wraps an array otherwise. Use it in a method that
accepts either form.

The constructor keeps `null` values. `fill()` skips them by default, so
existing values are not overwritten by `null`.

## Showcase

The following example filters a list of orders, sorts the paid ones by
total, and builds a small report:

```php
use function Windwalker\arr;

$orders = arr([
    ['id' => 1, 'status' => 'paid', 'total' => 120],
    ['id' => 2, 'status' => 'pending', 'total' => 45],
    ['id' => 3, 'status' => 'paid', 'total' => 80],
    ['id' => 4, 'status' => 'paid', 'total' => 15],
]);

$paid = $orders
    ->filter(fn (array $order) => $order['status'] === 'paid')
    ->sortBy('total', SORT_REGULAR, true);

$report = [
    'ids' => $paid->column('id')->values()->dump(),
    'revenue' => $paid->column('total')->sum(),
];

// ids: [1, 3, 4], revenue: 215
```

`filter()` and `sortBy()` each return a new object, so `$orders` still
holds all four rows. The chain is the whole data flow, and no temporary
array is needed between the steps.

## Reading Values

Items can be read with array syntax, and the object supports `count()` and
`foreach`. Nested values come back as native arrays:

```php
$list = arr(['red', 'green', 'blue']);

$list[0];                  // 'red'
count($list);              // 3

arr(['user' => ['name' => 'Ann']])['user']['name']; // 'Ann'
```

Searching methods cover the common checks:

- `first()` and `last()` return a value, optionally chosen by a callback.
- `findFirst()` returns the first value that matches a callback.
- `contains()` and `keyExists()` return a boolean.
- `search()` and `indexOf()` return the key of a value, or `-1` from
  `indexOf()` when the value is missing.

```php
$list = arr(['red', 'green', 'blue']);

$list->contains('green');  // true
$list->indexOf('blue');    // 2
$list->indexOf('black');   // -1
$list->last();             // 'blue'
```

## Transforming Values

`map()`, `filter()`, `reject()`, `unique()`, and `reduce()` cover most list
transformations. `filter()` without a callback removes falsy values:

```php
$tags = arr(['  PHP ', 'php', '', 'Framework']);

$clean = $tags
    ->map(fn (string $tag) => strtolower(trim($tag)))
    ->filter()
    ->unique()
    ->values();

// ['php', 'framework']
```

`map()`, `filter()`, and the sorting methods keep the original keys. The
`values()` call at the end reindexes the list, which matters when the result
is encoded as JSON. Without it, the keys stay as `0`, `2`, and so on.

`reduce()` returns the callback result. A scalar result is wrapped by
`ScalarsFactory::fromNative()`, so it comes back as a `StringObject`:

```php
$total = arr([1, 2, 3])->reduce(
    fn (int $carry, int $value) => $carry + $value,
    0
);

echo $total;               // 6
$total->toInteger();       // 6
```

Use `(int)` or `toInteger()` when you need the native number in a
calculation.

## Partitioning

`partition()` splits the list into two groups in one pass. The first group
holds the items that match the callback, and the second holds the rest. It
returns an array of two `ArrayObject` instances, so you can destructure it:

```php
$scores = arr([72, 45, 88, 30]);

[$passed, $failed] = $scores->partition(
    fn (int $score) => $score >= 50
);

$passed->dump(); // [72, 88]
$failed->dump(); // [45, 30]
```

Pass `true` as the second argument to keep the keys of each group:

```php
[$high, $low] = arr(['a' => 1, 'b' => 2, 'c' => 3])
    ->partition(fn (int $v) => $v >= 2, true);

$high->dump(); // ['b' => 2, 'c' => 3]
$low->dump();  // ['a' => 1]
```

Use `partition()` when both groups are needed, such as valid and invalid
rows from one import.

## Flat Mapping

`flatMap()` runs a callback on each item and merges the arrays it returns
into one object, by key. It suits items that expand into named values, such
as records that each contribute a few fields:

```php
$records = arr([
    ['name' => 'sally'],
    ['school' => 'arkansas'],
]);

$records->flatMap(
    fn (array $record) => array_map('strtoupper', $record)
);
// ['name' => 'SALLY', 'school' => 'ARKANSAS']
```

When the callback returns a scalar, the item keeps its own key. Returning
`null` skips the item:

```php
arr(['a' => 1, 'b' => 2])->flatMap(fn (int $v) => $v * 10);
// ['a' => 10, 'b' => 20]

arr(['a' => 1, 'b' => 2])->flatMap(fn (int $v) => null);
// []
```

::: warning
Returned keys are merged across all items. When two items return the same
key, the later value overwrites the earlier one, and no error is raised.
Give each returned key a unique name, or use `map()` when every item needs
its own key.
:::

## Mapping to New Keys

`mapWithKeys()` rebuilds the list as a map. The callback receives each
value and its key, and returns an array of `new key => new value` pairs.
It is useful for building a lookup table from records, where the record's
field becomes the key:

```php
$users = arr([
    ['id' => 7, 'name' => 'Ann', 'role' => 'admin'],
    ['id' => 9, 'name' => 'Ben', 'role' => 'editor'],
]);

$names = $users->mapWithKeys(
    fn (array $user) => [$user['id'] => $user['name']]
);
// [7 => 'Ann', 9 => 'Ben']
```

The callback can return several pairs for one item. Each pair adds one
entry to the result:

```php
$users->mapWithKeys(
    fn (array $user) => [
        $user['name'] => $user['id'],
        $user['role'] => $user['id'],
    ]
);
// ['Ann' => 7, 'admin' => 7, 'Ben' => 9, 'editor' => 9]
```

Callbacks can use the original key too. Because the original key is
available, the same callback can rebuild a keyed map:

```php
arr(['a' => 'x', 'b' => 'y'])->mapWithKeys(
    fn (string $value, string $key) => [$key => strtoupper($value)]
);
// ['a' => 'X', 'b' => 'Y']
```

The callback must return an array or a generator. Returning a scalar raises
a `TypeError`.

### Using a Generator

A generator lets the callback produce pairs with `yield` instead of building
an array. The callback runs once per item, and each `yield` adds one entry
to the result. The examples below use the same records:

```php
$records = arr([
    ['id' => 7, 'name' => 'Ann', 'role' => 'admin'],
    ['id' => 9, 'name' => 'Ben', 'role' => 'editor'],
]);
```

A keyed `yield` stores the value under the key you give it:

```php
$names = $records->mapWithKeys(function (array $user) {
    yield $user['name'] => $user['id'];
});
// ['Ann' => 7, 'Ben' => 9]
```

A `null` key is allowed in a generator. This is similar to push(), the value is appended to the end of
the result, and PHP gives it the next numeric key:

```php
$list = $records->mapWithKeys(function (array $user) {
    yield null => $user['name'];
});
// ['Ann', 'Ben']
```

::: info
Returning an array with a `null`  key (`[null => $value]`) is not allowed.
Only supports `yield null => $value` in a generator when you need an appended value.
:::

#### Several Yields and Conditional Yields

One item can yield several pairs, and the callback can skip an item by
yielding nothing. Use this to build an index from one record, or to choose
the value for each item with `if`/`else`:

```php
$index = $records->mapWithKeys(function (array $user) {
    yield $user['name'] => $user['id'];
    yield $user['role'] => $user['id'];
});
// ['Ann' => 7, 'admin' => 7, 'Ben' => 9, 'editor' => 9]

$status = $records->mapWithKeys(function (array $user) {
    if ($user['role'] === 'admin') {
        yield $user['name'] => 'admin';
    } else {
        yield $user['name'] => 'member';
    }
});
// ['Ann' => 'admin', 'Ben' => 'member']

$admins = $records->mapWithKeys(function (array $user) {
    // Same as filter()
    if ($user['role'] === 'admin') {
        yield $user['name'] => $user['id'];
    }
});
// ['Ann' => 7]
```

Mixing null and keyed yields is also valid. Each `yield null` appends one
value after the keyed entries:

```php
$audit = $records->mapWithKeys(function (array $user) {
    yield $user['name'] => $user['role'];
    yield null => 'checked';
});
// ['Ann' => 'admin', 0 => 'checked', 'Ben' => 'editor', 1 => 'checked']
```

#### Yield Without a Key

::: warning
A `yield` without a key gets an automatic key from the generator, starting
at `0`, and that counter is not per item. Every item then uses the same
key, so the default mode keeps only the last value. The `GROUP_TYPE_ARRAY`
and `GROUP_TYPE_MIX` modes group every value under `0` instead. No error is
raised in any mode.

```php
// Wrong: every item is stored under key 0.
$records->mapWithKeys(function (array $user) {
    yield $user['name'];
});
// [0 => 'Ben']

// Right: each name is its own key.
$records->mapWithKeys(function (array $user) {
    yield $user['name'] => $user['id'];
});
// ['Ann' => 7, 'Ben' => 9]
```
:::


### Handling Duplicate Keys

Several items can produce the same new key. The second argument of
`mapWithKeys()` chooses how the values are combined. It takes one of the
`ArrayObject::GROUP_TYPE_*` constants:

- `GROUP_TYPE_KEY_BY` (default): the last value wins.
- `GROUP_TYPE_ARRAY`: every value is collected into an array.
- `GROUP_TYPE_MIX`: a key holds a single value, and it becomes an array only
  when a second value arrives.

```php
$byRole = fn (array $user) => [$user['role'] => $user['name']];

$users->mapWithKeys($byRole);
// ['admin' => 'Ann', 'editor' => 'Ben']

$users->mapWithKeys($byRole, ArrayObject::GROUP_TYPE_ARRAY);
// ['admin' => ['Ann'], 'editor' => ['Ben']]

$users->mapWithKeys($byRole, ArrayObject::GROUP_TYPE_MIX);
// ['admin' => 'Ann', 'editor' => 'Ben']
```

With three records, two of which are admins, the outputs differ:

```php
$users = arr([
    ['name' => 'Ann', 'role' => 'admin'],
    ['name' => 'Ben', 'role' => 'editor'],
    ['name' => 'Cy', 'role' => 'admin'],
]);

$users->mapWithKeys($byRole);
// ['admin' => 'Cy', 'editor' => 'Ben']

$users->mapWithKeys($byRole, ArrayObject::GROUP_TYPE_ARRAY);
// ['admin' => ['Ann', 'Cy'], 'editor' => ['Ben']]

$users->mapWithKeys($byRole, ArrayObject::GROUP_TYPE_MIX);
// ['admin' => ['Ann', 'Cy'], 'editor' => 'Ben']
```

::: warning
The default `GROUP_TYPE_KEY_BY` drops every earlier value that shares a key,
and it raises no error. Use `GROUP_TYPE_ARRAY` or `GROUP_TYPE_MIX` whenever
the new keys might repeat.
:::

## Grouping and Keying

`groupBy()` collects the items under the value of a field, and `keyBy()`
uses the field value as the key of each item:

```php
$byStatus = $orders->groupBy('status');
// ['paid' => [...], 'pending' => [...]]

$byId = $orders->keyBy('id');
// [1 => [...], 2 => [...], 3 => [...], 4 => [...]]
```

`keyBy()` keeps only one item per key, so use it when the field is unique.

## Columns and Records

`column()` extracts one field from each record, and `setColumn()` writes a
field into each record. Both are useful when a query result is reshaped for
a lookup table or a form:

```php
$users = arr([
    ['id' => 7, 'name' => 'Ann', 'email' => 'ann@example.com'],
    ['id' => 9, 'name' => 'Ben', 'email' => 'ben@example.com'],
]);

$users->column('name');        // ['Ann', 'Ben']
$users->column('name', 'id');  // [7 => 'Ann', 9 => 'Ben']

$users->setColumn('active', true);
// each record gets 'active' => true
```

Pass a third field name to `column()` to use it as the key, as in
`column('name', 'id')`. Use `keyBy()` when you need the whole record under
its key.

## Chunking and Paging

`chunk()` splits the list into groups of a given size. Each chunk is an
`ArrayObject`. `page()` returns one page of items, where page numbers start
at `1`:

```php
$numbers = arr([1, 2, 3, 4, 5]);

$numbers->chunk(2)->dump();  // [[1, 2], [3, 4], [5]]
$numbers->page(2, 2)->dump(); // [3, 4]
```

## Flattening Nested Data

`flatten()` turns nested arrays into dotted keys, which is useful for
building configuration names or form field paths. `collapse()` merges a
list of arrays into one list:

```php
arr(['db' => ['host' => 'x', 'port' => 1]])->flatten();
// ['db.host' => 'x', 'db.port' => 1]

arr([[1, 2], [3]])->collapse(false);
// [1, 2, 3]
```

::: warning
`collapse()` keeps the keys by default. Nested lists that both start at
index `0` overwrite each other, and the result has silently wrong values.
Pass `false` to renumber the items, as in `collapse(false)`.
:::

## Adding and Padding Items

The following methods return a new object with items added or padded. They
do not change the original:

```php
$list = arr([1, 2]);

$list->append(3);              // [1, 2, 3]
$list->prepend(0);             // [0, 1, 2]
$list->concat([3, 4]);         // [1, 2, 3, 4]
$list->insertAfter(0, 9);      // [1, 9, 2]
$list->pad(4, 0);              // [1, 2, 0, 0]
$list->leftPad(4, 0);          // [0, 0, 1, 2]
```

`insertAfter()` and `insertBefore()` use a key from the list. `pad()`
fills the end of the list, and `leftPad()` fills the start, until the list
reaches the given size.

## Sorting and Ordering

`sort()`, `sortDesc()`, `sortKeys()`, and `natureSort()` sort by value or
key. `sortBy()` sorts a list of arrays by a field, with an optional
descending flag:

```php
$orders->sortBy('total', SORT_REGULAR, true);
```

Sorting keeps the keys of the items. Call `values()` afterwards when you
need a plain list.

`reverse()` returns the list in reverse order. `shuffle()` returns the items
in random order, and `rand()` picks a number of random items:

```php
arr([1, 2, 3])->reverse()->dump();   // [3, 2, 1]
arr([1, 2, 3])->shuffle()->dump();   // random order
arr([1, 2, 3, 4])->rand(2)->dump();  // two random items
```

## Aggregation

`sum()` adds the numeric values and skips the rest. `avg()` returns `null`
for an empty array, and `0` when the values add up to zero:

```php
arr([10, 20, 'n/a'])->sum();   // 30
arr([10, 20, 30])->avg();      // 20
arr([1, -1])->avg();           // 0
arr([])->avg();                // null
```

## Combining Arrays

`merge()` and `replace()` combine an array with others and return a new
object. Both overwrite values with the same string key, but they handle
numeric keys differently:

```php
$defaults = arr(['color' => 'red', 'size' => 'M']);

$defaults->merge(['size' => 'L']);
// ['color' => 'red', 'size' => 'L']

arr([1, 2])->merge([3]);   // [1, 2, 3]
arr([1, 2])->replace([3]); // [3, 2]
```

::: info
`merge()` renumbers numeric keys, while `replace()` keeps the key positions.
Choose the method that matches the data shape.
:::

The set methods compare the storage with other arrays. Like `filter()`,
they keep the keys of the items they return:

```php
arr([1, 2, 3])->diff([2]);             // [0 => 1, 2 => 3]
arr([1, 2, 3])->intersect([2, 3, 4]);  // [1 => 2, 2 => 3]
arr(['a' => 1, 'b' => 2])->diffKeys(['a' => 0]);  // ['b' => 2]
arr(['a' => 1, 'b' => 2])->only(['a']);           // ['a' => 1]
arr(['a' => 1, 'b' => 2])->except(['a']);         // ['b' => 2]
arr([1, 2])->union([5, 6, 7]);         // [1, 2, 7]
arr([1, 2])->crossJoin(['a', 'b']);
// [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
```

Call `values()` after a set method when you need a reindexed list.

## Immutable Updates

The `with*()` methods return a copy with one change, and the original keeps
its values. A shared configuration can be adjusted per request without
affecting other code:

```php
$base = arr(['host' => 'localhost', 'port' => 80]);

$base->with('port', 8080);
// ['host' => 'localhost', 'port' => 8080]

$base->withDef('timeout', 30);
// ['host' => 'localhost', 'port' => 80, 'timeout' => 30]

$base->withRemove('port');
// ['host' => 'localhost']

$base->withReset(['host' => 'example.com']);
// ['host' => 'example.com']
```

`withDef()` sets the default only when the key is missing, so an existing
value is kept.

## Wrapping Items

`wrapAll()` wraps each nested array in an `ArrayObject`, which lets you keep
chaining on the rows:

```php
$rows = arr([['id' => 1], ['id' => 2]])->wrapAll();

$rows[0]['id']; // 1
```

`wrap()` and `tryWrap()` convert a value into an `ArrayObject` when needed.
`tryWrap()` returns `null` for `null`. `unwrap()` converts it back to an
array:

```php
use Windwalker\Scalars\ArrayObject;

ArrayObject::tryWrap(null);            // null
ArrayObject::unwrap(arr([1]));         // [1]
```

## Methods That Change the Object in Place

Most methods return a new object. A small group changes the stored values
of the object instead. Call them only when the change is intended:

- `set()` and `fill()` write values.
- `push()`, `pop()`, `shift()`, and `unshift()` change the list ends.
- `takeout()` removes a key and returns its value.
- `splice()` removes a slice from the original and returns it.
- `transform()` replaces the storage with a callback result.
- `bind()` links the object to an existing array by reference.

```php
$a = arr([1, 2, 3]);

$b = $a->with(1, 9);   // $a is unchanged, $b is [1, 9, 3]
$a->set(1, 9);         // $a is changed to [1, 9, 3]
```

::: warning
`bind()` takes the array by reference. Changes made through the object
also change the original variable, and the reverse. Use `bind()` only when
the shared storage is intended.
:::

::: warning
`takeout()` removes the key before it returns the value. A call that is
meant to read a value will remove it from the object. Use array syntax or
a `first()` call when you only need to read.
:::
