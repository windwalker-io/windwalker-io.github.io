---
layout: doc
description: Move slow work such as sending email or importing rows into queued jobs that a separate worker runs after the web request returns.
---

# Queue Basics

Some work should not run inside an HTTP request. Sending an email,
generating a report, or importing thousands of rows can take seconds or
minutes. The Queue package stores that work as a message and lets a
separate worker process run it later. The web request only pushes the
message and returns.

:::info
The standalone package has its own detailed guide: [Queue](../../components/queue/index.md). This page focuses on using it inside the Windwalker framework.
:::

The package provides:

- A **driver** that stores messages (`sync`, `database`, or your own).
- A **job** class whose `#[JobEntry]` method does the work.
- A **worker** command (`queue:worker`) that reads and runs jobs.
- An **enqueuer** command (`queue:enqueuer`) that creates jobs from a
  source you define.
- **Retry**, **backoff**, **defer**, and **failed-job** handling. See
  [Flow Control](/documentation/framework/services/queue/flow-control).
- **Middleware** that runs before each job, for example for locks. See
  [Flow Control](/documentation/framework/services/queue/flow-control#middleware)
  and [Locks and Rate Limits](/documentation/framework/services/queue/flow-control#locks-and-rate-limits).

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

## Jobs

This section covers how a job uses services, how to push a closure as a job,
and how to run jobs from the CLI.

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
`#[JobEntry]`, `#[JobMiddleware]`, or `#[JobFailed]` method. Its methods
are documented in [Writing Jobs](/documentation/components/queue/writing-jobs#the-jobcontroller).

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

### Running Jobs from the CLI

Services bound only for the web, such as the request or the session, are
not available in CLI. Call `prepareWebSimulator()` before you push or run
a job that depends on them:

```php
$app->prepareWebSimulator();

$queue->push(new SendMailJob('user@example.com', 'Welcome'));
```

The `sync` driver simulates the CLI environment, so the same rule
applies to it.

### JobController and Flow Control

The `JobController` is the job's handle on its own run. A job type-hints it
to log messages, read its attempt count, and decide whether to defer, retry,
fail, or abandon the job. See [JobController](/documentation/framework/services/queue/flow-control#jobcontroller)
in [Flow Control](/documentation/framework/services/queue/flow-control).


`Middleware` runs before a job method and decides whether the job continues.
Use it for checks shared by many jobs, such as logging, locks, or rate
limits. See [Middleware](/documentation/framework/services/queue/flow-control#middleware)
in [Flow Control](/documentation/framework/services/queue/flow-control).

Locks and rate limits stop jobs from running at the same time or too often.
They are built as middleware with Symfony's lock and rate limiter
components. See [Locks and Rate Limits](/documentation/framework/services/queue/flow-control#locks-and-rate-limits)
in [Flow Control](/documentation/framework/services/queue/flow-control).


## Running the Worker

This section covers the `queue:worker` command: its channels, its options,
how to debug a job, how to restart workers, and how to keep them running
under a process manager.

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

The defaults come from `RunnerOptions`. For the worker's behavior behind
each option, see [Workers](/documentation/components/queue/workers).

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

### Keeping the Worker Running

A worker is a long-running process. If it exits, the queue stops. Use a
process manager to start it at boot and restart it when it stops.

#### pm2

The internal setup uses pm2. The command below is a generic example and is
not verified in this repository:

```bash
pm2 start "php windwalker queue:worker mail report --lifetime=3600" \
  --name queue-worker

pm2 save
```

Use `pm2 logs queue-worker` to read the output, and
`pm2 restart queue-worker` to restart it.

#### Supervisor

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

## Logging

The worker writes two kinds of output. Both come from the same events, but
they go to different places.

- **Log entries** go to the `system/queue` logger channel. They are always
  recorded, no matter which verbosity flag you pass.
- **Console lines** are printed to the terminal. Only the levels allowed by
  the verbosity flag appear.

Each worker event that matters, such as a job starting, ending, or failing,
is written as both a log entry and a flash message:

```text
Run Job: Closure - Message ID: 7f3a...
Job Message: 7f3a... END
Job Closure failed - ID: 7f3a... - Connection refused. Will retry after 30 seconds.
```

Job failures are logged at `error` level with the exception. The exception
is also recorded on the `system/queue-error` channel.

Use `-v` and `-vv` to see more on the console:

```bash
php windwalker queue:worker            # emergency to error
php windwalker queue:worker -v         # adds warning, notice, info
php windwalker queue:worker -vv        # adds debug
```

Each console line from a job or controller message has this format:

```text
[info] Sending mail to user 42
```

The level is shown in brackets, followed by the message and any context
as JSON.

::: info
Verbosity only changes what is printed. It does not change which entries
are written to the log channel.
:::

### Logging in a Job

A job writes its own messages with `JobController::log()`. The signature is:

```php
public function log(
    string|array $message,
    string $level = LogLevel::INFO,
    array $context = []
): static
```

The second argument is a PSR-3 level, such as `LogLevel::DEBUG` or
`LogLevel::ERROR`. It defaults to `info`. The third argument adds context,
which is printed as JSON on the console.

Each message is written to the log channel, and the console shows it only
when the verbosity allows that level. The example below logs one message
per level:

```php
use Psr\Log\LogLevel;
use Windwalker\Queue\Job\JobController;

return function (JobController $controller) {
    $controller->log(
        'Start syncing user',
        LogLevel::DEBUG,
        ['user_id' => 42]
    );

    $controller->log('Fetched profile from API', LogLevel::INFO);

    $controller->log(
        'Rate limit is close to the limit',
        LogLevel::WARNING
    );

    $controller->log('Payment API returned 500', LogLevel::ERROR);
};
```

The same job prints a different set of lines at each verbosity:

```bash
php windwalker queue:worker
```

```text
[error] Payment API returned 500
```

```bash
php windwalker queue:worker -v
```

```text
[info] Fetched profile from API
[warning] Rate limit is close to the limit
[error] Payment API returned 500
```

```bash
php windwalker queue:worker -vv
```

```text
[debug] Start syncing user {"user_id":42}
[info] Fetched profile from API
[warning] Rate limit is close to the limit
[error] Payment API returned 500
```

The lines are printed in the order they are logged. Use `debug` for detail
you need only while you investigate, and `error` for problems that always
need attention.

::: tip
Log the detail at `debug`, and keep `info` for normal progress. A default
worker then stays quiet, and `-vv` shows the full trace when you need it.
:::

## Summary

- Use `sync` in development and `database` in production.
- Define a job with `#[JobEntry]`. Keep data in the constructor and
  services in the method.
- Run `queue:worker` under a process manager.
- Use `queue:enqueuer` to create jobs from a source.
- Control retries with [`JobController`](/documentation/framework/services/queue/flow-control#jobcontroller),
  `#[JobFailed]`, and `#[JobBackoff]`. See
  [Flow Control](/documentation/framework/services/queue/flow-control).
- Replay failed jobs with `queue:retry`.
