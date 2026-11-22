---
layout: doc
title: Mixin
description: Assemble Unicorn JS classes from reusable mixins.
---

# Mixin

JavaScript classes extend only one base class. Mixins remove that limit: a
mixin is a small class that holds one capability, and `Mixin()` combines
several of them into a single class. You assemble behavior from small parts
instead of building a deep inheritance chain.

Unicorn JS uses this pattern for its own classes. `UnicornApp` and
`S3Uploader` both start from `Mixin(EventMixin)`. `EventMixin` is one of
the building blocks, and your own mixins work the same way.

## Enabling Mixin

Unicorn JS does not re-export `Mixin()`. Install `ts-mixer` in your
project and import the function from there:

```bash
yarn add ts-mixer
```

```ts
import { EventMixin } from '@windwalker-io/unicorn-next';
import { Mixin } from 'ts-mixer';

class Store extends Mixin(EventMixin) {}
```

::: tip
Use the same major version as the package. Unicorn JS currently depends on
`ts-mixer` `^6.0.4`.
:::

## Complete Example

The following upload task combines the event methods with two mixins of
its own. Each mixin contributes state and methods. The task class defines
only the flow that connects them:

```ts
import {
  EventAwareInterface,
  EventMixin,
} from '@windwalker-io/unicorn-next';
import { Mixin } from 'ts-mixer';

// Declares the event methods that this mixin relies on.
interface LoadingState extends EventAwareInterface {}

class LoadingState {
  loading = false;

  start(): void {
    this.loading = true;
    this.trigger('loading.start');
  }

  finish(): void {
    this.loading = false;
    this.trigger('loading.finish');
  }
}

class Retryable {
  attempts = 0;
  maxAttempts = 3;

  canRetry(): boolean {
    return this.attempts < this.maxAttempts;
  }

  countAttempt(): void {
    this.attempts++;
  }
}

class UploadTask extends Mixin(EventMixin, LoadingState, Retryable) {
  constructor(public readonly file: string) {
    super();
  }

  async run(upload: (file: string) => Promise<void>): Promise<void> {
    while (this.canRetry()) {
      this.countAttempt();
      this.start();

      try {
        await upload(this.file);
        this.trigger('upload.success', this.file);
        return;
      } catch {
        this.trigger('upload.retry', this.attempts);
      } finally {
        this.finish();
      }
    }

    this.trigger('upload.failed', this.file);
  }
}
```

Use the task like any other class. Its events come from the mixins:

```ts
const task = new UploadTask('photo.jpg');

task.on('loading.start', () => console.log('Uploading...'));
task.on('upload.retry', (attempt: number) => {
  console.log(`Retry ${attempt}`);
});
task.on('upload.success', (file: string) => {
  console.log(`${file} uploaded.`);
});

await task.run(async (file) => {
  const res = await fetch(`/upload/${file}`, { method: 'POST' });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
});
```

## Writing a Mixin

A mixin is a plain class. It needs no decorator and no special base. Keep
each mixin focused on one capability, such as loading state, retries, or
events.

A mixin that calls methods from another mixin must declare them. The
`interface ... extends EventAwareInterface {}` line above does this. It
merges the event typings into `LoadingState` without adding any runtime
code. The methods exist at runtime once the class is mixed with
`EventMixin`.

## Combining Mixins

`Mixin()` accepts any number of classes. When two mixins define the same
member, the mixin listed last wins:

```ts
class Logger {
  level = 'info';
}

class Debugger {
  level = 'debug';
}

class Tools extends Mixin(Logger, Debugger) {}

const tools = new Tools();

console.log(tools.level); // "debug"
```

::: warning
Two mixins that define the same member do not raise an error. The last one
silently replaces the others, so check the order when you combine mixins.
:::

## Constructors and State

Mixins keep their state in field initializers. `EventMixin` does this for its
listeners, so every instance gets its own list. `ts-mixer` creates each
mixin instance separately, and it copies the fields onto the final object.

Arguments reach the mixins only through `super()`. A class without its own
constructor forwards its arguments automatically. A class with its own
constructor must pass them along:

```ts
class Options {
  constructor(public readonly name: string) {}
}

class Plugin extends Mixin(Options, EventMixin) {
  constructor(name: string) {
    super(name); // Without this, Options receives no name.
  }
}
```

::: warning
Do not use `this` in a mixin constructor for side effects. The constructor
runs on a separate instance, so `this` is not the final object. Set fields
with initializers instead.
:::

## Checking for a Mixin

`instanceof` does not recognize mixins. Use `hasMixin()` from `ts-mixer`:

```ts
import { hasMixin } from 'ts-mixer';

const task = new UploadTask('photo.jpg');

console.log(task instanceof Retryable); // false
console.log(hasMixin(task, Retryable)); // true
```

::: info
Generic mixins need a different helper, `mix`, to keep the TypeScript types
correct. See the [ts-mixer documentation](https://github.com/tannerntannern/ts-mixer)
for the details.
:::

## Related

- [Unicorn JS](../unicorn-js)
- [Event Bus](./event-bus)
- [Macros](./macros)
