---
layout: doc
title: InlineField
description: InlineField field page for Windwalker Unicorn.
---

# InlineField

Some fields belong together, such as width, height, and unit, or a start and
an end value. Stacking them one per row takes space and separates related
inputs. `InlineField` lays out its sub-fields in one row. Below a breakpoint,
the sub-fields stack vertically.

## Enabling the Field

Add the field to the form, then define the sub-fields with `configureForm()`.
The callback receives a sub-form, and each field you add there becomes one
column.

```php
use Unicorn\Field\InlineField;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form->add('size', InlineField::class)
    ->label('Size')
    ->configureForm(function (Form $form) {
        $form->add('width', NumberField::class)
            ->label('Width');

        $form->add('height', NumberField::class)
            ->label('Height');

        $form->add('unit', TextField::class)
            ->label('Unit');
    });
```

## Complete Example

The form below groups three dimensions of a product. The sub-fields share a
row from the medium breakpoint up.

```php
use Unicorn\Field\InlineField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('product')]
public function main(Form $form): void
{
    $form->add('dimensions', InlineField::class)
        ->label('Dimensions')
        ->asGroup(true)
        ->widths(4, 4, 4)
        ->gap(2)
        ->rwdBreakpoint('md')
        ->showLabel(true)
        ->configureForm(function (Form $form) {
            $form->add('width', NumberField::class)
                ->label('Width')
                ->required(true);

            $form->add('height', NumberField::class)
                ->label('Height');

            $form->add('depth', NumberField::class)
                ->label('Depth');
        });
}
```

The values are saved under the group: `product/dimensions/width`,
`product/dimensions/height`, and `product/dimensions/depth`.

## Grouped and Ungrouped Values

The inline field stores no value of its own. Its sub-fields store the values,
and `asGroup()` decides where they go.

Without a group, each sub-field keeps its own name in the form data:

```php
use Unicorn\Field\InlineField;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Form;

$form->add('size', InlineField::class)
    ->configureForm(function (Form $form) {
        $form->add('width', NumberField::class);
    });

// Saved as: ['width' => '300']
```

With `asGroup(true)`, the sub-fields are saved under the field name. Pass a
string to choose another name:

```php
use Unicorn\Field\InlineField;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Form;

$form->add('size', InlineField::class)
    ->asGroup(true)
    ->configureForm(function (Form $form) {
        $form->add('width', NumberField::class);
    });

// Saved as: ['size' => ['width' => '300']]
```

::: tip
Use `asGroup()` when a sub-field name may match another field in the same
form.
:::

## Layout

`widths()` sets the column span of each sub-field. Integers are spans of a
12-column grid, so `widths(4, 4, 4)` gives three equal columns. A sub-field
without a width takes an equal share of the 12 columns.

`gap()` sets the space between columns. An integer adds a `gap-N` class, and a
string sets the CSS `gap` value. `gap(false)` removes the space.

```php
use Unicorn\Field\InlineField;
use Windwalker\Form\Form;

$form->add('range', InlineField::class)
    ->widths(6, 6)
    ->gap(3)
    ->configureForm(function (Form $form) {
        // ...
    });

$form->add('area', InlineField::class)
    ->gap('1rem')
    ->configureForm(function (Form $form) {
        // ...
    });
```

`rwdBreakpoint()` sets the breakpoint where the row starts. Use `sm`, `md`,
`lg`, `xl`, or `xxl`. The default is `lg`.

```php
use Unicorn\Field\InlineField;
use Windwalker\Form\Form;

$form->add('range', InlineField::class)
    ->rwdBreakpoint('md')
    ->configureForm(function (Form $form) {
        // ...
    });
```

`showLabel(true)` shows the labels of the sub-fields. Labels are hidden by
default, and they remain in the page for screen readers.

## Readonly and Disabled State

`readonly()` and `disabled()` on the inline field apply to every sub-field.
A sub-field keeps its own state when the inline field is not readonly.

```php
use Unicorn\Field\InlineField;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

// Both sub-fields are readonly.
$form->add('size', InlineField::class)
    ->readonly(true)
    ->configureForm(function (Form $form) {
        $form->add('width', NumberField::class);
        $form->add('height', NumberField::class);
    });

// Only the unit is readonly.
$form->add('spacing', InlineField::class)
    ->configureForm(function (Form $form) {
        $form->add('unit', TextField::class)
            ->readonly(true);
    });
```

## Validation and Filters

The inline field validates and filters through its sub-fields. Add rules to
each sub-field, not to the inline field.

```php
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Form;

$form->add('size', InlineField::class)
    ->configureForm(function (Form $form) {
        $form->add('width', NumberField::class)
            ->required(true);
    });
```

## Options Reference

`InlineField` provides the following methods for the sub-fields and layout.

| Method | Description | Default |
| --- | --- | --- |
| `widths()` | Sets the width of each sub-field. | `[]` |
| `getWidths()` | Returns the sub-field widths. | — |
| `gap()` | Sets the column gap between sub-fields. | `3` |
| `getGap()` | Returns the column gap. | — |
| `asGroup()` | Saves sub-field values under a group key. `true` uses the field name. | — |
| `getGroup()` | Returns the group key, or `null` when not grouped. | — |
| `showLabel()` | Shows or hides the labels of the sub-fields. | — |
| `getShowLabel()` | Returns whether sub-field labels are shown. | — |
| `rwdBreakpoint()` | Sets the breakpoint where sub-fields wrap to new lines. | `'lg'` |

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

## Related

- [Field Generation](../field-generation)
- [Cascade Select](./cascade-select)
- [Form Utilities](/documentation/unicorn/form-fields/form-utilities)
