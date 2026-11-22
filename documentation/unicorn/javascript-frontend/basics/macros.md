---
layout: doc
title: Macros
description: Expose Unicorn JS functions to HTML through the app object.
---

# Macros

Macros add functions to the Unicorn app object. Server-rendered pages can
then call them as `u.<name>()` from HTML and inline scripts, without
importing a module into every template.

## Enabling Macros

Register a function with `useMacro()` in your entry file. Then call
`pushUnicornToGlobal()` to expose the app as `window.u`:

```ts
import {
  pushUnicornToGlobal,
  useMacro,
  useUnicorn,
} from '@windwalker-io/unicorn-next';

const u = useUnicorn();

useMacro('greet', (name: string) => {
  alert(`Hello, ${name}`);
});

pushUnicornToGlobal();
```

```html
<button type="button" onclick="u.greet('Alice')">Greet</button>
```

`window.u` refers to the same object as `useUnicorn()`. Macros registered
later still appear on `u`.

## Complete Example

A list page often needs a confirmation before a batch action. The macro
returns a promise, so the template can react to the user's answer:

```ts
import {
  pushUnicornToGlobal,
  useMacro,
  useUnicorn,
} from '@windwalker-io/unicorn-next';

const u = useUnicorn();

function confirmDelete(message: string): Promise<boolean> {
  return Promise.resolve(window.confirm(message));
}

useMacro({ confirmDelete });

u.on('items.delete', () => {
  console.log('Deleting the selected items.');
});

pushUnicornToGlobal();
```

```html
<button
  type="button"
  onclick="u.confirmDelete('Delete selected items?')
    .then((ok) => {
      if (ok) {
        u.trigger('items.delete');
      }
    })"
>
  Delete
</button>
```

## Registering Several Macros

Pass an object to register many macros at once. Each key becomes the
macro name:

```ts
import {
  animateTo,
  fadeIn,
  useMacro,
  useTomSelect,
} from '@windwalker-io/unicorn-next';

useMacro({
  fadeIn,
  animateTo,
  useTomSelect,
});
```

```html
<script>
  u.fadeIn('#notice');
  u.useTomSelect('.js-tom-select');
</script>
```

## Macros Are Not Window Globals

A macro belongs to the app object only. It does not create a new
`window` function, so it cannot clash with other scripts on the page.
Other scripts reach it through `u`.

## Naming Rules

A macro name must be unique on the app object. The app already owns
names such as `on`, `trigger`, `use`, and `data`. Registering a name twice
throws an error:

```ts
useMacro('fadeIn', fadeIn);
useMacro('fadeIn', fadeIn);

// ERROR: Error: Macro: fadeIn already exists.
```

```ts
useMacro('data', () => {});

// ERROR: Error: Macro: data already exists.
```

::: tip
Declare your macros with `declare module` to get IDE completion for
`u.` calls. Use the same object you passed to `useMacro()`:

```ts
const macro = useMacro({ fadeIn });

declare module '@windwalker-io/unicorn-next' {
  type MyMacros = typeof macro;

  interface UnicornApp extends MyMacros {}
}
```
:::

::: info
Once `pushUnicornToGlobal()` runs, every inline script on the page can call
each macro. Register only the functions the page needs.
:::

## Related

- [Unicorn JS](../unicorn-js)
- [Mixin](./mixin)
- [Data Transfer](./data-transfer)

