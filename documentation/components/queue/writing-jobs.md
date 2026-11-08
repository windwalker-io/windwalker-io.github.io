---
layout: doc
title: Writing Jobs
component: queue
---

# Writing Jobs

A job is the unit of work that a worker runs later. Keep a job small and
focused on one task, such as sending one email or processing one order.
Put only identifiers in its constructor, not large objects, because the
job is serialized when it is pushed and deserialized when a worker picks
it up.

## Minimal Setup

A job can be any object that is invokable, or any object with a method
marked with `#[JobEntry]`. The simplest form is an invokable class:

```php
use Windwalker\Queue\Job\JobController;

class ClearReportCache
{
    public function __invoke(JobController $controller): void
    {
        // Clear the cache for the report.
    }
}

$queue->push(new ClearReportCache());
```

The worker calls `__invoke()` and passes the `JobController` as its first
argument. The job can also be pushed by class name. Windwalker creates it
through the container, so its constructor dependencies are injected:

```php
$queue->push(ClearReportCache::class);
```

::: warning
A job is serialized when it is pushed. If you rename its class or change
its properties while messages are waiting, those messages cannot be
unserialized after a deployment. Drain the queue before changing a job
class.
:::

## Showcase

The example below combines the common parts: a default channel, a backoff
schedule, the entry method, and a failure hook.

```php
use Windwalker\Queue\Attributes\DefaultChannel;
use Windwalker\Queue\Attributes\JobBackoff;
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Attributes\JobFailed;
use Windwalker\Queue\Job\JobController;

#[DefaultChannel('mail')]
#[JobBackoff([10, 60, 300])]
class SendWelcomeMail
{
    public function __construct(
        protected int $userId,
    ) {
    }

    #[JobEntry]
    public function handle(JobController $controller): void
    {
        $controller->log('Sending welcome mail to user ' . $this->userId);

        // Load the user by ID and send the mail here.
    }

    #[JobFailed]
    public function onFailure(JobController $controller): void
    {
        // Runs on every failed attempt, before the retry is scheduled.
    }
}

// No channel given: DefaultChannel('mail') is used.
$queue->push(new SendWelcomeMail(userId: 42));
```

`DefaultChannel` applies only when `push()` receives no channel. An
explicit channel argument always wins.

## Closure Jobs

A closure can be pushed directly. It receives the `JobController` as its
only argument:

```php
$queue->push(
    function (JobController $controller): void {
        // Work to be done later.
    },
    channel: 'default',
);
```

Closure jobs require `laravel/serializable-closure`. The closure is
serialized with its captured variables, so capture only small values:

```php
$userId = 42;

// Good: capture a scalar ID and load the data in the job.
$queue->push(
    function (JobController $controller) use ($userId): void {
        $user = $users->find($userId);
    },
);
```

::: warning
Do not capture services, database connections, or file handles. They
cannot be serialized, or they will be stale when the worker runs the job.
Pass an ID and load the data inside the closure, or use a class job
instead.
:::

## Entry Methods and Attributes

Use a class with `#[JobEntry]` when the job needs several methods or
attributes. Attributes on the class control the channel and the retry
delays:

```php
use Windwalker\Queue\Attributes\DefaultChannel;
use Windwalker\Queue\Attributes\JobBackoff;

#[DefaultChannel('mail')]
#[JobBackoff(backoff: [10, 60, 300])]
class SendInvoice
{
    // ...
}
```

`#[DefaultChannel]` sets the channel used when `push()` gets none. Set
`backoff` to an integer for a fixed delay in seconds, or to an array
indexed by attempt, as above. The `jitter` option adds a random ratio
between 0 and 1 to the delay, which spreads out retries of many jobs that
failed together:

```php
#[JobBackoff(backoff: 60, jitter: 0.2)]
class SyncCatalog
{
    // Retries wait about 48 to 72 seconds.
}
```

A method marked with `#[JobFailed]` runs when an attempt fails, before
the retry is scheduled. Use it for cleanup or notification:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Attributes\JobFailed;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        // ...
    }

    #[JobFailed]
    public function notifyTeam(JobController $controller): void
    {
        // Runs on every failed attempt.
    }
}
```

`$controller->shouldDelete` tells the failure method whether the job will
run again. It is `true` when no retry is left, so a method can report only
the final failure and keep the state pending otherwise. The error is in
`$controller->exception`:

```php
    #[JobFailed]
    public function notifyTeam(JobController $controller): void
    {
        if ($controller->shouldDelete) {
            // No retry is left: report the final failure.
            $this->notifier->notifyFailed($controller->exception);
        } else {
            // The job will run again: keep the state pending.
            $this->catalog->markPending($this->catalogId);
        }
    }
```

::: warning
An array backoff limits the attempts. With `[10, 60, 300]`, the job runs at
most three times. When it is picked up a fourth time, the worker removes it
without running it.
:::

`JobBackoff::backoff()` is a static helper that computes one delay for an
attempt number, for linear, exponential, or polynomial schedules. It is
a function call, so use it in your own code, not inside an attribute.

To compute the delay for each attempt, mark a method with `#[JobBackoff]`.
The method receives the `JobController`, and its return value becomes the
delay. Call the helper inside it when you need a standard schedule:

```php
use Windwalker\Queue\Attributes\JobBackoff;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobBackoff]
    public function backoff(JobController $controller): int
    {
        // Doubles with each attempt, capped at one hour.
        return min(3600, 10 * 2 ** $controller->attempts);
    }
}
```

::: warning
Returning `false` from a backoff method removes the job the next time it is
picked up, before it runs.
:::

## Middleware

Middleware wraps the job run, for example to log timing, open a
transaction, or skip work. Mark a method with `#[JobMiddleware]` and call
`next()` to continue the chain:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Attributes\JobMiddleware;
use Windwalker\Queue\Job\JobController;

class ImportFeed
{
    #[JobMiddleware(order: 1)]
    public function timing(JobController $controller): JobController
    {
        $start = microtime(true);

        $controller = $controller->next();

        $controller->log(
            'Took ' . round(microtime(true) - $start, 3) . 's'
        );

        return $controller;
    }

    #[JobEntry]
    public function handle(JobController $controller): void
    {
        // Import the feed.
    }
}
```

::: warning
Every middleware must call `$controller->next()` and return its result.

- If it does not call `next()`, the rest of the chain and the job never run.
  The worker reports the job as finished without an error.
- If it calls `next()` but does not return the result, `run()` throws an
  `UnexpectedValueException`, because the return value is `null`.
- Calling `next()` twice advances the chain twice. The later middleware and
  the job then run out of order, and the second result is ignored.

Write the pattern once, and keep it in every middleware:

```php
public function process(JobController $controller): JobController
{
    // Before the job.

    return $controller->next();
}
```
:::

Lower `order` values run first. Reusable middleware implements
`QueueMiddlewareInterface`. A method marked with
`#[JobMiddlewaresProvider]` returns the middleware objects or closures to
apply:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Attributes\JobMiddlewaresProvider;
use Windwalker\Queue\Job\JobController;
use Windwalker\Queue\Middleware\QueueMiddlewareInterface;

class TimingMiddleware implements QueueMiddlewareInterface
{
    public function process(JobController $controller): JobController
    {
        return $controller->next();
    }
}

class ReportJob
{
    #[JobMiddlewaresProvider]
    public function middlewares(): array
    {
        return [
            new TimingMiddleware(),
            fn (JobController $c) => $c->next(),
        ];
    }

    #[JobEntry]
    public function handle(JobController $controller): void
    {
        // Build the report.
    }
}
```

### Mapping Exceptions to Outcomes

A middleware can turn an exception from the job into a controller outcome.
The exception from the job reaches the middleware through `next()`, so the
middleware catches it in a `try` block and settles the run:

```php
use Windwalker\Queue\Attributes\JobMiddleware;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobMiddleware]
    public function mapErrors(JobController $controller): JobController
    {
        try {
            return $controller->next();
        } catch (ApiBusyException $e) {
            // Wait, without counting the run as a failure.
            throw $controller->defer(60, 'API is busy.');
        } catch (CatalogNotFound $e) {
            // The resource is gone, so stop for good.
            throw $controller->abandoned('Catalog was removed.');
        } catch (ApiTimeout $e) {
            // Count as a failure and let the backoff decide.
            throw $controller->failed($e);
        }
    }
}
```

::: warning
`defer()`, `abandoned()`, and `failed()` return exceptions, not
controllers. Use `throw` with them in a middleware. A `return` would
violate the `JobController` return type of the method.
:::

## The JobController

The `JobController` is passed to the job and to every middleware. It
exposes the message state, such as `attempts`, `id`, `body`, and `job`.
Its methods change how the worker settles the job. Each outcome below is
a different call:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncInventory
{
    public function __construct(
        protected ApiClient $api,
        protected Orders $orders,
    ) {
    }

    #[JobEntry]
    public function handle(JobController $controller): void
    {
        $controller->log('Attempt ' . $controller->attempts);

        if (!$this->api->isOnline()) {
            // Wait 120 seconds. Not an attempt, not a failure.
            // Must throw it out.
            throw $controller->defer(120, 'Remote API is offline.');
        }

        if ($this->api->isBusy()) {
            // Retry in 30 seconds. Counts as an attempt, not a failure.
            throw $controller->retryAfter(30);
        }

        if ($this->orders->isCancelled()) {
            // Discard the job for good.
            throw $controller->abandoned('Order was cancelled.');
        }

        $result = $this->api->sync();

        if (!$result->success) {
            // Record the failure and let the worker retry the job.
            throw new \RuntimeException('Sync failed: ' . $result->error);
        }
    }
}
```

Throwing an exception is the usual way to report a failure. The worker
then retries the job with the configured backoff. Use the `JobController`
methods when the outcome is expected, such as waiting for a resource or
discarding a message that no longer applies. Each outcome changes the
counters differently. The defaults are `tries = 5` and `backoff = 0`:

| Outcome | `attempts` | `deferTimes` | Counted as failure | Next step | Limited by `tries` |
|---------|------------|--------------|--------------------|-----------|--------------------|
| `throw $controller->defer(N)` | Unchanged | +1 | No | Requeued after N seconds | No |
| `throw $controller->retryAfter(N)` | +1 | Unchanged | No | Requeued after N seconds | Yes |
| Thrown exception, or `$controller->failed($e)` | +1 | Unchanged | Yes | Requeued with the backoff, or deleted when `tries` is reached | Yes |
| `throw $controller->abandoned()` | +1 | Unchanged | No | Deleted | Not applicable |

- `attempts` counts each run. A deferred run is not counted, because
  `defer()` restores the count.
- `deferTimes` is stored in the message body. The database, PDO, RabbitMQ,
  and SQS drivers record it. The sync driver does not.
- `$controller->message->totalDequeues` is the sum of `attempts` and
  `deferTimes`, so it counts every run.
- `defer()` does not count toward `tries`, so a job that always defers is not
  stopped by `tries`.
- When `retryAfter()` reaches `tries`, the job is handled as a failure.

The state properties describe the run at any point. Read them to decide what
to do next:

```php
$controller->id;               // Message ID.
$controller->attempts;         // Runs counted as attempts.
$controller->deferTimes;       // Times the job was deferred.
$controller->deleted;          // Whether the message is deleted.
$controller->failed;           // Whether a failure is recorded.
$controller->defer;            // Pending defer, or null.
$controller->retryAfter;       // Pending retry delay, or null.
$controller->abandoned;        // Pending abandon, or null.
$controller->maxAttemptsExceeds; // Whether tries is reached.
$controller->shouldDelete;     // Whether the message will be deleted.
$controller->willRetry;        // Whether the job will run again.
$controller->extra;            // Array for data shared by the methods.
```

`extra` is an ordinary array on the controller. A middleware can put data
in it for the job, and the data is not stored with the message.

Each outcome has its own behavior and its own traps, so the following
sections describe them one by one.

### defer()

Use `defer()` when the job cannot run now, but the cause is not a failure of
the job, for example when a remote service is offline. The message goes back
to the queue, runs again after the delay, and no failure is recorded:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        if (!$this->api->isOnline()) {
            throw $controller->defer(120, 'Remote API is offline.');
        }

        $this->api->sync();
    }
}
```

- The message is requeued after the delay. The run is not counted in
  `attempts`, and `deferTimes` increases.
- No `#[JobFailed]` method runs, and the worker writes no error log.
- The reason is kept on the exception object. The worker does not log it.
- `throw` stops the method. Calling `defer()` without `throw` still schedules
  the defer, but the rest of the method runs first.

::: tip
Prefer `throw $controller->defer(...)` in a job. `return $controller->defer()`
records the same outcome, but only in a method without a `void` return type,
and the returned value is discarded. In middleware, returning the exception
works only in an untyped closure, because
`QueueMiddlewareInterface::process()` must return a `JobController`.
:::

#### Reversing a defer

A reversal works only while the method is still running. Once the method
throws or returns, the outcome is settled. Here the job marks a defer, then
finds that another worker already synced the catalog, and cancels the defer
before it returns:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        if (!$this->api->isOnline()) {
            $controller->defer(120, 'Remote API is offline.');

            if ($this->cache->has('catalog.synced')) {
                // Reverse: cancel the pending defer.
                $controller->resume();
            }

            return;
        }

        $this->api->sync();
    }
}
```

`resume()` clears the pending `defer()` and `retryAfter()`. With nothing else
pending, the worker deletes the message as finished.

::: warning
`tries` does not limit deferred runs. A job whose condition never clears
keeps being requeued, so it needs a condition that eventually changes, or an
`abandoned()` branch that ends it.
:::

### retryAfter()

Use `retryAfter()` for a short, expected wait that should still count as an
attempt, such as a busy service that frees up soon:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        if ($this->api->isBusy()) {
            throw $controller->retryAfter(30);
        }

        $this->api->sync();
    }
}
```

- The run counts as an attempt, and the message is requeued after the delay.
- It is not a failure: no `#[JobFailed]` method runs, and the worker logs an
  info message that the job will retry.
- The delay is used as given. The jitter and the backoff from the attributes
  are not applied.
- When the attempts reach `tries`, the job is handled as a failure.

#### Reversing a retryAfter

A reversal works only while the method is still running. Here the job asks
for a retry without `throw`, so the method keeps running. It then finds that
the catalog was synced meanwhile, and cancels the retry before it returns:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        if ($this->api->isBusy()) {
            $controller->retryAfter(30);

            if ($this->cache->has('catalog.synced')) {
                // Reverse: no retry is needed after all.
                $controller->resume();
            }

            return;
        }

        $this->api->sync();
    }
}
```

`resume()` clears both pending states, so the message is deleted as finished
instead of being requeued.

::: warning
A plain call to `retryAfter()`, without `throw`, does not stop the method.
Code after it still runs, so `return` right after the call. An exception
thrown after a plain call makes the run a failure, and the retry request is
dropped.
:::

### failed()

Use `failed()` when the attempt has failed, but the method should finish a
cleanup first, or when the failure needs a specific message or code:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        $result = $this->api->sync();

        if (!$result->success) {
            $controller->failed('Sync failed: ' . $result->error, 502);

            $this->cache->clear();
        }
    }
}
```

- `failed()` records the exception and returns it. It does not throw.
- After the method returns, the worker handles the run as a failure. The
  `#[JobFailed]` methods run, the error is logged, and the message is released
  with the backoff, or deleted when `tries` is reached.
- A failure is checked before `defer()` or `retryAfter()`, so a later call to
  either one does not change the outcome.
- `success()` clears a recorded failure. The reversal example below shows it.

#### Reversing a failure

A reversal works only while the method is still running. Here the first sync
fails, the job retries inline, and the retry succeeds. The job clears the
failure before it returns, so the run is not counted as a failure:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncCatalog
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        $result = $this->api->sync();

        if (!$result->success) {
            $controller->failed('First sync failed.');

            // Retry once inline.
            $result = $this->api->sync();

            if ($result->success) {
                // Reverse: the retry worked, so clear the failure.
                $controller->success();
            }
        }
    }
}
```

::: warning
The method keeps running after `failed()`. The `cache->clear()` call above
runs even on failure. Add `return` or `throw` if the remaining work must not
run.
:::

### abandoned()

Use `abandoned()` when the job is no longer valid and must never run again,
for example when the order it refers to was cancelled:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class ShipOrder
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        if ($this->orders->isCancelled()) {
            $controller->log(
                'Order was cancelled, job dropped.',
                'notice',
            );

            throw $controller->abandoned('Order was cancelled.');
        }

        $this->orders->ship();
    }
}
```

- The message is deleted, and it is not retried.
- No `#[JobFailed]` method runs, and the worker writes no error log. The
  attempt that was counted when the job was taken stays counted.
- `keep()` clears the abandoned state. The reversal example below shows it.

#### Reversing an abandon

A reversal works only while the method is still running. Here the order is
cancelled, but the job finds that it was reinstated, so it clears the
abandoned state and ships the order:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class ShipOrder
{
    #[JobEntry]
    public function handle(JobController $controller): void
    {
        if ($this->orders->isCancelled()) {
            $controller->abandoned('Order was cancelled.');

            if (!$this->orders->isReinstated()) {
                return;
            }

            // Reverse: the order is back, so clear the abandoned state.
            $controller->keep();
        }

        $this->orders->ship();
    }
}
```

`keep()` clears only the abandoned flag. Without it, an exception thrown
later in the method would delete the message instead of retrying it.

::: warning
An abandoned job is discarded for good, so `queue:retry` cannot bring it
back. Use it only for work you never want to repeat. Because the worker
does not log it, log the reason first, as shown above.
:::

::: warning
Delivery is at least once. A worker can crash after your side effect and
before it deletes the message, so the job runs again. Make the job
idempotent, for example by checking whether the mail was already sent
before sending it.
:::
