---
layout: doc
title: Defining Forms
part: Components
chapter: Form
menu: components/form
component: form
---

# Defining Forms

A form is easy to build for two fields and hard to maintain at twenty. The names, labels, groups, and filters tend to be repeated in the view, the controller, and the save logic. A form definition keeps the field list in one place, so every later step works from the same structure.

Windwalker Form supports two styles. You can build the form imperatively with `addField()` in a script or service, or you can declare it in a definition class with attributes. Both produce the same `Form` object.

## Adding Fields

A field is created with its name, label, and optional attributes, then added to the form. The `addField()` method accepts an optional fieldset and an optional namespace:

```php
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form = new Form();

$form->addField(new TextField('id', 'ID'));

$form->addField(new TextField('username', 'Username'), 'basic');

$form->addField(new TextField('email', 'Email'), null, 'user');

echo $form->getField('user/email')->getInputName();
// user[email]
```

The field is stored under its full name, `user/email`. Use the same full name with `getField()`, `hasField()`, and `removeField()`.

::: info
Adding a second field with the same full name replaces the first one
without a warning.
:::

`add()` is a shorter form that accepts a class name or a callable instead of
an object. The callable receives the form and the field name:

```php
use Windwalker\Form\Field\ListField;
use Windwalker\Form\Field\TextareaField;

$form->add('bio', TextareaField::class);

$form->add(
    'role',
    fn (Form $form, string $name) => new ListField($name, 'Role')
);
```

When you pass a class name, the return value is the field instance, so you
can keep configuring it. Windwalker declares `add()` with a generic template
(`class-string<T>` returns `T`), so an IDE infers the concrete field type
without an extra annotation:

```php
$bio = $form->add('bio', TextareaField::class);

// $bio is inferred as TextareaField, so rows() is available.
$bio->rows(5);
```

The native return type is `AbstractField`. The concrete type is known from
the generic annotation for static analysis, and at runtime the object is the
class you passed.

## Fieldsets

A fieldset groups fields for display. Fields in one fieldset are rendered
together, and the fieldset can carry a title. Use `fieldset()` with a
callback to add fields to it:

```php
$form->fieldset('basic', function (Form $form) {
    $form->addField(new TextField('id', 'ID'));
})->title('Basic');

$fieldset = $form->getFieldset('basic');
```

A fieldset does not change the submitted name of its fields. `id` is still
submitted as `id`.

The same fieldset can also be declared with the `#[Fieldset]` attribute on a
closure, passed to `register()`. The attribute's first argument is the name,
so it cannot be omitted:

```php
$form->register(
    #[Fieldset('basic', 'Basic')]
    function (Form $form) {
        $form->addField(new TextField('id', 'ID'));
    }
);
```

`#[Fieldset(title: 'Basic')]` without a name throws an
`ArgumentCountError`. Passing the attribute to `fieldset()` also works, but
it repeats the name, so use `fieldset()` with `->title()` or `register()`.

## Namespaces

A namespace nests fields in the submitted data. Use `ns()` with a callback,
or `group()`, which is an alias:

```php
$form->ns('user', function (Form $form) {
    $form->addField(new TextField('email', 'Email'));
});

echo $form->getField('user/email')->getInputName();
// user[email]
```

Namespaces can be nested with a slash, such as `ns('user/profile', ...)`.
A namespace is not a fieldset. Fields in a namespace are not grouped for
display unless you also add them to a fieldset.

The `#[NS]` attribute works the same way, through `register()`:

```php
$form->register(
    #[NS('user')]
    function (Form $form) {
        $form->addField(new TextField('email', 'Email'));
    }
);

echo $form->getField('user/email')->getInputName();
// user[email]
```

::: info
Do not combine `#[NS]` with `ns()` for the same namespace. The name is
applied twice, and the field becomes `user/user/email`.
:::

### Nested namespaces in names

A namespace is written with slashes, and the submitted name nests one level
for each segment. The field `foo/bar/yoo/fieldname` is submitted as
`foo[bar][yoo][fieldname]`:

```php
$form->ns('foo/bar/yoo', function (Form $form) {
    $form->addField(new TextField('fieldname', 'Field'));
});

$field = $form->getField('foo/bar/yoo/fieldname');

echo $field->getInputName();
// foo[bar][yoo][fieldname]
```

The same rule applies to the `name` attribute in the rendered HTML, so the
submitted data is nested in the same shape that `fill()` and `getValues()`
expect.

## Selecting Fields

Once fieldsets and namespaces are declared, `getFields()` accepts a fieldset name and a namespace. Pass `null` to skip
one of the filters. The result is a generator keyed by each field's full
name:

```php
foreach ($form->getFields('basic') as $name => $field) {
    echo $field->render();
}

foreach ($form->getFields(null, 'user') as $name => $field) {
    echo $field->render();
}
```

`renderFields()` uses the same filters, so the two methods select the same
fields. Use `renderFields()` when you only need the HTML, and `getFields()`
when the template needs each field object:

```php
echo $form->renderFields(null, 'user');
```

Both filters are applied together. A field must match the fieldset and the
namespace to be returned:

```php
$form->getFields('basic', 'user');
// Only fields in both the basic fieldset and the user namespace
```

::: info
A namespace matches exactly. `getFields(null, 'user')` does not include
fields in `user/profile`. Call `getFields()` once for each nested namespace
you need.
:::

## Definition Classes

A definition class groups the fields of one form. It can implement
`FieldDefinitionInterface`, or it can be a plain object whose methods are
marked with `#[FormDefine]`. Each marked method receives the `Form` and adds
its fields. `#[Fieldset]` and `#[NS]` on the method apply the group to every
field the method adds:

```php
use Windwalker\Form\Attributes\Fieldset;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\EmailField;
use Windwalker\Form\Field\PasswordField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

class UserForm
{
    #[FormDefine]
    #[Fieldset('basic', 'Basic')]
    public function basic(Form $form): void
    {
        $form->addField(new TextField('id', 'ID'));

        $form->addField(new TextField('username', 'Username'))
            ->required(true);
    }

    #[FormDefine]
    #[Fieldset('account', 'Account')]
    #[NS('account')]
    public function account(Form $form): void
    {
        $form->addField(new EmailField('email', 'Email'))
            ->required(true);

        $form->addField(new PasswordField('password', 'Password'));
    }
}
```

Apply the definition with `defineFormFields()`. It accepts an object or a
class name:

```php
$form = (new Form())->defineFormFields(new UserForm());

// Or let the object builder create the definition:
$form = (new Form())->defineFormFields(UserForm::class);
```

Inside Windwalker, `FormFactory::create(UserForm::class)` does this for you,
as shown on the [Overview](./).

### Ordering

Methods are registered in the order given by the `ordering` argument of
`#[FormDefine]`. Lower values come first. A method without `ordering` uses
its position in the class, so set `ordering` explicitly when the sequence
matters:

```php
#[FormDefine(ordering: 1)]
#[Fieldset('meta')]
public function meta(Form $form): void
{
    $form->addField(new TextField('address', 'Address'));
}
```

Check the result with `getFieldsets()` or `getFields()` when the order is
important to your templates.

### Closure definitions

For a small form, pass a callable to `defineFormFields()` instead of a
class. The callable receives the form and adds its fields. Group them with
`fieldset()` or `ns()` inside the callable:

```php
$form->defineFormFields(function (Form $form) {
    $form->ns('post', function (Form $form) {
        $form->addField(new TextField('title', 'Title'));
    });
});
```

::: tip
Keep one definition class for each form that is rendered or stored in more
than one place. The view and the save logic then read the same field list.
:::
