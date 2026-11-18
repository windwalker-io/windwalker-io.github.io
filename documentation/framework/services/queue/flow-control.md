---
layout: doc
---

# Flow Control

This page covers how a job controls its own run: reading its state,
adding middleware, limiting concurrency and rate, and retrying or failing.

## JobController

This section covers the `JobController` object, the job's handle on its own
run. It records the outcome and tells the worker what to do next.

The worker injects it into any `#[JobEntry]`, `#[JobMiddleware]`, or
`#[JobFailed]` method when you type-hint it:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class ImportRowsJob
{
    public function __construct(public string $file)
    {
    }

    #[JobEntry]
    public function import(JobController $controller): void
    {
        // Write a line to the job log.
        $controller->log('Importing ' . $this->file);

        // Methods available on $controller:
        //   defer(60, 'reason')  Run again later, not a failure.
        //   retryAfter(30)       Run again, counts as an attempt.
        //   failed('reason')     Mark the job as failed.
        //   abandoned('reason')  Give up on the job.
        //   keep()               Keep the job in the queue.
        //   success()            Mark the job as successful.

        // Read the run state: $controller->attempts, $controller->failed,
        // $controller->deferTimes, $controller->willRetry,
        // $controller->shouldDelete, $controller->exception.
    }
}
```

`defer()`, `retryAfter()`, `failed()`, and `abandoned()` return an
exception object. Throw it to stop the job at that point, as shown in
[Deferring a Job](#deferring-a-job).

Method details and examples are in the component docs:
[defer()](/documentation/components/queue/writing-jobs#defer),
[retryAfter()](/documentation/components/queue/writing-jobs#retryafter),
[failed()](/documentation/components/queue/writing-jobs#failed),
[abandoned()](/documentation/components/queue/writing-jobs#abandoned), and
[the full JobController reference](/documentation/components/queue/writing-jobs#the-jobcontroller)
for `keep()`, `success()`, the state properties, and `log()`.

In middleware, the same controller is passed in. Call `next()` to continue,
as shown in [Middleware](#middleware).

::: info
The retry and failed-job behavior that follows depends on these calls.
:::

## Middleware

This section covers `#[JobMiddleware]` methods, which run before a job method
and decide whether the job continues.

Middleware runs before the job method. Use it for checks shared by many
jobs, such as logging, locks, or rate limits. Mark a method with
`#[JobMiddleware]`. It must return the `JobController` after calling
`next()`, or return a `DeferredException` to stop. The chain rules and
`#[JobMiddlewaresProvider]` are in
[Writing Jobs: Middleware](/documentation/components/queue/writing-jobs#middleware):

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Attributes\JobMiddleware;
use Windwalker\Queue\Job\JobController;

class SendMailJob
{
    public function __construct(
        public string $to,
        public string $subject,
    ) {
    }

    #[JobMiddleware]
    public function logStart(JobController $controller): JobController
    {
        $controller->log(
            'Mail job started, attempt ' . $controller->attempts,
        );

        return $controller->next();
    }

    #[JobEntry]
    public function send(MailService $mailService): void
    {
        $mailService->send($this->to, $this->subject);
    }
}
```

Set `order` to control the sequence when a job has several middleware
([details](/documentation/components/queue/writing-jobs#middleware)):

```php
#[JobMiddleware(order: 1)]
public function first(JobController $controller): JobController
{
    return $controller->next();
}
```

::: warning
If middleware returns `null`, the worker throws
`UnexpectedValueException`. Always return the controller or an exception.
:::

## Locks and Rate Limits

This section covers how to stop jobs from running at the same time or too
often, using Symfony's lock and rate limiter components in a middleware.

Some jobs must not run at the same time, for example two jobs that update
the same order. Other jobs must not run too often, for example a job that
calls a rate-limited API. Protect these in the queue, not only in the
caller. Jobs run in several workers, so a check made when the job is
enqueued cannot see what other workers are doing at run time. A middleware
checks the rule just before the job runs.

Use the Symfony components for this. They are general-purpose and do not
depend on Windwalker. See the [Symfony Lock](https://symfony.com/doc/current/components/lock.html)
and [Symfony Rate Limiter](https://symfony.com/doc/current/rate_limiter.html)
documentation for the full API:

```bash
composer require symfony/lock symfony/rate-limiter
```

The middleware below takes a lock on the order, and defers the job when the
lock is busy. It also applies a rate limit to the job:

```php
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Lock\Store\FlockStore;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\RateLimiter\Storage\InMemoryStorage;

$lockFactory = new LockFactory(new FlockStore());

$limiter = new RateLimiterFactory(
    [
        'id' => 'order-sync',
        'policy' => 'fixed_window',
        'limit' => 10,
        'interval' => '1 minute',
    ],
    new InMemoryStorage(),
);

// Inside a queue middleware's handle method:
$lock = $lockFactory->createLock('order.' . $orderId);

if (!$lock->acquire()) {
    return $controller->defer(60);
}

try {
    if (!$limiter->create('order-sync')->consume()->isAccepted()) {
        return $controller->defer(60);
    }

    return $next();
} finally {
    $lock->release();
}
```

Use a shared store such as [Redis](/documentation/components/queue/drivers#redis-driver)
in production. `FlockStore` and `InMemoryStorage` only protect one machine,
and in-memory rate limits reset for each process.

## Retry and Backoff

This section covers how the worker retries a failed job and how to set the
delay between attempts with `#[JobBackoff]`.

When a job fails, the worker decides what happens next. The decision
depends on the attempt count, the backoff, and what the job reported.

### Tries

A job that throws is retried until it reaches `--tries` attempts (default
`5`). Then it moves to the failed table:

```bash
php windwalker queue:worker --tries=3
```

The option is also described in
[Workers: Retries and Backoff](/documentation/components/queue/workers#retries-and-backoff).

### Deferring a Job

A job can ask to run later with `JobController`. See
[JobController](#jobcontroller) and [defer()](/documentation/components/queue/writing-jobs#defer)
for details. Use `defer()` when
the job cannot run now, for example when an external API is busy:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SyncOrderJob
{
    public function __construct(public int $orderId)
    {
    }

    #[JobEntry]
    public function sync(
        JobController $controller,
        OrderApi $api,
    ): void {
        if (!$api->isAvailable()) {
            throw $controller->defer(60, 'API is busy');
        }

        $api->sync($this->orderId);
    }
}
```

`defer()` returns a `DeferredException`. Throw it to stop the job. The
worker queues the job again after 60 seconds.

::: warning Throw the result of defer()
Inside a job method, `defer()` records the state, but execution
continues unless you throw the returned exception. Write
`throw $controller->defer(...)`, not `return`, so the job stops here.
:::

Use [abandoned()](/documentation/components/queue/writing-jobs#abandoned)
for a job that can never succeed. Its argument is a reason, not a number
of seconds:

```php
throw $controller->abandoned('Order no longer exists');
```

Use [retryAfter()](/documentation/components/queue/writing-jobs#retryafter)
when the job should wait, and the attempt should count:

```php
throw $controller->retryAfter(30);
```

### Backoff

By default, a failed job waits the number of seconds set by `--backoff`.
Use `#[JobBackoff]` to change that for one job. The attribute's arguments
are in
[Writing Jobs: Entry Methods and Attributes](/documentation/components/queue/writing-jobs#entry-methods-and-attributes),
and the worker-side settings are in
[Workers: Retries and Backoff](/documentation/components/queue/workers#retries-and-backoff).

#### A Fixed Delay

```php
use Windwalker\Queue\Attributes\JobBackoff;

#[JobBackoff(10)]
class SendMailJob
{
    // ...
}
```

#### A List of Delays

The list gives the delay for each attempt. When the list runs out, the
job stops retrying:

```php
#[JobBackoff([5, 10, 25, 50, 150, 600])]
class SendMailJob
{
    // ...
}
```

#### A Method

A method computes the delay. Return the seconds, or `false` to stop:

```php
use Windwalker\Queue\Attributes\JobBackoff;
use Windwalker\Queue\Job\JobController;

class SendMailJob
{
    #[JobBackoff]
    public function backoff(JobController $controller): false|int
    {
        return JobBackoff::backoff($controller->attempts, 10, 5);
    }
}
```

`JobBackoff::backoff()` is a helper for exponential delays:

```php
public static function backoff(
    int $n,
    int $base = 1,
    int $pow = 2,
    ?int $maxTimes = null,
    int $maxSeconds = 86400,
    int $adaptive = 1,
): int|false
```

It returns `false` when `$maxTimes` is reached.

The `jitter` argument of `#[JobBackoff]` randomizes the delay by a ratio
between `0` and `1`. This keeps many retries from running at the same
moment.

## Failed Jobs

This section covers where failed jobs are stored, how to retry them with
`queue:retry`, and how a `#[JobFailed]` method reacts to each failed
attempt.

Failed jobs are kept in the `queue_failed` table. Each row stores the
connection, channel, job body, and exception. Read the table from your
database or from an admin page.

Retry jobs by ID, and optionally delay them with `-d` (seconds). The
command and the failer classes are in
[Failed Jobs](/documentation/components/queue/failed-jobs):

```bash
php windwalker queue:retry 12 13 -d 60
```

Retry every failed job:

```bash
php windwalker queue:retry --all
```

Choose the connection that owns the failed table with `--failer`
([Failer Configuration](/documentation/components/queue/failed-jobs#failer-configuration)):

```bash
php windwalker queue:retry --all --failer=database
```

::: warning
Run `queue:retry` with IDs or `--all`. Without either, it throws
`InvalidArgumentException`.
:::

```text
// ERROR: InvalidArgumentException
php windwalker queue:retry
```

### The Failed Handler

Mark a method with `#[JobFailed]` to run code when an attempt fails. The
method runs on every failed attempt, so check `shouldDelete` to see
whether the job will be retried. See
[Writing Jobs: Entry Methods and Attributes](/documentation/components/queue/writing-jobs#entry-methods-and-attributes)
for the full rules:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Attributes\JobFailed;
use Windwalker\Queue\Job\JobController;

class SendMailJob
{
    public function __construct(
        public string $to,
        public string $subject,
    ) {
    }

    #[JobEntry]
    public function send(MailService $mailService): void
    {
        $mailService->send($this->to, $this->subject);
    }

    #[JobFailed]
    public function onFailed(
        JobController $controller,
        MailLogRepository $logs,
    ): void {
        if ($controller->shouldDelete) {
            $logs->markFailed(
                $this->to,
                $controller->exception?->getMessage(),
            );
        }
    }
}
```

`shouldDelete` is `true` when the job will not be retried. Update your
own records only then.
