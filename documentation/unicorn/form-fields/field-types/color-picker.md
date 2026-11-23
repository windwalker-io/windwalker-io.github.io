---
layout: doc
title: ColorPicker
description: ColorPicker field page for Windwalker Unicorn.
---

# ColorPicker

Typing a color by hand is error-prone, and users often do not know the exact
code for a shade. `ColorPickerField` adds a [Spectrum Vanilla](https://about.asika.tw/spectrum-vanilla/) color picker to a text
input. Users can choose a color visually or type one in.

## Enabling the Field

Add the field with `ColorPickerField::class`. The picker attaches to the input
when the form renders.

```php
use Unicorn\Field\ColorPickerField;

$form->add('brand_color', ColorPickerField::class)
    ->label('Brand Color');
```

The input is a text input (`type="text"`). Use Windwalker's `ColorField` when
you want the browser's native color input instead.

## Complete Example

The form below sets a dark picker theme for one color and uses the default
theme for the other.

```php
use Unicorn\Field\ColorPickerField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('theme')]
public function main(Form $form): void
{
    $form->add('brand_color', ColorPickerField::class)
        ->label('Brand Color')
        ->pickerOptions([
            'theme' => 'dark',
        ]);

    $form->add('accent_color', ColorPickerField::class)
        ->label('Accent Color');
}
```

## Picker Options

`pickerOptions()` takes an array of Spectrum options. The array is passed to
the Unicorn color picker helper as it is.

```php
use Unicorn\Field\ColorPickerField;

// Dark theme: loads the dark stylesheet.
$form->add('brand_color', ColorPickerField::class)
    ->pickerOptions([
        'theme' => 'dark',
    ]);

// No theme: loads the default stylesheet.
$form->add('accent_color', ColorPickerField::class)
    ->pickerOptions([]);

// Locale for the picker labels. Defaults to the application locale.
$form->add('text_color', ColorPickerField::class)
    ->pickerOptions([
        'locale' => 'de-DE',
    ]);
```

Set `locale` only when the picker should differ from the application locale.

## Value

The field saves the text of the input. It does not convert or check the
value. A user can type any text, so validate the format in your controller or
form validator when the value must be a color.

## Options Reference

`ColorPickerField` provides the following methods for the picker.

| Method | Description | Default |
| --- | --- | --- |
| `pickerOptions()` | Sets the options passed to the color picker. | `[]` |
| `getPickerOptions()` | Returns the picker options. | — |

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

## Related

- [Calendar](./calendar)
- [Field Generation](../field-generation)
