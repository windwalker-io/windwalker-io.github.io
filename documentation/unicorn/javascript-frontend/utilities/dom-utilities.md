---
layout: doc
title: DOM Utilities
description: Select elements, bind behavior, build markup, and delegate events.
---

# DOM Utilities

Unicorn JS pages mix server-rendered markup with small pieces of behavior.
The DOM utilities find elements, attach one instance per element, build
new markup, delegate events from a container, and add styles. They are
plain functions and need no framework.

## Enabling the Utilities

Import the functions you use from the package:

```ts
import {
  selectAll,
  selectOne,
} from '@windwalker-io/unicorn-next';

const form = selectOne<HTMLFormElement>('#admin-form');
const rows = selectAll('.js-row');
```

## Complete Example

The following script adds a live row counter to a list. It binds a counter
instance to the output element, adds rows with `html()`, and removes rows
through a delegated click handler:

```html
<div>
  <p>Rows: <span id="row-count">0</span></p>
  <button type="button" id="add-item">Add item</button>
  <ul id="item-list">
    <li class="js-row">
      Alpha <button type="button" class="js-remove">Remove</button>
    </li>
  </ul>
</div>
```

```ts
import {
  delegate,
  domready,
  html,
  module,
  selectOne,
} from '@windwalker-io/unicorn-next';

class RowCounter {
  constructor(private output: HTMLElement) {}

  update(): void {
    const rows = document.querySelectorAll('.js-row');

    this.output.textContent = String(rows.length);
  }
}

await domready();

const list = selectOne<HTMLElement>('#item-list');
const output = selectOne<HTMLElement>('#row-count');

if (!list || !output) {
  throw new Error('The item list or the row counter is missing.');
}

// Create one counter for the output element.
const counter = module<RowCounter, HTMLElement>(
  output,
  'row.counter',
  (el) => new RowCounter(el)
);

counter?.update();

// Build a row from static markup.
delegate(document, '#add-item', 'click', () => {
  const row = html<HTMLLIElement>(`
    <li class="js-row">
      New <button type="button" class="js-remove">Remove</button>
    </li>
  `);

  list.append(row);
  counter?.update();
});

// Rows added later also receive this handler.
delegate(list, '.js-remove', 'click', (e) => {
  const button = e.currentTarget as HTMLElement;

  button.closest('.js-row')?.remove();
  counter?.update();
});
```

## Selecting Elements

`selectOne()` returns the first match, or `null` when nothing matches.
Pass an element instead of a selector to get it back unchanged. A
function can accept either form this way:

```ts
import { selectAll, selectOne } from '@windwalker-io/unicorn-next';

const form = selectOne<HTMLFormElement>('#admin-form');
const missing = selectOne('#not-on-page'); // null

function focusField(field: string | HTMLElement) {
  selectOne<HTMLElement>(field)?.focus();
}

focusField('#title');
```

`selectAll()` returns a real array, so `map()` and `filter()` work
directly. It also accepts a `NodeList` or an array:

```ts
const rows = selectAll('.js-row');

const checked = selectAll<HTMLInputElement>('.js-check')
  .filter((el) => el.checked);

const fields = selectAll<HTMLInputElement>(
  document.querySelectorAll<HTMLInputElement>('.js-field')
);
```

The optional callback runs for each element:

```ts
// Return nothing to run side effects only.
selectAll('.js-toggle', (el) => {
  el.addEventListener('click', () => el.classList.toggle('open'));
});

// Return a value to collect one result per element.
// Widget is your own class.
const widgets = selectAll<any>('.js-widget', (el) => new Widget(el));
```

::: info
The callback result replaces the element only when it is truthy. A falsy
result, such as `undefined`, keeps the element in the returned array.
:::

## Binding Instances to Elements

`module()` creates one instance per element and stores it on that element
under a name. A later call returns the stored instance. The callback runs
only when no instance is stored under that name:

```ts
import { module, selectOne } from '@windwalker-io/unicorn-next';

// TableSorter is your own class that takes an element.

// A selector returns one entry per matched element.
const sorters = module<TableSorter, HTMLElement>(
  '.js-sortable',
  'sorter',
  (el) => new TableSorter(el)
);

// An element returns one instance.
const items = selectOne<HTMLElement>('#items')!;

const sorter = module<TableSorter, HTMLElement>(
  items,
  'sorter',
  (el) => new TableSorter(el)
);
```

::: tip
Use one name per behavior, such as `sorter` or `tooltip`. One element can
hold several instances, each under its own name.
:::

Use `getBoundedInstance()` for one element and `getBoundedInstanceList()`
for many. Both take the same callback as `module()`:

```ts
import {
  getBoundedInstance,
  getBoundedInstanceList,
  removeBoundedInstance,
} from '@windwalker-io/unicorn-next';

// Returns null when the selector matches nothing.
const one = getBoundedInstance<TableSorter, HTMLElement>(
  '#items',
  'sorter',
  (el) => new TableSorter(el)
);

const many = getBoundedInstanceList<TableSorter, HTMLElement>(
  '.js-sortable',
  'sorter',
  (el) => new TableSorter(el)
);

// Forget the instance on one element.
removeBoundedInstance('#items', 'sorter');

// Pass false as the callback to remove instances with module().
module(document.querySelectorAll('.js-sortable'), 'sorter', false);
```

::: info
After an instance is removed, the next call with a callback creates a new
instance. Removal does not call the callback.
:::

## Building Markup

`h()` creates an element from a tag name, an attribute object, and
content. Attributes are set with `setAttribute()`. Content is set as HTML.
`html()` parses a string and returns its first element:

```ts
import { h, html } from '@windwalker-io/unicorn-next';

const badge = h('span', { class: 'badge', 'data-count': 3 }, '3');

const row = html<HTMLLIElement>('<li class="js-row">Beta</li>');

row.append(badge);
document.querySelector('#item-list')?.append(row);
```

Use `textContent` for text from users. Never pass that text to `h()`.

```ts
// Unsafe: the browser runs any tags in userMessage.
const unsafe = h('p', {}, userMessage);

// Safe: the text is set as plain text.
const note = h('p', {}, '');

note.textContent = userMessage;
```

::: warning
`h()` and `html()` set content with `innerHTML`. Never pass user input or
data from a request as content. Only static markup belongs in these calls.
:::

::: info
`html()` parses the string inside a `<div>`. Browsers drop table parts such
as `<tr>` and `<td>` there, so the result is `undefined`.
:::

```ts
const row = html('<tr><td>Gamma</td></tr>'); // undefined
```

## Delegating Events

`delegate()` listens on a container. When an event fires, it checks the
target and its ancestors up to the container. It runs the callback for each
descendant that matches the selector. Rows added later still match. The
function returns an `unsubscribe` callback:

```ts
import { delegate } from '@windwalker-io/unicorn-next';

const stop = delegate('#item-list', '.js-remove', 'click', (e) => {
  const button = e.currentTarget as HTMLElement;

  button.closest('.js-row')?.remove();
});

// Remove this callback. Other callbacks on the same selector stay.
stop();
```

Inside the callback, `e.currentTarget` is the matched element. `e.target`
is the element that was clicked, which can be a child of the match, such
as an icon inside a button.

The selector and callback are required. An empty selector throws:

```ts
// ERROR: The provided selector is empty.
delegate('#item-list', '', 'click', () => {});
```

::: warning
The wrapper must exist when `delegate()` runs. If no element matches the
wrapper selector, `delegate()` attaches nothing and throws nothing. Call it
after the container is in the document, for example after `domready()`.
:::

::: info
Calling `e.stopPropagation()` in a callback stops the walk toward the
wrapper, so ancestors do not match. Other handlers on the current match
still run, and native event propagation continues.
:::

## Waiting for the DOM

`domready()` resolves once the DOM is ready. Use it when a script reads or
changes markup that may not be parsed yet. It accepts an optional callback
that runs after that:

```ts
import { domready } from '@windwalker-io/unicorn-next';

await domready();

// Or run code when the DOM is ready.
domready(() => {
  console.log('The DOM is ready.');
});
```

## Injecting Styles

`injectCssToDocument()` adds styles to the document as constructable
stylesheets. It accepts one or more sources. Each source is a CSS string,
a `CSSStyleSheet`, or a function that imports CSS text:

> !review
> 提供一個示範，這個功能實用的情境是 import css / scss with ?inline or ?raw 時，
> 可以直接 inject 到 document，避免在 vite build 時，css/scss 被打包成 js，導致無法被瀏覽器解析的問題。

```ts
import { injectCssToDocument } from '@windwalker-io/unicorn-next';

// A CSS string.
await injectCssToDocument(`
  .js-row.is-selected { background: #e8f0fe; }
`);

// A CSSStyleSheet that you built yourself.
const sheet = new CSSStyleSheet();

sheet.replaceSync('.js-remove { color: #b00020; }');

await injectCssToDocument(sheet);

// A module whose default export is the CSS text.
await injectCssToDocument(
  () => import('./row-styles.css?inline')
);
```

The `?inline` query is a Vite feature. Other bundlers need their own raw
CSS import setup.

::: tip
Call `injectCssToDocument()` once when the script loads. Each call adds new
stylesheets, and the function does not check for duplicates.
:::

## Related

- [Unicorn JS](../unicorn-js)
- [Loader](./loader)
- [Event Bus](../basics/event-bus)
