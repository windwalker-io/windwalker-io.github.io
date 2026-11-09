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

`fill()` accepts the multiple value in three formats. Each one becomes the
same array. An array is used as is. A comma-separated string is split, and
surrounding spaces are removed. A JSON array string is decoded:

```php
// Each call below sets the same value.
$form->fill(['tags' => ['php', 'go']]);
$form->fill(['tags' => 'php,go']);
$form->fill(['tags' => 'php, go']);
$form->fill(['tags' => '["php","go"]']);

$form->getField('tags')->getValue();
// ['php', 'go']
```

`fill()` also decodes JSON strings for the whole data, so a JSON string is
usually already an array by the time it reaches the field. Use the same
format for the stored value and the form, to keep the data predictable.

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

`registerFromEnums()` builds the options from the cases of an enum. Each
case's backed value becomes the option value, and its title becomes the
label. An enum that implements `EnumRichInterface` gets this behavior by
using `EnumRichTrait`. The trait provides the titles and the translated
labels, so the enum needs no extra methods:

```php
use Windwalker\Utilities\Attributes\Enum\Title;
use Windwalker\Utilities\Enum\EnumRichInterface;
use Windwalker\Utilities\Enum\EnumRichTrait;

enum Status: string implements EnumRichInterface
{
    use EnumRichTrait;

    #[Title('Draft')]
    case Draft = 'draft';

    #[Title('Published')]
    case Published = 'published';
    
    // Optionally, you can provide a translation key for the title.
    protected function translateKey(string $name): string
    {
        return "app.enum.status.$name";
    }
}

$form->addField(new ListField('status', 'Status'))
    ->registerFromEnums(Status::class);
```

A case without a `#[Title]` attribute is labeled with its case name.

For a backed enum, each option value is the backed value. Implement
`EnumRichInterface` when you also need translated labels, as shown below.

Pass a language as the second argument to `registerFromEnums()` to use the
translated labels. The translation key is built from the enum class name and the case name, as `app.enum.<class-name>.<Case>`, for example
`app.enum.status.draft`. If the key is missing, the `#[Title]` text is used.
`$lang` is any `LanguageInterface` instance from your application:

```php
$form->addField(new RadioField('status', 'Status'))
    ->registerFromEnums(Status::class, $lang);
```

::: tip
Use the same enum for the choice field, the validator, and the stored value,
so the three cannot drift apart.
:::

### Titles without the interface

`#[Title]` is read from any enum case, so an enum that does not implement
`EnumRichInterface` can still provide labels. A pure enum has no backed value,
so its option values are the case names:

```php
use Windwalker\Utilities\Attributes\Enum\Title;

enum Visibility
{
    #[Title('Visible to everyone')]
    case Public;

    #[Title('Visible to members')]
    case Members;
}

$form->addField(new RadioField('visibility', 'Visibility'))
    ->registerFromEnums(Visibility::class);
```

### Choosing the cases

`registerFromEnums()` also accepts an array of cases. Use it to show only
some cases, for example to hide an archived status from a new record form:

```php
$cases = array_filter(
    Status::cases(),
    fn (Status $status) => $status !== Status::Archived
);

$form->addField(new ListField('status', 'Status'))
    ->registerFromEnums($cases);
```

Build the array in any order you need, and pass it as is.

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

## Field Parameters

The choice fields share the option methods below. Each field section lists
only what is specific to that class.

Option methods, available on `ListField`, `CheckboxesField`, and
`RadioField`:

- `option(text, value, attrs, group)`: adds one option. `text` is the label
  and `value` is the submitted value.
- `setOptions(array $options, ?string $group)`: replaces all options.
- `addOptions(array $options, ?string $group)`: appends prepared option
  elements.
- `resetOptions()`: removes all options.
- `getOptions()`: returns the current option elements.
- `optionsGroup(string $name, callable $callback)`: adds the options in the
  callback to an `<optgroup>`.
- `registerOptions(iterable|string $options, ?callable $handler)`: adds
  options from an array, where each key is the value and each value is the
  label.
- `registerFromEnums(iterable|string $enums, ?LanguageInterface $lang)`:
  adds options from enum cases.

### ListField

`ListField` renders a `<select>`. It is single-select unless `multiple` is
set.

- `size(int $value)`: sets the number of visible rows.
- `multiple(bool $value)`: allows several selections, and submits the name
  with `[]`.
- `isMultiple()`: returns whether the field allows several selections.
- All option methods listed above.

```php
use Windwalker\Form\Field\ListField;

$form->addField(new ListField('languages', 'Languages'))
    ->size(4)
    ->multiple(true)
    ->registerOptions([
        'en' => 'English',
        'zh' => 'Chinese',
    ]);
```

### CheckboxesField

`CheckboxesField` renders one checkbox per option. It extends `ListField`,
and it is always multiple.

- `setOptionWrapperHandler(?callable $handler)`: changes the wrapper of each
  option. The handler receives the element and the field.
- `setOptionLabelHandler(?callable $handler)`: changes the label of each
  option.
- `setOptionHandler(?callable $handler)`: changes the input of each option.
- All option methods listed above.

```php
use Windwalker\Form\Field\CheckboxesField;

$form->addField(new CheckboxesField('notify', 'Notify'))
    ->option('Email', 'email')
    ->option('SMS', 'sms');
```

### RadioField

`RadioField` renders one radio button per option and submits one value. It
extends `ListField`.

- `setOptionWrapperHandler(?callable $handler)`: changes the wrapper of each
  option.
- `setOptionLabelHandler(?callable $handler)`: changes the label of each
  option.
- `setOptionHandler(?callable $handler)`: changes the input of each option.
- All option methods listed above.

```php
use Windwalker\Form\Field\RadioField;

$form->addField(new RadioField('plan', 'Plan'))
    ->registerOptions([
        'free' => 'Free',
        'pro' => 'Pro',
    ]);
```

### TimezoneField

`TimezoneField` extends `ListField`. It has no methods of its own. The
options are built from every timezone that PHP knows, grouped by region, so
you do not add them yourself. Use `setValue()` to select one:

```php
use Windwalker\Form\Field\TimezoneField;

$form->addField(new TimezoneField('timezone', 'Timezone'))
    ->setValue('Asia/Taipei');
```

