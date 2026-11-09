---
layout: doc
title: Data Lifecycle
part: Components
chapter: Form
menu: components/form
component: form
---

# Data Lifecycle

Form data takes a round trip. A record from storage fills the form for
editing. The submitted request is cleaned by filters, checked by validators,
and then prepared for storage. Each step reads the same field definitions,
so the rules are written once and cannot disagree with the HTML.

The request is the untrusted part. Filters make it safe to use, and
validators decide whether it is acceptable. Keep both steps on the server,
even when the browser already checked the input.

## Minimal Setup

A field's filters and validators are attached with `addFilter()` and
`addValidator()`. Then the form processes an array of input:

```php
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form = new Form();

$form->addField(new TextField('username', 'Username'))
    ->required(true)
    ->addFilter('cmd');

$filtered = $form->filter($data);
$result = $form->validate($filtered);
```

`$data` is the array of request values, keyed by field name. Nested
namespaces are read from nested arrays, so `user/email` is found at
`$data['user']['email']`.

## Showcase

The following example runs the full cycle for a sign-up form. It filters the
request, validates the result, and prepares the record for storage:

```php
use Windwalker\Form\Field\EmailField;
use Windwalker\Form\Field\PasswordField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form = new Form();

$form->addField(new TextField('username', 'Username'))
    ->required(true)
    ->addFilter('cmd')
    ->defaultValue('guest');

$form->addField(new EmailField('email', 'Email'))
    ->required(true)
    ->addValidator('email');

$form->addField(new PasswordField('password', 'Password'))
    ->required(true);

$data = [
    'username' => 'ann<script>',
    'email' => 'ann@example.com',
    'password' => 'secret',
    'extra' => 'ignored',
];

$filtered = $form->filter($data);
$result = $form->validate($filtered);

if ($result->isFailure()) {
    $failure = $result->getFirstFailure();

    // Show the error for $failure->getField()
}

$record = $form->prepareStore($filtered);
// ['username' => 'annscript', 'email' => ..., 'password' => ...]
```

`filter()` removes `extra` because it is not a field. It also removes the
`<script>` characters from `username` with the `cmd` filter. The `validate()`
call runs on the filtered values, so the validators see the same data that
will be stored.

## Filling the Form

`fill()` sets the value of every field whose name is present in the data.
Nested arrays fill nested namespaces, so `['user' => ['email' => ...]]`
fills `user/email`:

```php
$form->fill([
    'username' => 'ann',
    'user' => ['email' => 'ann@example.com'],
]);

$values = $form->getValues();
```

`getValues()` returns the current values as a nested array. Use it to read
the form after it was filled, bound, or edited.

`fillTo()` places the data under a path first. Use it when the data does
not start at the root:

```php
$form->fillTo('user', ['email' => 'ann@example.com']);
```

::: warning
`fill()` decodes any string that looks like JSON, including a plain text
field. The text `[1,2]` becomes an array, and the field then shows the
string `Array()`. Pass `false` as the second argument when the input is text:

```php
$form->fill($data, false);
```
:::

## Binding to an Array

`bind()` connects the fields to an array by reference, so the field and the
array share the same value:

```php
$data = ['username' => 'ann'];

$form->bind($data);

$form->getField('username')->setValue('tom');

echo $data['username'];
// tom
```

Use `bind()` when the array is also the record you will save, and you want
the edits to appear in it. Do not bind an array that you still need in its
original state.

::: info
A bound field writes into the array as soon as its value changes, so the
array always reflects the form's values. Keep a copy of the original data
if you still need it.
:::

## Filtering

`filter()` returns a new array with each field's value cleaned by its
filters. Only the fields whose names are present in the data are included:

```php
$filtered = $form->filter($data);
```

Pass a flag to change this behavior:

- `Form::FILTER_KEEP_DATA` keeps the keys that are not fields in the result.
- `Form::FILTER_USE_DEFAULT_VALUE` includes every field. A missing or empty
  value becomes the field's default, or `null` when there is none.

```php
$filtered = $form->filter(
    $data,
    Form::FILTER_USE_DEFAULT_VALUE
);
```

Filters are added by name, by class, or as a callable. A string may hold
several filters separated by `|`, and `func()` wraps a PHP function:

```php
use Windwalker\Filter\Rule\Range;

$form->addField(new TextField('slug', 'Slug'))
    ->addFilter('cmd|func(strtolower)');

$form->addField(new TextField('score', 'Score'))
    ->addFilter(new Range(0, 100));
```

Common names include `alnum`, `cmd`, `email`, `url`, `int`, `float`,
`string`, and `bool`. Filter classes live in the
[Filter](../filter/) package.

::: warning
A disabled field is not filtered or validated. Its value passes through
unchanged, and validation always succeeds. Browsers do not send disabled
inputs, so a value in the data for a disabled field came from your code or
from a manipulated request. Do not use `disabled(true)` as a security control.
:::

## Validating

`validate()` checks each field and returns a `ResultSet`. Each field has a
`ValidateResult` with one of these statuses:

- `ValidateResult::STATUS_SUCCESS` (200): the value is accepted.
- `ValidateResult::STATUS_REQUIRED` (400): a required field is empty.
- `ValidateResult::STATUS_FAILURE` (500): a validator rejected the value.

```php
$result = $form->validate($filtered);

if ($result->isSuccess()) {
    // Store the record
}

$failure = $result->getFirstFailure();

$passwordResult = $result->getResult('password');
```

Validators are added with `addValidator()`. They accept a class, a name, or
a callable. A validator runs only when the value is not empty, and a required
field is checked before its validators run:

```php
use Windwalker\Filter\Rule\IPAddress;

$form->addField(new TextField('ip', 'IP'))
    ->addValidator(IPAddress::class);
```

Use `isRequired()` on a field to check whether the required rule applies,
and `checkRequired()` to test one value.

::: info
Filters change the value, and validators only report on it. A filter that
truncates or clamps, such as `maxlength()` or `range()`, never fails a field.
See the [Fields](./fields#limiting-length) page for details.
:::

::: warning
HTML attributes such as `minlength` and `pattern` only tell the browser what
to accept. The server does not enforce them. Add a validator on the server
for every rule that matters.
:::

## Preparing for Storage

`prepareStore()` lets each field change its value just before it is saved,
for example to encode a list or hash a password. It only processes the
fields present in the data:

```php
$record = $form->prepareStore($filtered);
```

The default implementation returns the value unchanged. To change it, extend
a field class and override `prepareStore()`:

```php
class HashedPasswordField extends PasswordField
{
    public function prepareStore(mixed $value): mixed
    {
        return password_hash((string) $value, PASSWORD_DEFAULT);
    }
}
```

::: tip
Run `prepareStore()` after `validate()`, so the stored value is the checked
value. Hashing before validation would make the validators see the hash.
:::
