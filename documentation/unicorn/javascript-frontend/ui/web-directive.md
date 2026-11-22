---
layout: doc
title: WebDirective
description: Attach JavaScript behavior to HTML with directive attributes in Windwalker Unicorn JS.
---

# WebDirective

WebDirective connects JavaScript behavior to HTML with attributes. Add an attribute such as `uni-copy` to an element, and Unicorn runs the handler registered for `copy`. The handler runs when the element enters the page, when the attribute value changes, and when the element leaves the page.

Listeners bound once with `querySelectorAll()` are lost when the markup is replaced, for example in a re-rendered list or a row added later. A directive attribute stays with its element. Unicorn observes the DOM and runs the handler for every new match, so the behavior follows the markup.

Unicorn's own modules use the same mechanism, such as `uni-show-on`, `uni-form-validate`, and `uni-keeptab`. The `useUniDirective()` function registers your own directives.

## Enabling Directives

Import `useUniDirective()` and register a handler under a name. The attribute name is the directive name with the `uni-` prefix, so `copy` maps to `uni-copy`.

```ts
import { useUniDirective } from '@windwalker-io/unicorn-next';

await useUniDirective('copy', {
  mounted(el, binding) {
    console.log(binding.name); // 'uni-copy'
  }
});
```

```html
<button type="button" uni-copy="Hello World">Copy</button>
```

The first call starts observing `document.body`. Each registration mounts its directive on matching elements already on the page, and later DOM changes are handled automatically.

## Complete Example

This example adds a copy button and a character counter. The counter also works on fields added at runtime.

```ts
import {
  getBoundedInstance,
  removeBoundedInstance,
  useUniDirective,
} from '@windwalker-io/unicorn-next';

await useUniDirective('copy', {
  mounted(el) {
    const onClick = () => {
      navigator.clipboard.writeText(el.getAttribute('uni-copy') ?? '');
    };

    el.addEventListener('click', onClick);

    // Keep the listener so unmounted() can remove it.
    getBoundedInstance(el, 'copy', () => onClick);
  },
  unmounted(el) {
    el.removeEventListener('click', getBoundedInstance(el, 'copy'));
    removeBoundedInstance(el, 'copy');
  }
});

function renderCount(el: HTMLInputElement) {
  const selector = el.getAttribute('uni-char-count') ?? '';
  const output = document.querySelector(selector);

  if (output) {
    output.textContent = `${el.value.length}`;
  }
}

await useUniDirective<HTMLInputElement>('char-count', {
  mounted(el) {
    const onInput = () => renderCount(el);

    el.addEventListener('input', onInput);
    getBoundedInstance(el, 'char-count', () => onInput);
    renderCount(el);
  },
  updated(el) {
    // Runs when the uni-char-count value changes.
    renderCount(el);
  },
  unmounted(el) {
    el.removeEventListener('input', getBoundedInstance(el, 'char-count'));
    removeBoundedInstance(el, 'char-count');
  }
});

// Add a field at runtime. The observer mounts the
// char-count directive on the new input.
const row = document.createElement('div');

row.innerHTML = `
  <input type="text" maxlength="60"
    uni-char-count="#note-count">
  <span id="note-count"></span>
`;

document.querySelector('#fields')!.append(row);
```

The page markup contains the matching attributes. Load the module with `type="module"`.

```html
<button type="button" uni-copy="https://example.com/docs">
  Copy link
</button>

<label for="bio">Bio</label>
<input id="bio" type="text" maxlength="60"
  uni-char-count="#bio-count">
<span id="bio-count"></span>

<div id="fields"></div>
```

Hooks run after the DOM change is observed. A directive on an element added with `append()` mounts after `append()` returns, not during the call.

## Passing Values

`binding.value` is the raw attribute string. Unicorn does not parse it. Use `JSON.parse()` for structured options, and provide a fallback for an empty attribute.

```ts
await useUniDirective('widget', {
  mounted(el, { value }) {
    const options = JSON.parse(value || '{}');

    console.log(options.max); // 5
  }
});
```

```html
<div uni-widget='{"max": 5, "label": "Items"}'></div>
<div uni-widget></div>
```

::: warning
An empty attribute gives `value` as an empty string. Parsing it without
a fallback throws, and the exception stops the remaining hooks for the
same batch of DOM changes.

```ts
// ERROR: SyntaxError: Unexpected end of JSON input
const options = JSON.parse(value);
```

If the markup contains user input, treat attribute values as untrusted.
Do not insert them with `innerHTML` or run them as code.
:::

Use a directive attribute to point at another element, as Unicorn does
for `uni-char-count`. Read the attribute in the handler when you need the
current value.

## Lifecycle Hooks

A handler can define up to four hooks. Each hook receives the element and the binding.

```ts
await useUniDirective('panel', {
  mounted(el, binding) {
    // The attribute was added, or the element entered the page.
  },
  updated(el, binding) {
    // The attribute value changed. binding.oldValue holds the old value.
  },
  unmounted(el, binding) {
    // The attribute was removed, or the element left the page.
  },
  childrenUpdated(el, binding) {
    // Child elements changed. Requires enableChildrenUpdated.
  }
});
```

Hooks run after the mutation, so there are no before-hooks. Each hook also dispatches an event on the element, with the binding in `event.detail`.

```ts
el.addEventListener('wd:mounted', (e) => {
  const { binding } = (e as CustomEvent).detail;

  console.log(binding.name); // 'uni-panel'
});
```

Event names are `wd:mounted`, `wd:updated`, `wd:unmounted`, and `wd:children-updated`.

## Arguments and Modifiers

A directive can take an argument and modifiers. Enable them with the `enableAttrParams` option on the instance that serves the directive.

```ts
import {
  useUniDirective,
  useWebDirective,
} from '@windwalker-io/unicorn-next';

await useWebDirective('tools', { enableAttrParams: true });

await useUniDirective('highlight', {
  mounted(el, { arg, modifiers }) {
    console.log(arg); // 'warn'
    console.log(modifiers); // { bold: true, dashed: true }
  }
}, 'tools');
```

```html
<p uni-highlight:warn.bold.dashed="#notice">Notice</p>
```

Write modifiers in kebab-case, such as `bold-text`. Unicorn converts them to camelCase, so the key becomes `modifiers.boldText`.

::: tip
Give directives that need options their own instance name, as in the
example above. Their setup then does not depend on the order in which
other modules register directives.
:::

## Instance Options

`useUniDirective()` uses the instance named `unicorn` by default. The third argument selects another instance by name. Use `useWebDirective()` to create an instance with options.

```ts
import { useWebDirective } from '@windwalker-io/unicorn-next';

await useWebDirective('tools', {
  enableAttrParams: true,      // Allow uni-name:arg.modifier
  enableChildrenUpdated: true, // Enable the childrenUpdated hook
});
```

- `enableAttrParams`: Enables arguments and modifiers. Default `false`.
- `enableChildrenUpdated`: Enables the `childrenUpdated` hook. Default `false`.

Unicorn always uses the `uni-` prefix. A `prefix` value you pass is replaced.

::: warning
Options apply only when `useWebDirective()` creates the instance. If an
earlier `useUniDirective()` call already created `unicorn`, a later call
such as `useWebDirective('unicorn', { enableAttrParams: true })` returns
the existing instance without an error, and the options have no effect.
:::
