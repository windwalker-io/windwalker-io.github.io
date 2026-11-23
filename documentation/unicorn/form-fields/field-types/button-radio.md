---
layout: doc
title: ButtonRadio
description: ButtonRadio field page for Windwalker Unicorn.
---

# ButtonRadio

A [radio group](/documentation/components/form/choices) works well for a short list of choices, but it takes space and
the choices look alike. `ButtonRadioField` shows the same choices as a row of
buttons. The active button is colored, so users see the current value at a
glance. Use it for two to four options, such as a report period (Day, Week,
Month) or a visibility setting (Public, Private).

The field extends `RadioField`. The submitted value, the options, and the
validation are the same as for a radio group.

## Enabling the Field

Add `ButtonRadioField` to a form, then add the options with `option()`. The
first argument is the text, and the second is the value that is stored:

```php
use Unicorn\Field\ButtonRadioField;

$form->add('visibility', ButtonRadioField::class)
    ->label('Visibility')
    ->option('Public', 'public')
    ->option('Private', 'private');
```

The field loads the Unicorn script that builds the buttons, so no extra
script tag is needed.

## Complete Example

The following form uses two button groups. The first one sets colors for
each option, and the second one uses a default value:

```php
use Unicorn\Field\ButtonRadioField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Form;

class ReportEditForm
{
    #[FormDefine]
    #[NS('item')]
    public function basic(Form $form): void
    {
        $form->add('period', ButtonRadioField::class)
            ->label('Period')
            ->option('Day', 'day', ['data-color-class' => 'btn-info'])
            ->option('Week', 'week', ['data-color-class' => 'btn-primary'])
            ->option(
                'Month',
                'month',
                ['data-color-class' => 'btn-success']
            )
            ->defaultValue('week')
            ->required(true);

        $form->add('visibility', ButtonRadioField::class)
            ->label('Visibility')
            ->option('Public', 'public')
            ->option(
                'Private',
                'private',
                ['data-color-class' => 'btn-danger']
            )
            ->defaultValue('public');
    }
}
```

## Adding Options

`option()` takes the text, the value, optional attributes, and an optional
group name. Use `registerFromEnums()` when the choices come from an [enum](/documentation/framework/core-concepts/enum).
Each option text is the case title, or the case name when it has no title.
Hidden cases are skipped:

```php
use App\Enum\ReportPeriod;

$form->add('period', ButtonRadioField::class)
    ->label('Period')
    ->registerFromEnums(ReportPeriod::class);
```

## Button Colors

The script colors each active button by its value. A value that is empty
uses `btn-primary`, a value of `0` uses `btn-danger`, and any other value
uses `btn-success`. Set the `data-color-class` attribute on an option to
choose another class, as shown in the complete example.

::: info
The value `0` turns red by default. This is harmless, but it may surprise
you when `0` means a neutral choice. Set `data-color-class` to change it.
:::

## Disabled and Readonly

`disabled(true)` disables every radio and button in the group. `readonly(true)`
keeps the group visible, but the buttons cannot be clicked:

```php
$form->add('visibility', ButtonRadioField::class)
    ->option('Public', 'public')
    ->option('Private', 'private')
    ->disabled(true);

$form->add('visibility', ButtonRadioField::class)
    ->option('Public', 'public')
    ->option('Private', 'private')
    ->readonly(true);
```

## Unmatched Values

A stored value that matches no option leaves every button inactive. The
field has no hidden fallback input, so the browser sends no value for the
group. The saved value is then empty or unchanged, depending on your
controller.

```php
// "weekly" is not an option, so no button is active.
$form->add('period', ButtonRadioField::class)
    ->option('Day', 'day')
    ->option('Week', 'week')
    ->setValue('weekly');
```

::: warning
A group that is not required can save without a value. Set `required(true)`
on fields that must always have a value, and check the stored value against
the option values when you change them.
:::

## Options Reference

The button radio adds option methods and a layout setter on top of the radio
field.

| Method | Description | Default |
| --- | --- | --- |
| `option()` | Adds an option with its text, value, attributes, and group. | — |
| `registerFromEnums()` | Adds options from an enum, skipping hidden cases. | — |
| `setOptions()` | Replaces all options, optionally under a group. | — |
| `getOptions()` | Returns all options as an array. | — |
| `layout()` | Sets a custom layout template for the field. | — |
| `getLayout()` | Returns the layout template in use. | `@theme::field.button-radio` |

[Common form field methods](/documentation/components/form/fields) such as `label()`, `required()`, and `disabled()` also work.

## Related

- [Switcher](/documentation/unicorn/form-fields/field-types/switcher)
- [Form Utilities](/documentation/unicorn/form-fields/form-utilities)
- [ButtonRadio (JavaScript)](/documentation/unicorn/javascript-frontend/bootstrap-5/button-radio)
