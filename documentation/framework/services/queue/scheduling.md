---
layout: doc
description: Start the queue worker or enqueuer from a scheduled event, so queued jobs run without a separate process-manager entry.
---

# Scheduling Workers and Enqueuers

A queue worker is a long-running process. In production, a process
manager such as Supervisor keeps it alive. See
[Keeping the Worker Running](/documentation/framework/services/queue#keeping-the-worker-running).

Some hosts have no process manager, or you want the scheduler to own the
worker. `ScheduleWorker` and `ScheduleEnqueuer` let a scheduled event
start the queue commands for you. Each tick starts a worker or enqueuer,
which runs until its lifetime ends or it has nothing left to do.

- `ScheduleWorker` starts `queue:worker`.
- `ScheduleEnqueuer` starts `queue:enqueuer`.

:::info
These services need the scheduler to be set up first. See
[Scheduler](/documentation/framework/services/scheduler). Install
`windwalker/queue` as well.
:::

## Keep a Worker Running

Register an event in your schedules file. Type-hint `ScheduleWorker` in
the handler, and call `runByCommand()`:

```php
// resources/registry/schedules.php
use Windwalker\Core\Queue\ScheduleWorker;
use Windwalker\Core\Queue\ScheduleWorkerOptions;
use Windwalker\Core\Schedule\Schedule;

/** @var Schedule $schedule */

$schedule->minutely('queue-worker')
    ->handler(
        fn (ScheduleWorker $worker) => $worker->runByCommand(
            lifetime: 3600,
            channels: ['mail', 'report'],
            options: new ScheduleWorkerOptions(tries: 3),
        )
    );
```

The handler runs `php windwalker queue:worker` with the channels, the
`--lifetime` value, and the non-zero options. It waits until the worker
exits.

Every tick checks the task lock first. While a worker is running, later
ticks skip the event. When the worker exits, the next tick starts a new
one, so at most about a minute passes without a worker.

::: warning
Set `lifetime` above zero. With `lifetime: 0`, the worker never exits.
The handler never returns, and the other events in that run never start.
:::

Events run one after another. A running worker therefore occupies the
scheduler for its whole lifetime.

## Run an Enqueuer

`ScheduleEnqueuer::runByCommand()` works the same way. Use it to create
jobs from a source on each tick:

```php
use Windwalker\Core\Queue\ScheduleEnqueuer;
use Windwalker\Core\Queue\ScheduleEnqueuerOptions;

$schedule->minutely('queue-enqueuer')
    ->handler(
        fn (ScheduleEnqueuer $enqueuer) => $enqueuer->runByCommand(
            lifetime: 300,
            channels: 'mail',
            options: new ScheduleEnqueuerOptions(
                stopWhenEmpty: true,
            ),
        )
    );
```

With `stopWhenEmpty`, the process exits as soon as every handler returns
`null`. It does not idle until the lifetime ends.

The command runs in a new process, so it loads its channel handlers
itself. Register them in the file listed under `queue.enqueuer.handlers`
in `etc/packages/queue.php`:

```php
// etc/packages/queue.php (excerpt)
return [
    // ...
    'enqueuer' => [
        'handlers' => [
            __DIR__ . '/../../resources/registry/enqueuers.php',
        ],
    ],
];
```

The handler file receives `$app` and `$enqueuer`:

```php
// resources/registry/enqueuers.php
use App\Job\SendMailJob;
use App\Repository\MailRepository;
use Windwalker\Queue\Enqueuer\EnqueuerController;

/** @var \Windwalker\Queue\Enqueuer $enqueuer */

$enqueuer->channel(
    'mail',
    function (EnqueuerController $controller) use ($app) {
        $repo = $app->make(MailRepository::class);
        $mail = $repo->findNextPending();

        if (!$mail) {
            return null;
        }

        $controller->enqueue(
            new SendMailJob($mail->to, $mail->subject)
        );

        return true;
    }
);
```

See [Enqueuer](/documentation/framework/services/queue/enqueuer) for the
handler API.

## Options

The first argument of `runByCommand()` is the lifetime in seconds.
`0` means unlimited. The options object sets the rest. These are the
worker options and their CLI flags:

```php
new ScheduleWorkerOptions(
    once: false,            // --once: run one job, then exit
    backoff: 0,             // --backoff: seconds before a retry
    force: false,           // --force: run while the queue is paused
    sleep: 1.0,             // --sleep: seconds to wait when empty
    tries: 5,               // --tries: maximum attempts per job
    timeout: 60,            // --timeout: seconds allowed per job
    maxRuns: 0,             // --max-runs: stop after N jobs
    shuffleChannels: false, // --shuffle-channels
    stopWhenEmpty: false,   // --stop-when-empty
    enqueuer: false,        // --enqueuer: also run the enqueuer
);
```

The enqueuer options are similar. They have no `tries` or `backoff`,
because the worker applies those:

```php
new ScheduleEnqueuerOptions(
    once: false,            // --once: run one round, then exit
    force: false,           // --force: run while the queue is paused
    memoryLimit: 128,       // --memory: limit in megabytes
    sleep: 1.0,             // --sleep: seconds after each round
    timeout: 60,            // --timeout: seconds a round may run
    maxRuns: 0,             // --max-runs: stop after N loops
    shuffleChannels: false, // --shuffle-channels
    stopWhenEmpty: false,   // --stop-when-empty
);
```

::: info
`runByCommand()` does not pass `memoryLimit` to the worker. The worker
uses its own default. `memoryLimit` applies to the in-process `run()`
methods below.
:::

::: tip
`enqueuer: true` runs the enqueuer inside the worker process. The
worker prints a warning, because a separate process performs better. Use
two scheduled events instead when throughput matters.
:::

## Run in the Scheduler Process

`runOnce()` runs the worker loop in the scheduler's own process, without
starting a command. It processes the queue once and returns:

```php
$schedule->minutely('queue-drain')
    ->handler(
        fn (ScheduleWorker $worker) => $worker->runOnce(
            channels: 'default',
            options: new ScheduleWorkerOptions(tries: 3),
        )
    );
```

`run($lifetime, ...)` keeps the loop going until the lifetime ends.
Both methods throw a `DomainException` when `windwalker/queue` is not
installed.

::: warning
Jobs run inside the scheduler process. A slow job delays the other
events, and a job that leaks memory affects the whole process. For long
work, use `runByCommand()`.
:::

## Handle Failures

`runByCommand()` throws Symfony's `ProcessFailedException` when the
command exits with an error. Attach `catch()` to the event to receive it:

```php
$schedule->minutely('queue-worker')
    ->handler(
        fn (ScheduleWorker $worker) => $worker->runByCommand(3600)
    )
    ->catch(function (\Throwable $e) {
        // ERROR: ProcessFailedException: The command "php windwalker ..."
        // failed with exit code 1.
        // Notify the team or retry here.
    });
```

The scheduler logs the failure to the `system/schedule-error` channel,
then continues with the next event.

## Overlap and Multiple Servers

The scheduler's task lock stops a second copy of the event from starting
while the first one still runs. The default lock is a file lock on one
host. On several servers, each server needs a shared lock or a claim. See
[Claims and Overlap Protection](/documentation/framework/services/scheduler#claims-and-overlap-protection).

::: tip
Use a process manager for production workers, as described in
[Keeping the Worker Running](/documentation/framework/services/queue#keeping-the-worker-running).
Scheduled workers suit small setups and hosts without a process manager.
:::

## Summary

- `ScheduleWorker::runByCommand()` starts `queue:worker` on each tick.
- `ScheduleEnqueuer::runByCommand()` starts `queue:enqueuer` on each tick.
- Set a `lifetime` above zero, so the worker recycles and the scheduler
  continues.
- Register enqueuer handlers in `queue.enqueuer.handlers`, because the
  command runs in a new process.
- Use `runOnce()` or `run()` to run the loop in the scheduler process.
- Handle failures with `catch()` on the event.
