---
layout: doc
title: Array Sync
component: utilities
---

# Array Sync

Many forms edit a list that is stored elsewhere: tags on a post, members
of a team, or line items in an order. The user submits the complete list
they want, but the database still holds the old rows. Saving the form
means working out three things: which rows are new, which were removed,
and which remain and need updating. `Arr::sync()` makes this comparison
in one call and returns the three groups.

## Minimal Setup

`Arr::sync()` is a static method, so there is nothing to configure:

```php
use Windwalker\Utilities\Arr;

$result = Arr::sync($existing, $incoming, 'name');
```

It returns an array with the keys `creating`, `deleting`, and `keeping`.

## Showcase: Saving Post Tags

The following example compares the tags stored for a post with the tags
submitted from a form. Tags are matched by name, because a tag that the
user has just typed does not have an ID yet:

```php
use Windwalker\Utilities\Arr;

$existing = [
    ['id' => 10, 'name' => 'php'],
    ['id' => 11, 'name' => 'legacy'],
];

$incoming = [
    ['name' => 'php', 'color' => 'blue'],
    ['name' => 'go', 'color' => 'cyan'],
];

[
    'creating' => $creating,
    'deleting' => $deleting,
    'keeping' => $keeping,
] = Arr::sync($existing, $incoming, 'name');

// $creating: the 'go' tag, to insert
// $deleting: the 'legacy' tag (id 11), to delete
// $keeping:  the 'php' tag with its new color, to update

$existingByName = array_column($existing, null, 'name');

foreach ($keeping as $item) {
    $id = $existingByName[$item['name']]['id'];

    // Update the row with $id using $item['color'].
}
```

The three groups are ready to drive the database writes, and nothing
else needs to be compared by hand.

## The Result Groups

| Group      | Contents                                       | Taken from |
|------------|------------------------------------------------|------------|
| `creating` | Items that exist only in `$incoming`           | `$incoming` |
| `deleting` | Items that exist only in `$existing`           | `$existing` |
| `keeping`  | Items present in both lists                    | `$incoming` |

Each group keeps the original keys of its source array. `keeping` holds
the incoming data only. It does not contain the stored row, so keep the
stored row available, as the showcase does with `array_column()`, when the
update needs its ID.

::: info
If several items share the same match value, the last one wins. A tag
submitted twice from the form appears once in `keeping` or `creating`.
:::

## Choosing How Items Are Matched

The third argument decides how two items are considered the same. It
accepts three forms.

When it is `null`, items are matched by their array key:

```php
$existing = ['a' => 1, 'b' => 2];
$incoming = ['b' => 20, 'c' => 30];

Arr::sync($existing, $incoming);
// creating: ['c' => 30]
// deleting: ['a' => 1]
// keeping:  ['b' => 20]
```

When it is a string, the string is a field path. Rows can be arrays or
objects, and nested fields can be reached with dots:

```php
$existing = [
    ['user' => ['id' => 1]],
];

$incoming = [
    ['user' => ['id' => 1]],
    ['user' => ['id' => 2]],
];

Arr::sync($existing, $incoming, 'user.id');
// creating: [1 => ['user' => ['id' => 2]]]
// keeping:  [0 => ['user' => ['id' => 1]]]
```

When it is a callback, the callback receives the item and its key, and
returns the match value. Use it when the identity depends on more than
one field:

```php
Arr::sync(
    $existing,
    $incoming,
    fn (array $item, int|string $key) => $item['type'] . ':' . $item['id'],
);
```

## Supported Match Values

The value returned by a field or callback must be one of these types:

- `int` or `string`.
- A `BackedEnum`, matched by its `value`.
- A `UnitEnum`, matched by its `name`.
- A `Stringable` object, matched by its string form.
- Any other object, matched by identity.

::: warning
A `null` match value throws an `InvalidArgumentException`. This happens
most often with new rows that have no `id` yet. Match new rows by a
different field, such as `name`, as the showcase does.
:::

## Related

- [Arr](./arr): the helper that provides `getColumn()`, `query()`, and
  the other methods used around a sync.
