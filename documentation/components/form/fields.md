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

## Common Parameters

Every field extends `AbstractField`, so the methods below are available on
all of them. Use this table as a reference, and see the field sections for
the parameters that belong to one class.

| Method | Description |
| --- | --- |
| `__construct(name, label, attributes)` | Name, label text, and HTML attributes of the input. |
| `setValue(mixed $value)` | Sets the current value. |
| `getValue()` | Returns the value after the view filter. |
| `bindValue(&$value)` | Binds the field to a variable by reference. |
| `defaultValue(mixed $value)` | Value used when the field is empty. |
| `required(bool $value)` | Marks the field as required, checked by validation. |
| `isRequired()` | Returns whether the field is required. |
| `disabled(bool $value)` | Disables the input. See the warning on Data Lifecycle. |
| `readonly(bool $value)` | Makes the input read-only. |
| `label(string $label)` | Sets the label text. |
| `getLabelName()` | Returns the label text. |
| `labelAttr(string $name, mixed $value)` | Sets an attribute on the label. |
| `addLabelClass(...$classes)` | Adds classes to the label. |
| `modifyLabel(callable $handler)` | Passes the label element to a callable. |
| `addWrapperClass(...$classes)` | Adds classes to the wrapper element. |
| `modifyWrapper(callable $handler)` | Passes the wrapper element to a callable. |
| `attr(string $name, mixed $value)` | Sets an attribute on the input. |
| `getAttribute(string $name)` | Returns an input attribute, or `null`. |
| `removeAttribute(string $name)` | Removes an input attribute. |
| `addClass(...$classes)` | Adds classes to the input. |
| `removeClass(...$classes)` | Removes classes from the input. |
| `setClass(string $class)` | Replaces the input classes. |
| `id(string $value)` | Sets the input `id` attribute. |
| `help(string $value)` | Stores a help text in the field state. |
| `description(string $value)` | Stores a description in the field state. |
| `addFilter(...$filters)` | Adds a filter used by `Form::filter()`. |
| `addValidator(...$validators)` | Adds a validator used by `Form::validate()`. |
| `addViewFilter(...$filters)` | Adds a filter applied only by `getValue()`. |
| `addEmptyValues(...$values)` | Adds values that `required` treats as empty. |
| `render(array $options)` | Renders the wrapper, label, and input. |
| `renderLabel(array $options)` | Renders the label only. |
| `renderInput(array $options)` | Renders the input only. |

The `help()` and `description()` values are stored with the field. The
package's `SimpleRenderer` does not print them, so print them in your own
template or in a custom renderer.

## Text Inputs

These fields render a text input. Choose the class that matches the type
of data, because each sets a different `type` attribute. The class sets the
`type` itself, so `attr('type', ...)` cannot change it:

- `TextField`: a plain `type="text"` input.
- `PasswordField`: a `type="password"` input.
- `EmailField`: a `type="email"` input.
- `SearchField`: a `type="search"` input.
- `UrlField`: a `type="url"` input.
- `TelField`: a `type="tel"` input.

### TextField

`TextField` is the base of the text inputs. It also provides the methods
that the other text-based fields inherit.

- `placeholder(string $value)`: sets the `placeholder` attribute.
- `size(string $value)`: sets the `size` attribute.
- `autofocus(string $value)`: sets the `autofocus` attribute.
- `autocomplete(string $value)`: sets the `autocomplete` attribute.
- `pattern(string $value)`: sets the `pattern` attribute.
- `maxlength(?int $length, bool $addFilter = true, bool $utf8 = true)`:
  sets the `maxlength` attribute and adds a `Length` filter.
- `option(text, value, attrs, group)`: adds a suggestion, rendered as a
  `<datalist>`. See [Choice Fields](./choices#text-fields-with-suggestions).

```php
use Windwalker\Form\Field\TextField;

$form->addField(new TextField('code', 'Code'))
    ->placeholder('ABC123')
    ->pattern('[A-Z0-9]+')
    ->maxlength(6);
```

The `maxlength()` filter truncates the submitted value to the limit on the
server side:

```php
$form->addField(new TextField('code', 'Code'))
    ->maxlength(6);
```

::: info
The filter truncates the value; it does not reject it. A six-character
limit turns `abcdefgh` into `abcdef` before validation runs. Use a validator
if the input must be rejected instead.
:::

### PasswordField

`PasswordField` has no methods of its own. It inherits everything from
`TextField`.

```php
use Windwalker\Form\Field\PasswordField;

$form->addField(new PasswordField('password', 'Password'))
    ->autocomplete('new-password');
```

### EmailField

`EmailField` has no methods of its own. It inherits everything from
`TextField`. Add `EmailAddress` or the `email` filter if the server must
check the value, because the browser check can be bypassed.

```php
use Windwalker\Form\Field\EmailField;

$form->addField(new EmailField('email', 'Email'))
    ->required(true);
```

### SearchField

`SearchField` has no methods of its own. It inherits everything from
`TextField`.

```php
use Windwalker\Form\Field\SearchField;

$form->addField(new SearchField('q', 'Search'))
    ->placeholder('Keywords');
```

### UrlField

`UrlField` renders `type="url"`. It extends `AbstractHtml5Field`, so the
`TextField` and range methods are available. Set `attr('pattern', ...)`
only as a hint; validate the URL on the server with the `url` filter or
`UrlAddress`.

```php
use Windwalker\Form\Field\UrlField;

$form->addField(new UrlField('website', 'Website'))
    ->placeholder('https://example.com');
```

### TelField

`TelField` renders `type="tel"`. It extends `AbstractHtml5Field`, so the
`TextField` and range methods are available.

```php
use Windwalker\Form\Field\TelField;

$form->addField(new TelField('phone', 'Phone'))
    ->autocomplete('tel');
```

### TextareaField

`TextareaField` renders a `<textarea>`. Its value is written as the element
content, not as a `value` attribute. It inherits the `TextField` methods.

- `rows(string|int $value)`: sets the `rows` attribute.
- `cols(string|int $value)`: sets the `cols` attribute.

```php
use Windwalker\Form\Field\TextareaField;

$form->addField(new TextareaField('bio', 'Biography'))
    ->rows(5)
    ->cols(40);
```

## HTML5 Typed Inputs

`AbstractHtml5Field` is the base for the typed inputs. It extends
`TextField`, so the `TextField` methods are also available. It adds the
range methods below:

| Method | Description |
| --- | --- |
| `min(?int $min, bool $addFilter = true)` | Sets the `min` attribute. Adds a `Range` filter with the minimum. |
| `max(?int $max, bool $addFilter = true)` | Sets the `max` attribute. Adds a `Range` filter with the maximum. |
| `range(?int $min, ?int $max, bool $addFilter = true)` | Sets `min` and `max` together, and adds one `Range` filter. |
| `step(int\|float\|string $value)` | Sets the `step` attribute. It does not add a filter. |

The fields below inherit these methods. Each one differs only in its `type`:

- `NumberField`: `type="number"`.
- `RangeField`: `type="range"`.
- `ColorField`: `type="color"`.
- `DateField`: `type="date"`.
- `TimeField`: `type="time"`.
- `DatetimeLocalField`: `type="datetime-local"`.
- `MonthField`: `type="month"`.
- `WeekField`: `type="week"`.
- `DatetimeField`: `type="datetime"`.

### NumberField

`NumberField` has no methods of its own beyond the range methods.

```php
use Windwalker\Form\Field\NumberField;

$form->addField(new NumberField('quantity', 'Quantity'))
    ->range(1, 10);
```

The `min()`, `max()`, and `range()` methods add a `Range` filter by default.
The filter clamps the value into the range, so `15` becomes `10` for the
example above. Pass `false` as the second argument to set only the HTML
attribute:

```php
$form->addField(new NumberField('quantity', 'Quantity'))
    ->max(10, false);
```

::: info
With `false`, the browser enforces the limit, but the server does not.
Unless the browser is the only client, add a validator or a filter.
:::

### RangeField

`RangeField` has no methods of its own. Use `step()` to set the slider
increment.

```php
use Windwalker\Form\Field\RangeField;

$form->addField(new RangeField('volume', 'Volume'))
    ->min(0)
    ->max(100)
    ->step(5);
```

### ColorField

`ColorField` has no methods of its own.

```php
use Windwalker\Form\Field\ColorField;

$form->addField(new ColorField('accent', 'Accent color'))
    ->setValue('#336699');
```

### DateField

`DateField` has no methods of its own. Set the date limits with `attr()`,
using values in `YYYY-MM-DD` format:

```php
use Windwalker\Form\Field\DateField;

$form->addField(new DateField('starts_on', 'Start date'))
    ->attr('min', '2026-01-01');
```

The `min()` and `max()` methods accept integers only, so they cannot set
date limits. Add a validator if the server must enforce the range.

### TimeField

`TimeField` has no methods of its own.

```php
use Windwalker\Form\Field\TimeField;

$form->addField(new TimeField('opens_at', 'Opens at'))
    ->step(60);
```

### DatetimeLocalField

`DatetimeLocalField` has no methods of its own.

```php
use Windwalker\Form\Field\DatetimeLocalField;

$form->addField(new DatetimeLocalField('publish_at', 'Publish at'));
```

### MonthField

`MonthField` has no methods of its own.

```php
use Windwalker\Form\Field\MonthField;

$form->addField(new MonthField('billing_month', 'Billing month'));
```

### WeekField

`WeekField` has no methods of its own.

```php
use Windwalker\Form\Field\WeekField;

$form->addField(new WeekField('sprint', 'Sprint'));
```

### DatetimeField

`DatetimeField` has no methods of its own. It renders `type="datetime"`,
which is no longer part of the HTML standard. Prefer `DatetimeLocalField`
for new forms.

```php
use Windwalker\Form\Field\DatetimeField;

$form->addField(new DatetimeField('legacy_at', 'Date and time'));
```

## Hidden Field

`HiddenField` renders `type="hidden"`. It extends `TextField` and has no
methods of its own. It is useful for IDs and return paths that the browser
sends back with the form:

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

## File Field

`FileField` renders `type="file"`. It extends `TextField` and adds the
attributes below:

- `accept(string $value)`: sets the `accept` attribute, such as
  `image/png,image/jpeg`.
- `multiple(bool $value)`: allows selecting several files.
- `capture(mixed $value)`: sets the `capture` attribute for mobile devices.
- `getCapture()`: returns the `capture` value.

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

## Checkbox Field

`CheckboxField` renders a single `type="checkbox"` input. Its value is
checked when the stored value is truthy. It has one method of its own:

- `checkedValue(mixed $value)`: sets the value submitted when the box is
  checked. The default is `on`.

```php
use Windwalker\Form\Field\CheckboxField;

$form->addField(new CheckboxField('agree', 'I agree'))
    ->checkedValue('yes');
```

## Non-Input Fields

Some fields do not render an input. They take a place in the form layout or
show content next to the inputs:

- `SpacerField`: renders a `<span>` with the `description` attribute, or an
  `<hr>` when `hr(true)` is set.
- `ButtonField`: renders a `<button>` or a link. Its `text()` is shown as
  the button label.
- `CustomHtmlField`: renders the content you pass to `content()` in place of
  an input.

### SpacerField

`SpacerField` extends `AbstractField`, not `TextField`.

- `hr(bool $value)`: renders an `<hr>` instead of a `<span>`.
- `tag(string $value)`: sets the element name when `hr` is not used.
- `description`: set with `attr('description', ...)`. It becomes the text
  of the element.

```php
use Windwalker\Form\Field\SpacerField;

$form->addField(new SpacerField('section'))
    ->hr(true);

$form->addField(new SpacerField('note'))
    ->tag('p')
    ->attr('description', 'Changes are saved on submit.');
```

### ButtonField

`ButtonField` renders a `<button>`. Set `element('a')` to render a link.

- `text(string $value)`: the label of the button.
- `buttonType(string $value)`: sets the `type` attribute, such as `submit`.
- `element(string $value)`: the element name, `button` by default.
- `href(string $value)`: the link target, used with `element('a')`.
- `target(string $value)`: the link target window, such as `_blank`.

```php
use Windwalker\Form\Field\ButtonField;

$form->addField(new ButtonField('reset', 'Reset'))
    ->text('Reset form');

$form->addField(new ButtonField('docs', 'Docs'))
    ->element('a')
    ->href('/docs')
    ->target('_blank')
    ->text('Open docs');
```

::: warning
`ButtonField::text()` is parsed as HTML. Pass only trusted markup to it. If
the text comes from a user, escape it first with `htmlspecialchars()`.
:::

::: info
Use `element('a')` for a link. Do not rely on the `ButtonField::ELEMENT_LINK`
constant, because it produces a `<link>` element.
:::

### CustomHtmlField

`CustomHtmlField` has one method of its own:

- `content(string|HTMLElement|callable $content)`: the markup to render. A
  callable receives the field, the element attributes, and the render
  options, and returns the markup.

```php
use Windwalker\Form\Field\CustomHtmlField;

$form->addField(new CustomHtmlField('notice', 'Notice'))
    ->content('<p class="hint">Changes are saved on submit.</p>');

$form->addField(new CustomHtmlField('stamp', 'Stamp'))
    ->content(
        fn ($field, $attrs, $options) =>
            '<time>' . date('Y-m-d') . '</time>'
    );
```

::: warning
`CustomHtmlField::content()` is written into the page without escaping. Pass
only trusted markup to it, or escape any user value first.
:::

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

- [Choice Fields](./choices): Select, checkbox group, and radio fields.
- [Data Lifecycle](./data): Filters, validators, and the value each field
  holds.
- [Rendering](./rendering): How fields are turned into HTML.
