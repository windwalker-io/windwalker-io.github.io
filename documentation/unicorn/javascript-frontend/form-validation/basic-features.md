---
layout: doc
title: Basic Features
description: Add validation rules, messages, and checks to Unicorn form fields.
---

# Basic Features

[Unicorn form fields](/documentation/unicorn/form-fields/field-generation) come with validation built in. A PHP field can carry a
rule, a custom message, or a required flag, and the browser shows the
result next to the input. This page shows how to use the features with
Unicorn fields. For forms written by hand, see
[Standalone Usage](./standalone).

## Setup

### Enabling Validation

Load the module once per page. Then add `uni-form-validate` to the form
element in your form view:

```ts
import { useFormValidation } from '@windwalker-io/unicorn-next';

await useFormValidation();
```

```html
<form id="admin-form" uni-form-validate>
  <!-- Unicorn fields -->
</form>
```

Each Unicorn field wraps its input in an element with
`uni-field-validate`. The module reads the rules from the input's
`data-validate` attribute, so you set the rules on the PHP field and need no
extra markup.

## Rules

### Adding a Rule

A rule is set with the `data-validate` attribute. Use `attr()` on the PHP
field to add it:

```php
use Windwalker\Form\Field\TextField;

$form->add('ip', TextField::class)
    ->label('IP Address')
    ->attr('data-validate', 'ip');
```

The module includes these rules:

- `username`: rejects the characters `< > " ' % ; ( ) & |`.
- `numeric`: accepts digits with an optional minus sign, commas, and a decimal point.
- `email`: checks an email address.
- `url`: checks an `http`, `https`, or `ftp` URL.
- `alnum`: accepts letters and digits only.
- `color`: checks a hex color such as `#fff` or `#ffaa00`.
- `creditcard`: checks the number format of common card networks.
- `ip`: checks an IPv4 address.
- `password-confirm`: checks that the value equals another field.

Separate several rules with `|`, such as `alnum|username`.

A rule runs only when the field has a value. An empty field is judged by
`required` and the other browser checks. Readonly fields are skipped.

### Confirming a Password

`password-confirm` reads the other field from `data-confirm-target`:

```php
$form->add('password', PasswordField::class)
    ->attr('id', 'input-item-password');

$form->add('password2', PasswordField::class)
    ->attr('data-validate', 'password-confirm')
    ->attr('data-confirm-target', '#input-item-password');
```

```ts
// ERROR: Error: Validator: "password-confirm" must add
// "data-confirm-target" attribute.
```

### Required and Pattern

`required()` and `pattern()` are standard HTML checks. Unicorn passes them
to the browser, and the browser blocks the submit:

```php
use Windwalker\Form\Field\TextField;

$form->add('mobile', TextField::class)
    ->label('Mobile')
    ->required(true)
    ->pattern('09[0-9]{8}');
```

### Rule Parameters

A rule can take parameters in brackets, written as `key: value` pairs. The
pairs are passed to the rule as its options:

```php
$form->add('phone', TextField::class)
    ->attr('data-validate', 'tel(region: tw)');
```

Numbers become numbers, and `null`, `true`, and `false` become their
JavaScript values. Quoted values are not supported.

### Custom Rules

Register your own rule on the form instance with `addValidator()`. The
handler receives the field value and returns `true` to pass or `false` to
fail. Return a string to fail with that text. An empty string passes.

```ts
import { useFormValidation } from '@windwalker-io/unicorn-next';

const validation = await useFormValidation('#admin-form');

validation?.addValidator('password_strength', (value: string) => {
  return /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(value);
});

validation?.addValidator('tel', (value: string) => {
  if (value.includes('-')) {
    return 'Do not use the - character.';
  }

  return true;
});
```

Use the rule name in `data-validate`, and set the message with
`data-custom-error-message`:

```php
$form->add('password', PasswordField::class)
    ->attr('data-validate', 'password_strength')
    ->attr(
        'data-custom-error-message',
        'Use 8 or more characters with digits, and both letter cases.'
    );
```

When a handler returns `false` and no message is set, the `notice` option
supplies the text. The option takes a string or a function:

```ts
validation?.addValidator(
  'tel',
  (value: string) => value.length >= 7,
  { notice: 'Enter at least 7 digits.' }
);
```

::: info
The `data-custom-error-message` attribute takes precedence over `notice`.
:::

A handler can return a Promise to check a server. See
[Async Validation](./standalone#async-validators) in Standalone Usage.

### Forcing a Failure

Some checks cannot run as a rule, such as a value that another system
rejects. Set `data-validation-fail` with a message to make the field fail.
The message becomes the field's validation message:

```ts
const input = document.querySelector<HTMLInputElement>('#input-item-tel')!;

input.dataset.validationFail = 'This number is already registered.';
```

Set the attribute to an empty string, or remove it, to clear the failure:

```ts
input.dataset.validationFail = '';

// Or:
delete input.dataset.validationFail;
```

::: info
Like every rule, the failure applies only when the field has a value. An
empty field is judged by `required` and the other browser checks.
:::

## Messages

### Custom Messages

Each check has its own message attribute, named `data-<kind>-message`. The
module shows the attribute when the matching check fails:

```php
$form->add('title', TextField::class)
    ->required(true)
    ->attr('data-value-missing-message', 'Enter a title.');

$form->add('mobile', TextField::class)
    ->pattern('09[0-9]{8}')
    ->attr(
        'data-pattern-mismatch-message',
        'Enter 10 digits, starting with 09.'
    );
```

The message kinds are:

- `value-missing`: a required field is empty.
- `type-mismatch`: the value does not match the field type.
- `pattern-mismatch`: the value does not match `pattern`.
- `too-long` and `too-short`: the length is outside the limit.
- `range-underflow` and `range-overflow`: a number is outside its range.
- `step-mismatch`: a number does not match its `step`.
- `bad-input`: the browser cannot parse the input.
- `custom-error`: a message set by a rule. See Messages for Rules below.

Set only the kinds you need. Other kinds show the browser's own message.

Unicorn does not clear a message that other code sets with
`input.setCustomValidity()`. That message also blocks the submit.

### Messages for Rules

A failed rule uses the `custom-error` kind. Set its message with
`data-custom-error-message`:

```php
$form->add('ip', TextField::class)
    ->attr('data-validate', 'ip')
    ->attr('data-custom-error-message', 'Enter a valid IP address.');
```

## Checking

### Checking from Script

Read the form instance with `useFormValidationInstance()` when the module is
already loaded. Call `validateAll()` to check every field. It returns `true`
when all fields pass, and each failed field gets the `is-invalid` class:

```ts
import {
  useFormValidation,
  useFormValidationInstance,
} from '@windwalker-io/unicorn-next';

await useFormValidation();

const validation = useFormValidationInstance('#admin-form');

if (validation?.validateAll()) {
  // Every field passed.
}
```

Use `useFormValidation()` with a selector when the module might not be
loaded yet. It resolves to the instance:

```ts
const validation = await useFormValidation('#admin-form');
```

### Checking One Field

Pass the field's wrapper to `useFieldValidationInstance()` and call
`checkValidity()`. The wrapper is the element with `uni-field-validate`,
not the input:

```ts
import { useFieldValidationInstance } from '@windwalker-io/unicorn-next';

const input = document.querySelector<HTMLInputElement>(
  '#input-item-title'
)!;
const wrapper = input.closest<HTMLElement>('[uni-field-validate]')!;

const valid = useFieldValidationInstance(wrapper)?.checkValidity() ?? true;
```

### Submit Behavior

When the user submits the form, the module checks every field. A failed
check stops the submit, and the form receives an `invalid` event. The
module also sets `novalidate` on the form, so the browser shows no bubbles:

```ts
document.querySelector('#admin-form')?.addEventListener('invalid', () => {
  console.log('Some fields are invalid.');
});
```

::: info
The browser's submit check runs only when the form fires its submit event.
`form.requestSubmit()` fires that event, but `form.submit()` does not. If
your script calls `form.submit()`, call `validateAll()` before it.
:::

## Related

- [Validation & Error Display](../../form-fields/form-utilities#validation-and-error-display)
- [Standalone Usage](./standalone)
- [Unicorn JS](../unicorn-js)
