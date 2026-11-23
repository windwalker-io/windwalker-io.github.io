---
layout: doc
title: LayoutField
description: LayoutField field page for Windwalker Unicorn.
---

# LayoutField

Some controls do not fit a single input. A rating widget, a color swatch,
or a summary card built from other data needs its own markup.
`LayoutField` renders a field with a template that you write. The field
keeps the label and the wrapper that the other fields use.

## Enabling the Field

Add `LayoutField`, and name the template with `layout()`. The name is a
renderer template, written with dots. See
[Form Fields Layout](/documentation/unicorn/form-fields/form-utilities#form-fields-layout)
for how template names are resolved.

```php
use Unicorn\Field\LayoutField;

$form->add('summary', LayoutField::class)
    ->label('Summary')
    ->layout('fields.order-summary');
```

The base class has no default template. Without `layout()` or a subclass,
rendering the field fails:

```php
$form->add('summary', LayoutField::class)
    ->label('Summary');
// ERROR: LogicException: Please provide a layout path
```

## Complete Example

The following field stores a rating from 1 to 5. A subclass sets the
default template, so every use of the field renders the same stars:

```php
namespace App\Field;

use Unicorn\Field\LayoutField;

class RatingField extends LayoutField
{
    public function getDefaultLayout(): string
    {
        return 'fields.rating';
    }
}
```

```php
use App\Field\RatingField;

$form->add('rating', RatingField::class)
    ->label('Rating')
    ->defaultValue(3);
```

The template writes the radio inputs itself, using the field's input
name and value:

```blade
{{-- fields/rating.blade.php --}}
<div class="d-flex gap-2">
    @foreach ([1, 2, 3, 4, 5] as $star)
        <label>
            <input type="radio"
                name="{{ $field->getInputName() }}"
                value="{{ $star }}"
                {{ (int) $field->getValue() === $star ? 'checked' : '' }}
            >
            {{ $star }}
        </label>
    @endforeach
</div>
```

The controller reads the value like any other field:

```php
$rating = (int) $app->input('rating');
```

## Template Variables

The template receives three variables:

- `$field`: the field object. Use it for `getValue()`, `getId()`, and
  `getInputName()`.
- `$input`: the element that the field passes to the layout.
- `$options`: the render options of the field.

::: info
`$input` is an empty `<div>`, not an input element. `LayoutField` replaces
the input that other fields create. Write the markup in the template.
:::

## Submitting a Value

A `LayoutField` has no input of its own, so the browser sends nothing for
it. The template must write the inputs with `getInputName()`. Use
`getId()` for the `id` attribute.

::: warning
A template without a named input saves nothing, and the form does not
report it. Check the submitted data after you add a new template.
:::

## Layouts per Class and per Field

`getDefaultLayout()` sets the template for every use of the class. Call
`layout()` on a field to use another template for that one field:

```php
// Uses fields.rating from the subclass.
$form->add('rating', RatingField::class);

// Uses a different template for this field only.
$form->add('rating', RatingField::class)
    ->layout('fields.rating-compact');
```

Call `layout(null)` to return to the default template.

When your field must extend another base class, use `LayoutFieldTrait`.
It provides `layout()`, `getLayout()`, and `renderLayout()`, and requires
you to implement `getDefaultLayout()`.

## Related

- [Form Utilities](/documentation/unicorn/form-fields/form-utilities#form-fields-layout)
- [Custom Field Layouts](/documentation/unicorn/mvc-crud/mvc-admin/form-management#custom-field-layouts)
- [Repeatable](./repeatable)
