---
layout: doc
title: Form
part: Components
chapter: Form
menu: components/form
component: form
---

# Form

Windwalker Form is a builder for HTML forms and the data that flows through them. A form holds a set of fields. Each field knows its name, label, HTML attributes, value, filters, validators, and how it renders. The same objects handle the three jobs every form has: showing values, cleaning submitted input, and checking it before it is stored.

The package keeps these jobs in one place. A form definition describes the fields once. The same definition is used to render the form, to fill it with stored data, to filter a request, and to validate the result. This prevents the common drift where the HTML, the validation rules, and the storage code each list the fields separately.

## Installation

Install via composer:

```bash
composer require windwalker/form ^4.0
```

The package requires PHP 8.4.6 or later.

## Use as Standalone Component

Create a form, add fields, fill them with data, and render them. No container or framework bootstrap is needed:

```php
use Windwalker\Form\Field\EmailField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form = new Form();

$form->addField(new TextField('name', 'Name'))
    ->required(true);

$form->addField(new EmailField('email', 'Email'));

$form->fill(['name' => 'Ann']);

echo $form->renderFields();
```

`renderFields()` outputs a wrapper, label, and input for each field. Rendering is covered on the [Rendering](./rendering) page.

## Use in Windwalker

In a Windwalker application, the `FormPackage` config registers `FormProvider`. It shares a `FormFactory` in the DI container. Use the factory instead of creating `Form` directly, so the form receives the application's object builder and the theme renderer:

```php
use Windwalker\Core\Form\FormFactory;

$formFactory = $app->retrieve(FormFactory::class);

$form = $formFactory->create(UserForm::class);
```

Inject the factory into a service through its constructor when the service builds forms on demand:

```php
use Windwalker\Core\Form\FormFactory;

class UserFormService
{
    public function __construct(
        protected FormFactory $formFactory
    ) {
    }

    public function createUserForm(): \Windwalker\Form\Form
    {
        return $this->formFactory->create(UserForm::class);
    }
}
```

`UserForm` is a definition class. See [Defining Forms](./defining) for how to write one.

## Core Concepts

- **Form**: the container. It stores fields under their full name, such as
  `user/email`, and provides fill, filter, validate, and render methods.
- **Field**: an object extending `AbstractField`. Input fields such as
  `TextField` and `EmailField` map to HTML inputs. `ListField`,
  `CheckboxesField`, and `RadioField` add options.
- **Fieldset**: a display group. It controls which fields are rendered
  together, and it can carry a title.
- **Namespace**: a data path. A field in the `user` namespace is submitted
  as `user[email]` and stored under `user/email`.
- **Renderer**: converts a field into HTML. `SimpleRenderer` is the default.

Fieldsets group fields for display, and namespaces nest them in the data. A fieldset does not change the submitted name, and a namespace does not create a fieldset.

## Topic Pages

- [Defining Forms](./defining): Adding fields, fieldsets, namespaces, and
  definition classes with `#[FormDefine]`.
- [Fields](./fields): The field types, grouped by the HTML they produce.
- [Choice Fields](./choices): Select, checkbox, and radio fields, option
  groups, and enum-backed options.
- [Data Lifecycle](./data): Filling, binding, filtering, validating, and
  preparing data for storage.
- [Rendering](./rendering): Rendering fields, labels, and wrappers, and
  replacing the renderer.

## Related components

- [Filter](../filter/): The filters and validators that fields use.
- [DOM](../dom/): The element tree that fields build their markup with.
