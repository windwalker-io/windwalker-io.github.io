---
layout: doc
title: Form
description: Form enhancement for Windwalker Unicorn JS.
---

# Form

The form module wraps a native `<form>` element. It submits the form from
JavaScript with extra values, a different URL, and a custom HTTP method.
Plain HTML forms send only `GET` and `POST`. The module sends `PUT`,
`PATCH`, `DELETE`, and `QUERY` by posting the form with a `_method` field.

Each form element keeps one instance, so repeated calls share its state.

## Enable the module

```js
import { useFormAsync } from '@windwalker-io/unicorn-next';

const form = await useFormAsync('#user-form');
```

`useFormAsync()` loads the form module on demand. It does not submit
anything by itself.

## Complete example

The module does not add a CSRF field to forms that already exist in the
page. Render the `anticsrf` token in your markup.

```html
<form id="user-form" action="/admin/users/save" method="post">
  <input type="hidden" name="anticsrf" value="TOKEN">
  <input type="text" name="name" value="">
  <button type="button" id="save-btn">Save</button>
  <p id="message"></p>
</form>
```

The script sends the form with `form.post()`. The submit listener
replaces the browser submission with an asynchronous request.

```js
import { useFormAsync, useHttpClient } from '@windwalker-io/unicorn-next';

const form = await useFormAsync('#user-form');
const http = useHttpClient();
const el = form.getElement();
const message = document.querySelector('#message');

el.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    // Server responds with JSON: { "message": "..." }
    const response = await http.post(
      el.action,
      new FormData(el)
    );

    message.textContent = response.data.message;
  } catch (error) {
    message.textContent = http.isAxiosError(error)
      ? `Save failed: HTTP ${error.response?.status}`
      : 'Unexpected error.';
  }
});

document.querySelector('#save-btn').addEventListener('click', () => {
  form.post('/admin/users/save', {
    user: {
      address: { city: 'Taipei' },
      tags: ['admin', 'editor'],
    },
  });
});
```

When the button is clicked, `form.post()` sets the form action and method,
adds the hidden fields, and requests a submit. The browser fires the
`submit` event, the listener cancels the navigation, and the values are
sent with `FormData`.

## Submit handling

Every method call requests a native submit with `requestSubmit()`. The
form fires a `submit` event first. Add a listener to `form.getElement()`
and call `event.preventDefault()` to keep the page from navigating.

Without a listener, the browser sends the form as a normal HTML submission.

The form module does not send AJAX requests. Use `useHttpClient()` or
`fetch()` inside your listener, and pass `new FormData(el)` to include the
fields the module added.

`submit()` returns `true` after the submit is requested. It does not
report the server response.

## Values

Extra values are written as hidden inputs. Nested objects and arrays are
flattened to bracket names.

```js
form.post('/admin/users/save', {
  user: { name: 'Lee', address: { city: 'Taipei' } },
  ids: [1, 2],
});

// Hidden inputs added to the form:
// <input type="hidden" name="user[name]" value="Lee">
// <input type="hidden" name="user[address][city]" value="Taipei">
// <input type="hidden" name="ids[0]" value="1">
// <input type="hidden" name="ids[1]" value="2">
```

Each hidden input uses `data-role="temp-input"`. A later call with the
same name updates the existing input instead of adding a new one.

::: warning
If an `<input>` with the same name already exists, the module writes the
value into that input. A visible field the user edited is overwritten.
Use a name that does not match a field in the form.

```js
// The form contains <input name="name"> with user input "Ann".
form.post('/admin/users/save', { name: 'Lee' });
// The visible input now contains "Lee". The typed value is lost.
```
:::

Read the submitted values with `new FormData(form.getElement())`.

## HTTP methods

The methods below set the form attributes and the `_method` field.

```js
form.submit(url, data, method, customMethod);
form.get(url, data, customMethod);
form.post(url, data, customMethod);
form.put(url, data);
form.patch(url, data);
form.delete(url, data);
form.query(url, data);

// Form method is POST, and _method=PATCH is added.
form.submit('/admin/users/1', { name: 'Lee' }, 'POST', 'PATCH');

// post() always adds _method=POST, unlike a native form.
form.post('/admin/users', { name: 'Lee' });

// put() adds _method=PUT and sends the form as POST.
form.put('/admin/users/1', { name: 'Lee' });
```

::: warning
A `_method` field stays in the form after a call. Later calls that do not
pass a method still send it.

```js
form.put('/admin/users/1', { name: 'Lee' });
// The form now contains _method=PUT.

form.get('/admin/users', { page: 2 });
// Still contains _method=PUT, with method GET.
```

Remove the field before the next request, or pass the method on every call.
:::

::: info
The `url` and `method` arguments change the form attributes. The new values
stay until another call changes them.
:::

## Instances

`useForm()` returns the instance for a selector or element. It requires the
module to be loaded first.

```js
import { useForm, useFormAsync } from '@windwalker-io/unicorn-next';

await useFormAsync();

const a = useForm('#user-form');
const b = useForm(document.querySelector('#user-form'));

a === b; // true

// ERROR: Form module is not loaded. Please use useFormAsync()
//        to load the module before using useForm().
```

Other cases:

- `useForm()` without arguments creates a hidden `<form>` and appends it to
  `<body>`. Each call creates a new form.
- If the selector matches no element, the module creates a hidden form. An
  id selector such as `#user-form` sets the id of the new form.
- Forms created by the module include an `anticsrf` field.
- The optional `options` object is stored on `form.options`. The form module
  does not read it.

::: warning
`destroy()` removes the form element and every field inside it from the
page. Use it only for forms that the module created.

```js
form.destroy();
// The <form id="user-form"> element is removed from the DOM.
```
:::

## Alpine store

`initComponent()` registers the form methods in an Alpine.js store. Alpine
loads on demand. The default store name is `form`.

```html
<form id="user-form" action="/admin/users/save" method="post">
  <input type="text" name="name">
  <button type="button" @click="$store.form.post('/admin/users/save')">
    Save
  </button>
</form>
```

```js
import { useFormComponent } from '@windwalker-io/unicorn-next';

await useFormComponent('#user-form');
```

To add your own methods, pass them to `initComponent()` with a store name.

```js
import { useFormAsync } from '@windwalker-io/unicorn-next';

const form = await useFormAsync('#user-form');

await form.initComponent('userForm', {
  save() {
    form.post('/admin/users/save', { user: { name: 'Lee' } });
  },
});
```

```html
<button type="button" @click="$store.userForm.save()">Save</button>
```

## Validation hooks

Validation has its own module. A form with the `uni-form-validate`
attribute gets a validation instance. The form module does not run
validation.

```js
import { useFormValidation } from '@windwalker-io/unicorn-next';

const validation = await useFormValidation('#user-form');

// validateAllAsync() resolves to false when a field fails.
const valid = await validation?.validateAllAsync();
```

## Helper: useFormSubmit

`useFormSubmit()` posts or sends data without a form instance. It returns a
promise of `true`.

```js
import { useFormSubmit } from '@windwalker-io/unicorn-next';

await useFormSubmit('/admin/users/save', { name: 'Lee' });

await useFormSubmit('PUT', '/admin/users/1', { name: 'Lee' });

await useFormSubmit({
  form: '#user-form',
  method: 'PATCH',
  url: '/admin/users/1',
  data: { name: 'Lee' },
});
```

::: info
Without the `form` option, each call creates a new hidden form in the page.
Pass `form` to reuse an existing form.
:::

