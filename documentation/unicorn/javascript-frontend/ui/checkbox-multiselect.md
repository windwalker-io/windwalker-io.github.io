---
layout: doc
title: Checkbox MultiSelect
description: Shift-click range selection for checkbox lists in Windwalker Unicorn JS.
---

# Checkbox MultiSelect

Lists of checkboxes, such as the rows of an admin table, often need
range selection. The user checks one row, then holds Shift and clicks
another row. Every row between the two is selected as well.

`useCheckboxesMultiSelect()` adds this behavior to any container of
checkboxes. It only attaches click handlers, so the markup and the form
submission stay unchanged.

## Enabling the Module

Import the function and pass a CSS selector for the container.

```ts
import { useCheckboxesMultiSelect } from '@windwalker-io/unicorn-next';

useCheckboxesMultiSelect('#article-list');
```

The function loads the module, then binds every matching container. The
binding happens after the module loads, so the call returns a Promise.

::: tip
Call the function after the rows are in the DOM. The module reads the
checkboxes once, when it binds the container. Rows added later are not
tracked.
:::

## Complete Example

The page contains a form with a table. Each row has a checkbox with the
`grid-checkbox` role, which is the default selector of the module.

```html
<form id="article-form" method="post">
  <table class="table">
    <thead>
      <tr>
        <th></th>
        <th>Title</th>
      </tr>
    </thead>
    <tbody id="article-list">
      <tr>
        <td>
          <input type="checkbox" name="ids[]" value="1"
            data-role="grid-checkbox" />
        </td>
        <td>Getting Started</td>
      </tr>
      <tr>
        <td>
          <input type="checkbox" name="ids[]" value="2"
            data-role="grid-checkbox" />
        </td>
        <td>Routing Basics</td>
      </tr>
      <tr>
        <td>
          <input type="checkbox" name="ids[]" value="3"
            data-role="grid-checkbox" />
        </td>
        <td>Database Setup</td>
      </tr>
    </tbody>
  </table>

  <button type="submit">Submit</button>
</form>
```

The script enables range selection and reads the checked IDs on submit.

```ts
import { useCheckboxesMultiSelect } from '@windwalker-io/unicorn-next';

useCheckboxesMultiSelect('#article-list');

const form = document.querySelector<HTMLFormElement>('#article-form')!;

form.addEventListener('submit', (e: SubmitEvent) => {
  e.preventDefault();

  const ids = new FormData(form).getAll('ids[]');

  console.log(ids); // e.g. ['1', '2', '3']
});
```

To try it, click the checkbox of row 1. Then Shift+click the checkbox
of row 3. Rows 1 to 3 are checked.

## Shift-Click Range Selection

The first click in a container sets the anchor. The anchor is the
previously clicked checkbox. A Shift+click then applies the anchor's
checked state to every checkbox from the anchor to the clicked one,
inclusive.

```ts
// Rows 1 to 5 in the container, all unchecked.

// 1. Click row 2.
//    Row 2 is checked and becomes the anchor.

// 2. Shift+click row 5.
//    Rows 2 to 5 take the checked state of row 2 (checked).

// 3. Shift+click row 3, which is checked and gets unchecked.
//    Rows 3 to 5 take the checked state of row 5 (checked).
```

The range takes the checked state of the anchor, not of the clicked
checkbox. To clear a range, first clear the anchor row, then Shift+click
the end of the range.

::: info
The anchor is tracked per container. Clicks in another container do not
change it.
:::

## Custom Checkbox Selector

The default selector is `input[type=checkbox][data-role=grid-checkbox]`.
Pass `inputSelector` to match other checkboxes inside the container.

```ts
import { useCheckboxesMultiSelect } from '@windwalker-io/unicorn-next';

useCheckboxesMultiSelect('#file-list', {
  inputSelector: 'input[type=checkbox].row-check',
});
```

## Multiple Containers

A selector can match several containers. Each container gets its own
instance and its own anchor.

```ts
import { useCheckboxesMultiSelect } from '@windwalker-io/unicorn-next';

useCheckboxesMultiSelect('.checkbox-table');
```

If the selector matches no container, nothing is bound and no error is
thrown.

## Accessing the Instances

Calling the function without a selector loads the module and returns it.
Use the module to bind containers and to read the instances.

```ts
import { useCheckboxesMultiSelect } from '@windwalker-io/unicorn-next';

const m = await useCheckboxesMultiSelect();

const [multi] = m.CheckboxesMultiSelect.handle('#article-list', {
  inputSelector: 'input[type=checkbox].row-check',
});

multi.$element; // The container element
multi.boxes;    // The checkboxes found when the instance was created
multi.last;     // The anchor checkbox, or false before the first click
```

::: warning
Calling `handle()` again on the same container adds a second set of
click listeners. Bind each container once.
:::

## Scope

The module handles row clicks only. It does not toggle all checkboxes.
Windwalker's generated list pages call this function with the admin form
selector. The select-all checkbox is handled by the grid component.
