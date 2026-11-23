---
layout: doc
title: Form Utilities
description: Conditional display, empty array markers, field layouts, and validation display for Unicorn form fields.
---

# Form Utilities

Form utilities change how a form field behaves or how it is rendered. This page
covers four of them: conditional display, the empty array marker, field
layouts, and validation display. Each section stands on its own.

## Conditional Display

Many forms have fields that matter only for one choice. A product form might
show a discount field only when the product is on sale, and a bundle list only
when it is a bundle. Showing every field at once makes the form harder to scan.
`showon()` shows a field only when another field in the same form has a given
value. The browser applies the rule, and the form still receives every value.

### Enabling Conditional Display

`showon()` is a field method that Unicorn adds to every form field. It takes an
array. Each key is the path of the controlling field, and each value is the
value that shows the field:

```php
$form->add('discount', NumberField::class)
    ->showon(['item/type' => 'sale']);
```

The key is the full path of the controlling field. A field in the `item`
namespace has the path `item/type`. A field without a namespace uses its name
alone, such as `type`. Unicorn's form scripts apply the rule, so use it in a
Unicorn form that loads the Unicorn scripts.

### Complete Example

The following edit form shows two fields that depend on the product type. The
`item` namespace comes from the `#[NS]` attribute of the form method:

```php
// ProductEditForm.php
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\ListField;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Field\TextareaField;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('item')]
public function main(Form $form): void
{
    $form->add('type', ListField::class)
        ->label($this->trans('app.product.field.type'))
        ->option('Regular', 'regular')
        ->option('On Sale', 'sale')
        ->option('Bundle', 'bundle');

    $form->add('discount', NumberField::class)
        ->label($this->trans('app.product.field.discount'))
        ->showon(['item/type' => 'sale']);

    $form->add('bundle_items', TextareaField::class)
        ->label($this->trans('app.product.field.bundle_items'))
        ->showon(['item/type' => 'bundle']);
}
```

The discount field appears when the user selects On Sale, and the bundle items
field appears when the user selects Bundle. Both fields are in the initial state
that matches the saved record, so an existing sale product shows its discount
on load.

### Matching Values

The rule compares the controlling field's value with the value you give. The
match depends on the value type:

```php
// A scalar: shows when the target equals the value.
->showon(['item/type' => 'sale'])

// An array with a single-value target: shows when the target
// equals any value in the array.
->showon(['item/type' => ['sale', 'bundle']])

// An array with a multiple-select target: shows only when every
// value in the array is selected.
->showon(['item/tags' => ['new', 'sale']])
```

The rule supports inputs, textareas, selects, checkboxes, and radio groups as
the controlling field. Each one reads its own value in the browser.

### Hidden Fields

A hidden field is faded out, and its input gets the `readonly` attribute. The
input is not disabled, so the browser still submits its value. The save uses
every submitted key that the form defines, so a hidden field can still store
data.

::: warning
A field hidden by `showon()` still submits its value. If the value must not be
stored when the field is hidden, clear it in a `prepareSave` hook:
:::

```php
// ProductController.php
$controller->prepareSave(
    function (PrepareSaveEvent $event): void {
        if ($event->data['type'] !== 'sale') {
            $event->data['discount'] = null;
        }
    }
);
```

::: info
The rule listens to the `change` event. A text input fires `change` when it
loses focus, not on each keystroke. Use a select, checkbox, or radio button as
the controlling field when the dependent field must update at once.
:::

### Errors

The controlling path must match a field in the same form. Unicorn throws when it
renders a field whose path is missing:

```php
// ERROR: UnexpectedValueException: Field: item/type not found.
```

## Empty Array Utilities

Browsers do not submit a multiple select when nothing is selected. The server
then cannot tell "the user cleared the field" from "the field is not on the
page". Unicorn fills this gap with a marker value, `__EMPTY_ARRAY__`. This
section explains how the marker is produced and how your code should read it.

### Enabling Empty Array Support

The support is automatic. A `ListField` in multiple mode renders a hidden input
with the marker value, placed before the select. Unicorn's Bootstrap 5 input
layout adds it:

```php
$form->add('tags', ListField::class)
    ->option('PHP', 'php')
    ->option('Go', 'go')
    ->multiple(true);
```

The rendered input will look like this:

```html
<input name="tags" type="hidden" value="__EMPTY_ARRAY__">
<select name="tags[]" multiple>
    <option value="php">PHP</option>
    <option value="go">Go</option>
</select>
```

The rendered markup contains a hidden field before the select. Its value is
`__EMPTY_ARRAY__`, and its name is the same as the select's name.

### Reading the Marker

`EmptyArrayFieldSubscriber` replaces the marker in the request values with an
empty array. It runs for web requests, on body and query values, and walks
nested arrays. A field that is not on the page is not in the request, so the
subscriber does not touch it.

The controller can check whether the key exists before it writes the value. The
right reaction depends on the field. The three cases below cover the common
situations.

A field on a normal form: the key exists, so the value is saved. An empty array
means the user cleared every option:

```php
// The user saw the field and chose none or some.
$input = ['tags' => []];

if (array_key_exists('tags', $input)) {
    $entity->tags = $input['tags'];
}
```

A field that is not on the page: the key is missing, so the controller skips
the field and keeps the saved value:

```php
// The field was hidden or not rendered, so nothing is written.
$input = [];

if (array_key_exists('tags', $input)) {
    $entity->tags = $input['tags'];
}
```

A field that a script always renders: the page always sends the key. A missing
key means the script failed, so the controller returns an error instead of
saving:

```php
// The script always renders this field, so a missing key is an error.
$input = [];

if (!array_key_exists('tags', $input)) {
    // ERROR: RuntimeException: Field "tags" is missing.
    throw new \RuntimeException('Field "tags" is missing.');
}

$entity->tags = $input['tags'];
```

Each case protects the saved data from a page that failed to send the field.

::: warning
Never turn a missing key into an empty array. A field that was hidden or not
rendered would then clear the saved values. Check the key with
`array_key_exists()` before you write the value.
:::

::: info
The subscriber is registered only for web requests. A command or a queue job
receives the raw values and does not get the conversion.
:::

## Form Fields Layout

Every Unicorn form field is printed in layers. A theme layout draws the wrapper,
the label, and the input for all fields. A field can also have its own layout
for the input part, which is useful for one special field. This section explains
both levels and shows when to use each.

### Overriding One Field's Layout

Fields that use `LayoutFieldTrait` have a `layout()` method. It replaces the
template that renders the field's input. Use a template name that the renderer
can find, such as `fields.switcher-compact`:

```php
$form->add('featured', SwitcherField::class)
    ->layout('fields.switcher-compact');
```

The template receives `$input`, which is the field's own markup, and `$field`.
In a host app that uses the default `@root/views` path, the renderer resolves
`fields.switcher-compact` to `views/fields/switcher-compact.blade.php`:

```blade
{{-- views/fields/switcher-compact.blade.php --}}
<div class="d-flex align-items-center gap-2">
    {!! $input !!}

    <small class="text-muted">
        {{ $field->get('hint') }}
    </small>
</div>
```

The `hint` value is set on the field with `set()`:

```php
$form->add('featured', SwitcherField::class)
    ->set('hint', 'Shown on the home page.')
    ->layout('fields.switcher-compact');
```

Call `layout(null)` to return to the field's default layout.

The fields that support `layout()` include:

- `SwitcherField`
- `CalendarField`
- `ColorPickerField`
- `ButtonRadioField`
- `FlatListField`
- `InlineField`
- `CascadeSelectField`
- `RepeatableField`
- `ModalField`
- `MultiUploaderField`
- `FileDragField`
- `SingleImageDragField`
- `ModalTreeField`

To create a new field type with its own template, extend `LayoutField`. See
[Custom Field Layouts](/documentation/unicorn/mvc-crud/mvc-admin/form-management#custom-field-layouts).

### Overriding the Layouts of All Fields

Every field goes through three theme layouts, and the form renderer calls each
one with the field in scope:

- `@theme::form.field-wrapper`: the outer element, with the label and the
  error area.
- `@theme::form.label`: the label element.
- `@theme::form.input`: the input element.

Unicorn registers its Bootstrap 5 layouts under `@theme`. To change the markup
of every form, copy the layout from `views/ui/bootstrap5/form/` into your own
theme folder and edit it. The [Theming](/documentation/unicorn/introduction/theming)
page explains how the folder becomes the first match in the `@theme` search.

::: info
A theme layout changes the markup of every form in the application. Use a
field-level `layout()` when only one field needs a different look.
:::

## Validation and Error Display

A user should see a problem with a field before the request is sent, and a save
that fails should show why. Unicorn validates in two layers:

- Browser: the form checks the fields before submit and shows each message
  next to its field. See [Basic Features](/documentation/unicorn/javascript-frontend/form-validation/basic-features).
- Server: the validators on the form class run on every save. A failing
  validator stops the save and throws `ValidateFailException`. See
  [Validating Fields](/documentation/unicorn/mvc-crud/mvc-admin/edit-management#validating-fields).

::: warning
The browser check is a convenience, not a protection. A request can skip the
browser entirely, so the server validators must stay on for every save. Do not
pass `SaveAction::IGNORE_VALIDATE` for data that comes from a user.
:::

## Related

- [Form Validation: Basic Features](/documentation/unicorn/javascript-frontend/form-validation/basic-features)
- [Edit Management](/documentation/unicorn/mvc-crud/mvc-admin/edit-management)
- [Form Management](/documentation/unicorn/mvc-crud/mvc-admin/form-management)
- [Theming](/documentation/unicorn/introduction/theming)
- [Form Rendering](/documentation/components/form/rendering)
