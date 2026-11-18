---
layout: doc
title: Form Service
description: Define, fill, validate and render forms with the Windwalker form service.
---

# Form Service

The form service builds forms from plain PHP objects. A form is defined
once, then reused to fill values, filter and validate input, and render HTML.

When each controller and template builds its own fields, the field names,
validation rules and markup drift apart. A shared definition keeps them in
sync.

## Minimal Setup

Create a definition class. Mark each method with `#[FormDefine]` and add
the fields with `addField()`.

> !review
> 可以優先用 `add('name', FieldClass::class)` 的作法來介紹
> add() 有提供 generics

```php
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Field\EmailField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

class UserForm
{
    #[FormDefine]
    public function define(Form $form): void
    {
        $form->addField(new TextField('name', 'Name'))
            ->required(true);

        $form->addField(new EmailField('email', 'Email'))
            ->required(true);
    }
}
```

The form is built by `FormFactory`. Get it from the container, or inject it
into a constructor.

```php
use Windwalker\Core\Form\FormFactory;

$formFactory = $app->retrieve(FormFactory::class);
$form = $formFactory->create(UserForm::class);
```

For more about service lookup, see
[Service Variants](/documentation/framework/core-concepts/dependency-injection/service-variants).

## Complete Example

The following example defines a form, fills it with stored data, filters
and validates a submitted request, and renders the result.

```php
use Windwalker\Core\Form\FormFactory;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Field\EmailField;
use Windwalker\Form\Field\PasswordField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

class UserForm
{
    #[FormDefine]
    public function define(Form $form): void
    {
        $form->ns('user', function (Form $form) {
            $form->addField(new TextField('name', 'Name'))
                ->required(true);

            $form->addField(new EmailField('email', 'Email'))
                ->required(true);

            $form->addField(new PasswordField('password', 'Password'));
        });
    }
}

$form = $formFactory->create(UserForm::class);

// Fill the form with stored data.
$form->fill([
    'user' => [
        'name' => 'Alice',
        'email' => 'alice@example.com',
    ],
]);

// Filter and validate the submitted data.
$data = $form->filter($input);
$result = $form->validate($data);

if ($result->isFailure()) {
    // ERROR: $result->getResult('user/email') reports the failed field.
    $first = $result->first();
}

// Render all fields.
echo $form->renderFields();
```

## Defining Fields

### Field Classes

Each field is a class in the `Windwalker\Form\Field` namespace. The
constructor takes the field name and label. Options are set by chained
calls, such as `required(true)` and `attr()`.

> !review
> 用 min() 示範，attr() 可以示範 attr('data-bs-toggle', 'tooltip') 之類的自訂屬性

```php
use Windwalker\Form\Field\DateField;
use Windwalker\Form\Field\TextareaField;

$form->addField(new TextareaField('bio', 'Biography'));

$form->addField(new DateField('starts_on', 'Start date'))
    ->attr('min', '2026-01-01');
```

See the [Fields](/documentation/components/form/fields) reference for the full list of
field types.

### Adding by Class Name

`add()` creates the field from a class name. It returns the field.

```php
$bio = $form->add('bio', TextareaField::class);
```

### Namespaces and Fieldsets

> !review
> 說明 ns() 產出的 name 會長怎麼樣
> 詳細看一下 @documentation/components/form 內的文件
> 依照文件內容增補本篇文件

`ns()` prefixes field names with a namespace. A field named `email` inside
`ns('user')` has the full name `user/email`. Use `getField()` with that
full name.

```php
$form->ns('user', function (Form $form) {
    $form->addField(new TextField('email', 'Email'));
});

echo $form->getField('user/email')->getInputName();
```

`fieldset()` groups fields under a name. `getFieldset()` returns the group.

```php
$form->fieldset('basic', function (Form $form) {
    $form->addField(new TextField('id', 'ID'));
});
```

::: info
`getFields()` matches the namespace exactly. It does not match prefixes, so
`getFields(null, 'user')` does not return fields in `user/profile`.
:::

### Choices

Select, radio and checkbox fields take their options from a choice list.
See [Choices](/documentation/components/form/choices) for the option APIs.

## Filling Data

`fill()` assigns an array to the form. JSON-looking strings are decoded by
default. Pass `false` as the second argument to keep them as plain text.

```php
$form->fill($data);

// Keep JSON-looking strings as plain text.
$form->fill($data, false);
```

`getValues()` returns the current values. `fillTo()` copies the values to
another object or array. See [Data](/documentation/components/form/data) for the full data
workflow.

## Filtering and Validation

`filter()` applies each field's filters and skips disabled fields.
`validate()` checks the data and returns a `ResultSet`.

```php
$data = $form->filter($input);
$result = $form->validate($data);

if ($result->isFailure()) {
    $first = $result->first();
}
```

`ResultSet::getResult()` takes the full namespaced field name, such as
`user/email`. Each `ValidateResult` has these status codes:

- `ValidateResult::STATUS_SUCCESS` (200): the value passed.
- `ValidateResult::STATUS_REQUIRED` (400): a required value is missing.
- `ValidateResult::STATUS_FAILURE` (500): a rule rejected the value.

`prepareStore()` returns the filtered and validated values, ready for
storage.

For the filters and validation rules, see
[Validation and Filter](/documentation/framework/core-concepts/http-routing/validation-and-filter)
and the [Filter](/documentation/components/filter/) component.

## Rendering

`renderFields()` renders every field. `renderField()` renders one field by
its full name.

```php
echo $form->renderField('user/email');
```

`setRenderer()` replaces the renderer. The default `FormRenderer` looks up
the `@theme::form.field-wrapper`, `@theme::form.label` and
`@theme::form.input` templates. When they are missing, it uses a simple
built-in renderer.

See [Rendering](/documentation/components/form/rendering) for the rendering API.

## Using Forms in a View

> !review
> 介紹 CustomForm class 內注入一些外部參數，例如從 input 送進來的內容
> 然後據此改變 fields 內容
> FormFactory create() 是支援注入的

Views receive the form from `FormFactory`, fill it with the record, and
pass it to the template. For the full pattern, see
[View](/documentation/guides/mvc/view) and [Admin](/documentation/guides/mvc/admin). The Unicorn
edit-form tutorial is at [Edit Forms](/documentation/guides/rad/edit-forms).

The short example below follows the pattern in those guides.

```php
use Windwalker\Core\Form\FormFactory;

class UserEditView
{
    public function __construct(
        protected FormFactory $formFactory,
    ) {
    }

    public function prepare(array $item): array
    {
        $form = $this->formFactory->create(UserForm::class);
        $form->fill(['user' => $item]);

        return compact('form');
    }
}
```

## Reminders

::: warning
Do not store request data without calling `filter()` and `validate()`
first. Unvalidated input can reach your database.
:::

::: tip
Keep one definition class per form. Controllers, views and renderers should
all use the same class so the field names stay consistent.
:::
