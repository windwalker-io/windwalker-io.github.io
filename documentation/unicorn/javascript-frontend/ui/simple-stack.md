---
layout: doc
title: SimpleStack
description: Track pending work or history with named stacks and disable UI elements while work is pending in Windwalker Unicorn JS.
---

# SimpleStack

`Stack` is a small LIFO container for Unicorn JS. Each item you push marks a unit of work, such as an upload that is still running. When the stack is empty, the work is done. Observers receive a notice on every push and pop, so the page can react to the change.

Typical uses:

- Count pending uploads or requests.
- Keep a simple history of actions.
- Disable the save buttons while a background task runs.

Unicorn JS keeps named stacks in a shared registry. Any part of the page that asks for the same name gets the same stack. This lets an upload field and a save button coordinate without knowing about each other.

## Enabling the Stack

Import the helpers from the package. `useStack()` returns the shared stack with the given name.

```ts
import { useStack } from '@windwalker-io/unicorn-next';

const stack = useStack('uploading');
```

## Complete Example

This example disables the save buttons while files are uploading. Each file is pushed onto the `uploading` stack before the request and popped after it finishes.

```html
<input type="file" id="file-input" multiple>
<button type="submit" data-task="save">Save</button>
```

```ts
import {
  useDisableIfStackNotEmpty,
  useStack,
} from '@windwalker-io/unicorn-next';

// Disable every [data-task=save] button while the stack is not empty.
useDisableIfStackNotEmpty('[data-task=save]', 'uploading');

async function uploadFile(file: File): Promise<string> {
  const stack = useStack('uploading');
  stack.push(file.name);

  try {
    const body = new FormData();
    body.append('file', file, file.name);

    const res = await fetch('/api/upload', { method: 'POST', body });
    const data = await res.json();

    return data.url;
  } finally {
    stack.pop();
  }
}

document.querySelector('#file-input')
  ?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;

    for (const file of input.files ?? []) {
      await uploadFile(file);
    }
  });
```

While a file uploads, the save button gets the `disabled` attribute and the `disabled` class. When the last upload finishes, both are removed.

## Creating Stacks

`useStack()` shares one stack per name. Use `createStack()` when the stack should not be shared, for example a private history of one component.

```ts
import { createStack, useStack } from '@windwalker-io/unicorn-next';

// Shared: the same instance for every call with this name.
const shared = useStack('uploading');
shared === useStack('uploading'); // true

// Private: a new instance, not stored in the registry.
const history = createStack<string>();
history.push('Open editor');
history.push('Change title');
```

The default name of `useStack()` is `default`.

::: info
The `store` argument only applies when the named stack is created.
Later calls with the same name return the existing stack and ignore `store`.
:::

## Pushing and Popping

`push()` adds a value and returns the new length. `pop()` removes the most recent value and returns it.

```ts
const stack = useStack('tasks');

stack.push('import-users');   // Returns 1.
stack.push('export-orders');  // Returns 2.

stack.length;    // 2
stack.pop();     // 'export-orders'
stack.pop();     // 'import-users'
stack.pop();     // undefined, the stack is already empty.
```

If you call `push()` without a value, the stack stores `true`.

```ts
const stack = createStack();

stack.push();    // Stores true.
stack.pop();     // true
```

::: tip
Each `push()` must have a matching `pop()`. Use `try ... finally` so the pop runs even when the request fails.
:::

::: warning
`pop()` removes the most recent item, not the item that finished. With parallel tasks, the count is still correct, but the values may not match the tasks that ended. Store only values you do not need to match, or run the tasks one by one.
:::

## Checking State

Use `isEmpty()` and `length` to read the current state.

```ts
const stack = useStack('uploading');

if (stack.isEmpty()) {
  // No uploads are running.
}

if (stack.length > 0) {
  // At least one upload is running.
}
```

`peek()` returns the internal array. Changing that array does not notify observers.

::: info
Read values with `peek()`, but change the stack only through `push()`, `pop()`, and `clear()`.
:::

## Observing Changes

`observe()` calls a handler on every push, pop, and clear. The handler receives the stack and its new length. It returns a function that removes the handler.

```ts
const stack = useStack('uploading');

const unobserve = stack.observe((stack, length) => {
  console.log(`Pending uploads: ${length}`);
});

stack.push('a.jpg'); // Pending uploads: 1
stack.pop();         // Pending uploads: 0

unobserve();         // The handler no longer runs.
```

`once()` runs the handler on the next change only. Then it is removed.

```ts
const stack = useStack('uploading');

stack.once((stack, length) => {
  console.log('The first change happened.');
});

stack.push('a.jpg'); // Logs once.
stack.push('b.jpg'); // Nothing is logged.
```

`off()` removes a handler by reference. Use the function returned by `observe()` or `once()` in most cases.

```ts
const stack = useStack('uploading');

const handler = (_stack: unknown, length: number) => {
  console.log(length);
};

stack.observe(handler);
stack.off(handler);
```

::: info
Handlers run on every change, including a pop on an empty stack. Check `length` in the handler if you only need to react to empty or non-empty states.
:::

## Disabling UI Elements

`useDisableIfStackNotEmpty()` connects a stack to buttons. It observes the stack and sets or removes the `disabled` attribute and the `disabled` class on every element that matches the selector.

```ts
import { useDisableIfStackNotEmpty } from '@windwalker-io/unicorn-next';

// Defaults: selector '[data-task=save]', stack 'uploading'.
useDisableIfStackNotEmpty();

// Custom selector and stack name.
useDisableIfStackNotEmpty('.btn-submit', 'sending');
```

The buttons update on the next push or pop. Call the helper before the work starts, so the first change updates the buttons.

::: tip
Each call adds a new observer. The helper does not return a function to remove its observer, so call it once per selector and stack for the life of the page.
:::

## Clearing the Stack

`clear()` removes all items and notifies observers once.

```ts
const stack = useStack('uploading');

stack.push('a.jpg');
stack.push('b.jpg');

stack.clear(); // stack.length is 0 and observers are notified.
```

Use `clear()` to reset the stack after an error that makes the pending work invalid. Do not call it to end normal tasks. Each task should pop its own item.
