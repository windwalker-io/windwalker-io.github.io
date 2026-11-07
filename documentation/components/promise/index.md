---
layout: doc
title: Introduction
component: promise
---

# Introduction

Windwalker Promise is a Promise/A+ implementation with an ES-like interface. It provides promises, combinators, coroutines, and a scheduler that decides when deferred callbacks run.

## Installation

Install via composer

```bash
composer require windwalker/promise ^4.0
```

## Use in Windwalker

To utilize any component supporting asynchronous calls, a promise will be returned as the value:

```php
// Http Client
$http = new \Windwalker\Http\HttpClient();

$http->postAsync(...)->then(fn () => ...);

// File Async operation
$file = \Windwalker\fs('/path/to/file');

$file->deleteAsync()->then(fn () => ...);
```

## Use as Standalone Component

Simply initiate Promise object which like ES syntax.

```php
use Windwalker\Promise\Promise;

$promise = new Promise(function ($resolve, $reject) {
    $resolve(...);
});

$promise->wait();
```

The resolver may also take no arguments when the promise is only needed to wrap a synchronous call. If the resolver throws, the promise is rejected with the exception.

```php
$promise = new Promise(fn() => throw new RuntimeException('Failed'));
```

## Getting Started

### How Promise Works in Pure PHP

PHP is inherently synchronous. When run in an Apache module, FPM, or CGI, there are no asynchronous processes.

Windwalker Promise creates a queue to manage all your asynchronous tasks. It waits until the PHP process ends (for example, when the process shuts down or runs to completion) and then executes all the tasks.

For instance, the following code attempts to send mail asynchronously. Once `runAndSendMail()` completes, the promise tasks are added to a global queue and not executed immediately. These tasks will be performed after the entire process ends, preventing the user from experiencing any delay when the system tries to send an email.

```php
use Windwalker\Promise\Promise;

function runAndSendMail() {
    // Do something
    
    // Start to send mail
    return Promise::resolve()
        ->then(function () {
            // This will run after the process ends
            Mailer::send(...);
        });
}

runAndSendMail()->then(...);
```

### Force Wait

To force all asynchronous tasks to run, you can use `wait()` to make PHP pause and block:

```php
$promise = runAndSendMail();

// This will process all tasks and block
$promise->wait();

// After all tasks executed, the process will resume
```

## Creating Promises

| Method | Description |
|--------|-------------|
| `new Promise(?callable $resolver)` | Create a promise. The resolver receives `$resolve` and `$reject`, or none. |
| `Promise::create(?callable $resolver)` | Same as the constructor, returns `static`. |
| `Promise::resolve(mixed $value = null)` | Create a fulfilled promise. A promise or thenable value is adopted. |
| `Promise::reject(mixed $reason = null)` | Create a rejected promise. |
| `Promise::try(callable $callback, mixed ...$args)` | Run the callback and fulfill with its return value, or reject with the thrown exception. |
| `Promise::withResolvers()` | Return `[$promise, $resolve, $reject]` for settling the promise from outside. |

```php
use Windwalker\Promise\Promise;

[$promise, $resolve, $reject] = Promise::withResolvers();

$resolve('done');

echo $promise->wait(); // done
```

`Promise::resolved()` and `Promise::rejected()` are kept for backward compatibility. Use `resolve()` and `reject()` in new code.

## Chaining

| Method | Description |
|--------|-------------|
| `then(?callable $onFulfilled, ?callable $onRejected)` | Register handlers. Returns a new promise with the handler's return value. |
| `catch(?callable $onRejected)` | Shortcut for `then(null, $onRejected)`. |
| `finally(?callable $onFulfilledOrRejected)` | Run the callback on either outcome. The original value or reason passes through. |
| `done(?callable $onFulfilled)` | Deprecated. Use `then()` instead. |

Returning a promise from a handler makes the chained promise wait for it:

```php
Promise::resolve(2)
    ->then(fn (int $v) => Promise::resolve($v * 10))
    ->wait(); // 20
```

## Promise States

The state is a `Windwalker\Promise\Enum\PromiseState` enum with the cases `PENDING`, `FULFILLED`, and `REJECTED`.

```php
$promise->getState(); // PromiseState::PENDING

$promise->isPending();
$promise->isSettled();
$promise->isFulfilled();
$promise->isRejected();
```

Once a promise is fulfilled or rejected, its state and value cannot change.

## Combining Promises

| Method | Fulfills when | Rejects when |
|--------|---------------|--------------|
| `Promise::all(array $values)` | All values fulfill, with the values in input order. | Any value rejects. |
| `Promise::allSettled(array $values)` | All values settle. Each item is a `SettledResult` with `status` and `value`. | Never. |
| `Promise::any(array $values)` | Any value fulfills, with its value. | All values reject, with an array of reasons. An empty list rejects with `AggregateException`. |
| `Promise::race(array $values)` | The first value settles, with its value. | The first value settles by rejection. |

```php
use Windwalker\Promise\Promise;

$results = Promise::allSettled([
    Promise::resolve(1),
    Promise::reject('error'),
])->wait();

$results[0]->status; // PromiseState::FULFILLED
$results[0]->value;  // 1
$results[1]->status; // PromiseState::REJECTED
$results[1]->value;  // 'error'
```

## Handling Rejections

A rejected promise without a handler is treated as an uncaught error. Calling `wait()` on it throws `Windwalker\Promise\Exception\UncaughtException`. The original reason is available with `getReason()`. If the reason is a `Throwable`, the exception message and code are copied from it and it is set as the previous exception.

```php
use Windwalker\Promise\Exception\UncaughtException;

try {
    Promise::reject('Oops')->wait();
} catch (UncaughtException $e) {
    $e->getReason(); // 'Oops'
}
```

To log uncaught rejections instead of throwing, set an uncaught logger. Use the instance property `$uncaughtLogger` for one promise, or the static `Promise::$defaultUncaughtLogger` for all promises:

```php
Promise::$defaultUncaughtLogger = function (UncaughtException $e) {
    // Log $e->getReason()
};
```

## Coroutines

`coroutine()` runs a generator. Each `yield` waits for the yielded promise and sends its value back into the generator. The `return` value fulfills the returned promise. `coroutineable()` wraps a callable and keeps its arguments.

```php
use function Windwalker\Promise\coroutine;
use function Windwalker\Promise\coroutineable;

$promise = coroutine(function () {
    $a = yield Promise::resolve(3);
    $b = yield Promise::resolve(4);

    return $a + $b;
});

$promise->wait(); // 7

$double = coroutineable(fn (int $x) => (yield Promise::resolve($x)) * 2);

$double(5)->wait(); // 10
```

## Helper Functions

The following helpers are available in the `Windwalker\Promise` namespace:

| Function | Description |
|----------|-------------|
| `resolve($value)` / `reject($reason)` | Shortcuts for `Promise::resolve()` and `Promise::reject()`. |
| `is_thenable($value)` | Check whether a value has a `then()` method. |
| `async(callable $callable)` | Run the callable in a promise chain and return the promise. |
| `asyncable(callable $callable)` | Return a function that returns a promise each time it is called. |
| `await(PromiseInterface $promise)` | Wait for the promise and return its value. Same as `$promise->wait()`. |
| `coroutine(callable $callback)` | Run a generator as a coroutine. See the Coroutines section. |
| `coroutineable(callable $callback)` | Wrap a callable as a coroutine. See the Coroutines section. |

## Schedulers

A scheduler decides when callbacks of a pending promise run. `ScheduleRunner` tries its schedulers in order and uses the first one whose `isSupported()` returns `true`. The default order is:

1. `SwooleScheduler`: used inside a Swoole coroutine in CLI mode.
2. `DeferredScheduler`: queues callbacks in a global task queue.

With the default `DeferredScheduler`, callbacks run when you call `wait()`, or when the PHP process shuts down. They do not run when `then()` is called. For example, the following callback runs at the end of the script:

```php
Promise::resolve('x')->then(fn ($v) => print("Value: $v\n"));

echo "Script end\n";

// Output:
// Script end
// Value: x
```

The following schedulers are available in the `Windwalker\Promise\Scheduler` namespace:

| Scheduler | Description |
|-----------|-------------|
| `DeferredScheduler` | Default. Queues callbacks until `wait()` or shutdown. `DeferredScheduler::registerEventLoop()` drives the queue from a ReactPHP loop (periodic timer) or a custom callable. |
| `SwooleScheduler` | Runs callbacks in Swoole coroutines. Used by default when Swoole is available. |
| `EventLoopScheduler` | Schedules callbacks with a ReactPHP loop or a custom timer. Use `EventLoopScheduler::swoole()` for Swoole timers. |
| `ImmediateScheduler` | Runs callbacks immediately when `then()` is called. |

To change the schedulers, set them on the runner before creating promises:

```php
use Windwalker\Promise\Scheduler\ImmediateScheduler;
use Windwalker\Promise\Scheduler\ScheduleRunner;

ScheduleRunner::getInstance()->setSchedulers([new ImmediateScheduler()]);
```

`SyncablePromise` is a `Promise` subclass that runs every callback synchronously and does not use the scheduler.


