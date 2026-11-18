---
layout: doc
title: Form
---

# Form

# Form

Forms are where untrusted input enters an application.
A registration page, for example, must render a set of inputs, fill them with existing data when editing, validate what the user submitted, and filter it before it reaches the database.
The Form service keeps these steps in one definition, so the View and the Controller describe the same fields instead of repeating them.

## Minimal Setup

A form is built from four parts:

- `FormFactory` creates `Form` instances from the DI container.
- `Form` holds the fields, fills them, filters, validates, and renders them.
- `Fieldset` and `NS` attributes group fields into sections and namespaces.
- Field classes, such as `TextField` and `PasswordField`, describe each input.

Obtain the factory from the container, then create the form from a definition class.

```php
use Windwalker\Core\Form\FormFactory;

// In a constructor or a method that receives the application
$formFactory = $app->retrieve(FormFactory::class);

$form = $formFactory->create(UserForm::class);
```

::: info
`FormFactory` is registered as a shared object, so the same instance is reused across the application.
:::

## Using Form in a View

This example defines a profile form in a View. It uses a fieldset, a namespace, registered fields, a custom adjustment, and pre-filled data.

```php
namespace App\View\User;

use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\Fieldset;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\PasswordField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

#[FormDefine]
#[Fieldset('user', 'User')]
#[NS('user')]
class UserProfileForm
{
    // Registered fields are added to the form by the attribute resolver
    public function username(): TextField
    {
        return (new TextField('username', 'Username'))
            ->required(true);
    }

    public function email(): TextField
    {
        return (new TextField('email', 'Email'))
            ->required(true);
    }

    public function password(): PasswordField
    {
        return (new PasswordField('password', 'Password'))
            ->attr('placeholder', 'Leave blank to keep');
    }
}
```

The View creates the form, adjusts it, fills it with data, and passes it to the template.

```php
namespace App\View\User;

use Windwalker\Core\Form\FormFactory;
use Windwalker\Core\View\AbstractView;

class UserProfileView extends AbstractView
{
    public function prepare(): array
    {
        $form = $this->container->get(FormFactory::class)
            ->create(UserProfileForm::class);

        // Custom adjustment: add a class to the email input
        $form->getField('user/email')?->addClass('form-control-lg');

        // Pre-fill the fields from the existing record
        $form->fill([
            'username' => 'foo',
            'email' => 'foo@example.com',
        ]);

        return compact('form');
    }
}
```

::: info
The `user/` prefix comes from the `#[NS('user')]` attribute.
Fields are addressed by `namespace/name` in methods such as `getField()`.
:::

::: tip
Use `#[FormDefine]` on each method that registers fields, and keep those methods free of request logic.
:::

The template renders the whole form or a single field.

```php
<?= $form->renderFields() ?>

<?= $form->renderField('user/email') ?>
```

### Defining Fieldsets and Namespaces

`#[Fieldset]` groups fields under a named section with an optional title.
`#[NS]` prefixes the names of the fields that follow it, so `username` becomes `user/username`.
Use `ns()` or its alias `group()` when you need the namespace inside a method.

```php
use Windwalker\Form\Form;

// Inside a definition method
$form->ns('billing', function (Form $form) {
    // Field names become billing/...
});
```

For the full definition syntax, see [Defining Forms](/documentation/components/form/defining).

### Registering Fields

Fields can be added as an instance, a class name, or a callable.

```php
use Windwalker\Form\Field\TextField;

// Instance
$form->addField(new TextField('user/username', 'Username'));

// Named form field with a fieldset
$form->add('user/email', TextField::class, 'user');

// Callable that receives the form and the name
$form->add('user/phone', fn ($form, $name) => new TextField($name));
```

::: info
`add()` throws `InvalidArgumentException` when the value does not resolve to an `AbstractField`.
:::

See [Fields](/documentation/components/form/fields) for the available field types and their options.

### Injecting Custom Content to Adjust Fields

A definition can use `Form::register()` or `Form::wrap()` to run closures against the form.
Fields are also adjusted after creation, using methods like `addClass()`, `addFilter()`, and `addValidator()`.

```php
use Windwalker\Filter\Rule\CastTo;
use Windwalker\Filter\Rule\EmailAddress;

$form->getField('user/email')
    ?->addFilter(new CastTo('string'))
    ?->addValidator(EmailAddress::class);
```

### Filling Data

`fill()` sets values on registered fields. Fields that are not registered are ignored.

```php
// Pre-fill from a record
$form->fill($user->toArray());

// Fill a nested path
$form->fillTo('user', $user->toArray());
```

By default, `fill()` decodes JSON strings and nested JSON values.
Pass `false` as the second argument to keep them as they are.

```php
// Keep JSON strings untouched
$form->fill($data, false);
```

## Using Form in a Controller

Controllers use the same definition to check and prepare submitted data.
The request data is passed through `filter()`, `validate()`, and then `prepareStore()`.

```php
namespace App\Controller\User;

use Windwalker\Core\Form\FormFactory;

// Inside a controller method, with $data holding the request values
$form = $formFactory->create(UserProfileForm::class);

// Filter first, then validate the filtered data
$filtered = $form->filter($data);
$result = $form->validate($filtered);

if ($result->isFailure()) {
    // Return to the form with the errors
}

// Keep only the registered fields and prepare them for storage
$values = $form->prepareStore($filtered);

// Save $values using a repository or model
```

`validate()` returns a `ResultSet`.
Use `getResult('user/email')` to read the outcome of a single field.

```php
$emailResult = $result->getResult('user/email');

if ($emailResult?->isFailure()) {
    // Show the message for the email field only
}
```

::: warning
Do not store request data without calling `validate()` and `prepareStore()`.
Skipping them stores unchecked values, and `prepareStore()` only returns the fields that are registered in the form.
:::

::: info
The framework's own tests call `validate()` on the output of `filter()`, so validators see the cleaned values.
:::

For the rules that run in the validation step, see [Validation and Filter](/documentation/framework/core-concepts/http-routing/validation-and-filter).

## Customizing Field Layout

`FormRenderer` renders each part of a field through a theme layout when it exists:

- `@theme::form.field-wrapper` wraps the label and input.
- `@theme::form.label` renders the label.
- `@theme::form.input` renders the input.

If a layout is missing, the field is rendered by the built-in `SimpleRenderer`.
Create the layouts in your theme to change the markup for every form.

```php
// Set a custom renderer on the form
$form->setRenderer($customRenderer);

// Render one field with the current renderer
echo $form->renderField('user/email', ['class' => 'mb-3']);
```

::: tip
Customize one layout at a time.
Start with `form.input` and keep the field wrapper unchanged until the input markup is correct.
:::

::: info
The `@theme::` namespace is resolved through the renderer's paths.
The configuration that maps this namespace in the host app was not verified in the source.
:::

For the full renderer options, see [Rendering](/documentation/components/form/rendering).

## Related Topics

- [Form component](/documentation/components/form/index) for standalone usage.
- [Defining Forms](/documentation/components/form/defining) for attributes and definition syntax.
- [Fields](/documentation/components/form/fields) for field types and options.
- [Data](/documentation/components/form/data) for filling and binding.
- [Rendering](/documentation/components/form/rendering) for renderers and layouts.
- [Validation and Filter](/documentation/framework/core-concepts/http-routing/validation-and-filter) for request validation.


- 如何在 View 中使用 Form
  - 如何定義 Form Fieldset NS(group)
  - 如何註冊 Fields
  - 如何注入自訂內容用來調整 Fields
  - 如何 fill data 讓 Fields 預先填入內容
- 如何在 Controller 中也建立 Form 來做 Validation & Filter & prepareStore
- 如何客制化 fields layout
- 更詳細的說明可以連回 components 介紹
- 任何你覺得值得追加的項目
