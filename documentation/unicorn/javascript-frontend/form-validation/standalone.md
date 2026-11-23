---
layout: doc
title: Standalone Usage
description: Use form validation in plain HTML pages, without Windwalker or Unicorn PHP.
---

# Standalone Usage

The validation module works on any HTML page. It needs no PHP, no [route
table](/documentation/unicorn/javascript-frontend/utilities/router), and no [Unicorn data](/documentation/unicorn/javascript-frontend/basics/data-transfer). Use it for forms that the server renders without
Unicorn fields, or for pages outside a Unicorn application. For PHP fields,
see [Basic Features](./basic-features).

## Setup

### Marking Forms and Fields

Add `uni-form-validate` to the form. The attribute value is optional. When it
is set, it must be a JSON object:

```html
<form uni-form-validate>...</form>
<form uni-form-validate='{"scroll": true}'>...</form>
```

Each field should sit inside an element with `uni-field-validate`. This
element holds the message and the state classes of the field:

```html
<div uni-field-validate>
  <label for="email">Email</label>
  <input id="email" type="email" name="email" required>
</div>
```

A form that has no wrapper still works. For an input without a wrapper, the
module uses the closest `data-input-container` element, or the input's
parent element. It adds `uni-field-validate` to that element.

### Complete Example

The following page validates a sign-up form. It checks an email address, a
password with a custom rule, and a confirmation field that must match the
password:

```html
<!doctype html>
<html>
<body>
  <form id="signup" uni-form-validate='{"scroll": true}'>
    <div uni-field-validate>
      <label for="email">Email</label>
      <input id="email" type="email" name="email" required>
    </div>

    <div uni-field-validate>
      <label for="password">Password</label>
      <input id="password" type="password" name="password"
        required data-validate="password_strength">
    </div>

    <div uni-field-validate>
      <label for="confirm">Confirm password</label>
      <input id="confirm" type="password" name="confirm"
        data-validate="password-confirm"
        data-confirm-target="#password">
    </div>

    <button type="submit">Sign up</button>
  </form>

  <script type="module">
    import {
      useFormValidation,
      useFormValidationInstance,
    } from '@windwalker-io/unicorn-next';

    // Load the module and register its attributes.
    await useFormValidation();

    const validation = useFormValidationInstance('#signup');

    validation.addValidator('password_strength', (value) => {
      return /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(value);
    }, {
      notice: 'Use 8+ characters with a digit, a lowercase letter,' +
        ' and an uppercase letter.',
    });
  </script>
</body>
</html>
```

The module reads the rules when a field is checked. A rule added in the
script applies to the field even when the script runs after the HTML.

## Options

### Form Options

Set the form options with the `uni-form-validate` attribute:

| Option           | Default                   | Meaning                             |
| ---------------- | ------------------------- | ----------------------------------- |
| `scroll`         | `false`                   | Scroll to the first failed field.   |
| `scrollOffset`   | `-100`                    | Offset in pixels for the scroll.    |
| `enabled`        | `true`                    | Check the form on submit.           |
| `validatedClass` | `was-validated`           | Class added after the first check.  |
| `fieldSelector`  | `input, select, textarea` | Inputs to check.                    |
| `fieldDefaults`  | `{}`                      | Options applied to every field.     |

### Field Options

Set the field options with the `uni-field-validate` attribute, or with
`fieldDefaults` for the whole form:

| Option              | Default              | Meaning                         |
| ------------------- | -------------------- | ------------------------------- |
| `validClass`        | `is-valid`           | Class for a passing field.      |
| `invalidClass`      | `is-invalid`         | Class for a failing field.      |
| `errorSelector`     | `[data-field-error]` | Element that shows the message. |
| `events`            | `["change"]`         | Events that trigger a check.    |
| `errorMessageClass` | `invalid-tooltip`    | Class of a created message.     |

```html
<div uni-field-validate='{"events": ["input", "change"]}'>
  <input type="text" name="code" data-validate="alnum">
</div>
```

The module creates a message element with the class `invalid-tooltip` when
the wrapper has no `[data-field-error]` element. Add one to place the message
yourself:

```html
<div uni-field-validate>
  <input type="text" name="code" data-validate="alnum">
  <div class="invalid-tooltip" data-field-error></div>
</div>
```

## Validators

### Custom Validators

A validator is a function. It receives the value and the input, and it
returns one of these results:

- `true` or an empty string: the value passes.
- `false`: the value fails. The message comes from `notice`, from
  `data-custom-error-message`, or from the default message.
- A non-empty string: the value fails, and the string is the message.

Register a validator on the form instance with `addValidator()`:

```ts
import { useFormValidationInstance } from '@windwalker-io/unicorn-next';

const validation = useFormValidationInstance('#signup');

validation?.addValidator('tel', (value: string) => {
  if (value.includes('-')) {
    return 'Do not use the "-" character.';
  }

  if (value.length < 7) {
    return 'The number is too short.';
  }

  return true;
});
```

```html
<input type="text" name="phone" data-validate="tel">
```

A validator can also set the message on the input. Call
`setCustomValidity()` and return `false`:

```ts
validation?.addValidator('tel', (value: string, input) => {
  if (value.length < 7) {
    input.setCustomValidity('The number is too short.');
    return false;
  }

  return true;
});
```

Options can be given as the third argument. The `notice` option sets the
message for a `false` result, and accepts a string or a function:

```ts
validation?.addValidator('code', (value: string) => {
  return /^[A-Z]{3}$/.test(value);
}, {
  notice: 'Use three uppercase letters.',
});
```

Read the rule's parameters from the third argument of the handler. A
parameter is written in the attribute, as in `tel(region: tw)`:

```ts
validation?.addValidator<string, HTMLInputElement, { region?: string }>(
  'tel',
  (value, input, options) => {
    if (options.region === 'tw') {
      return /^09[0-9]{8}$/.test(value);
    }

    return true;
  }
);
```

### Global Validators

A global validator is available in every form on the page. Register it with
`addGlobalValidator()`:

```ts
import { addGlobalValidator } from '@windwalker-io/unicorn-next';

await addGlobalValidator('no_spaces', (value: string) => {
  return !/\s/.test(value);
});
```

```html
<input type="text" name="slug" data-validate="no_spaces">
```

A validator added to a form takes precedence over a global validator with
the same name.

### Async Validators

A validator can return a promise. Use it to ask the server whether a value is
free to use:

```ts
validation?.addValidator('account_free', async (value: string) => {
  const res = await fetch(
    `/api/accounts/check?name=${encodeURIComponent(value)}`
  );
  const data = await res.json();

  if (data.exists) {
    return 'This account name is already taken.';
  }

  return true;
});
```

```html
<input type="text" name="username" data-validate="account_free">
```

::: warning
The browser's submit check cannot wait for a promise. An async result appears
after the request finishes, so a fast submit can pass before the check ends.
Use `validateAllAsync()` before you submit, or disable the submit button until
the check finishes. See [Checking Asynchronously](#checking-asynchronously) below.
:::

## Checking

### Manual Validation

Read the form instance and call `validateAll()` to run every check. It
returns `true` when all fields pass:

```ts
import { useFormValidation } from '@windwalker-io/unicorn-next';

const validation = await useFormValidation('#signup');

if (validation.validateAll()) {
  // Send the form data.
}
```

To check one field, read the instance from the wrapper element:

```ts
import { useFieldValidationInstance } from '@windwalker-io/unicorn-next';

const wrapper = document.querySelector<HTMLElement>('#email-field')!;
const field = useFieldValidationInstance(wrapper);

field?.checkValidity();
```

### Checking Asynchronously

`validateAllAsync()` waits for every async validator and returns a promise
of the result. Use it to submit a form that has async validators:

```ts
const form = document.querySelector<HTMLFormElement>('#signup')!;
const validation = await useFormValidation(form);

let approved = false;

form.addEventListener('submit', async (e) => {
  if (approved) {
    approved = false;
    return;
  }

  e.preventDefault();

  if (await validation.validateAllAsync()) {
    approved = true;
    form.requestSubmit();
  }
});
```

To check one field asynchronously, call `checkValidityAsync()` on its
instance:

```ts
const ok = await field.checkValidityAsync();
```

## Security

### Client Checks Are Not Security

::: warning
Validation in the browser helps users fill in the form. It does not protect
the server, because anyone can change the page or send a request directly.
Validate the same data on the server. Set `enabled` to `false` only when the
server already validates the data.
:::

## Reference

### Attributes

The attributes are grouped by the [directive](/documentation/unicorn/javascript-frontend/ui/web-directive) they belong to.

#### Global Attributes

These attributes sit on an input. They work with any form or field:

| Attribute | Purpose |
| --- | --- |
| `data-validate` | Rules to run, separated by `\|`. Takes `name(key: value)` parameters. |
| `data-confirm-target` | Selector of the field that `password-confirm` compares with. |
| `data-validation-fail` | Message that forces the field to fail. Set it from script. |
| `data-novalidate` | Skips the checks for the field. Set it on the input or an ancestor. |
| `data-<kind>-message` | Message for an HTML check, such as `data-pattern-mismatch-message`. |
| `data-custom-error-message` | Message for a failed rule. |

#### Form Attributes

| Attribute | Purpose |
| --- | --- |
| `uni-form-validate` | Enables validation for the form. Takes JSON options. |

#### Field Attributes

These attributes belong to a field wrapper, or mark the input that the field
validates:

| Attribute | Set on | Purpose |
| --- | --- | --- |
| `uni-field-validate` | wrapper | Marks a field. Takes JSON options. |
| `data-field-input` | input | Marks the input that the field validates first. |
| `data-input-container` | wrapper | Element that the module uses when no wrapper is set. |
| `data-field-error` | wrapper | Element that shows the field message. |
| `data-field-label` | wrapper | Label that the module names in a message for a hidden field. |
| `data-field-wrapper` | wrapper | Wrapper that the module searches for the label. |


## Related

- [Basic Features](./basic-features)
- [Unicorn JS](../unicorn-js)
- [Web Directive](../ui/web-directive)
