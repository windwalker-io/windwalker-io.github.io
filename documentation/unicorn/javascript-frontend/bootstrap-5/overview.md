---
layout: doc
title: Bootstrap 5
description: Use Bootstrap 5 with Unicorn JS for messages, tooltips, and components.
---

# Bootstrap 5

Admin pages built on Bootstrap 5 need the same few things: a way to show
messages, tooltips on controls, and components such as tabs and modals.
Unicorn JS provides these through one Bootstrap 5 integration. It installs
a message theme for the UI helpers, and it exposes helpers for Bootstrap
components.

## Enabling Bootstrap 5

Call `useUIBootstrap5()` once at startup. The first argument installs the
Bootstrap 5 theme. The second argument also exposes the Bootstrap module as
`window.bootstrap`:

```ts
import { useUIBootstrap5 } from '@windwalker-io/unicorn-next';

await useUIBootstrap5(true, true);
```

Calling the function without arguments returns the shared instance without
installing it:

```ts
const bs5 = await useUIBootstrap5();

// The Bootstrap module bundled with the package.
const { Modal, Tooltip } = bs5.bootstrap;
```

::: info
The bundled module is used by Unicorn JS. Your own scripts can use
`window.bootstrap` only when the second argument is `true`.
:::

## Complete Example

The following entry file sets up Bootstrap 5 for a settings page. It adds
tooltips, remembers the active tab, and shows a message after load:

```ts
import {
  renderMessage,
  useBs5KeepTab,
  useBs5Tooltip,
  useUIBootstrap5,
} from '@windwalker-io/unicorn-next';

await useUIBootstrap5(true, true);

await useBs5Tooltip();

await useBs5KeepTab('#settings-tabs');

renderMessage('Settings loaded.', 'success');
```

## Messages

With the Bootstrap 5 theme installed, `renderMessage()` and
`clearMessages()` show alerts inside the element with the class
`c-messages-container`. The message type becomes the alert class, such as
`success`, `info`, `warning`, or `danger`:

```html
<div class="c-messages-container"></div>
```

```ts
import { renderMessage } from '@windwalker-io/unicorn-next';

renderMessage(['Upload failed.', 'File is too large.'], 'danger');
```

::: warning
Each message is inserted as HTML. Do not pass user input or data from a
request without escaping it first, because it can run scripts on the page.
:::

::: info
When the page has no `.c-messages-container` element, the message is not
shown and no error is raised.
:::

The full set of message helpers, and how to replace the theme, is described
in [UI Helpers](../ui/ui-helpers).

## Tooltips

`useBs5Tooltip()` attaches Bootstrap tooltips to matching elements. The
default selector is `[data-bs-toggle="tooltip"]`:

```html
<button data-bs-toggle="tooltip" title="Save the draft">Save</button>
```

```ts
import { useBs5Tooltip } from '@windwalker-io/unicorn-next';

await useBs5Tooltip();

// A custom selector and Bootstrap tooltip options.
await useBs5Tooltip('.js-help', { placement: 'right' });
```

::: tip
Each element keeps one tooltip instance. Call `useBs5Tooltip()` again after
you add elements to the page, so the new elements get tooltips.
:::

## Components

Unicorn JS provides helpers for these Bootstrap components:

- [Keep Tab](./keep-tab): remembers the active tab across page loads.
- [Button Radio](./button-radio): turns a radio group into buttons.
- [Modal Alert](./modal-alert): shows a confirmation in a Bootstrap modal.
- [Iframe Modal](./iframe-modal): loads a page inside a modal.

## Related

- [Unicorn JS](../unicorn-js)
- [UI Helpers](../ui/ui-helpers)
