---
layout: doc
title: Fields
part: Components
chapter: Form
menu: components/form
component: form
---

# Fields

A field is a PHP object that describes one control in a form. Its name and
label are the main properties, and its HTML attributes are set with
chained methods. Each field class produces a specific HTML element, so the
class you choose decides the markup, the browser behavior, and the default
filters.

This page covers the fields that produce a single input element. Choice
fields, which render a list of options, are described on the
[Choice Fields](./choices) page.

## Building a Field

Create a field with its name, label, and optional attributes. Chain the
methods that set options, then add the field to a form:

```php
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form = new Form();

$form->addField(
    (new TextField('title', 'Title'))
        ->placeholder('Post title')
        ->required(true)
        ->addClass('form-control')
);
```

Most setters are magic methods. `placeholder()`, `autofocus()`, and
`pattern()` write the matching HTML attribute. `addClass()` and `attr()`
write to the input element. `required(true)` writes the `required`
attribute and is also read by validation, as described on the
[Data Lifecycle](./data) page.

## Text Inputs

These fields render a text input. Choose the class that matches the type
of data, because each sets a different `type` attribute. The class sets the
`type` itself, so `attr('type', ...)` cannot change it:

- `TextField`: a plain `type="text"` input.
- `PasswordField`: a `type="password"` input.
- `EmailField`: a `type="email"` input.
- `UrlField`: a `type="url"` input.
- `TelField`: a `type="tel"` input.
- `SearchField`: a `type="search"` input.

```php
use Windwalker\Form\Field\EmailField;
use Windwalker\Form\Field\PasswordField;

$form->addField(new EmailField('email', 'Email'))
    ->required(true);

$form->addField(new PasswordField('password', 'Password'));
```

`TextareaField` renders a `<textarea>`. Its value is written as the element
content, not as a `value` attribute:

```php
use Windwalker\Form\Field\TextareaField;

$form->addField(new TextareaField('bio', 'Biography'))
    ->rows(5)
    ->cols(40);
```

### Limiting length

`maxlength()` sets the HTML attribute and also adds a `Length` filter. The
filter cuts the submitted value to the limit on the server side:

```php
$form->addField(new TextField('code', 'Code'))
    ->maxlength(6);
```

::: info
The filter truncates the value; it does not reject it. A six-character
limit turns `abcdefgh` into `abcdef` before validation runs. Use a validator
if the input must be rejected instead.
:::

## HTML5 Numeric, Range, and Date Fields

`AbstractHtml5Field` is the base for the typed inputs. It adds `min()`,
`max()`, `range()`, and `step()`:

- `NumberField`: `type="number"`.
- `RangeField`: `type="range"`.
- `ColorField`: `type="color"`.
- `DateField`: `type="date"`.
- `TimeField`: `type="time"`.
- `DatetimeLocalField`: `type="datetime-local"`.
- `MonthField`: `type="month"`.
- `WeekField`: `type="week"`.
- `DatetimeField`: `type="datetime"`.

```php
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Field\RangeField;

$form->addField(new NumberField('quantity', 'Quantity'))
    ->range(1, 10);

$form->addField(new RangeField('volume', 'Volume'))
    ->min(0)
    ->max(100)
    ->step(5);
```

The `min()`, `max()`, and `range()` methods also add a `Range` filter by
default. The filter clamps the value into the range, so `15` becomes `10`
for the example above. Pass `false` as the second argument to set only the
HTML attribute:

```php
$form->addField(new NumberField('quantity', 'Quantity'))
    ->max(10, false);
```

::: info
With `false`, the browser enforces the limit, but the server does not.
Unless the browser is the only client, add a validator or a filter.
:::

## Hidden and File Fields

`HiddenField` renders `type="hidden"`. It is useful for IDs and return
paths that the browser sends back with the form:

```php
use Windwalker\Form\Field\HiddenField;

$form->addField(new HiddenField('id'))
    ->setValue(42);
```

::: warning
A hidden field is only a form control. The client can change its value
before submitting, so validate it like any other input before you use it to
select a record or grant access.
:::

`FileField` renders `type="file"`. It extends `TextField`, so `accept()`
and `multiple()` set the matching attributes:

```php
use Windwalker\Form\Field\FileField;

$form->addField(new FileField('avatar', 'Avatar'))
    ->accept('image/png,image/jpeg');
```

::: warning
The form does not receive, move, or check uploaded files. Read them from
the request's uploaded files, and check the size, type, and destination in
your own code.
:::

## Non-Input Fields

Some fields do not render an input. They take a place in the form layout or
show content next to the inputs:

- `SpacerField`: renders a `<span>` with the `description` attribute, or an
  `<hr>` when `hr(true)` is set.
- `ButtonField`: renders a `<button>` or a link. Its `text()` is shown as
  the button label.
- `CustomHtmlField`: renders the content you pass to `content()` in place of
  an input.

```php
use Windwalker\Form\Field\ButtonField;
use Windwalker\Form\Field\CustomHtmlField;
use Windwalker\Form\Field\SpacerField;

$form->addField(new SpacerField('section'))
    ->hr(true);

$form->addField(new ButtonField('reset', 'Reset'))
    ->text('Reset form');

$form->addField(new CustomHtmlField('notice', 'Notice'))
    ->content('<p class="hint">Changes are saved on submit.</p>');
```

::: warning
`ButtonField::text()` is parsed as HTML, and `CustomHtmlField::content()`
is written into the page without escaping. Pass only trusted markup to these
methods. If the text comes from a user, escape it first with
`htmlspecialchars()`, or put the text in an attribute.
:::

`CustomHtmlField::content()` also accepts a callable. It receives the field,
the element attributes, and the render options, and returns the markup.

## Custom Input Types

If the package has no class for an input type you need, extend `TextField`
and set its protected `$inputType` property, as `PasswordField` does:

```php
use Windwalker\Form\Field\TextField;

class PinField extends TextField
{
    protected string $inputType = 'tel';
}
```

## Related Pages

- [Choice Fields](./choices): Select, checkbox, and radio fields.
- [Data Lifecycle](./data): Filters, validators, and the value each field
  holds.
- [Rendering](./rendering): How fields are turned into HTML.
