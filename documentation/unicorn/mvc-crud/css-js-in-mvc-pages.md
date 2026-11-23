---
layout: doc
title: CSS & JS in MVC Pages
description: How module assets, TypeScript entries, and SCSS partials reach Unicorn MVC pages, and what the generator writes for you.
---

# CSS & JS in MVC Pages

Each MVC module keeps its own TypeScript and SCSS in an `assets` folder, next to its controllers and views. A page-specific script or style stays with the page it belongs to, so you can change one page without touching a shared bundle. Unicorn's hooks handle the common admin behavior, such as grids, forms, and tooltips, so a generated page works before you write any script.

## How Assets Reach the Page

A module's assets pass through three stages: the module declares them, the build collects them, and the browser loads them.

```text
src/Module/Admin/Product/
    ProductListView.php      declares js: 'product-list.ts'
    assets/
        product-list.ts      TypeScript entry for the list page
        _product-list.scss   SCSS partial for the list page
```

The stage build collects the module assets. The host app's `fusionfile.ts` calls `jsModulizeDeep()` and `cssModulizeDeep()` once for each stage:

```ts
// fusionfile.ts
jsModulizeDeep(
  'Admin',
  'resources/assets/src/admin/main.ts',
  'js/admin/main.js'
),
cssModulizeDeep(
  'Admin',
  'resources/assets/scss/admin/main.scss',
  'css/admin/main.css'
),
```

For a JavaScript entry, each `Admin/**/assets/*.ts` file becomes its own Vite entry. Each entry is keyed by a hash of its module path, so the view can import it by name. SCSS files in `assets/` are merged into the stage stylesheet, so the SCSS partial needs no declaration.

When a view renders, Windwalker reads the `js` entries from its `#[ViewModel]` attribute and imports them. The view's folder is the base for every path.

## Declaring Assets in a View

Declare the TypeScript entry with the `js` option. A string applies to every layout, and an array lists several files:

```php
use Windwalker\Core\Attributes\ViewModel;

#[ViewModel(
    layout: [
        'default' => 'product-list',
        'modal' => 'product-modal',
    ],
    js: 'product-list.ts',
)]
class ProductListView
{
}
```

Use layout names as keys for `css` and `js` when a file belongs to one layout only:

```php
#[ViewModel(
    layout: [
        'default' => 'product-list',
        'modal' => 'product-modal',
    ],
    css: [
        'modal' => 'product-modal.scss',
    ],
)]
```

::: info
Windwalker loads a file only when it is listed in `js`. A file with the same name as the view is not loaded automatically. Vite mode also removes the extension from `js` entries.
:::

::: warning
Plain asset mode, which is used without Vite, writes the `.ts` path as a script tag. Browsers cannot run TypeScript source, so the page fails. Use Vite mode for any page that loads TypeScript.
:::

## Writing a TypeScript Entry

A TypeScript entry runs when the browser loads the page, so call the hooks at the top level. Import them from `@windwalker-io/unicorn-next`, and select elements with the same form selector that the blade template uses.

The example below adds a confirmation to the delete button of an edit page. It uses the `useFormComponent()` hook for the form, and plain DOM code for the page-specific behavior:

```ts
import {
  useBs5Tooltip,
  useFormComponent,
} from '@windwalker-io/unicorn-next';

const formSelector = '#admin-form';

useBs5Tooltip();
useFormComponent(formSelector);

// Ask for confirmation before a delete button runs.
const buttons = document.querySelectorAll<HTMLButtonElement>(
  '[data-confirm]'
);

for (const button of buttons) {
  button.addEventListener('click', (event) => {
    const message = button.dataset.confirm ?? 'Are you sure?';

    if (!window.confirm(message)) {
      event.preventDefault();
    }
  });
}
```

The blade template marks the button with the `data-confirm` attribute:

```blade
<button type="button" class="btn btn-danger"
    data-confirm="Delete this product?">
    Delete
</button>
```

After you add or change a TypeScript file, rebuild the frontend assets. The build collects the file only when it is inside a stage's `assets` folder.

## Hooks in the Generated Scripts

The generator writes a TypeScript entry for the grid page and the edit page. Each hook covers one part of the page.

### Grid Page

`ProductListView` uses `product-list.ts`:

```ts
import {
  useBs5Tooltip,
  useCheckboxesMultiSelect,
  useDisableOnSubmit,
  useGridComponent,
} from '@windwalker-io/unicorn-next';

const formSelector = '#admin-form';

useBs5Tooltip();

useGridComponent(formSelector);

useDisableOnSubmit(formSelector);

useCheckboxesMultiSelect(formSelector);
```

- `useBs5Tooltip()`: starts Bootstrap 5 tooltips on elements with `data-bs-toggle="tooltip"`.
- `useGridComponent()`: starts the grid on the form. The grid handles sorting, batch actions, and the filter panel.
- `useDisableOnSubmit()`: disables the buttons and shows a spinner while the form submits. The grid's `data-dos` button is one of the targets.
- `useCheckboxesMultiSelect()`: handles row selection for the `input[data-role=grid-checkbox]` checkboxes inside the form.

### Edit Page

`ProductEditView` uses `product-edit.ts`:

```ts
import {
  useBs5Tooltip,
  useDisableIfStackNotEmpty,
  useDisableOnSubmit,
  useFormComponent,
  useFormValidation,
  useKeepAlive,
} from '@windwalker-io/unicorn-next';

const formSelector = '#admin-form';

useBs5Tooltip();

useFormComponent(formSelector);

useFormValidation().then(() => useDisableOnSubmit(formSelector));

useDisableIfStackNotEmpty();

useKeepAlive(location.href);
```

- `useFormComponent()`: starts the form component on `#admin-form`.
- `useFormValidation()`: loads the validation module. The generated code calls `useDisableOnSubmit()` only after it loads.
- `useDisableIfStackNotEmpty()`: disables the `[data-task=save]` buttons while an upload is running. TinyMCE uses the same `uploading` stack.
- `useKeepAlive()`: requests the current URL every 60 seconds, which keeps the session alive while the user edits. It returns a function that stops the timer.

::: warning
The default button selector of `useDisableOnSubmit()` includes `#admin-toolbar`. The generated views do not set that id. It belongs to the admin layout, which renders the `toolbar-buttons` section. The exact markup depends on your team's admin template. If your layout does not provide `#admin-toolbar`, pass a selector that matches your buttons, or add the `data-dos` attribute to them.
:::

### Simple MVC Pages

The `list` and `item` views from `unicorn:mvc-simple` generate `product-list.ts` and `product-item.ts`, but both files are empty. Add the hooks and code that the page needs.

## Styles in the Module

The generator writes a SCSS partial for each grid and edit page. The root selector is the view's body class, so every style stays inside its page:

```scss
// _product-list.scss
.view-product-list {
    //
}
```

Windwalker adds the `view-*` class to the body, using the view name without the `View` suffix. Keep the page styles under this root selector so they do not affect other pages.

## Blocking Save During Uploads

Saving while a file is still uploading can store a record that points to a
missing file. Unicorn prevents this with a named stack. Each upload pushes an
item onto the stack when it starts and pops it when it finishes. The generated
edit script calls `useDisableIfStackNotEmpty()`, which disables every
`[data-task=save]` button while the `uploading` stack holds an item.

The built-in fields use the stack as follows:

- `TinymceEditorField`: pushes to `uploading` by default.
- `NuxtEditorField`: pushes to `uploading` by default.
- `MultiUploaderField`: has no default stack name, so set it explicitly.

```php
$form->add('content', TinymceEditorField::class);

$form->add('images', MultiUploaderField::class)
    ->stackName('uploading');
```

::: warning
Without `stackName()`, `MultiUploaderField` pushes onto the `default` stack.
The save buttons do not wait for those uploads. Set the same name that the
save script watches.
:::

To block saving for your own uploader, push to the same stack and pop in a
`finally` block, so the pop runs after a failed request too:

```ts
import { useStack } from '@windwalker-io/unicorn-next';

const stack = useStack('uploading');

async function upload(file: File) {
  stack.push(file.name);

  try {
    return await sendFile(file);
  } finally {
    stack.pop();
  }
}
```

::: warning
Every `push()` needs a matching `pop()`. A missed pop keeps the save buttons
disabled until the page reloads.
:::

To react to changes in the stack, register an observer. It receives the stack
and its current length after every push and pop. The example below warns the
user before they leave the page while an upload runs:

```ts
import { useStack } from '@windwalker-io/unicorn-next';

const stack = useStack('uploading');

function onBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
}

stack.observe((_stack, length) => {
  if (length > 0) {
    window.addEventListener('beforeunload', onBeforeUnload);
  } else {
    window.removeEventListener('beforeunload', onBeforeUnload);
  }
});
```

For the full stack API, see [SimpleStack](/documentation/unicorn/javascript-frontend/ui/simple-stack).

## Related

- [MVC Concepts](./mvc-concepts)
- [Views](/documentation/framework/core-concepts/views/views)
- [Asset Management](/documentation/framework/core-concepts/views/asset-management)
- [Grid](/documentation/unicorn/javascript-frontend/ui/grid)
- [Form](/documentation/unicorn/javascript-frontend/ui/form)
- [Checkbox MultiSelect](/documentation/unicorn/javascript-frontend/ui/checkbox-multiselect)
