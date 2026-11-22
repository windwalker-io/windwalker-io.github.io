---
layout: doc
title: UI Helpers
description: Show messages, confirm actions, animate elements, and guard forms.
---

# UI Helpers

Admin and form pages repeat the same UI tasks. They show messages, ask for
confirmation, animate panels, stop double submits, and keep a session alive.
The UI helpers provide these tasks as plain functions. They are exported
from `@windwalker-io/unicorn-next` and need no other framework.

## Enabling the Helpers

Import the functions you use from the package:

```ts
import {
  renderMessage,
  simpleConfirm,
  slideDown,
} from '@windwalker-io/unicorn-next';
```

The message helpers draw through a theme. The bundled theme is Bootstrap 5.
Install it once at startup, as described in [Bootstrap 5](../bootstrap-5/overview):

```ts
import { useUIBootstrap5 } from '@windwalker-io/unicorn-next';

await useUIBootstrap5(true);
```

Calling a message helper before a theme is installed fails:

```ts
// ERROR: TypeError: Cannot read properties of undefined (reading 'theme')
renderMessage('Saved.');
```

## Complete Example

A save form disables its buttons while the save runs. It shows a message
when the save succeeds, asks before a destructive action, and keeps the
session alive while the editor is open:

```ts
import {
  clearMessages,
  renderMessage,
  simpleConfirm,
  useDisableIfStackNotEmpty,
  useDisableOnSubmit,
  useKeepAlive,
  useUIBootstrap5,
} from '@windwalker-io/unicorn-next';

await useUIBootstrap5(true);

// Disable the form buttons and show a spinner on submit.
useDisableOnSubmit('#edit-form');

// Disable save buttons while an upload is pending.
useDisableIfStackNotEmpty('[data-task=save]', 'uploading');

// Ping the server every 30 seconds while the editor is open.
const stopKeepAlive = useKeepAlive('/admin/ping', 30000);

const deleteButton = document.querySelector('#delete-btn');

deleteButton?.addEventListener('click', async () => {
  if (await simpleConfirm('Delete this article?')) {
    // Continue with the deletion.
  }
});

// Show the result of the last action.
clearMessages();
renderMessage('Article saved.', 'success');

// Stop the ping when the editor closes.
window.addEventListener('pagehide', () => stopKeepAlive());
```

## Theme and Messages

A theme draws messages on the page. It is any object with a
`renderMessage()` method and a `clearMessages()` method. The helpers below
call the installed theme:

```ts
import {
  clearMessages,
  renderMessage,
  useUI,
  useUITheme,
} from '@windwalker-io/unicorn-next';

// The shared UI instance. It creates the instance on first use.
const ui = useUI();

// Install a theme. The argument can be an object or a class.
useUITheme({
  renderMessage(messages, type = 'info') {
    console.info(`[${type}]`, messages);

    return () => {};
  },
  clearMessages() {
    console.info('Messages cleared.');
  },
});

// Returns the installed theme, without changing it.
const theme = useUITheme();
```

`renderMessage()` accepts one string or an array of strings. It returns a
function that removes the message:

```ts
// One message.
renderMessage('Changes saved.', 'success');

// Several lines in one message.
renderMessage(['Upload failed.', 'File is too large.'], 'danger');

// Remove one message after three seconds.
const remove = renderMessage('Syncing...', 'info');
setTimeout(() => remove(), 3000);

// Remove every message the theme shows.
clearMessages();
```

::: warning
The Bootstrap 5 theme inserts messages as HTML. Escape any user input or
request data before you pass it to `renderMessage()`.
:::

## Alerts and Notifications

These helpers ask the user for input. They run through an adapter, so you
can replace the default dialogs without changing the calls:

```ts
import {
  clearNotifies,
  deleteConfirm,
  simpleAlert,
  simpleConfirm,
  simpleNotify,
} from '@windwalker-io/unicorn-next';

await simpleAlert('Saved', 'Your changes are live.');

const ok = await simpleConfirm('Publish this article?');

const confirmed = await deleteConfirm('Delete this article?');

const remove = await simpleNotify('Saved', 'Changes are live.', 'success');
remove();

clearNotifies();
```

By default, `simpleAlert()` and `simpleConfirm()` use `window.alert()` and
`window.confirm()`. `simpleNotify()` sends the message to the installed
theme. `deleteConfirm()` shares the confirm adapter.

Replace the adapter with `useAlertAdapter()`. Pass only the handlers you
change. The handler receives the same arguments as the helper:

```ts
import { useAlertAdapter } from '@windwalker-io/unicorn-next';

useAlertAdapter({
  // Your own dialog returns a boolean.
  confirm: async (title, text = '') => {
    return showMyDialog(title, text);
  },
});
```

::: info
Use a theme for the messages that stay on the page. Use the adapter for
dialogs that need the user to answer before the code continues.
:::

## Alpine.js

Unicorn JS loads Alpine.js on demand. The helpers below control when Alpine
starts and how components attach to the page:

```html
<div uni-counter="{ count: 0 }">
  <button @click="count++">
    Clicked <span x-text="count"></span>
  </button>
</div>
```

```ts
import {
  initAlpineComponent,
  loadAlpine,
  prepareAlpine,
  prepareAlpineDefer,
} from '@windwalker-io/unicorn-next';

// Register code that runs before Alpine starts.
await prepareAlpine((Alpine) => {
  Alpine.store('cart', { items: 0 });
});

// Load Alpine and start it.
await loadAlpine();

// Attach the component in the element's attribute value.
await initAlpineComponent('uni-counter');

// Run code after Alpine has started.
await prepareAlpineDefer((Alpine) => {
  console.log('Alpine version is ready.');
});
```

`initAlpineComponent()` reads each element's attribute, moves the value to
`x-data`, and starts Alpine on that element.

::: warning
`initAlpineComponent()` and `prepareAlpineDefer()` wait until `loadAlpine()`
has run. If your page never calls `loadAlpine()`, they never resolve.
:::

## Text Highlighting

`mark()` loads mark.js and highlights a keyword inside a selector. The
options are passed to mark.js unchanged:

```ts
import { mark } from '@windwalker-io/unicorn-next';

// Highlight the search term in the list.
await mark('#article-list', 'windwalker', {
  separateWordSearch: false,
});

// Load mark.js without highlighting anything.
await mark();
```

## Animation

Each animation helper accepts a selector or an element. Durations are in
milliseconds. The slide, fade, and highlight helpers return a promise that
resolves when the animation ends.

```ts
import {
  animateTo,
  fadeIn,
  fadeOut,
  highlight,
  slideDown,
  slideToggle,
  slideUp,
} from '@windwalker-io/unicorn-next';

// Open and close a panel. slideDown() defaults to 300 ms.
await slideDown('#details');
await slideUp('#details', 200);

// Toggle with a 400 ms duration and flex display.
await slideToggle('#filters', 400, 'flex');

// Fade an element in and out.
await fadeIn('#notice');
await fadeOut('#notice', 250);

// Flash a row, then restore its background color.
await highlight('#row-42');
await highlight('#row-43', '#c8f7c5', 1000);

// Animate any CSS property with the Web Animations API.
animateTo(document.querySelector('#badge')!, { opacity: 0.4 }, 250);
```

`animateTo()` is the base of the other helpers. Its second argument maps
CSS property names to target values, and its third argument is a duration
or a `KeyframeAnimationOptions` object:

```ts
animateTo(
  document.querySelector<HTMLElement>('#card')!,
  { backgroundColor: ['#ffffff', '#fff3cd'] },
  { duration: 600, easing: 'ease-in-out' }
);
```

Pass an array to set both start and end values. Pass a single value to
animate from the element's current value. The defaults are a 400 ms
duration, a `linear` easing, and `fill: both`.

`slideToggle()` opens a hidden element and closes a visible one.
`slideUp()` and `fadeOut()` set `display` to `none` when they finish.
`slideDown()` and `fadeIn()` set the display value you pass.

::: info
`slideDown()` measures the tallest child of the element to set the target
height. Wrap the content in one container when the children have different
sizes.
:::

## Color Picker

`useColorPicker()` loads Spectrum, the color picker library, and applies
it to a selector. The `theme` option chooses the light or dark stylesheet:

```ts
import { useColorPicker } from '@windwalker-io/unicorn-next';

// Apply the picker to every matching input.
await useColorPicker('.js-color', { theme: 'dark' });

// Load the picker library without attaching it to an element.
const spectrum = await useColorPicker();
```

::: info
When you pass a `locale`, the function loads the matching Spectrum locale
file. If that file fails to load, it logs a warning and keeps the picker in
the default language.
:::

## Form and Button Helpers

These helpers prevent double submits and show progress on the form:

```ts
import {
  useDisableIfStackNotEmpty,
  useDisableOnSubmit,
  useStack,
} from '@windwalker-io/unicorn-next';

// Disable the form's buttons on submit, and add a spinner to the
// button that was clicked. The defaults target "#admin-form".
useDisableOnSubmit('#edit-form', '', {
  event: 'submit',
  spinnerClass: 'spinner-border spinner-border-sm',
  loadingCass: 'is-uni-loading',
});

// Disable buttons while an upload is in progress.
useDisableIfStackNotEmpty('[data-task=save]', 'uploading');

const uploads = useStack('uploading');

uploads.push(file); // The stack is not empty, so the buttons are off.
uploads.pop(); // The stack is empty, so the buttons are back on.
```

`useDisableOnSubmit()` disables the matching buttons only when the form
passes its validity check. Buttons clicked within 1.5 seconds of the submit
count as the source of the submit, and they show the spinner.

`useDisableIfStackNotEmpty()` watches a named stack. It disables the
matching buttons while the stack has items, and enables them again when the
stack is empty. See [SimpleStack](./simple-stack) for the stack methods.

## Session Keep-Alive

`useKeepAlive()` sends a request to a URL at a fixed interval. It returns a
function that stops the requests:

```ts
import { useKeepAlive } from '@windwalker-io/unicorn-next';

// Ping every 60 seconds (the default).
const stop = useKeepAlive('/admin/ping');

// Stop the requests when the editor closes.
stop();
```

::: info
The keep-alive request reads no response. Use a lightweight endpoint, such
as a route that returns an empty response.
:::

## Vue Component Fields

`useVueComponentField()` loads the Vue field widget that the server renders
for a form field. Pass the selector, the initial value, and the widget
options:

```ts
import { useVueComponentField } from '@windwalker-io/unicorn-next';

await useVueComponentField('#tags-field', ['php', 'js'], {
  placeholder: 'Add a tag',
});
```

Call the function without a selector to load the widget module only.

## Related

- [Bootstrap 5](../bootstrap-5/overview)
- [SimpleStack](./simple-stack)
- [Unicorn JS](../unicorn-js)
