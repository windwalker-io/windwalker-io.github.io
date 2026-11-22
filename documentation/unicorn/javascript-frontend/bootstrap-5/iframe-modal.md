---
layout: doc
title: Iframe Modal
description: Open a URL in a Bootstrap 5 modal with Unicorn JS, bind links to it, and send messages from the framed page to the parent.
---

# Iframe Modal

Admin pages often edit a record on a separate page. Opening that page in a
modal keeps the list in place. The iframe modal loads a URL inside a
Bootstrap 5 modal. You can bind it to links with an attribute, or open it
from JavaScript.

Unicorn JS provides this through the `<uni-iframe-modal>` element. The
element builds its own modal markup. It uses the Bootstrap `Modal` class from
the bundled Bootstrap module, so `useUIBootstrap5()` is not required. The page
still needs the Bootstrap 5 CSS for the modal classes. See the
[Bootstrap 5 overview](./overview) for the rest of the integration.

## Enabling the Iframe Modal

Import `useIframeModal()` and await it once. The function defines the element
and registers the `uni-modal-link` attribute:

```ts
import { useIframeModal } from '@windwalker-io/unicorn-next';

await useIframeModal();
```

Then add the element with an `id` to the page:

```html
<uni-iframe-modal id="article-modal"></uni-iframe-modal>
```

## Complete Example

The following example runs end to end. A link opens the article editor in a
modal. When the editor saves, it sends a message to the page, and the page
reloads its list.

The admin page contains the link and the modal element:

```html
<a href="/admin/articles/1/edit"
  class="btn btn-primary"
  uni-modal-link="#article-modal"
  data-size="modal-xl"
  data-height="700px">
  Edit article
</a>

<uni-iframe-modal id="article-modal"></uni-iframe-modal>
```

The admin page script starts the module and listens for the saved message:

```ts
import {
  type IFrameModalElement,
  useIframeModal,
} from '@windwalker-io/unicorn-next';

await useIframeModal();

const modal = document.querySelector<IFrameModalElement>(
  '#article-modal'
);

if (!modal) {
  throw new Error('Iframe modal #article-modal was not found.');
}

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) {
    return;
  }

  if (e.source !== modal.iframe.contentWindow) {
    return;
  }

  if (typeof e.data === 'object' && e.data?.task === 'saved') {
    window.location.reload();
  }
});
```

The framed edit page sends the message after the server confirms the save:

```ts
// Runs in the framed edit page.
function notifyParent(id: number) {
  window.parent.postMessage(
    { task: 'saved', id },
    window.location.origin
  );
}

// Call after the save succeeds.
notifyParent(1);
```

## Opening from a Link

Add `uni-modal-link` to a link. Its value is a CSS selector for the modal
element. The click opens the link's `href` in the modal and prevents the
browser from navigating.

A minimal link uses the default size and height:

```html
<a href="/admin/articles/1/edit"
  uni-modal-link="#article-modal">
  Edit
</a>
```

Use `data-*` attributes to change the modal for one link:

```html
<!-- Wide dialog with a 700px frame -->
<a href="/admin/articles/1/edit"
  uni-modal-link="#article-modal"
  data-size="modal-xl"
  data-height="700px">
  Edit
</a>
```

```html
<!-- The frame grows to fit its content -->
<a href="/admin/articles/1/preview"
  uni-modal-link="#article-modal"
  data-resize="1">
  Preview
</a>
```

The `data-resize` attribute accepts `1` or `true`. Any other value,
including `0`, turns resizing off.

The directive reads the `data-*` attributes when the link is set up. To
change them later, call `open()` instead.

::: warning
If the selector matches no element when the link is clicked, nothing
happens. The browser does not navigate to the `href` either. Check the
`id` spelling in `uni-modal-link` first.
:::

## Opening from JavaScript

Select the element and call `open()` with the URL and optional settings.
Call `close()` to hide the modal from the page:

```ts
import {
  type IFrameModalElement,
  useIframeModal,
} from '@windwalker-io/unicorn-next';

await useIframeModal();

const modal = document.querySelector<IFrameModalElement>(
  '#article-modal'
)!;

// Show the modal with a URL and optional settings.
await modal.open('/admin/articles/1/edit', {
  size: 'modal-xl',
  height: '700px',
  resize: false,
});

// Hide the modal and clear the frame.
await modal.close();

// Get the Bootstrap Modal instance, created on first use.
const bsModal = await modal.getBootstrapModal();
```

The element exposes these members:

- `modal.iframe` is the `<iframe>` element.
- `modal.modalElement` is the `.modal` element that Bootstrap manages.
- `modal.getBootstrapModal()` returns the Bootstrap `Modal` instance.

Call `getBootstrapModal()` instead of reading `modal.modal`. The property
is set only after the Bootstrap module has loaded.

Call `open()` only after `useIframeModal()` has finished. Before that, the
element has no methods:

```ts
const modal = document.querySelector<IFrameModalElement>(
  '#article-modal'
)!;

modal.open('/admin/articles/1/edit');
// ERROR: TypeError: modal.open is not a function
```

## Sizing the Modal

The `open()` options and the `data-*` attributes accept the same settings.

Size is a Bootstrap dialog class such as `modal-sm`, `modal-lg`, or
`modal-xl`. When `open()` receives no size, the dialog uses `modal-lg`.

Height is a CSS length. The default is `500px`. Include the unit, because
a bare number such as `600` is not valid CSS and the browser ignores it.

```ts
// A fixed 600px frame.
await modal.open('/admin/articles/1/edit', {
  height: '600px',
});

// A frame that fits its content after it loads.
await modal.open('/admin/articles/1/preview', {
  resize: true,
});
```

When `resize` is `true`, the frame is sized to its content after it loads,
and the height option is not applied. The resized height is the content
height plus 30px, with a minimum of 500px.

::: info
Resizing reads the framed document. It works only when the framed page has
the same origin as the parent. For other pages, the frame keeps the browser
default height.
:::

## Closing and Events

The modal closes with the Escape key or a click on the backdrop, which are
Bootstrap defaults. Closing the modal clears the frame's `src`. Opening the
modal again loads the URL from the beginning.

::: warning
Closing the modal unloads the framed page. Unsaved input in the frame is
lost. Save the data in the framed page before the modal closes, or ask the
user to confirm.
:::

Unicorn JS does not dispatch events of its own. Listen to the Bootstrap
events on `modal.modalElement`:

```ts
modal.modalElement.addEventListener('shown.bs.modal', () => {
  console.log('The modal is visible.');
});

modal.modalElement.addEventListener('hidden.bs.modal', () => {
  console.log('The modal is hidden.');
});
```

## Messages from the Framed Page

The framed page can send data to the page that opened it with
`window.postMessage()`. Send to `window.parent`, not to `window`, because
a message posted to `window` stays in the frame.

Use the page origin as the target origin, as the
[complete example](#complete-example) does. Then the parent checks the
origin and the source of each message before it reads the data.

The listener receives messages from every window. Filter them with the
`origin` and `source` checks, as shown in the complete example.

::: warning
The `data` of a message is untrusted input. Any window can send a message
to the parent, so check the shape and the values before you use them. Do
not insert `data` into HTML or run it as code.
:::

The pattern works only for framed pages on the same origin as the parent.
A message to another origin is not delivered, and the parent ignores
messages from other origins.

::: warning
The modal loads whatever URL you pass to `open()` or to a link. Do not pass
a URL from user input or from a query string without checking it. A page
from another site can then appear inside your admin page.
:::

::: info
Some sites send an `X-Frame-Options` or `frame-ancestors` header. The
browser refuses to show those pages in the modal, and the frame stays
empty.
:::

## Related Pages

- [Bootstrap 5 overview](./overview) explains the Bootstrap integration.
- [Modal alert](./modal-alert) covers simple message dialogs.
