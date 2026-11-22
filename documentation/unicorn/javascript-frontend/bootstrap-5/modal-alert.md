---
layout: doc
title: ModalAlert
description: Show Unicorn JS alerts and confirmations in Bootstrap 5 modals.
---

# ModalAlert

`window.alert()` and `window.confirm()` block the page and cannot show
styled content. `useBsModalAlert()` shows the same kind of message in a
Bootstrap 5 modal. Each call returns a Promise. The Promise resolves with
the value of the button the user chose, so a confirmation reads like a
normal `await`.

## Enabling ModalAlert

Call `useBsModalAlert()` and keep the returned instance. The first call
creates a dialog with the id `uni-modal-alert` and appends it to
`document.body`. Later calls reuse that dialog.

```ts
import { useBsModalAlert } from '@windwalker-io/unicorn-next';

const modal = await useBsModalAlert();

await modal.show('Saved', 'Your changes were stored.');
```

The page must load the Bootstrap 5 CSS, because the dialog uses Bootstrap
classes. You do not need to call `useUIBootstrap5()` first. See the
[Bootstrap 5 overview](./overview) for installing the theme.

## Complete Example

This list page asks for confirmation before it deletes an article. The
Promise resolves with `true` for Delete, `false` for Cancel, and
`undefined` when the user presses Escape.

```html
<button type="button" class="btn btn-danger js-delete"
  data-url="/admin/articles/delete/42">Delete</button>
```

```ts
import { useBsModalAlert } from '@windwalker-io/unicorn-next';

const modal = await useBsModalAlert();

const deleteButtons = document.querySelectorAll<HTMLElement>(
  '.js-delete'
);

for (const button of deleteButtons) {
  button.addEventListener('click', async (e) => {
    e.preventDefault();

    const confirmed = await modal.show({
      title: 'Delete this article?',
      text: 'The article will be removed permanently.',
      icon: 'fas fa-exclamation-triangle',
      buttons: [
        {
          text: 'Cancel',
          class: 'btn btn-outline-secondary',
          value: false,
        },
        {
          text: 'Delete',
          class: 'btn btn-danger',
          value: true,
        },
      ],
    });

    if (confirmed === true) {
      window.location.href = button.dataset.url!;
    }
  });
}
```

## Showing a Message

`show()` accepts positional arguments or an options object. The
positional form takes a title, a text, an icon class, and options.

```ts
// Positional arguments: title, text, icon class, and options.
await modal.show(
  'Saved',
  'Your changes were stored.',
  'fas fa-check',
  { size: 'sm' }
);

// Options object: the same message as an object.
await modal.show({
  title: 'Saved',
  text: 'Your changes were stored.',
  icon: 'fas fa-check',
  size: 'sm',
});
```

The `icon` string is a class name, not a type name. Pass the full class
list of your icon font. It renders a `<span>` at 64px. A value such as
`'info'` renders a span with the class `info` and shows no icon.

```ts
// Full icon font classes.
await modal.show({
  title: 'Unsaved changes',
  text: 'Save before you leave?',
  icon: 'fa fa-warning text-warning',
});
```

Pass an element or a function returning an element for other icons or
a custom header.

```ts
const icon = document.createElement('img');
icon.src = '/images/logo.svg';
icon.width = 64;

await modal.show({
  header: () => {
    const header = document.createElement('div');
    header.classList.add('modal-header', 'd-flex', 'gap-2');
    header.textContent = 'Import';

    return header;
  },
  icon,
  text: 'The file was imported.',
});
```

The following block lists every option. Use only the options you need.

```ts
await modal.show({
  // A string adds a title bar with a close button.
  header: 'Notice',
  // Heading and text in the body.
  title: 'Heading',
  text: 'Message text.',
  // A class name, an element, or a function returning an element.
  icon: 'fas fa-info-circle',
  // Replaces title, text, and icon in the body. The header stays.
  content: '<p>Custom <strong>body</strong> markup.</p>',
  // Adds the class modal-sm, modal-lg, modal-xl, or modal-xxl.
  size: 'lg',
  // Receives the dialog element after its content is built.
  configure: (el) => {
    el.classList.add('my-alert');
  },
  // Passed to Bootstrap's show() as the related target.
  relatedTarget: button,
  // Button list. The default is one "OK" button.
  buttons: ['OK'],
});
```

Bootstrap has no `modal-xxl` class. Add a CSS rule for that size before
you use it.

::: warning
`title`, `text`, `header`, a string `content`, and a string `icon` are
inserted as HTML. Escape user input before you pass it. Use an element
with `textContent` for untrusted text.
:::

```ts
// Unsafe: markup in userName runs in the page.
await modal.show(`Hello ${userName}`);

const body = document.createElement('div');
body.textContent = `Hello ${userName}`;

// Safe: the text is never parsed as HTML.
await modal.show({ content: body });
```

## Buttons

The `buttons` option accepts strings, objects, elements, and functions.
String buttons are the simplest form.

```ts
// No buttons option: one primary "OK" button. Resolves true.
await modal.show('Done', 'Import finished.');

// Two strings: the first resolves false, the second resolves true.
const overwrite = await modal.show({
  title: 'Overwrite the file?',
  buttons: ['No', 'Yes'],
});
```

Object buttons give full control over the markup and the value. An object
button resolves with its `value` field. If you omit `value`, the Promise
resolves with `undefined`, so set it on every object button.

```ts
const action = await modal.show({
  title: 'Unsaved changes',
  text: 'Save before you leave?',
  icon: 'fa fa-warning text-warning',
  buttons: [
    {
      text: 'Leave',
      value: 'leave',
      class: 'btn btn-outline-danger me-auto',
    },
    {
      text: 'Cancel',
      value: false,
      class: 'btn btn-outline-primary',
    },
    {
      text: 'Save',
      value: true,
      class: 'btn btn-primary',
      styles: { width: '150px' },
    },
  ],
});

if (action === true) {
  // Save
} else if (action === 'leave') {
  // Leave
} else {
  // Cancel
}
```

The `buttons` option also accepts a prebuilt element or a function that
returns one. Use an element when you need custom markup.

```ts
const info = document.createElement('a');
info.className = 'btn btn-link';
info.href = '/docs/upload';
info.textContent = 'Read the upload guide';

await modal.show({
  title: 'Upload failed',
  buttons: [
    'Close',
    () => {
      const link = document.createElement('a');
      link.className = 'btn btn-link';
      link.href = '/docs/upload';
      link.textContent = 'Help';

      return link;
    },
    info,
  ],
});
```

An element button is added unchanged, and Unicorn attaches no click
handler to it. Its click does not resolve the Promise. Use a string or
an object button when the code needs the result.


```ts
await modal.show({
  title: 'Publish the article?',
  buttons: [
    {
      text: 'Later',
      class: 'btn btn-outline-secondary',
      value: 'later',
    },
    {
      text: 'Publish',
      class: 'btn btn-success',
      styles: { minWidth: '120px' },
      value: 'publish',
      onClick: (value, e) => {
        console.log('Clicked:', value, e);
      },
    },
  ],
});
```

Each object button accepts these fields.

```ts
{
  text: 'Retry',                      // String, or a function (el) => {}
  class: 'btn btn-primary',           // Default: "btn btn-secondary"
  attrs: { 'data-role': 'retry' },    // Extra attributes
  styles: { minWidth: '120px' },      // Inline styles
  dismiss: false,                     // Default: true (closes the modal)
  value: 'retry',                     // Value the Promise resolves with
  onClick: (value, e) => {},          // Runs before the Promise resolves
}

// With href, the button renders as a link.
{ text: 'Docs', href: '/docs', target: '_blank' }
```

Set `dismiss: false` to keep the modal open after a click. The Promise
still resolves on the first click.

Element buttons, and functions that return an element, are added to the
footer unchanged. Attach your own handlers to them.

## Result and Dismissal

A button click resolves the Promise with that button's `value`. Escape and
a backdrop click close the dialog and resolve with `undefined`.

```ts
const overwrite = await modal.show({
  title: 'Overwrite the file?',
  buttons: ['No', 'Yes'],
});

// Escape and backdrop clicks resolve with undefined.
if (overwrite === true) {
  overwriteFile();
}
```

::: warning
A dismissed dialog and a "No" answer can both be falsy. Check for `true`
explicitly before you run an action that changes or deletes data.
:::

To force a choice, disable backdrop and keyboard dismissal. Pass Bootstrap
modal options as the second argument.

```ts
const choice = await useBsModalAlert('choice-modal', {
  backdrop: 'static',
  keyboard: false,
});

await choice.show({
  title: 'Choose a format',
  buttons: ['CSV', 'JSON'],
});
```

Bootstrap options such as `backdrop` and `keyboard` apply only when the
dialog is first created. Use a separate id for a dialog that needs
different options.

::: info
Calling `show()` while the dialog is open closes it first. Then the new
message appears.
:::

## Instance Methods

The instance wraps the Bootstrap modal and the dialog element.

```ts
const modal = await useBsModalAlert('report-modal');

modal.el;        // The dialog root element.
modal.instance;  // The Bootstrap Modal instance.

modal.hide();    // Hides the dialog.
modal.toggle();  // Shows the dialog if hidden, or hides it if shown.
modal.dispose(); // Removes the Bootstrap instance. The element stays.
modal.destroy(); // Disposes the instance and removes the element.

const onHidden = () => {
  document.body.classList.remove('is-busy');
};

// on() adds a listener. It returns a function that removes it.
modal.on('hidden.bs.modal', onHidden);

// off() removes a listener by the same function reference.
modal.off('hidden.bs.modal', onHidden);
```

Use one id per dialog when you need separate dialogs on a page. Each id
creates its own element.

## Customizing the Dialog Layout

Each dialog is a Bootstrap modal element. `instance` is the Bootstrap
Modal, and `el` is the root element.

```ts
const modal = await useBsModalAlert();

// Classes on the footer survive later show() calls.
modal.el.querySelector('.modal-footer')!.classList.add('text-center');
```

Body content, the header, and buttons are rebuilt on every `show()`.
Changes to them made before `show()` are replaced. Use `configure` to
change them after they are built.

```ts
await modal.show({
  title: 'Saved',
  buttons: ['OK'],
  configure: (el) => {
    const footer = el.querySelector('.modal-footer')!;
    footer.classList.add('justify-content-center');

    return el;
  },
});
```

To reuse your own markup, place an empty modal with an `id` on the page.
Pass that id as the first argument.

```html
<div id="my-modal-alert" class="modal fade" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
      <div class="modal-body text-center p-4"></div>
      <div class="modal-footer"></div>
    </div>
  </div>
</div>
```

```ts
const modal = await useBsModalAlert('my-modal-alert', {
  backdrop: 'static',
});
```

If the id does not exist, Unicorn creates a standard dialog with that id
and appends it to `document.body`. If the element exists but lacks a
`.modal-body` or `.modal-footer` element, the dialog gets no content and
the browser logs an unhandled error.

```ts
// ERROR: Uncaught (in promise) TypeError: Cannot read
// properties of null (reading 'innerHTML')
await modal.show('Saved');
```

::: info
A dialog id can show one message at a time. Each `show()` call closes the
previous message on the same dialog. Use a second id for a second dialog
that must stay open.
:::

## Replacing simpleAlert and simpleConfirm

The Unicorn helpers `simpleAlert()`, `simpleConfirm()`, and
`deleteConfirm()` call the alert adapter. `useAlertAdapter()` replaces the
adapter's `alert` and `confirm` handlers. Once you install these handlers,
the helpers show the modal instead of `window.alert()` and
`window.confirm()`. See [UI Helpers](../ui/ui-helpers) for the default
adapter.

```ts
import {
  deleteConfirm,
  simpleAlert,
  simpleConfirm,
  useAlertAdapter,
  useBsModalAlert,
} from '@windwalker-io/unicorn-next';

const modal = await useBsModalAlert();

useAlertAdapter({
  alert: async (title, text, icon, extra = {}) => {
    await modal.show({ title, text, icon, ...extra });
  },
  confirm: async (title, text, icon, extra = {}) => {
    const value = await modal.show({
      title,
      text,
      icon,
      buttons: ['Cancel', 'OK'],
      ...extra,
    });

    return value === true;
  },
});

await simpleAlert('Saved', 'Your changes were stored.');

if (await simpleConfirm('Publish this article?')) {
  // Publish the article.
}

// deleteConfirm() uses the confirm handler by default.
if (await deleteConfirm('Delete this article?')) {
  // Delete the article.
}
```

This replacement affects only the Unicorn helpers. Native `window.alert()`
and `window.confirm()` calls are not changed.
