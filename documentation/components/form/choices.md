---
layout: doc
title: Choice Fields
part: Components
chapter: Form
menu: components/form
component: form
---

# Choice Fields

Many form values come from a fixed list: a country, a category, a set of
permissions, a publication status. Choice fields render that list and mark
the options that match the field's value. The same list is often used for
validation too, so the options should be defined once and reused.

The package has three choice fields. `ListField` renders a `<select>`.
`CheckboxesField` renders a group of checkboxes that submit an array.
`RadioField` renders a group of radio buttons. All three share the option
API described on this page.

## Building a Choice Field

Create the field, then add options with `option()`. The first argument is
the label shown to the user, and the second is the submitted value:

```php
use Windwalker\Form\Field\ListField;
use Windwalker\Form\Form;

$form = new Form();

$form->addField(new ListField('country', 'Country'))
    ->option('Please select', '')
    ->option('Taiwan', 'TW')
    ->option('Japan', 'JP');
```

Each option is a `<option>` element. The field compares its value with the
option values and marks the matching one as `selected`.

## Single and Multiple Selection

`ListField` is single-select by default. Call `multiple(true)` to allow
several values. The field then submits its name with a `[]` suffix, and its
value is always an array:

```php
$form->addField(new ListField('tags', 'Tags'))
    ->multiple(true)
    ->option('PHP', 'php')
    ->option('Go', 'go')
    ->option('Rust', 'rust');

$form->fill(['tags' => 'php,go']);
```

A multiple field accepts its value as an array, as a comma-separated string,
or as a JSON array string. The string `php,go` above becomes `['php', 'go']`.

`CheckboxesField` is always multiple, and a `RadioField` submits one value.
Each one renders one input per option:

```php
use Windwalker\Form\Field\CheckboxesField;
use Windwalker\Form\Field\RadioField;

$form->addField(new CheckboxesField('notify', 'Notify'))
    ->option('Email', 'email')
    ->option('SMS', 'sms');

$form->addField(new RadioField('plan', 'Plan'))
    ->option('Free', 'free')
    ->option('Pro', 'pro');
```

Checkbox values are submitted as `notify[]`. A radio group submits one
value under its own name.

## Option Groups

Use `optionsGroup()` to place options in an `<optgroup>`. Inside the
callback, call `option()` as usual:

```php
$form->addField(new ListField('zone', 'Time zone'))
    ->optionsGroup('Asia', function (ListField $field) {
        $field->option('Taipei', 'Asia/Taipei');
        $field->option('Tokyo', 'Asia/Tokyo');
    })
    ->optionsGroup('Europe', function (ListField $field) {
        $field->option('Paris', 'Europe/Paris');
    });
```

`setOptions()` and `addOptions()` also accept a group name as their second
argument. Use them when the options come from an array that you already
have.

## Options from Enums

Most lists are backed by an enum. Loop over the cases and call `option()`
with the label and the enum value. This keeps the enum as the single source
of the allowed values:

```php
enum Status: string
{
    case Draft = 'draft';
    case Published = 'published';
}

$field = new ListField('status', 'Status');

foreach (Status::cases() as $case) {
    $field->option(ucfirst($case->value), $case->value);
}

$form->addField($field);
```

::: tip
Use the same enum for the choice field, the validator, and the stored value,
so the three cannot drift apart.
:::

### Validating against the list

A choice field does not reject values that are not in its list. Check the
submitted value against the enum on the server, for example with `tryFrom()`:

```php
$status = Status::tryFrom($data['status'] ?? '');
```

::: warning
A `<select>` or a radio group only limits what the browser sends. A client
can submit any value. Always check a choice value on the server before you
store it.
:::

## Timezone Field

`TimezoneField` is a `ListField` filled with every timezone that PHP knows.
It groups the zones by region, such as `Asia` and `Europe`:

```php
use Windwalker\Form\Field\TimezoneField;

$form->addField(new TimezoneField('timezone', 'Timezone'))
    ->setValue('Asia/Taipei');
```

## Text Fields with Suggestions

`TextField` can also take options. Its options render as a `<datalist>`,
so the user can type a value or pick a suggestion:

```php
use Windwalker\Form\Field\TextField;

$form->addField(new TextField('color', 'Color'))
    ->option('Red')
    ->option('Green');
```

The browser still accepts any text. Treat the value as free input.

## Customizing Option Markup

`CheckboxesField` and `RadioField` build each option from a wrapper, a
label, and an input. Attach a handler to change any of them. The handler
receives the element and the field, and returns the element:

```php
use Windwalker\DOM\HTMLElement;

$form->addField(new RadioField('plan', 'Plan'))
    ->option('Free', 'free')
    ->option('Pro', 'pro')
    ->setOptionWrapperHandler(
        function (HTMLElement $wrapper, RadioField $field): HTMLElement {
            $wrapper->addClass('plan-option');

            return $wrapper;
        }
    );
```

Use `setOptionLabelHandler()` to change the label and `setOptionHandler()`
to change the input. These handlers are the supported way to change option
markup. Do not override the renderer just to add a class to an option.

::: info
`option()` creates the option element for you. `addOptions()` expects
prepared option elements, not plain strings. Use `option()` or
`createOption()` to create them.
:::
