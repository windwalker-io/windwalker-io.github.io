---
layout: doc
title: Translation
description: Translate strings in Unicorn JS with the server's language data.
---

# Translation

Messages that a script shows to the user, such as confirmations and
validation errors, must follow the page's language. Unicorn JS keeps a
dictionary of translated strings and looks them up by key. The server
copies only the keys a page needs, so scripts never load the whole
language file.

## Enabling Translation

On the server, copy keys with `translate()` before the page's scripts
are rendered. The method accepts an exact key, a prefix ending with `*`,
or an array of either:

```php
// Copy one exact key
$unicornScript->translate('user.edit.save');

// Copy every key that starts with the prefix
$unicornScript->translate('user.edit.*');

// Copy several keys and prefixes at once
$unicornScript->translate([
    'user.edit.save',
    'user.edit.*',
]);
```

Each call adds to the keys copied earlier on the same page.

For a prefix, the server copies keys from the fallback language and from
the current locale. Keys are stored in lowercase dotted form.

In JavaScript, read a key with `trans()`:

```ts
import { trans } from '@windwalker-io/unicorn-next';

const label = trans('user.edit.save');
```

::: info
The trailing dot of a prefix is removed before matching. So
`user.edit.*` also copies `user.editor.title`. Give groups of keys
names that do not share a prefix, or list the exact keys.
:::

## Complete Example

A delete confirmation shows a message with the item name and count. The
server copies the keys, and the script fills in the placeholders:

```php
$unicornScript->translate('user.delete.*');
```

```ini
; Language file: user.delete.*
user.delete.confirm = Delete :name and %d related items?
user.delete.done = Deleted :name.
```

```ts
import { trans } from '@windwalker-io/unicorn-next';

function confirmDelete(name: string, related: number): boolean {
  const message = trans(
    'user.delete.confirm',
    related,
    { name }
  );

  return window.confirm(message);
}

if (confirmDelete('Alice', 3)) {
  alert(trans('user.delete.done', { name: 'Alice' }));
}
```

## Replacing Placeholders

`trans()` accepts replacements after the key. Two kinds are supported,
and they can be combined in one call.

Positional values fill `%s`, `%d`, and other `sprintf` markers in order:

```ini
; Language file
user.count = You have %d users.
```

```ts
trans('user.count', 5);
// Result: "You have 5 users."
```

Object values fill named `:key` markers:

```ini
; Language file
user.hello = Hello, :name.
```

```ts
trans('user.hello', { name: 'Alice' });
// Result: "Hello, Alice."
```

A function value is called when the string is built:

```ini
; Language file
user.updated = Updated at :now.
```

```ts
trans('user.updated', {
  now: () => new Date().toLocaleTimeString(),
});
```

Positional values are applied first, and then the named markers.
Several objects can be passed. Their keys are merged, and a later object
wins when a key repeats.

::: warning
Named markers are replaced by plain text search, not by whole-word match.
When one marker name starts with another, the shorter name changes the
longer one. Replacements run in the order of the object keys, and a
replaced value can be changed by a later marker. The following call gives
the wrong result:

```ini
; Language file
item.info = Item :idx of :id
```

```ts
trans('item.info', { id: 7, idx: 2 });
// Result: "Item 7x of 7"
// Expected: "Item 2 of 7"
```

Use names that do not overlap, such as `:itemIndex` and `:itemId`.
:::

## Missing Keys

A key that the page did not copy returns the original text of the id,
so the text stays readable during development:

```ts
trans('user.not.copied');
// Result: "user.not.copied"
```

A key with an empty translation returns the id in the same way:

```ini
; Language file
user.empty =
```

```ts
trans('user.empty');
// Result: "user.empty"
```

::: info
In debug mode, the id appears between `??` markers, such as
`??user.not.copied??`. The server enables debug mode when the application
runs in debug mode.
:::

## Key Format

Lookup normalizes the key. Each run of characters other than letters and
digits becomes one dot. These calls find the same entry:

```ts
trans('user.edit.save');
trans('user_edit_save');
trans('user-edit-save');
```

::: warning
Lookup does not change letter case. Write keys in lowercase, as the
server stores them. `trans('User.Edit.Save')` does not match
`user.edit.save`, and the call returns the id as the text:

```ts
trans('User.Edit.Save');
// Result: "User.Edit.Save"
```
:::

::: tip
Use dotted lowercase keys in language files, as in `user.edit.save`.
This matches the keys that `translate()` copies.
:::

## Adding Strings in JavaScript

`useLang()` returns the shared translator. Use `add()` to store a string
at runtime. The key is normalized when it is stored. A key with the same
normalized name is replaced:

```ts
import { useLang } from '@windwalker-io/unicorn-next';

const lang = useLang();

lang
  .add('user.saved', 'Saved.')
  .add('user_deleted', 'Deleted.');

console.log(lang.get('user.saved'));
```

`has()` and `get()` use the key as given, without normalization:

```ts
lang.has('user.deleted'); // true
lang.has('user_deleted'); // false
```

::: info
Use the dotted form with `has()` and `get()`. `trans()` accepts any form.
:::

`__()` is a shorter alias for `trans()`:

```ts
import { __ } from '@windwalker-io/unicorn-next';

const save = __('user.edit.save');
```

## Related

- [Unicorn JS](../unicorn-js)
- [Data Transfer](../basics/data-transfer)
- [Router](./router)
