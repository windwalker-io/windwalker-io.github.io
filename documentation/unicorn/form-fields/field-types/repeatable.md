---
layout: doc
title: Repeatable
description: Repeatable field page for Windwalker Unicorn.
---

# Repeatable

Many records have a variable number of rows, such as order items, contact
persons, or key-value settings. A fixed set of inputs cannot hold them.
`RepeatableField` renders a group of sub-fields for each row, with buttons
to add and remove rows. The rows are submitted as an array, so the server
receives one entry per row.

## Enabling the Field

Add `RepeatableField` to a form, then define the sub-fields for each row
with `configureForm()`. The handler receives the sub-form, and each
sub-field becomes an input in every row.

```php
use Unicorn\Field\RepeatableField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form->add('phones', RepeatableField::class)
    ->label('Phones')
    ->configureForm(function (Form $form) {
        $form->add('number', TextField::class)
            ->label('Number');
    });
```

The sub-fields are submitted as `phones[0][number]`, `phones[1][number]`,
and so on. The index follows the row order on the page.

## Complete Example

The following form lists the items of an order. Each row has a product
and a quantity. The controller reads the rows back as an array:

```php
use Unicorn\Field\RepeatableField;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form->add('items', RepeatableField::class)
    ->label('Order items')
    ->placeholder('Items')
    ->sortable(true)
    ->max(10)
    ->configureForm(function (Form $form) {
        $form->add('product', TextField::class)
            ->label('Product')
            ->required(true);

        $form->add('quantity', NumberField::class)
            ->label('Quantity')
            ->defaultValue(1);
    })
    ->colWidths('70%', '30%');
```

```php
// In the controller: skip rows that were left empty.
$items = $app->input('items') ?? [];

foreach ($items as $item) {
    if (($item['product'] ?? '') === '') {
        continue;
    }

    // $item['product'] and $item['quantity'] are submitted values.
}
```

`defaultValue()` on a sub-field sets the value of every new row. The
`colWidths()` call sets the width of each column, as described in
[Column Widths](#column-widths).

## Loading Saved Values

The field accepts the saved rows in three forms:

- An array of rows, each row an array keyed by sub-field name.
- A JSON string that decodes to that array.
- A comma-separated string, in single-array mode only.

```php
// An array of rows, as stored by an entity or a previous request.
$form->fill([
    'items' => [
        ['product' => 'Keyboard', 'quantity' => 2],
        ['product' => 'Mouse', 'quantity' => 1],
    ],
]);
```

::: tip
A JSON string works as well. The field decodes it, so you can pass the
stored column value directly.
:::

## Layouts

The default layout is a table with one column per sub-field. Its header
shows the label of each sub-field. Switch layouts with the helper methods
shown below. Each one is a shortcut for `layout()` with a `LAYOUT_*`
constant.

```php
// Default: a table with one column per sub-field.
$form->add('phones', RepeatableField::class)
    ->useTableLayout();

// Sub-fields stacked in a row. Use a flex layout for compact forms.
$form->add('phones', RepeatableField::class)
    ->useFlexLayout();

// A CSS grid. Set the breakpoint and the gap between the columns.
$form->add('phones', RepeatableField::class)
    ->useGridLayout()
    ->rwdBreakpoint('md')
    ->gap(2);
```

The flex and grid layouts show `placeholder()` as the header of the row
column. The table layout uses the sub-field labels instead.

### Column Widths

`colWidths()` and `colClasses()` set the width of each sub-field, by
position. Pass one value for each sub-field, in order:

```php
// A string is used as the CSS width of the column.
->colWidths('70%', '30%')

// Explicit CSS classes for each column.
->colClasses('col-md-8', 'col-md-4')
```

Numeric widths mean different things per layout. In the flex layout, a
number becomes a `col-lg-N` class. In the grid layout, it becomes a column
span of a 12-column grid. For the table layout, use string widths or
`colClasses()`.

### Grid Options

The grid layout applies its columns from the `rwdBreakpoint()` value and
up. Below that breakpoint, the sub-fields stack. The default breakpoint
is `xl`. The accepted values are `sm`, `md`, `lg`, `xl`, and `xxl`.

`gap()` sets the space between the columns. A number uses the Bootstrap
`gap-N` class. A string is used as the CSS `gap` value:

```php
->useGridLayout()
->gap('0.5rem')
```

## Rows and Controls

`sortable()` adds a drag handle to each row. The order of the rows after
dragging is the order that the server receives:

```php
->sortable(true)
```

`max()` limits how many rows the user can add. The default `0` means no
limit. `showControls(false)` removes the add and remove buttons, so the
rows are fixed:

```php
->max(5)
->showControls(false)
```

`ensureFirstRow(true)` adds an empty row when the list is empty. Use it
for a required list, so that the user always sees at least one row.

::: warning
`max()` is enforced only in the browser. The server accepts any number of
rows, so validate the count in your controller or form validator.
:::

::: info
An empty row is submitted with empty values. Skip such rows in the
controller when `ensureFirstRow()` is enabled.
:::

## Single-Array Mode

Set `singleArray(true)` to store a flat list of values instead of rows.
The sub-form must contain a `value` field. It may also contain a `key`
field, and no other field.

```php
// Submitted as tags[]: a list of strings.
$form->add('tags', RepeatableField::class)
    ->singleArray(true)
    ->configureForm(function (Form $form) {
        $form->add('value', TextField::class)
            ->label('Tag');
    });
```

With a `key` field, the key becomes the index of the submitted array:

```php
// Submitted as headers[Content-Type]: a map of key and value.
$form->add('headers', RepeatableField::class)
    ->singleArray(true)
    ->configureForm(function (Form $form) {
        $form->add('key', TextField::class)
            ->label('Name');

        $form->add('value', TextField::class)
            ->label('Value');
    });
```

The `key` field is not submitted by its own name. The browser sends it as
the index of the `value` input.

Single-array mode without a `value` field fails when the field renders:

```php
$form->add('tags', RepeatableField::class)
    ->singleArray(true)
    ->configureForm(function (Form $form) {
        $form->add('label', TextField::class);
    });
// ERROR: UnexpectedValueException: Repeatable field in singleArray
// mode must have a `value` field.
```

::: warning
In key mode, two rows with the same key overwrite each other. The last row
wins, and no error is shown. Validate the keys before saving.
:::

## Disabled and Readonly State

`disabled()` and `readonly()` on the repeatable field apply to every
sub-field, and hide the add and remove buttons. A sub-field that is
disabled or readonly on its own keeps that state.

```php
$form->add('phones', RepeatableField::class)
    ->readonly(true);
```

## Empty Lists

When the list has no rows, the browser submits the
`__EMPTY_ARRAY__` marker. Unicorn converts it to an empty array when it
reads the request, so the controller receives `[]`. See
[Empty Array Utilities](/documentation/unicorn/form-fields/form-utilities#empty-array-utilities).

## Options Reference

The table lists the methods specific to the repeatable field.

| Method | Description | Default |
|--------|-------------|---------|
| `useTableLayout()` | Use the table layout. | Table layout |
| `useFlexLayout()` | Use the flex layout. | — |
| `useGridLayout()` | Use the grid layout. | — |
| `layout()` | Set a custom layout path. | `null` |
| `getLayout()` | Return the layout path in use. | Table layout |
| `colWidths()` | Set the column widths. | `[]` |
| `colClasses()` | Set the CSS classes for each column. | `[]` |
| `sortable()` | Enable or disable row sorting. | `false` |
| `isSortable()` | Return whether row sorting is enabled. | `false` |
| `ensureFirstRow()` | Keep at least one row in the list. | `false` |
| `isEnsureFirstRow()` | Return whether one row is always kept. | `false` |
| `showControls()` | Show or hide the add and remove buttons. | `true` |
| `isShowControls()` | Return whether the controls are shown. | `true` |
| `singleArray()` | Store values as a flat array instead of rows. | `false` |
| `isSingleArray()` | Return whether single-array mode is enabled. | `false` |
| `placeholder()` | Set the placeholder text. | `''` |
| `getPlaceholder()` | Return the placeholder text. | `''` |
| `max()` | Set the maximum number of rows. | `0` |
| `getMax()` | Return the maximum number of rows. | `0` |
| `gap()` | Set the gap between items. | `3` |
| `rwdBreakpoint()` | Set the responsive breakpoint. | `'xl'` |
| `getSubForm()` | Return the sub-form that defines the row fields. | Empty `Form` |
| `configureForm()` | Configure the sub-form with a callback. | — |

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

## Related

- [Form Utilities](/documentation/unicorn/form-fields/form-utilities)
- [Modal Field](./modal-field)
- [Unicorn Form Fields](/documentation/unicorn/form-fields/field-generation)
