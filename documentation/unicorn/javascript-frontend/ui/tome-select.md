---
layout: doc
title: Tom Select
description: Enhance select boxes with Tom Select, including remote loading and themes.
---

# Tom Select

A native `<select>` cannot search its options, accept new values, or load
a long option list on demand. [Tom Select](https://tom-select.js.org/)
replaces a select box with a searchable control. The original `<select>`
stays in the form and keeps the submitted value.

`useTomSelect()` applies Tom Select to one or more select boxes. It adds
Unicorn defaults, loads the library and its stylesheet on first use, and
returns a Promise. The Promise resolves after the select boxes are
enhanced.

## Enabling Tom Select

Import the function and pass a selector:

```ts
import { useTomSelect } from '@windwalker-io/unicorn-next';

await useTomSelect('#country');
```

The selector accepts a CSS selector string, an `HTMLElement`, or a
`NodeList`. Calling `useTomSelect()` without a selector loads the library
and the stylesheet only.

## Complete Example

The form has a country list, a customer search, and a tag input:

```html
<form id="order-form">
  <div class="mb-3">
    <label for="country" class="form-label">Country</label>
    <select id="country" name="country" class="form-select">
      <option value="">Select a country</option>
      <option value="de">Germany</option>
      <option value="fr">France</option>
      <option value="jp" selected>Japan</option>
    </select>
  </div>

  <div class="mb-3">
    <label for="customer" class="form-label">Customer</label>
    <select id="customer" name="customer" class="form-select"></select>
  </div>

  <div class="mb-3">
    <label for="tags" class="form-label">Tags</label>
    <select id="tags" name="tags" class="form-select" multiple>
      <option value="urgent">Urgent</option>
      <option value="gift">Gift</option>
    </select>
  </div>
</form>
```

The script enhances each select box with its own options:

```ts
import { module, useTomSelect } from '@windwalker-io/unicorn-next';

await useTomSelect('#country', {
  placeholder: 'Select a country',
});

await useTomSelect('#customer', {
  placeholder: 'Search customers',
  valueField: 'id',
  labelField: 'name',
  searchField: ['name', 'email'],
  load(query, callback) {
    const url = '/api/customers?q=' + encodeURIComponent(query);

    fetch(url)
      .then((res) => res.json())
      .then((json) => callback(json.items))
      .catch(() => callback([]));
  },
});

await useTomSelect('#tags', {
  placeholder: 'Add tags',
  create: true,
  maxItems: 5,
});

const [country] = module<any, HTMLSelectElement>(
  '#country',
  'tom.select'
);

country?.on('item_add', (value: string) => {
  console.log('Selected country:', value);
});
```

The `/api/customers` endpoint is an example. It must return an
object with an `items` array. Each item has the `id` and `name` keys
that the options name in `valueField` and `labelField`.

## Themes

The third argument selects the stylesheet. The default is `bootstrap5`.
The library also ships `bootstrap4` and `default`:

```ts
await useTomSelect('#country', {}, 'default');
```

The theme name is part of the stylesheet path. Only the themes that
the library ships are available.

## Default Options

Unicorn merges your options into its defaults. Your values replace the
defaults for the same keys:

- `allowEmptyOption` is `true`, so an empty first option stays visible.
- `maxOptions` is `null`, so the dropdown shows all matching options.
- The `caret_position` and `clear_button` plugins are always enabled.
- Single select boxes add the `dropdown_input` plugin, which shows a
  search field inside the dropdown.
- Multiple select boxes add the `remove_button` plugin.

Plugins you pass are added to the defaults:

```ts
await useTomSelect('#country', {
  maxOptions: 50,
  plugins: {
    no_backspace_delete: {},
  },
});
```

Unicorn chooses `dropdown_input` or `remove_button` by element type, so
you do not add them yourself.

## Remote Loading

The `load` option fetches options while the user types. Tom Select
calls it with the search text and a `callback` function. Pass the
options array to the callback:

```ts
await useTomSelect('#customer', {
  valueField: 'id',
  labelField: 'name',
  searchField: ['name', 'email'],
  load(query, callback) {
    fetch('/api/customers?q=' + encodeURIComponent(query))
      .then((res) => res.json())
      .then((json) => callback(json.items))
      .catch(() => callback([]));
  },
});
```

Related options:

- `valueField` and `labelField` name the keys of each option. The
  defaults are `value` and `text`.
- `searchField` lists the keys that the search matches. The default
  is `['text']`.
- `loadThrottle` delays the requests. The default is `300` milliseconds.
- `shouldLoad` decides whether a query starts a request. By default,
  an empty query does not.
- `preload: 'focus'` loads the options when the user focuses the box.
- `preload: true` loads the options with an empty query at startup.

::: warning
The `query` value comes from user input. Encode it in the URL, as the
example does. Validate and escape it on the server before using it in a
database query.
:::

::: info
Tom Select stores the results for each query until the options are
cleared. Typing the same text again does not send a second request.
:::

## Creating Options

Set `create: true` to let users add a new option by typing a value and
pressing Enter. The new value is selected like any other option. Use
`maxItems` on a multiple select box to limit the number of selected
values:

```ts
await useTomSelect('#tags', {
  create: true,
  maxItems: 5,
});
```

## Accessing the Instance

Unicorn stores the Tom Select instance on the select element under the
name `tom.select`. Read it with `module()`:

```ts
import { module } from '@windwalker-io/unicorn-next';

const [country] = module<any, HTMLSelectElement>(
  '#country',
  'tom.select'
);

country?.setValue('fr');
country?.addItem('de');
```

Call `destroy()` on the instance to remove the enhancement. The native
select box returns to the page.

```ts
country?.destroy();
```

## Events

Tom Select emits its own events on the instance. Use `on()` to listen to
them:

```ts
country?.on('item_add', (value: string) => {
  console.log('Added:', value);
});

country?.on('item_remove', (value: string) => {
  console.log('Removed:', value);
});

country?.on('dropdown_open', () => {
  console.log('Dropdown opened');
});
```

When the value changes, Tom Select also dispatches the native `input`
and `change` events on the original `<select>`. Use
`addEventListener()` on the select element for form-level listeners:

```ts
document.querySelector('#country')?.addEventListener('change', () => {
  console.log('Country changed');
});
```

## Refreshing Options

When a script replaces the options of a select box, dispatch a
`list:updated` event on the native select element. Tom Select rebuilds
its options from the new list:

```ts
const city = document.querySelector<HTMLSelectElement>('#city')!;

city.innerHTML = `
  <option value="1">Tokyo</option>
  <option value="2">Osaka</option>
`;
city.dispatchEvent(new CustomEvent('list:updated'));
```

The selected value stays selected when the new list still contains it.
Otherwise, the first option is selected. This refresh does not fire
`change`. Dispatch `change` yourself if other code depends on it.

The Unicorn `ListDependent` module dispatches the same event after it
updates a select box.
