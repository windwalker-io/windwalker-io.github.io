---
layout: doc
title: Arr
component: utilities
---

# Arr

`Arr` is a static helper for arrays and objects. Configuration files,
API responses, and database rows are often nested several levels deep.
Reading one value from them with plain PHP means chaining `isset()`
checks, and changing one value means rebuilding the parent arrays.
`Arr` addresses any value with a key path such as `data.users`, and
handles the missing levels for you.

## Method Summary

Most `Arr` features are also available on [`ArrayObject`](../scalars/array-object), returned by the
`arr()` helper in the [Scalars](../scalars/) package. Prefer the object
version when you chain several operations on one value. The few methods
that work on key paths, such as `get()` and `set()` with dots, and `sync()`
exist only in `Arr`.

::: tip
Use [`ArrayObject`](../scalars/array-object) for chained work, and `Arr` for key-path access and
`sync()`. Check the defaults in the Scalars docs before swapping one form
for the other, because some defaults differ.
:::

| Method | Parameters | Description | ArrayObject |
|--------|------------|-------------|-------------|
| `has()` | `$source, $key, $delimiter = '.'` | Whether a key path exists. | `keyExists()` for one key |
| `get()` | `&$data, $key, $delimiter = '.'` | Reads a value at a key path. | `$obj[$key]` for one key |
| `set()` | `$data, $key, $value, $delimiter = '.', $storeType = 'array'` | Writes a value at a key path. | `set()` for one key |
| `def()` | `$array, $key, $value, $delimiter = '.'` | Writes a value when the path is missing. | `withDef()` |
| `remove()` | `$data, $key, $delimiter = '.'` | Returns data without a key path. | `withRemove()` for one key |
| `takeout()` | `&$data, $key, $default = null, $delimiter = '.'` | Reads and removes a value. | `takeout()` |
| `only()` | `$data, array $fields` | Keeps the listed keys. | `only()` |
| `except()` | `$data, array $fields` | Drops the listed keys. | `except()` |
| `getColumn()` | `$src, $column, $keyName = null, $invasive = true` | Collects one field from each row. | `column()` |
| `find()` | `$data, $callback = null, $keepKey = false, $offset = null, $limit = null` | Items matching a callback. | `find()` |
| `findFirst()` | `$data, $callback = null` | First item matching a callback. | `findFirst()` |
| `reject()` | `$data, $callback, $keepKey = false` | Drops items matching a callback. | `reject()` |
| `query()` | `$array, $queries = [], $strict = false, $keepKey = false` | Rows matching conditions. | `query()` |
| `queryFirst()` | `$array, $queries = [], $strict = false` | First row matching conditions. | `query()` then `first()` |
| `where()` | `$array, $field, $operator = null, $value = null, ...` | Rows matching one field. | `query()` |
| `match()` | `$array, array $queries, $strict = false` | Whether one item matches conditions. | — |
| `flatten()` | `$array, $delimiter = '.', $depth = 0, $prefix = null` | Nested data to dotted keys. | `flatten()` |
| `collapse()` | `$data, $keepKey = false` | Removes all nesting into a list. | `collapse()` |
| `flatMap()` | `$array, $callback` | Maps and merges returned items. | `flatMap()` |
| `mapRecursive()` | `$array, $callback, $useKeys = false, $loopIterable = false` | Maps every nested value. | `mapRecursive()` |
| `sort()` | `$data, $condition, $descending = false, $options = SORT_REGULAR` | Sorts by value or field, keeping keys. | `sortBy()` |
| `invert()` | `$array` | Swaps keys and values. | `flip()` |
| `unique()` | `$array` | Removes duplicate values. | `unique()` |
| `padStart()` | `$array, $length, $value` | Pads a list at the start. | `leftPad()` |
| `padEnd()` | `$array, $length, $value` | Pads a list at the end. | `rightPad()` |
| `merge()` | `...$args` | Merges arrays. | `merge()` |
| `mergeRecursive()` | `...$args` | Merges arrays recursively. | `mergeRecursive()` |
| `unionRecursive()` | `...$args` | Unions arrays recursively. | — |
| `isAssociative()` | `$array` | Whether keys are not a list. | — |
| `isAccessible()` | `$array` | Whether a value is an array or `ArrayAccess`. | — |
| `arrayEquals()` | `$a, $b` | Whether two arrays are equal. | — |
| `explodeAndClear()` | `$delimiter, $string, $limit = null` | Splits a string and drops empty parts. | — |
| `sync()` | `$existing, $incoming, $by = null` | Creating, deleting, and keeping groups. | — |
| `dump()` | `$data, $depth = 5` | Readable string of the data. | — |
| `show()` | `...$args` | Prints the data. | — |
| `filterRecursive()` | `$array, $callback` | Recursively filters values. | — |

`sync()` is covered on its own page: [Array Sync](./arr-sync).

## Minimal Setup

`Arr` needs no setup. Import the class and call its methods:

```php
use Windwalker\Utilities\Arr;

$name = Arr::get(['user' => ['name' => 'Alice']], 'user.name');
// Alice
```

## Showcase: Preparing an API Response

The following example reads a nested response, selects part of it, adds
a value, and removes the part it no longer needs:

```php
use Windwalker\Utilities\Arr;

$response = [
    'meta' => ['total' => 3],
    'data' => [
        'users' => [
            ['id' => 1, 'name' => 'Alice', 'role' => 'admin'],
            ['id' => 2, 'name' => 'Bob', 'role' => 'editor'],
            ['id' => 3, 'name' => 'Carol', 'role' => 'admin'],
        ],
    ],
];

$users = Arr::get($response, 'data.users');

$admins = Arr::query($users, ['role' => 'admin']);

$adminNames = Arr::getColumn($admins, 'name');
// ['Alice', 'Carol']

$response = Arr::set($response, 'meta.admins', count($adminNames));

$response = Arr::remove($response, 'data');
// ['meta' => ['total' => 3, 'admins' => 2]]
```

Most `Arr` methods take the data and return the updated or selected
result. `takeout()` is the documented exception, as explained below.

## Reading and Checking Values

Use `has()` to check whether a path exists, and `get()` to read it:

```php
$config = [
    'db' => ['host' => 'localhost', 'port' => 3306],
];

Arr::has($config, 'db.host');    // true
Arr::has($config, 'db.user');    // false

Arr::get($config, 'db.port');    // 3306
Arr::get($config, 'db.user');    // null
```

`get()` returns `null` for a missing path. Combine it with `??` to set
a fallback:

```php
$user = ['profile' => []];

$name = Arr::get($user, 'profile.name') ?? 'Guest';
```

`get()` takes its first argument by reference, so pass a variable. A
literal array or a function result cannot be passed to it.

Both methods accept objects as well as arrays. Each path segment is
checked as an array key or a public property.

### Keys Containing Dots

The third argument is the delimiter that splits the path. Use another
delimiter when a key itself contains a dot:

```php
$data = ['v1.2' => ['released' => true]];

Arr::get($data, 'v1.2/released', '/');
// Looks up 'v1.2' and then 'released'.
```

Using a delimiter that does not appear in your keys avoids this
ambiguity. Every path-based method accepts the delimiter as its last
parameter, after its other arguments.

## Writing Values

`set()` writes a value at a path and creates any missing level on the way.
It returns the updated data:

```php
$settings = [];

$settings = Arr::set($settings, 'cache.driver', 'redis');
// ['cache' => ['driver' => 'redis']]
```

`def()` writes a value only when the path does not exist yet. Use it to
fill in defaults without overwriting configured values:

```php
$settings = ['cache' => ['driver' => 'redis']];

$settings = Arr::def($settings, 'cache.driver', 'file');
$settings = Arr::def($settings, 'cache.ttl', 3600);
// driver stays 'redis'; ttl is added as 3600
```

`remove()` returns the data without the given path. `takeout()` reads
a value and removes it at the same time:

```php
$data = ['token' => 'abc', 'user' => 'alice'];

$token = Arr::takeout($data, 'token');
// $token is 'abc'; $data no longer has 'token'
```

::: warning
`Arr::takeout()` takes the data by reference and changes the variable you
pass in. Use `Arr::get()` if you only need to read the value.
:::

## Selecting Fields

`only()` keeps the listed keys, and `except()` removes them. Both return
a new array:

```php
$user = ['id' => 1, 'name' => 'Alice', 'password' => 'secret'];

$public = Arr::except($user, ['password']);
// ['id' => 1, 'name' => 'Alice']

$summary = Arr::only($user, ['id', 'name']);
// ['id' => 1, 'name' => 'Alice']
```

`getColumn()` collects one field from every row in a list. It is useful
when you need a single column, such as IDs for a `WHERE IN` clause:

```php
$users = [
    ['id' => 1, 'name' => 'Alice'],
    ['id' => 2, 'name' => 'Bob'],
];

$ids = Arr::getColumn($users, 'id');
// [1, 2]
```

When you pass a third argument, the result is keyed by that field, and
each value is the whole row:

```php
$byId = Arr::getColumn($users, 'name', 'id');
// [1 => ['id' => 1, 'name' => 'Alice'], 2 => [...]]
```

`getColumn()` also reads public properties of objects, and it uses
`__get()` when the object provides it.

## Finding and Querying Rows

`find()` returns every item that matches a callback. Without a callback,
it returns all items that are not `null`:

```php
$numbers = [1, 2, 3, 4];

$even = Arr::find($numbers, fn (int $n) => $n % 2 === 0);
// [2, 4]

$first = Arr::findFirst($numbers, fn (int $n) => $n > 2);
// 3
```

`reject()` is the opposite of `find()`: it keeps the items for which the
callback returns `false`.

`query()` filters a list of rows with a condition array. A plain value
means an equal comparison, and loose comparison is used unless you pass
`$strict` as `true`:

```php
$users = [
    ['id' => 1, 'role' => 'admin'],
    ['id' => 2, 'role' => 'editor'],
    ['id' => 3, 'role' => 'admin'],
];

$admins = Arr::query($users, ['role' => 'admin']);
// Rows 1 and 3
```

For other comparisons, write a condition as a tuple of field, operator,
and value. The supported operators are `>`, `>=`, `<`, and `<=`. Tuples and
plain values can be mixed in one array:

```php
$recent = Arr::query($users, [
    ['id', '>=', 2],
    'role' => 'editor',
]);
// Row 2
```

Pass a callback instead of a condition array when the rule is more
complex. The callback receives the row, its key, and the strict flag:

```php
$first = Arr::queryFirst(
    $users,
    fn (array $row) => $row['id'] > 1
);
// ['id' => 2, 'role' => 'editor']
```

`queryFirst()` returns the first match, or `null`.

## Reshaping Data

`flatten()` turns nested data into one level, joining keys with the
delimiter. Its key-path output works with `set()` and `get()`:

```php
Arr::flatten(['a' => ['b' => 1, 'c' => ['d' => 2]]]);
// ['a.b' => 1, 'a.c.d' => 2]
```

`collapse()` removes all nesting and returns a plain list. Pass `true` as
the second argument to keep the original keys.

`sort()` orders an array by a field name or a callback, and keeps the
keys. Pass `true` as the third argument to sort in descending order:

```php
$users = [
    ['id' => 2, 'name' => 'Bob'],
    ['id' => 1, 'name' => 'Alice'],
];

$sorted = Arr::sort($users, 'name');
// Alice first, then Bob; keys are preserved
```

`merge()` is a shortcut for `array_merge()`. `mergeRecursive()` merges
nested arrays too. Lists are appended, and associative keys are replaced:

```php
Arr::mergeRecursive(
    ['tags' => ['php'], 'title' => 'Old'],
    ['tags' => ['go'], 'title' => 'New'],
);
// ['tags' => ['php', 'go'], 'title' => 'New']
```

`padStart()` and `padEnd()` add items to a list until it reaches a
length. `invert()` swaps keys and values, and `unique()` removes repeated
values.

## Syncing Two Lists

When a stored list must match a list from user input, you need to know
which rows to create, which to delete, and which to update. `Arr::sync()`
returns those three groups. It is covered on its own page:
[Array Sync](./arr-sync).

## Debugging

`dump()` returns a readable tree of an array or object as a string.
`show()` prints the same output directly:

```php
Arr::show($response);
```

Use `dump()` when you need the text, for example in a log message.

## Related

- [Array Sync](./arr-sync): splitting a stored list and an incoming list
  into create, delete, and keep groups.
- [Str](./str): the string helper in the same package.
