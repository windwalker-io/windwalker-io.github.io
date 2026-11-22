---
layout: doc
title: Grid
description: Manage list pages with row selection, sorting, filters, and batch actions.
---

# Grid

Admin list pages share a common set of actions. Users select rows, sort by
a column, filter the list, and run an action on one row or on every selected
row. The grid helper wires these actions to a form that contains the table,
so each action sends the same form data with a different task.

Templates can call the grid through Alpine.js, using the `grid` store and
directives such as `@click`. See [UI Helpers](./ui-helpers#alpine-js) for the
Alpine setup, and the [Alpine.js documentation](https://alpinejs.dev) for
directive syntax.

## Enabling the Grid

Use `useGridComponent()` with the form element that wraps the grid. It loads
the form module, creates the grid, and starts Alpine.js so the markup can
call the grid through the `grid` store:

```ts
import { useGridComponent } from '@windwalker-io/unicorn-next';

const grid = await useGridComponent('#admin-form');
```

::: tip
Calling `useGrid()` or `useGridComponent()` again on the same element returns
the same grid instance.
:::

## Complete Example

The following list page has a select-all checkbox, sortable columns, a
filter, a delete button, and a publish button for the selected rows. The
server renders the table, and the script connects the buttons to the grid:

```html
<form id="admin-form" method="post">
  <input name="filter[search]" value="" placeholder="Search">
  <button type="button" @click="$store.grid.sendFilter($event)">
    Search
  </button>

  <table>
    <thead>
      <tr>
        <th>
          <input type="checkbox"
            @change="$store.grid.toggleAll($event.target.checked)">
        </th>
        <th data-field="title" @click="$store.grid.sort($el)">Title</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <input type="checkbox" name="id[0]" value="1"
            data-role="grid-checkbox" data-row-number="0">
        </td>
        <td>Hello world</td>
      </tr>
    </tbody>
  </table>

  <button type="button" id="btn-publish">Publish</button>
  <button type="button" id="btn-delete">Delete</button>
</form>
```

```ts
import {
  selectOne,
  useGridComponent,
} from '@windwalker-io/unicorn-next';

const grid = await useGridComponent('#admin-form');

selectOne('#btn-publish')?.addEventListener('click', () => {
  // Stop when no row is checked, and show a message.
  if (!grid?.hasChecked()) {
    grid?.validateChecked();
    return;
  }

  grid?.updateListByTask('publish', '/admin/article/batch');
});

selectOne('#btn-delete')?.addEventListener('click', () => {
  grid?.deleteList(
    'Delete the selected articles?',
    '/admin/article/delete'
  );
});
```

## Selecting Rows

Each row checkbox needs `data-role="grid-checkbox"`, a `value` with the
item id, and a `data-row-number` for row-based methods. Checkbox changes
dispatch a `unicorn:checked` event on the form, with the grid in `detail`:

```ts
const grid = await useGridComponent('#admin-form');

// Read the selection.
const ids = grid?.getCheckedValues();     // ['1', '4']
const count = grid?.countChecked();       // 2
const any = grid?.hasChecked();           // true

// Select or clear rows.
grid?.toggleAll(false);                   // Clear every row.
grid?.checkRow(0);                        // Check row 0.
grid?.checkRow(0, false);                 // Uncheck row 0.

// React when the selection changes.
document.querySelector('#admin-form')
  ?.addEventListener('unicorn:checked', (e) => {
    const { grid } = (e as CustomEvent).detail;

    console.log(grid.countChecked());
  });
```

`validateChecked()` checks the selection. When nothing is checked, it shows
an alert and stops. When rows are checked, it runs the optional callback:

```ts
grid?.validateChecked(undefined, () => {
  console.log('Ready to run the action.');
}, 'Select at least one article.');
```

To make a button require a selection before it opens a Bootstrap modal, add
`data-must-checked` with a selector that matches the form:

```html
<button data-must-checked="#admin-form"
  data-bs-toggle="modal" data-bs-target="#batch-modal">
  Batch
</button>
```

The modal does not open until at least one row is checked.

A click event cannot stop a Bootstrap modal, so the check runs on `mousedown`.
Call `validateChecked()` with the event. It shows the message and stops the
modal when no row is checked:

```html
<button type="button" @mousedown="$store.grid.validateChecked($event)"
  data-bs-toggle="modal" data-bs-target="#batch-modal">
  Batch
</button>
```

To do the same check in script, call `validateCheckedPromise()` on
`mousedown`. It rejects when no row is checked. In the `catch` block, call
`preventBSModal()` with the trigger element, and pass `true` to show the
default message:

```ts
const grid = await useGridComponent('#admin-form');
const button = document.querySelector<HTMLElement>('#batch-btn');

button?.addEventListener('mousedown', async () => {
  try {
    await grid?.validateCheckedPromise();
  } catch (error) {
    // Stop the modal named by data-bs-target.
    grid?.preventBSModal(button!, true);
  }
});
```

`preventBSModal()` accepts a modal selector or the trigger element. Its
listener stops the next `show.bs.modal` event while no row is checked, then
removes itself after the first event.

## Sorting

Mark a sortable column with `data-field`. Clicking it toggles between
`ASC` and `DESC` for that field. The grid writes the new ordering into a
hidden `list_ordering` input and sends the form:

```html
<th data-field="created" @click="$store.grid.sort($el)">Created</th>
```

The current ordering comes from the grid element's `data-ordering`
attribute. `ASC` is added when the value has no direction:

```html
<form id="admin-form" data-ordering="a.created DESC">
```

```ts
const grid = await useGridComponent('#admin-form');

// Sort by a field directly.
grid?.sortBy('title ASC');

// Check the state of a column header.
const header = document.querySelector<HTMLElement>('[data-field=title]');

if (header && grid?.isSortActive(header)) {
  console.log(grid.getDirection(header)); // "ASC" or "DESC"
}
```

## Filters

`sendFilter()` submits the form with the current filter values. Pass the
click event to stop the default form submit. `clearFilters()` empties the
inputs inside an element and submits the form again:

```ts
const grid = await useGridComponent('#admin-form');

const filterBox = document.querySelector<HTMLElement>('#filter-box');

if (filterBox) {
  grid?.clearFilters(filterBox);
}

// Show or hide the filter panel with a slide animation.
await grid?.toggleFilters(true, filterBox!);
```

## Single-Row Actions

Row methods take the row number from `data-row-number`. Each method sends
the form with the item id in `id[]`:

```ts
const grid = await useGridComponent('#admin-form');

// Send a task for one row, with a custom URL.
grid?.updateRowByTask('publish', 0, '/admin/article/item');

// Update one row without a task.
grid?.updateRow(0, '/admin/article/item', { title: 'New' });

// Copy one row.
grid?.copyRow(0, '/admin/article/copy');

// Delete one row. It asks for confirmation first.
await grid?.deleteRow(0, 'Delete this article?', '/admin/article/delete');

// Move a row up or down by one position.
grid?.moveUp('42', '/admin/article/reorder');
grid?.moveDown('42', '/admin/article/reorder');
```

::: info
Single-item actions disable every row checkbox before they send the
request. The page enables them again after it reloads.
:::

## Copy, Delete, Move, and Reorder

These methods act on one item by id, or on the whole list:

```ts
const grid = await useGridComponent('#admin-form');

// Copy one item. The form posts with the id injected.
grid?.copyItem('42', '/admin/article/copy');

// Ask before deleting, then send the delete request.
const deleted = await grid?.deleteItem(
  '42',
  'Delete this article?',
  '/admin/article/delete'
);

// Move one item by a delta. Use -1 to move up, 1 to move down.
grid?.moveItem('42', 1, '/admin/article/move');

// Send the form with the reorder task.
grid?.reorderAll('/admin/article/reorder');
```

`deleteItem()` resolves to `true` when the user confirms, and `false`
otherwise. It sends the id as `id` in the request data.

::: warning
`deleteItem()` always asks for confirmation. Passing `false` as the message
does not skip the prompt, because the default message replaces it. Use
`deleteList()` for a delete without confirmation.
:::

## Batch Actions

A batch action sends the grid's form to the server with a task name, the
checked item ids, and optional values. The grid sends the checked rows as
`id[n]`, the task as `task`, and the new values as `batch`.

### Server Handling

The server's grid controller reads these inputs. A task named `publish`
calls a `batchPublish()` method when the controller defines one. Otherwise
the request goes to `batchUpdate()`, which applies the `batch` values to the
checked items:

```php
use Unicorn\Controller\GridController;

class ArticleController extends GridController
{
    public function batchFeatured(
        AppContext $app,
        ArticleRepository $repository,
        mixed $ids = null,
    ): mixed {
        // Handle the "featured" task for the checked ids.
    }
}
```

To handle several tasks in one method, override `batch()` and choose the
data for each task. Pass the data to `GridController::batch()` with
`$app->call()`:

```php
use Unicorn\Controller\GridController;
use Windwalker\DI\Attributes\Autowire;

class ArticleController extends GridController
{
    public function batch(
        AppContext $app,
        #[Autowire] ArticleRepository $repository,
        GridController $controller
    ): mixed {
        $data = match ($app->input('task')) {
            'publish' => ['state' => 1],
            'unpublish' => ['state' => 0],
            'featured' => ['featured' => 1],
            'unfeatured' => ['featured' => 0],
            default => null
        };

        return $app->call(
            [$controller, 'batch'],
            compact('repository', 'data')
        );
    }
}
```

The client sends the task name, so the same grid buttons work for every
task above. Only the mapping lives on the server.

### Updating Values Directly

Use `form.patch()` with a `batch` object to set values on every checked
row. Pass `null` as the URL to send the request to the current controller:

```ts
const grid = await useGridComponent('#admin-form');

// Set state = 1 on every checked row.
grid?.form.patch(null, { batch: { state: '1' } });

// Set state = 1 on one row.
grid?.updateItem('42', null, { batch: { state: '1' } });
```

### Running a Task

`updateListByTask()` runs a task on every checked row. `updateItemByTask()`
runs it on one id:

```ts
grid?.updateListByTask('publish');

grid?.updateItemByTask('unfeatured', '42');
```

::: info
`batch()` and `updateByTask()` are deprecated. Use `updateListByTask()`
instead, and `updateItemByTask()` for one item.
:::

### Checking the Selection

`validateChecked()` runs the callback only when at least one row is checked.
Pass the click event as the first argument, so the event stops when no row
is selected:

```html
<button type="button"
  @click="$store.grid.validateChecked($event, () => {
    $store.grid.updateListByTask('featured');
  })">
  Featured
</button>
```

Pass `null` as the first argument to skip the event handling:

```html
<button type="button"
  @click="$store.grid.validateChecked(null, () => {
    $store.grid.updateListByTask('featured');
  })">
  Featured
</button>
```

### Confirming Before a Batch

Register `simpleConfirm()` as a macro, then call it from the template. The
callback runs only when the user confirms:

```ts
import { simpleConfirm, useMacro } from '@windwalker-io/unicorn-next';

useMacro({ confirm: simpleConfirm });
```

```html
<button type="button"
  @click="u.confirm('Publish the selected items?').then((ok) => {
    if (ok) {
      $store.grid.updateListByTask('publish');
    }
  })">
  Publish
</button>
```

See [Macros](../basics/macros) for how macros are exposed to templates.

### Without a Grid

A page without a list has no grid. Use the form directly, and pass the
task and values in the same request:

```ts
import { useForm } from '@windwalker-io/unicorn-next';

const form = useForm('#admin-form');

form?.patch(null, { task: 'publish', batch: { state: '1' } });
```

### Sending to Another Route

The default URL is the current controller. Pass a URL to send the batch
to another controller or method. The receiving method must accept `id` as a
number, a numeric string, or an array:

```ts
grid?.updateListByTask(
  'publish',
  '/admin/article/publish',
  { foo: 'bar' }
);
```

```php
public function publish(AppContext $app): mixed
{
    $ids = (array) $app->input('id');

    foreach ($ids as $id) {
        // Update one item.
    }
}
```

## Messages and Translations

The default messages come from translation keys. Copy the keys with
`translate()` on the server, as described in
[Translation](../utilities/translation):

- `unicorn.message.grid.checked`: shown when no row is checked.
- `unicorn.message.delete.confirm`: asked before deleting checked items.

```php
$unicornScript->translate('unicorn.message.*');
```

::: warning
`deleteList()` and `deleteRow()` ask for confirmation when the message is
not `false`. Passing `false` as the message deletes the checked items without
asking.
:::

## Alpine Store

`initComponent()` registers the grid in Alpine.js as the `grid` store. The
store contains the form state, and every grid method is available on it. To
use another name, pass it as the first argument:

```ts
const grid = await useGridComponent('#admin-form');

// Use a second store name for a second list on the page.
await grid?.initComponent('comments', { page: 1 });
```

```html
<span x-text="$store.grid.countChecked()"></span>
```

## Related

- [Form](./form)
- [Checkbox MultiSelect](./checkbox-multiselect)
- [Data Transfer](../basics/data-transfer)
