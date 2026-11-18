---
layout: doc
---

# Retry and Failed Jobs

This page covers how failed jobs are retried, delayed, and recorded.

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

### Deferring a Job

A job can ask to run later with `JobController`. See
[JobController](/documentation/framework/services/queue#jobcontroller) for
all of its methods. Use `defer()` when the job cannot run now, for example
when an external API is busy:

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

Use `abandoned()` for a job that can never succeed. Its argument is a
reason, not a number of seconds:

```php
throw $controller->abandoned('Order no longer exists');
```

```php
// ERROR: TypeError, abandoned() expects string|Throwable
throw $controller->abandoned(10);
```

Use `retryAfter()` when the job should wait, and the attempt should
count:

```php
throw $controller->retryAfter(30);
```

### Backoff

By default, a failed job waits the number of seconds set by `--backoff`.
Use `#[JobBackoff]` to change that for one job.

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

Retry jobs by ID, and optionally delay them with `-d` (seconds):

```bash
php windwalker queue:retry 12 13 -d 60
```

Retry every failed job:

```bash
php windwalker queue:retry --all
```

Choose the connection that owns the failed table with `--failer`:

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
whether the job will be retried:

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
