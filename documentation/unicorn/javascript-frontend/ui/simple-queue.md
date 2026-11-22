---
layout: doc
title: SimpleQueue
description: Run async tasks with a concurrency limit using the Unicorn JS queue.
---

# SimpleQueue

Many browser jobs, such as uploading a batch of files or calling an API
for each row in a table, should not all start at once. A queue runs async
tasks with a concurrency limit. It starts the next waiting task when a
running task finishes, so the number of active tasks never exceeds the limit.

Unicorn provides two factory functions, `createQueue()` and `useQueue()`.
Both return a `TaskQueue` object from the `@lyrasoft/ts-toolkit` package.

## Enabling the Queue

Import a factory and create a queue with a limit. The default limit is `1`,
which runs tasks one at a time.

```ts
import { createQueue } from '@windwalker-io/unicorn-next';

// Run at most three tasks at the same time.
const queue = createQueue(3);

// push() returns a promise for the task's return value.
const value = await queue.push(async () => 'done');
```

## Complete Example

This example uploads selected files three at a time. It keeps the result of
each upload, including failed ones.

```ts
import { createQueue } from '@windwalker-io/unicorn-next';

interface UploadResult {
  name: string;
  ok: boolean;
}

async function uploadFiles(files: File[]): Promise<UploadResult[]> {
  // Upload at most three files at the same time.
  const queue = createQueue(3);

  queue.onEnd(() => {
    console.log('All uploads have finished.');
  });

  const jobs = files.map((file) => {
    return queue.push(async (): Promise<UploadResult> => {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body,
      });

      return { name: file.name, ok: res.ok };
    });
  });

  const settled = await Promise.allSettled(jobs);

  return settled.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    // A network error rejects the task promise.
    return { name: files[index].name, ok: false };
  });
}

const input = document.querySelector<HTMLInputElement>('#files');
const results = await uploadFiles(Array.from(input?.files ?? []));

console.log(results.filter((r) => r.ok).length + ' uploaded.');
```

## Creating Queues

`createQueue()` returns a new, independent queue on each call.
`useQueue()` returns a named queue. Calls with the same name return the
same queue object for the whole page.

```ts
import { createQueue, useQueue } from '@windwalker-io/unicorn-next';

// A new independent queue with the default limit of 1.
const serial = createQueue();

// A new independent queue with a limit of 5.
const parallel = createQueue(5);

// A named queue shared across the page.
const avatars = useQueue('avatars', 2);
const sameQueue = useQueue('avatars');

console.log(avatars === sameQueue); // true
```

::: info
The `maxRunning` argument applies only when a name is first used.
Later calls with the same name return the existing queue and ignore it.

```ts
const first = useQueue('avatars', 2);

// The limit stays 2. The argument 10 is ignored.
const second = useQueue('avatars', 10);
```
:::

## Adding Tasks

`push()` accepts a function. The function can return a value or a promise.
Tasks start in the order they were pushed. A task that rejects does not
stop the queue, and the next waiting task still starts.

```ts
const queue = createQueue(2);

// Resolves with the value returned by the task.
const user = await queue.push(async () => {
  const res = await fetch('/api/user');

  return res.json();
});

// Rejects with the error thrown inside the task.
try {
  await queue.push(async () => {
    // ERROR: Error: Upload failed
    throw new Error('Upload failed');
  });
} catch (e) {
  console.error(e);
}
```

::: warning
Each `push()` promise rejects when its task fails. If you do not catch the
rejection, it becomes an unhandled rejection and the failure may go unnoticed.
Handle every promise, or use `Promise.allSettled()` for a batch.
:::

## Inspecting the Queue

The queue exposes its state through properties. `length` counts waiting
tasks only. `currentRunning` counts tasks that are running now.

```ts
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const queue = createQueue(2);

queue.push(() => wait(1000));
queue.push(() => wait(1000));
queue.push(() => wait(1000));

// Two tasks are running, and one is waiting.
console.log(queue.currentRunning); // 2
console.log(queue.running);        // true
console.log(queue.length);         // 1
console.log(queue.isEmpty());      // false
```

## Observing the Queue

Observers receive the queue, the number of waiting tasks, and the number of
running tasks. They are called when a task starts or finishes, and after
`clear()`. Pushing a task while the queue is full does not call them.

```ts
const queue = createQueue(3);

// Called on every start or finish. Returns an unsubscribe function.
const stop = queue.observe((q, length, running) => {
  console.log(`Waiting: ${length}, running: ${running}`);
});

// Called when no task is waiting or running.
queue.onEnd(() => {
  console.log('All tasks finished.');
});

// Called on the next notification only, then removed.
queue.once(() => {
  console.log('The first change.');
});

// Remove one observer.
stop();

// Remove every observer on this queue.
queue.off();
```

## Clearing Waiting Tasks

`clear()` removes all waiting tasks and returns the queue. Running tasks
continue until they finish.

```ts
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const queue = createQueue(1);

const first = queue.push(() => wait(1000));
const second = queue.push(() => wait(1000));

// Removes the waiting task. `first` keeps running.
queue.clear();

// ERROR: Never resolves, because the task was removed.
await second;
```

::: warning
`clear()` discards waiting tasks without settling their promises. Code that
awaits a discarded task waits forever. Do not await a task that may be
cleared, or track cleared tasks in your own code.
:::
