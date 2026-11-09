---
layout: doc
title: Rendering
part: Components
chapter: Form
menu: components/form
component: form
---

# Rendering

A field knows what it holds and how it is validated, but it does not decide
the page layout. Rendering turns the field into HTML: a wrapper, a label,
and an input. Keeping this step separate lets the same form appear in
different layouts, for example a stacked admin page and a compact modal,
without changing the field definitions.

The package provides the default markup. The renderer can be replaced when
your theme needs a different structure.

## Minimal Setup

Every field renders itself with `render()`. A form renders a group of
fields with `renderFields()`:

```php
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form = new Form();

$form->addField(new TextField('title', 'Title'));

echo $form->getField('title')->render();

echo $form->renderFields();
```

`render()` returns a wrapper element containing the label and the input.
Both methods return HTML strings, so they can be echoed directly into a
template.

## Showcase

The following example builds a two-section form and renders it in a view.
The fieldset title is printed above each group:

```php
use Windwalker\Form\Field\EmailField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form = new Form();

$form->fieldset('basic', function (Form $form) {
    $form->addField(new TextField('username', 'Username'))
        ->required(true)
        ->addClass('form-control');
})->title('Basic');

$form->fieldset('account', function (Form $form) {
    $form->addField(new EmailField('email', 'Email'))
        ->placeholder('you@example.com')
        ->addClass('form-control');
})->title('Account');

$form->fill(['username' => 'ann']);
```

In the template, print each fieldset with its title:

```php
<form method="post">
    <fieldset>
        <legend>
            <?= $form->getFieldset('basic')->getTitle() ?>
        </legend>

        <?= $form->renderFields('basic') ?>
    </fieldset>

    <fieldset>
        <legend>
            <?= $form->getFieldset('account')->getTitle() ?>
        </legend>

        <?= $form->renderFields('account') ?>
    </fieldset>
</form>
```

`renderFields()` takes a fieldset name as its first argument. Pass `null`
to render every field, or a namespace as the second argument to render only
the fields inside it.

## Rendering Parts

A field renders in three parts, and each part can be rendered on its own:

- `render()` returns the wrapper, the label, and the input together.
- `renderLabel()` returns the label only.
- `renderInput()` returns the input only.

```php
$field = $form->getField('email');

echo $field->renderLabel();
echo $field->renderInput();
```

Use the separate parts when a template places the label and the input in
different containers, such as a table row.

Pass render options as an array. The `no_label` option omits the label, which
is useful for a field that a layout already labels:

```php
echo $form->getField('username')->render(['no_label' => true]);
```

The same option can be set on the field with `set('no_label', true)`, so it
applies to every render.

## Adjusting the Markup

The wrapper, label, and input can be changed from the field, without a
custom renderer:

```php
$form->getField('email')
    ->addWrapperClass('col-md-6')
    ->addLabelClass('fw-bold')
    ->labelAttr('title', 'Your login email')
    ->addClass('form-control-lg');
```

For more than an attribute, pass a callable that receives the element:

```php
use Windwalker\DOM\HTMLElement;

$form->getField('email')->modifyWrapper(
    function (HTMLElement $wrapper): void {
        $wrapper->addClass('mb-3');
    }
);
```

`modifyLabel()` works the same way on the label. Attribute values and label
text are escaped when the markup is built, so a label such as `Email <b>` is
printed as text:

```php
$form->addField(new EmailField('email', 'Email <b>'));
// <label ...>Email &lt;b&gt;</label>
```

::: info
`label()` sets the label text as plain text. To add markup to a label, such
as an icon, use `modifyLabel()` to append an element.
:::

## Custom Renderers

A form delegates the markup to a renderer. The default is `SimpleRenderer`.
A renderer implements `FormRendererInterface`, which has three methods:
`renderField()`, `renderLabel()`, and `renderInput()`. Each receives the
field and the element built for that part.

A renderer that adds classes to each part, and keeps the default structure
for everything else, can wrap `SimpleRenderer`:

```php
use Windwalker\DOM\HTMLElement;
use Windwalker\Form\Field\AbstractField;
use Windwalker\Form\Renderer\FormRendererInterface;
use Windwalker\Form\Renderer\SimpleRenderer;

class BootstrapRenderer implements FormRendererInterface
{
    public function __construct(
        protected FormRendererInterface $inner = new SimpleRenderer()
    ) {
    }

    public function renderField(
        AbstractField $field,
        HTMLElement $wrapper,
        array $options = []
    ): string {
        $wrapper->addClass('mb-3');

        return $this->inner->renderField($field, $wrapper, $options);
    }

    public function renderLabel(
        AbstractField $field,
        HTMLElement $label,
        array $options = []
    ): string {
        $label->addClass('form-label');

        return $this->inner->renderLabel($field, $label, $options);
    }

    public function renderInput(
        AbstractField $field,
        HTMLElement $input,
        array $options = []
    ): string {
        $input->addClass('form-control');

        return $this->inner->renderInput($field, $input, $options);
    }
}

$form->setRenderer(new BootstrapRenderer());
```

::: tip
Change the markup in one renderer when the whole form needs the same
structure. Use the field-level methods for a single exceptional field.
:::

## Use in Windwalker

Inside a Windwalker application, `FormFactory` gives each form the
application's `FormRenderer`. That renderer looks for the theme layouts
`@theme::form.field-wrapper`, `@theme::form.label`, and
`@theme::form.input`. When a layout exists, it renders the field with it.
When it does not, the renderer falls back to `SimpleRenderer`.

The theme can therefore control the markup of every form by providing those
three layouts, and the form code stays the same. See the
[Overview](./) for how the factory creates a form.

::: info
`setRenderer()` on a form replaces the theme renderer for that form only.
Other forms created by the factory keep the theme renderer.
:::
