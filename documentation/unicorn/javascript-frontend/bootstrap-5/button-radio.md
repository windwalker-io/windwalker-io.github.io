---
layout: doc
title: ButtonRadio
description: Show radio inputs as a Bootstrap 5 button group with Unicorn JS.
---

# ButtonRadio

ButtonRadio shows a group of radio inputs as Bootstrap 5 buttons. Users click a button, and the native radio inside it is checked. The form still submits the radio values, so the server receives the same data as before.

Use it for segmented choices such as a status, a level, or a yes/no switch. Each option can use its own color.

## Enabling ButtonRadio

Import `useBs5ButtonRadio` and pass a selector. The selector can point to the element with `data-field-input`, or to an ancestor that contains it.

```js
import { useBs5ButtonRadio } from '@windwalker-io/unicorn-next';

await useBs5ButtonRadio('#status-field');
```

The examples use the package name. Resolve it with a bundler or an import map. Load Bootstrap 5 CSS, because the buttons use `.btn` classes.

## Complete Example

This page contains a form with three status options. The buttons replace the radios, and the submit handler reads the selected value.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet"
    href="https://unpkg.com/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="p-4">
  <form id="article-form">
    <div class="mb-3">
      <label class="form-label">Status</label>

      <div id="status-field" data-field-input>
        <div class="radio">
          <input type="radio" id="status-1" name="status"
            value="1" checked>
          <label for="status-1">Published</label>
        </div>
        <div class="radio">
          <input type="radio" id="status-0" name="status"
            value="0">
          <label for="status-0">Unpublished</label>
        </div>
        <div class="radio">
          <input type="radio" id="status-2" name="status"
            value="2">
          <label for="status-2">Archived</label>
        </div>
      </div>
    </div>

    <button type="submit" class="btn btn-primary">Save</button>
  </form>

  <script type="module">
    import { useBs5ButtonRadio } from '@windwalker-io/unicorn-next';

    await useBs5ButtonRadio('#status-field');

    document.getElementById('article-form')
      .addEventListener('submit', (e) => {
        e.preventDefault();

        const data = new FormData(e.target);

        console.log(data.get('status')); // "1"
      });
  </script>
</body>
</html>
```

After the call, ButtonRadio adds a `.btn-group` as the first child of the wrapper. It hides each `.radio` block.

## Markup Structure

Each option is a `.radio` block that contains an `input` and a `label`. The `input` holds the value and the form name. The `label` HTML becomes the button text.

```html
<div id="status-field" data-field-input>
  <div class="radio">
    <input type="radio" id="status-1" name="status" value="1">
    <label for="status-1">Published</label>
  </div>
</div>
```

::: warning
The label HTML is inserted into the button as raw HTML. Escape any user-supplied text in labels, or the page is open to XSS.
:::

## Button Colors

Each button color depends on the input value.

- `''` (empty value): `color.blue`, default `btn-primary`
- `'0'`: `color.red`, default `btn-danger`
- Any other value: `color.green`, default `btn-success`

Inactive buttons use `color.default`, which defaults to `btn-default btn-outline-secondary`. Set your own classes in the options.

```js
await useBs5ButtonRadio('#status-field', {
  color: {
    'default': 'btn-outline-secondary',
    green: 'btn-success',
    red: 'btn-danger',
    blue: 'btn-primary',
  },
});
```

To set a color for one option, add `data-color-class` to its input. The attribute takes priority over the value-based color.

```html
<div class="radio">
  <input type="radio" id="level-high" name="level" value="high"
    data-color-class="btn-warning">
  <label for="level-high">High</label>
</div>
```

## Options

The other options control the button classes.

- `buttonClass`: classes added to every button. Default `btn`.
- `activeClass`: class added to the checked button. Default `active`.

```js
await useBs5ButtonRadio('#status-field', {
  buttonClass: 'btn btn-sm',
  activeClass: 'active',
});
```

Partial `color` objects are merged with the defaults, so you can change one color only.

```js
await useBs5ButtonRadio('#status-field', {
  color: { red: 'btn-warning' },
});
```

## Instance Properties

`useBs5ButtonRadio()` resolves to a `ButtonRadio` instance when you pass a selector. The instance exposes the parts it created.

```js
const radio = await useBs5ButtonRadio('#status-field');

radio.wrapper; // The element with data-field-input
radio.inputs;  // HTMLInputElement[], the native radios
radio.buttons; // HTMLButtonElement[], one per option
radio.syncState(); // Re-apply the classes to all buttons
```

If you change a radio in code, dispatch a `change` event. Setting `checked` alone does not update the buttons.

```js
const input = document.getElementById('status-0');

input.checked = true;
input.dispatchEvent(new Event('change'));
```

Listen to the native input for user changes. Clicking a button dispatches `change` and `input` events on the radio.

```js
document.getElementById('status-1')
  .addEventListener('change', (e) => {
    console.log(e.target.value);
  });
```

## Disabled and Readonly Options

A disabled or readonly radio disables its button and adds the `disabled` class. A readonly radio also adds the `readonly` class to the button.

```html
<div class="radio">
  <input type="radio" id="status-3" name="status" value="3"
    disabled>
  <label for="status-3">Deleted</label>
</div>
```

::: info
The disabled and readonly state is read once, when the group is created. Changing the `disabled` attribute later does not update the buttons.
:::

## Using Existing Button Markup

If the wrapper already contains a `.btn-group`, ButtonRadio reuses its buttons. The PHP `ButtonRadioField` renders this layout. Each button must have a `data-for` attribute that matches its radio `id`.

```html
<div id="status-field" data-field-input>
  <div class="btn-group">
    <button type="button" class="btn btn-outline-secondary"
      data-value="1" data-for="status-1">
      <span>Published</span>
    </button>
  </div>

  <div class="radio">
    <input type="radio" id="status-1" name="status"
      value="1" checked>
    <label for="status-1">Published</label>
  </div>
</div>
```

::: warning
Each radio needs a matching button with `data-for`. A missing button makes the constructor throw.
:::

```js
// ERROR: TypeError: Cannot read properties of null
// (reading 'classList') when data-for has no matching button.
await useBs5ButtonRadio('#status-field');
```

## Events

ButtonRadio dispatches `button-radio.loaded` on the wrapper after it builds the group. The event does not bubble. The event fires during the call, so attach the listener before you call `useBs5ButtonRadio()`.

```js
const el = document.getElementById('status-field');

el.addEventListener('button-radio.loaded', () => {
  console.log('Button group is ready.');
});

await useBs5ButtonRadio(el);
```

::: warning
A listener added after the `await` never runs. No error is shown.
:::

## Reusing an Instance

ButtonRadio stores one instance on each element. A second call with the same element returns that instance, and its options are ignored.

```js
const first = await useBs5ButtonRadio('#status-field');
const second = await useBs5ButtonRadio('#status-field', {
  activeClass: 'checked',
});

// first === second, and activeClass stays "active"
```

Pass the options on the first call. Later calls return the existing instance.

## Without a Selector

Call the function without a selector to get the module. Use `ButtonRadio.handle()` to create instances. It takes the same arguments as the function call.

```js
const { ButtonRadio } = await useBs5ButtonRadio();

const radio = ButtonRadio.handle('#status-field', {
  activeClass: 'active',
});
```

If the selector matches no element, `useBs5ButtonRadio()` resolves to `null`.

```js
const radio = await useBs5ButtonRadio('#missing'); // null
```
