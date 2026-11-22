---
layout: doc
title: Event Bus
description: Use the Unicorn JS app as an event bus between page components.
---

# Event Bus

On a typical admin page, several components depend on the same change. A
row selector changes the selection, and a toolbar and a counter must react.
An event bus lets each component announce changes and listen for them,
without holding a reference to the others.

The Unicorn app is the event bus. It has no separate object to create.

## Enabling the Event Bus

Call `useUnicorn()` to get the app, then register listeners with `on()` and
send events with `trigger()`:

```ts
import { useUnicorn } from '@windwalker-io/unicorn-next';

const u = useUnicorn();

u.on('selection.changed', (ids: number[]) => {
  console.log(`${ids.length} rows selected.`);
});

u.trigger('selection.changed', [3, 7]);
```

## Complete Example

The row selector announces the selection. The toolbar and the counter
listen for it and update their own parts of the page:

```ts
import { selectAll, useUnicorn } from '@windwalker-io/unicorn-next';

const u = useUnicorn();

// Toolbar: enable the delete button when rows are selected.
u.on('selection.changed', (ids: number[]) => {
  const button = document.querySelector<HTMLButtonElement>('#btn-delete');

  if (button) {
    button.disabled = ids.length === 0;
  }
});

// Counter: show how many rows are selected.
u.on('selection.changed', (ids: number[]) => {
  const badge = document.querySelector('#selected-count');

  if (badge) {
    badge.textContent = String(ids.length);
  }
});

// Row selector: announce every change of the checkboxes.
selectAll('.js-row-check', (checkbox) => {
  checkbox.addEventListener('change', () => {
    const ids = selectAll<HTMLInputElement>('.js-row-check')
      .filter((el) => el.checked)
      .map((el) => Number(el.value));

    u.trigger('selection.changed', ids);
  });
});
```

The selector does not know about the toolbar or the counter. Add a new
listener to the bus when another component needs the selection.

## Registering Listeners

`on()` adds a listener. Every listener runs on each trigger, in the order
they were registered. Pass an array to listen for several events with one
handler:

```ts
u.on(['cart.added', 'cart.removed'], (item: string) => {
  console.log(`Cart changed: ${item}`);
});
```

Use `once()` for a listener that should run on the next trigger only:

```ts
u.once('form.ready', () => {
  console.log('The form is ready for the first time.');
});
```

## Removing Listeners

`off()` removes a listener when you pass the same function you registered.
Without a handler, `off()` removes every listener of the event. Keep the
reference when you need to remove the listener later:

```ts
const onSelect = (ids: number[]) => {
  console.log(ids);
};

u.on('selection.changed', onSelect);

// Remove only this listener.
u.off('selection.changed', onSelect);

// Remove every listener of the event.
u.off('selection.changed');
```

::: warning
Listeners stay registered until you call `off()`. When a component is
removed from the page, remove its listeners too. Otherwise the handler keeps
running and may touch elements that no longer exist.
:::

## Passing Data

`trigger()` passes every argument after the event name to each listener.
Send one object when a listener needs several values:

```ts
u.on('user.saved', ({ id, name }: { id: number; name: string }) => {
  console.log(`Saved ${name} (${id}).`);
});

u.trigger('user.saved', { id: 1, name: 'Alice' });
```

Name events as `domain.action`, such as `user.saved` or `cart.removed`.
This keeps the names readable across the page.

## Framework Events

Unicorn JS triggers a few events of its own:

- `loaded`: fired once after the DOM is ready and async setup has finished.
- `plugin.installed`: fired by `use()`, with the installed plugin.
- `plugin.uninstalled`: fired by `detach()`, with the removed plugin.

```ts
u.on('loaded', () => {
  console.log('The page is ready.');
});
```

::: warning
`loaded` fires only once. A listener added after the page is ready never
runs. Register `loaded` listeners in the entry file, before the DOM finishes
loading.
:::

::: info
Listeners run synchronously. `trigger()` returns after every listener has
finished, so a slow listener delays the code that triggered the event. Start
long work with `await` inside the listener, or with a separate task.
:::

## Related

- [Unicorn JS](../unicorn-js)
- [Mixin](./mixin)
- [Macros](./macros)
