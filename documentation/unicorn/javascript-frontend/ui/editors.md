---
layout: doc
title: Editors
description: Get and control TinyMCE and Nuxt Editor instances from Unicorn JS.
---

# Editors

Unicorn JS can load two rich text editors: TinyMCE and the Nuxt Editor. The
PHP field types create them on the page. This page covers the JavaScript
side: how to get a running editor, change its content, and customize it.
For the server-side setup, see [TinyMCE Editor](../../form-fields/field-types/tinymce-editor)
and [Nuxt Editor](../../form-fields/field-types/nuxt-editor).

Both editors attach to a `<textarea>`. The textarea holds the value that the
form submits, so the editor and the textarea stay in sync.

## TinyMCE

### Getting the Editor

Call `useTinymce()` with the selector of the textarea. The helper loads
TinyMCE on first use and returns a controller:

```ts
import { useTinymce } from '@windwalker-io/unicorn-next';

const controller = await useTinymce('#content');

controller.setValue('<p>Hello, world.</p>');
console.log(controller.getValue());
```

Calls with the same selector return the same controller.

### Waiting for Initialization

The controller's `editor` property is set after TinyMCE finishes its setup.
Until then, `insert()`, `getValue()`, and `setValue()` have no effect. To run
code once the editor is ready, use the `init_instance_callback` option:

```ts
const controller = await useTinymce('#content', {
  init_instance_callback: (editor) => {
    editor.setContent('<p>Ready.</p>');
  },
});
```

::: warning
Do not call `insert()` or `setValue()` right after `useTinymce()` resolves.
They do nothing until the editor is initialized, and `getValue()` returns an
empty string. Wait for `init_instance_callback` first.
:::

### Inserting and Replacing Content

Use `insert()` to add HTML at the cursor, and `setValue()` to replace all
content:

```ts
controller.insert('<strong>Inserted at the cursor</strong>');
controller.setValue('<p>Replace everything.</p>');

const html = controller.getValue();
```

### Using the TinyMCE API

The `editor` property gives the TinyMCE `Editor` object. Use it for any
TinyMCE method that the controller does not wrap:

```ts
const text = controller.editor?.getContent({ format: 'text' });

controller.editor?.execCommand('mceInsertContent', false, '<hr>');
```

### Customizing Options

Options passed to `useTinymce()` are merged into the options of
`tinymce.init()`:

```ts
const controller = await useTinymce('#content', {
  height: 400,
  menubar: false,
  toolbar: 'bold italic | link image',
});
```

The editor is created only once per selector. If the PHP field has already
created the editor, the options of a later `useTinymce()` call are ignored.

### Global Hooks

`useTinymceHook()` registers a function that receives the global `tinymce`
object before the first editor is created. Use it to add plugins or set
defaults for every editor on the page:

```ts
import { useTinymceHook } from '@windwalker-io/unicorn-next';

useTinymceHook((tinymce) => {
  tinymce.PluginManager.add('my-plugin', (editor) => {
    // Register commands or buttons for the editor.
  });
});
```

::: warning
A hook added after the first editor is created never runs. Register hooks
before any editor is loaded.
:::

### Image Upload Events

When the editor has an image upload URL, TinyMCE uploads pasted or dropped
images through Unicorn. The textarea dispatches these events:

- `upload-start`: an upload begins.
- `upload-success`: an upload succeeds.
- `upload-error`: an upload fails. `event.detail` holds the error.
- `upload-complete`: an upload ends, whether it succeeded or failed.

```ts
const textarea = document.querySelector('#content')!;

textarea.addEventListener('upload-error', (e) => {
  console.error((e as CustomEvent).detail);
});
```

## Nuxt Editor

### Getting the Editor

Call `useNuxtEditor()` with the selector of the textarea. The controller
has the same main methods as the TinyMCE controller:

```ts
import { useNuxtEditor } from '@windwalker-io/unicorn-next';

const controller = await useNuxtEditor('#content');

controller.setValue('<p>Hello, world.</p>');
console.log(controller.getValue());
```

The `editor` property holds the TipTap editor, and it is `null` until the
editor is created. To run code when the editor is ready, listen for the
`nuxt-editor:create` event on the textarea. The event passes the TipTap
editor as `detail`:

```ts
const textarea = document.querySelector('#content')!;

textarea.addEventListener('nuxt-editor:create', (e) => {
  const editor = (e as CustomEvent).detail;

  editor.commands.setContent('<h2>Ready.</h2>');
});

await useNuxtEditor('#content');
```

Add the listener before the editor is created. The event does not fire
again for an editor that already exists.

### Inserting and Replacing Content

`insert()` adds HTML at the cursor, and `setValue()` replaces all content.
`getValue()` returns the content in the editor's format, which is HTML by
default:

```ts
controller.insert('<p>Inserted at the cursor.</p>');
controller.setValue('<p>Replace everything.</p>');

const html = controller.getValue();
```

### Read-Only Mode

Use `setEditable()` to lock or unlock the editor:

```ts
controller.setEditable(false);
controller.setEditable(true);
```

### Using the TipTap API

The `editor` property gives the TipTap editor. Use it for any command that
the controller does not wrap:

```ts
controller.editor?.chain().focus().insertContent('<p>Note</p>').run();

const plain = controller.editor?.getText();
```

### Customizing Toolbars

The `toolbars` option changes the toolbars of one editor. The keys are
`fixed`, `textBubble`, `videoBubble`, `imageBubble`, `slash`, and
`blockMenu`. A value of `false` hides the toolbar. An array replaces its
items. A function receives the default items and returns the new list:

```ts
await useNuxtEditor('#content', {
  toolbars: {
    fixed: false,
    blockMenu: false,
  },
});
```

## Destroying an Editor

Both modules provide `destroy()`. It removes the editor and restores the
textarea. Get the module with no selector, then pass the selector:

```ts
import { useNuxtEditor, useTinymce } from '@windwalker-io/unicorn-next';

const tinymce = await useTinymce();
tinymce.destroy('#content');

const nuxt = await useNuxtEditor();
nuxt.destroy('#content');
```

## Related

- [TinyMCE Editor](../../form-fields/field-types/tinymce-editor)
- [Nuxt Editor](../../form-fields/field-types/nuxt-editor)
- [Unicorn JS](../unicorn-js)
