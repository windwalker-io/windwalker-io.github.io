---
layout: doc
title: Switcher
description: Switcher field page for Windwalker Unicorn.
---

# Switcher

A switcher is an on/off toggle for a flag, such as a published state or a
feature option. It reads faster than a yes/no select, and it fits a column
that holds only two values. `SwitcherField` extends `CheckboxField` and draws
the toggle with a styled label. The field always submits a value, so the
server never has to guess what a missing key means.

## Enabling the Field

Add `SwitcherField` to a form. Without other options, the field stores `'1'`
when on and `'0'` when off.

```php
use Unicorn\Field\SwitcherField;

$form->add('state', SwitcherField::class)
    ->label('Published');
```

The field loads its stylesheet when it renders, so no extra asset is needed.

## Complete Example

The following form uses three switchers: a published flag, a featured flag
with a custom shape, and a switch between two named values:

```php
use Unicorn\Field\SwitcherField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Form;

class ProductEditForm
{
    #[FormDefine]
    #[NS('item')]
    public function basic(Form $form): void
    {
        $form->add('state', SwitcherField::class)
            ->label('Published')
            ->circle(true)
            ->color('success')
            ->defaultValue('1');

        $form->add('featured', SwitcherField::class)
            ->label('Featured')
            ->round(true)
            ->size('sm')
            ->color('warning');

        $form->add('ordering', SwitcherField::class)
            ->label('Manual ordering')
            ->checkedValue('manual')
            ->uncheckedValue('auto')
            ->defaultValue('auto');
    }
}
```

## Checked and Unchecked Values

The default values are `'1'` for on and `'0'` for off. Use `checkedValue()`
and `uncheckedValue()` to store other values, such as `manual` and `auto`.

When `checkedValue()` is set, the switch is on only if the stored value
equals it. Without it, the switch is on for any truthy value. So `'0'`,
`''`, and `null` render as off, and other values render as on.

::: warning
Without `checkedValue()`, a stored string such as `no` renders as on. Set
`checkedValue()` and `uncheckedValue()` whenever the column does not hold
`1` and `0`.
:::

```php
// Stored "no" without checkedValue(): the switch is on.
$form->add('newsletter', SwitcherField::class)
    ->setValue('no');

// Stored "no" with checkedValue(): the switch is off.
$form->add('newsletter', SwitcherField::class)
    ->checkedValue('yes')
    ->uncheckedValue('no')
    ->setValue('no');
```

## Submitted Value

The field renders two inputs with the same name. The first is a hidden input
that holds the unchecked value. The second is the checkbox, which holds the
checked value and follows the hidden input in the markup. When the switch is
off, only the hidden input is sent. When it is on, both are sent, and PHP
keeps the last value of a repeated key.

```text
# Switch off: the request body contains newsletter=no
# Switch on:  the request body contains newsletter=yes
```

::: info
The hidden fallback means the key is always present in the request. Unlike
a checkbox, an off switch does not drop the key.
:::

## Shape, Size, and Color

`shape()` sets the look of the slider. The values `round` and `circle` use
the matching slider classes, and `square` is the default. `round()` and
`circle()` are shortcuts for these values. Pass `false` to either one to
return to `square`.

`size()` accepts `sm` or `lg`. `color()` sets the `btn-*` class of the
slider, and the default is `secondary`:

```php
$form->add('state', SwitcherField::class)
    ->shape('round')       // Or ->round(), ->circle(), ->round(false).
    ->size('lg')           // Or 'sm'. Omit for the default size.
    ->color('primary');    // Bootstrap color name, without "btn-".
```

## Options Reference

The switcher adds slider, color, and value methods on top of the checkbox
field.

| Method | Description | Default |
| --- | --- | --- |
| `shape()` | Sets the slider shape: `square`, `round`, or `circle`. | `square` |
| `getShape()` | Returns the slider shape, or `null` when unset. | — |
| `round()` | Sets the shape to `round` when `true`, or `square` when `false`. | `true` |
| `circle()` | Sets the shape to `circle` when `true`, or `square` when `false`. | `true` |
| `size()` | Sets the slider size, `sm` or `lg`. | — |
| `getSize()` | Returns the slider size, or `null` when unset. | — |
| `color()` | Sets the `btn-*` color of the slider, without the `btn-` prefix. | `secondary` |
| `getColor()` | Returns the slider color, or `null` when unset. | — |
| `checkedValue()` | Sets the value submitted when the switch is on. | — |
| `getCheckedValue()` | Returns the checked value, or `null` when unset. | — |
| `uncheckedValue()` | Sets the value submitted when the switch is off. | — |
| `getUncheckedValue()` | Returns the unchecked value, or `null` when unset. | — |
| `help()` | Sets the help text of the field. | — |
| `getHelp()` | Returns the help text of the field. | — |
| `description()` | Sets the description of the field. | — |
| `getDescription()` | Returns the description of the field. | — |

[Common form field methods](/documentation/components/form/fields) such as `label()`, `required()`, and `disabled()` also work.

## Related

- [ButtonRadio](/documentation/unicorn/form-fields/field-types/button-radio)
- [Form Management](/documentation/unicorn/mvc-crud/mvc-admin/form-management)
- [Form Utilities](/documentation/unicorn/form-fields/form-utilities)
- [Field Generation](/documentation/unicorn/form-fields/field-generation)
