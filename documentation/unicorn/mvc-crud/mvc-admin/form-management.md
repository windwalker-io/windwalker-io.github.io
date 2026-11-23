---
layout: doc
title: Form Management
description: Define, group, validate, and render Unicorn form fields for the edit page and the grid page, including generated fields from a table.
---

# Form Management

Forms describe the fields that a page shows and the values that it accepts. Unicorn builds each form from a form class, where each method adds fields to the form. The same form class supplies the fields for the page, filters the submitted data, and validates it before it is saved. This page covers how to add fields, group them, and render them in the layouts.

## Adding Fields and Filling Values

Each method marked with `#[FormDefine]` adds fields to the form. Use `#[NS]` to set the data namespace of the fields:

```php
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

class ProductEditForm
{
    #[FormDefine]
    #[NS('item')]
    public function main(Form $form): void
    {
        $form->add('title', TextField::class)
            ->label('Title')
            ->required(true);
    }
}
```

Fill the form with data before you render it. The generated edit view fills the `item` namespace from the record, then from the state that holds the last failed input:

```php
$form = $this->createForm(ProductEditForm::class)
    ->fillTo('item', $this->orm->extractEntity($item))
    ->fillTo(
        'item',
        $this->repository->getState()->getAndForget('edit.data')
    );
```

`fill()` fills the whole form from an array. `fillTo()` fills only the given namespace path.

## Fieldsets and Layouts

A fieldset groups fields for the layout. Add `#[Fieldset]` to the method to place its fields in a named group:

```php
use Windwalker\Form\Attributes\Fieldset;

#[FormDefine]
#[Fieldset('meta')]
#[NS('item')]
public function meta(Form $form): void
{
    $form->add('state', SwitcherField::class)
        ->label('Published');
}
```

Print each fieldset in the blade template with `<x-fieldset>`:

```blade
<x-fieldset name="basic" :form="$form" is="card"></x-fieldset>
<x-fieldset name="meta" :form="$form" is="card"></x-fieldset>
```

To print a single field, pass the field object to `<x-field>`:

```blade
<x-field :field="$form->getField('item/title')"></x-field>
```

## Nested Data with Namespaces

Fieldsets are flat. Each fieldset is a named group at the form level, so a fieldset cannot contain another fieldset. To nest the submitted data, use a namespace path with `/`:

```php
#[FormDefine]
#[Fieldset('seo')]
#[NS('item/params')]
public function seo(Form $form): void
{
    $form->add('meta_title', TextField::class)
        ->label('Meta title');

    $form->add('meta_description', TextareaField::class)
        ->label('Meta description');
}
```

The fields in this method submit their values under `item`, then `params`. The layout still prints the group with `<x-fieldset name="seo">`. Keep the fieldset name and the namespace separate: the name controls where the field appears, and the namespace controls the shape of the data.

## Generating Fields from a Table

Create the edit form first with `unicorn:view-edit`, and then fill it from the columns of a table with `build:form`:

```bash
php windwalker build:form Admin/Product/ProductEditForm product
```

The command adds one field for each column that the form does not define yet. See [Field Generation](/documentation/unicorn/form-fields/field-generation) for the field types, the translation prefix, and the rewrite behavior.

## Filters and Validation

Filters change a value before it is validated and saved. Validators check the value and fail the save when a rule is broken. Add both to the field:

```php
$form->add('title', TextField::class)
    ->addFilter('trim')
    ->addValidator('required');

$form->add('contact', TextField::class)
    ->addValidator('email');
```

The `required(true)` method is a shortcut for the `required` rule. For the rules that the edit page uses on save, see [Edit Management](./edit-management).

## How the Form Filters Submitted Data

`Form::filter()` returns the part of the submitted data that the form defines. The save uses this filter first, so a key that no field defines never reaches the entity. The second argument changes what is kept:

```php
// Keep only the keys that the form defines (the default).
$clean = $form->filter($data);

// Keep every submitted key, including undefined ones.
$all = $form->filter($data, Form::FILTER_KEEP_DATA);

// Fill a missing or empty value with the field's default.
$withDefaults = $form->filter($data, Form::FILTER_USE_DEFAULT_VALUE);
```

Without `FILTER_USE_DEFAULT_VALUE`, a missing key is skipped and an empty value stays empty. The generated save does not use the default-value option, so `defaultValue()` does not fill a value on save. See [Edit Management](./edit-management) for how to store a default.

## Options from Enums

Fill a list field from an enum with `registerFromEnums()`. The labels go through the language service. The generated grid filter uses this method for the state field:

```php
use Unicorn\Enum\BasicState;
use Windwalker\Form\Field\ListField;

$form->add('state', ListField::class)
    ->label($this->trans('unicorn.field.state'))
    ->option($this->trans('unicorn.select.placeholder'), '')
    ->registerFromEnums(BasicState::class, $this->lang);
```

Add a leading option with `option()` for an empty choice, such as a placeholder. The enum cases follow it.

## Custom Field Layouts

Use `LayoutField` to render a field with your own template. Extend the class, and return the template name from `getDefaultLayout()`:

```php
use Unicorn\Field\LayoutField;

class ColorSwatchField extends LayoutField
{
    public function getDefaultLayout(): string
    {
        return 'fields.color-swatch';
    }
}
```

The template name is a renderer template that your project provides. The template receives `$input`, `$field`, and `$options`:

```blade
{{-- fields/color-swatch.blade.php --}}
<div class="color-swatch">
    {!! $input !!}
</div>
```

To use a different template for one field, call `layout()`:

```php
$form->add('color', ColorSwatchField::class)
    ->layout('fields.color-swatch-large');
```

## Grid Filters and Batch Fields

The grid form has three namespaces. The generated form defines `search[*]`, `filter[...]`, and `batch[...]`. Add a filter by adding a field to the `filter` namespace:

```php
#[FormDefine]
#[NS('filter')]
public function category(Form $form): void
{
    $form->add('product.category_id', ListField::class)
        ->label('Category')
        ->option('- Select category -', '')
        ->option('Books', '1')
        ->option('Music', '2')
        ->onchange('this.form.submit()');
}
```

The filter name uses the table column, `product.category_id`. The list selector allows it because it is a column of the query. See [List Management](./list-management) for how filter values reach the query.

Fields in the `batch` namespace use entity property names, not table aliases. The batch modal shows when the form has batch fields. See [Advanced Grid Features](/documentation/guides/rad/advanced-grid) for batch examples.

## Adding a Create Modal

A grid form can also define a group for another purpose, such as a dialog that creates a record. This example adds a `create` fieldset in the `item` namespace, so the dialog can post to the edit route:

```php
#[FormDefine]
#[Fieldset('create')]
#[NS('item')]
public function create(Form $form): void
{
    $form->add('title', TextField::class)
        ->label('Title')
        ->addFilter('trim')
        ->required(true);
}
```

Place the button and the dialog after the `admin-form` form in the list blade. The dialog must not be inside the grid form, because nested forms are not valid HTML:

```blade
<button type="button" class="btn btn-success"
    data-bs-toggle="modal" data-bs-target="#create-modal">
    New Product
</button>

<div class="modal fade" id="create-modal" tabindex="-1">
    <div class="modal-dialog">
        <form method="post" action="{{ $nav->to('product_edit') }}">
            <div class="modal-body">
                <x-fieldset name="create" :form="$form"></x-fieldset>
            </div>
            <div class="modal-footer">
                <x-csrf></x-csrf>
                <button type="submit" class="btn btn-primary">
                    Create
                </button>
            </div>
        </form>
    </div>
</div>
```

The form posts to the edit route. The controller saves the new record and redirects to its edit page, where the user can continue editing.

## Related

- [Edit Management](./edit-management)
- [List Management](./list-management)
- [Edit Forms and Saving](/documentation/guides/rad/edit-forms)

