---
layout: doc
---

# Queue

Some work should not run inside an HTTP request. Sending an email,
generating a report, or importing thousands of rows can take seconds or
minutes. The Queue package stores that work as a message and lets a
separate worker process run it later. The web request only pushes the
message and returns.

The package provides:

- A **driver** that stores messages (`sync`, `database`, or your own).
- A **job** class whose `#[JobEntry]` method does the work.
- A **worker** command (`queue:worker`) that reads and runs jobs.
- An **enqueuer** command (`queue:enqueuer`) that creates jobs from a
  source you define.
- **Retry**, **backoff**, **defer**, and **failed-job** handling.
- **Middleware** that runs before each job, for example for locks.

## Installation

Install the package with Composer:

```bash
composer require windwalker/queue
```

Choose the default connection in `.env`. The `sync` driver runs a job
immediately, in the same request. It is useful during development:

```ini
QUEUE_DEFAULT=sync
```

For production, use the `database` driver:

```ini
QUEUE_CONNECTION=database
```

The queue settings live in `etc/packages/queue.php`.

## Your First Job

Start with the `sync` driver. You define a job class and push it. The
job runs immediately, so you see the result without a worker.

### Define a Job

A job is a plain class. Mark one public method with `#[JobEntry]`. The
worker calls this method when it runs the job.

```php
<?php

declare(strict_types=1);

namespace App\Job;

use Windwalker\Queue\Attributes\JobEntry;

class HelloJob
{
    public function __construct(
        public string $name,
    ) {
    }

    #[JobEntry]
    public function run(): void
    {
        echo "Hello, {$this->name}!\n";
    }
}
```

The constructor holds the data the job needs. Use simple values such
as strings, numbers, and arrays. Jobs are serialized before they are
stored, so do not keep services or connections in the constructor.

### Push the Job

Get the queue with `retrieve()` or `make()`, then call `push()`:

```php
use App\Job\HelloJob;
use Windwalker\Queue\Queue;

$queue = $app->retrieve(Queue::class);

$queue->push(new HelloJob('Simon'));
// Output: Hello, Simon!
```

With `sync`, `push()` runs the job before it returns.

### Use Services in a Job

Do not inject services into the constructor. Ask for them as parameters
of the `#[JobEntry]` method. The worker resolves them when the job runs:

```php
use Windwalker\Queue\Attributes\JobEntry;
use Windwalker\Queue\Job\JobController;

class SendMailJob
{
    public function __construct(
        public string $to,
        public string $subject,
    ) {
    }

    #[JobEntry]
    public function send(
        JobController $controller,
        MailService $mailService,
    ): void {
        $controller->log('Sending mail to ' . $this->to);

        $mailService->send($this->to, $this->subject);
    }
}
```

`JobController` is provided by the queue package. It lets the job log
messages, defer, retry, or stop. You can type-hint it in any
`#[JobEntry]`, `#[JobMiddleware]`, or `#[JobFailed]` method.

::: warning Do not store PDO or other non-serializable objects
A PDO connection, a resource, or a closure that the serializer cannot
handle cannot be stored in a job. Pushing such a job fails. Fetch those
objects inside the job method instead.
:::

### Closures as Jobs

You can push a closure, but it requires the
[laravel/serializable-closure](https://github.com/laravel/serializable-closure)
package:

```bash
composer require laravel/serializable-closure
```

```php
$queue->push(function () {
    echo "Run from a closure\n";
});
```

::: tip
Prefer job classes in production. They are easier to test and to read
in the failed-job table.
:::

## Running Jobs from the CLI

Services bound only for the web, such as the request or the session, are
not available in CLI. Call `prepareWebSimulator()` before you push or run
a job that depends on them:

```php
$app->prepareWebSimulator();

$queue->push(new SendMailJob('user@example.com', 'Welcome'));
```

The `sync` driver simulates the CLI environment, so the same rule
applies to it.

## Using the Database Driver

`sync` is for development only. In production, use the `database`
driver. Jobs are stored in a table, and a worker process reads them.

### Create the Tables

The queue uses two tables: one for pending jobs and one for failed jobs.
Generate both, then run your application's migrations:

```bash
php windwalker queue:table
php windwalker queue:failed-table
```

The pending table is `queue_jobs` by default. The failed table is
`queue_failed`.

### Configure the Connection

Set the connection in `.env`:

```ini
QUEUE_CONNECTION=database
```

Push jobs as before. With the `database` driver, `push()` stores the job
and returns its ID. Nothing runs until a worker processes the job:

```php
$id = $queue->push(new SendMailJob('user@example.com', 'Welcome'));
// Saved to queue_jobs. Nothing is sent yet.
```

### Choosing a Connection by Tag

Each queue connection is registered with a tag, named after the
connection. You can inject the default connection, or retrieve a named
one from the container:

```php
use Windwalker\Core\Queue\Queue;

// Default connection
$queue = $this->app->retrieve(Queue::class);

// A named connection, selected by tag
$sqsQueue = $this->app->retrieve(Queue::class, tag: 'sqs');
```

The same tag lookup works for failers, for example
`QueueFailerInterface` with `tag: $failerName`.

## Running the Worker

The worker is a long-running command. It reads the queue, runs each job,
then deletes, retries, or defers it:

```bash
php windwalker queue:worker
```

Run it in a terminal for testing. In production, run it under a process
manager. See [Keeping the Worker Running](#keeping-the-worker-running).

### Channels

A channel is a named lane, such as `mail` or `report`. Push to a channel
with the third argument:

```php
$queue->push(new SendMailJob('user@example.com', 'Welcome'), 0, 'mail');
```

Pass the channels the worker should read as arguments. Without arguments,
it reads `default`:

```bash
php windwalker queue:worker mail report
```

Use `-a` to read every channel, and `-S` to shuffle their order so one
channel does not always run first:

```bash
php windwalker queue:worker -a -S
```

### Worker Options

The defaults come from `RunnerOptions`.

| Option | Default | Meaning |
| --- | --- | --- |
| `-c`, `--connection` | default | Connection to use |
| `-o`, `--once` | off | Run one job, then exit |
| `-b`, `--backoff` | `3` | Seconds before a failed job is available again |
| `-d`, `--delay` | `3` | Alias of `--backoff` |
| `-t`, `--tries` | `5` | Maximum attempts per job |
| `-T`, `--timeout` | `60` | Seconds allowed per job |
| `-m`, `--memory` | `128` | Memory limit in MB; the worker stops when exceeded |
| `-s`, `--sleep` | `1` | Seconds to sleep when the queue is empty |
| `-f`, `--force` | off | Run even when the worker is paused |
| `--max-runs` | `0` | Stop after N jobs; `0` means no limit |
| `-L`, `--lifetime` | `0` | Stop after N seconds; `0` means no limit |
| `-E` | off | Stop when the queue is empty |
| `-e`, `--enqueuer` | none | Run the enqueuer in the same process |
| `--file` | none | Message file to run, with `--once` |
| `-a` | off | Read all channels |
| `-S` | off | Shuffle channel order |

A typical production command:

```bash
php windwalker queue:worker mail report \
  --tries=3 \
  --timeout=300 \
  --backoff=5 \
  --memory=256 \
  --lifetime=3600
```

::: tip
`--lifetime` makes the worker exit after an hour, so a process manager
can start a fresh one. This releases memory a long-running PHP process
might accumulate.
:::

### Debugging a Job

To see a job's error while you fix it, run one job with `--once`:

```bash
php windwalker queue:worker --once --tries=999 --backoff=0
```

With `--once`, job exceptions are rethrown, so the error appears in the
terminal. Stop with `Ctrl+C` when you are done.

::: warning
`--once` rethrows job exceptions. Do not use it under a process manager,
or the worker exits on the first failure.
:::

### Restarting Workers

After a deployment, workers still run the old code. Signal them to
restart:

```bash
php windwalker queue:restart
```

A worker finishes its current job, then exits. Your process manager
starts it again with the new code. The signal is a file under
`@temp/queue/restart`.

## The Enqueuer

The worker runs jobs already in the queue. The enqueuer creates jobs. Use
it when work comes from a source, such as expired subscriptions found by
a query, or rows fetched from an external API.

### Register a Channel Handler

Register handlers on the `Enqueuer`, for example in a bootstrap file. A
handler receives the channel name. Return a job to push it, or `null` to
push nothing:

```php
use Windwalker\Queue\Enqueuer;

$enqueuer = $app->retrieve(Enqueuer::class);

$enqueuer->channel(
    'mail',
    function (string $channel) use ($app): ?object {
        $repo = $app->make(MailRepository::class);
        $mail = $repo->findNextPending();

        if (!$mail) {
            return null;
        }

        return new SendMailJob($mail->to, $mail->subject);
    }
);
```

Use `default()` for channels that have no handler of their own:

```php
$enqueuer->default(function (string $channel): ?object {
    return null;
});
```

### Run the Enqueuer

```bash
php windwalker queue:enqueuer mail
```

It accepts the same channel, connection, and loop options as the worker:
`-a`, `-S`, `-c`, `-o`, `-f`, `-m`, `-s`, `--timeout`, `--max-runs`,
`--lifetime`, and `-e`. It does not accept `--tries` or `--backoff`,
because the worker handles those when it runs the job.

::: info
`-e` means different things in the two commands. On `queue:worker`, it
runs the enqueuer in the same process. On `queue:enqueuer`, it stops when
there is nothing to enqueue.
:::

## Scheduling Workers and Enqueuers

The Scheduler can start the worker and the enqueuer for you.

- `ScheduleWorker` runs the worker logic. `runByCommand()` starts
  `queue:worker` as a separate process.
- `ScheduleEnqueuer` runs the enqueuer logic. `runByCommand()` starts
  `queue:enqueuer` as a separate process.

Both check that `windwalker/queue` is installed before they run. Use
them when a scheduled task should keep the queue fed or drained, without
a separate process-manager entry for each one. The scheduled task only
starts the process; it does not replace a long-running worker in
production.

## Retry, Defer, and Failed Jobs

When a job fails, the worker decides what happens next. The decision
depends on the attempt count, the backoff, and what the job reported.

### Tries

A job that throws is retried until it reaches `--tries` attempts (default
`5`). Then it moves to the failed table:

```bash
php windwalker queue:worker --tries=3
```

### Failed Jobs

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

### Controlling a Job with JobController

A `#[JobEntry]` method can take a `JobController`. It decides how the
job ends:

- `log($message, $level, $context)`: write to the job log.
- `defer($delay, $reason)`: run the job again after `$delay` seconds.
  It does not count as a failure.
- `retryAfter($delay)`: run again after `$delay` seconds. It counts as
  an attempt.
- `failed($reason)`: mark the job as failed.
- `success()`: mark the job as successful.
- `abandoned($reason)`: give up. The reason is a string or an exception.
- `keep()`: keep the job in the queue.
- `next()`: continue to the next middleware or to the job.

Read the state with properties such as `attempts`, `failed`, `defer`,
`abandoned`, `willRetry`, and `shouldDelete`.

Use `defer()` when the job cannot run now, for example when an external
API is busy:

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

## Middleware

Middleware runs before the job method. Use it for checks shared by many
jobs, such as logging, locks, or rate limits. Mark a method with
`#[JobMiddleware]`. It must return the `JobController` after calling
`next()`, or return a `DeferredException` to stop:

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

Set `order` to control the sequence when a job has several middleware:

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

## Backoff

By default, a failed job waits the number of seconds set by `--backoff`.
Use `#[JobBackoff]` to change that for one job.

### A Fixed Delay

```php
use Windwalker\Queue\Attributes\JobBackoff;

#[JobBackoff(10)]
class SendMailJob
{
    // ...
}
```

### A List of Delays

The list gives the delay for each attempt. When the list runs out, the
job stops retrying:

```php
#[JobBackoff([5, 10, 25, 50, 150, 600])]
class SendMailJob
{
    // ...
}
```

### A Method

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

## Locks and Rate Limits

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

Use a shared store such as Redis in production. `FlockStore` and
`InMemoryStorage` only protect one machine, and in-memory rate limits reset
for each process.

## Keeping the Worker Running

A worker is a long-running process. If it exits, the queue stops. Use a
process manager to start it at boot and restart it when it stops.

### pm2

The internal setup uses pm2. The command below is a generic example and is
not verified in this repository:

```bash
pm2 start "php windwalker queue:worker mail report --lifetime=3600" \
  --name queue-worker

pm2 save
```

Use `pm2 logs queue-worker` to read the output, and
`pm2 restart queue-worker` to restart it.

### Supervisor

::: info Generic example
The following Supervisor program is a generic example. It is not verified
against this repository. Adjust the paths and user for your server.
:::

Create `/etc/supervisor/conf.d/queue-worker.conf`:

```ini
[program:queue-worker]
command=php /var/www/app/windwalker queue:worker mail report
directory=/var/www/app
autostart=true
autorestart=true
user=www-data
numprocs=2
process_name=%(program_name)s_%(process_num)02d
stdout_logfile=/var/log/queue-worker.log
stopwaitsecs=60
```

Reload Supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

::: tip
Set `stopwaitsecs` longer than your longest job, so the process manager
does not stop a worker in the middle of a job. After each deployment, run
`php windwalker queue:restart`.
:::

## Custom Drivers

The queue creates a driver from a driver class and its arguments. The
package provides `SyncQueueDriver` and `DatabaseQueueDriver`. To add your
own, such as a Redis-backed driver, implement
`Windwalker\Queue\Driver\QueueDriverInterface`.

Register the queue instance in the `queue` config under
`factories.instances`. Each entry is a closure that returns a `Queue`
built from your driver. Set `default` to the new name to use it:

```php
// etc/packages/queue.config.php
return [
    'default' => env('QUEUE_DEFAULT', 'redis'),

    'factories' => [
        'instances' => [
            'redis' => static fn () => new Queue(
                new MyRedisQueueDriver(/* connection settings */),
            ),
        ],
    ],
];
```

Failed-job storage uses the `failer_default` key, and its factories are
under `factories.failers`. Read `QueueFactory` in your installed version
for the exact constructor arguments before you add a driver.

## Summary

- Use `sync` in development and `database` in production.
- Define a job with `#[JobEntry]`. Keep data in the constructor and
  services in the method.
- Run `queue:worker` under a process manager.
- Use `queue:enqueuer` to create jobs from a source.
- Control retries with `JobController`, `#[JobFailed]`, and `#[JobBackoff]`.
- Replay failed jobs with `queue:retry`.
