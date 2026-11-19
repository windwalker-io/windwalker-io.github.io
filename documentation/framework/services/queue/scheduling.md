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

$schedule->task('queue-worker')
    // Every 5 minutes at minutes 4, 9, 14, ... (4-59/5 * * * *)
    ->everyMinutes(5, 4, 59)
    ->handler(
        fn (ScheduleWorker $worker) => $worker->runByCommand(
            lifetime: 180,
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
one, so up to about two minutes pass without a worker.

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

$schedule->task('queue-enqueuer')
    // Every 5 minutes at minutes 2, 7, 12, ... (2-59/5 * * * *)
    ->everyMinutes(5, 2, 59)
    ->handler(
        fn (ScheduleEnqueuer $enqueuer) => $enqueuer->runByCommand(
            lifetime: 60,
            channels: 'mail',
            options: new ScheduleEnqueuerOptions(
                stopWhenEmpty: true,
            ),
        )
    );
```

With `stopWhenEmpty`, the process exits as soon as every handler returns
`null`. It does not idle until the lifetime ends.

The command loads its channel handlers in the new process. See
[Enqueuer](/documentation/framework/services/queue/enqueuer) for how to
write them.

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

`run()` runs the worker loop inside the scheduler process. Unlike
`runByCommand()`, it does not start a separate `queue:worker` process.
Compared with that process, the loop shares memory and services with the
scheduler, so memory grows across the whole loop. `memoryLimit` still
stops the loop when it is reached. A fatal error or `exit()` in a job also
ends the scheduler, and the events after it in that run do not start.

`run()` keeps processing until the lifetime ends:

```php
$schedule->task('queue-worker-inline')
    // Every 5 minutes at minutes 4, 9, 14, ... (4-59/5 * * * *)
    ->everyMinutes(5, 4, 59)
    ->handler(
        fn (ScheduleWorker $worker) => $worker->run(
            lifetime: 180,
            channels: 'default',
            options: new ScheduleWorkerOptions(
                stopWhenEmpty: true,
                tries: 3,
            ),
        )
    );
```

`runOnce()` is a similar method. It processes the queue until it is
empty, then returns. Both methods throw a `DomainException` when
`windwalker/queue` is not installed.

::: warning
Jobs run inside the scheduler process. A slow job delays the other
events, and a job that leaks memory affects the whole process. For long
work, use `runByCommand()`.
:::

## Simulate a Queue with Cron

Without a background process, cron can run short batches instead. We
recommend a batch every five minutes at minutes 2, 7, 12, and so on
(`2-59/5 * * * *`). Each batch processes the queue for a fixed time and
exits. See [Choose the Interval](#choose-the-interval) for the reasons.

::: warning Limited throughput
This pattern gives you only one worker. Each task runs one process at a
time, and the tasks run only a few minutes in every five. It suits small
scheduled jobs and work that does not need to run right away. For a
large volume of real-time background work, use proper queue workers
under a process manager, as described in
[Keeping the Worker Running](/documentation/framework/services/queue#keeping-the-worker-running).
:::

### Set Up the Cron Line

Start the scheduler with the crontab entry described in
[Installing the Crontab](/documentation/framework/services/scheduler#installing-the-crontab).
The batch below is one of the events it runs.

### A Queue Batch

Register two tasks in your schedules file. The enqueuer task runs at
minutes 2, 7, and so on. The worker task runs at minutes 4, 9, and so on,
so the two never overlap. The enqueuer task comes first in the file:

```php
use Windwalker\Core\Queue\ScheduleEnqueuer;
use Windwalker\Core\Queue\ScheduleEnqueuerOptions;
use Windwalker\Core\Queue\ScheduleWorker;
use Windwalker\Core\Queue\ScheduleWorkerOptions;

$schedule->task('queue-enqueuer')
    // Every 5 minutes at minutes 2, 7, 12, ... (2-59/5 * * * *)
    ->everyMinutes(5, 2, 59)
    ->handler(
        fn (ScheduleEnqueuer $enqueuer) => $enqueuer->run(
            lifetime: 60,
            channels: 'mail',
            options: new ScheduleEnqueuerOptions(
                stopWhenEmpty: true,
            ),
        )
    );

$schedule->task('queue-worker')
    // Every 5 minutes at minutes 4, 9, 14, ... (4-59/5 * * * *)
    ->everyMinutes(5, 4, 59)
    ->handler(
        fn (ScheduleWorker $worker) => $worker->run(
            lifetime: 180,
            channels: ['mail', 'default'],
            options: new ScheduleWorkerOptions(
                stopWhenEmpty: true,
                tries: 3,
            ),
        )
    );
```

Each task has its own task lock and lifetime. Keep each lifetime below
the five-minute interval, so a task ends before its next tick starts it
again. `stopWhenEmpty` makes each part exit as soon as its work is done,
so an idle queue does not hold the batch open. The enqueuer task also
needs its channel handlers. See [Enqueuer](/documentation/framework/services/queue/enqueuer).

::: tip
Keep each `lifetime` below the interval. A task that ends early leaves
the queue idle until the next tick.
:::

### Choose the Interval

The pattern `2-59/5 * * * *` runs the enqueuer at minutes 2, 7, 12, and
so on. The worker uses `4-59/5 * * * *`, two minutes later. Use
`everyMinutes(5, 2, 59)` and `everyMinutes(5, 4, 59)` to write them. These
are a good default for queue tasks:

- It avoids minute `0`. Hourly, daily, and most system cron jobs start at
  `:00`, so the batch does not compete with them.
- It avoids every minute used by `*/5`, `*/10`, `*/15`, and `*/30`. Those
  expressions all run at multiples of 5, and this pattern never lands on
  one.
- It leaves room for the task. Each lifetime ends before the next run at
  the five-minute mark.

Other step values hit some of the same minutes. For example, `*/3` also
runs at minutes 12 and 57. A one-minute interval also works, but then
`lifetime` must stay below 60 seconds.

::: info
The worker checks `lifetime` between jobs. A job that starts just
before the limit can run past it. Keep a margin of at least the job's
`timeout` below the interval.
:::

### Place the Batch Last

Events due in the same minute run one after another in the scheduler
process. A queue task blocks the events that come after it in that
minute, so register the queue tasks last in the file. Register other
events above them.

```php
$schedule->daily('purge-sessions')
    ->handler(fn () => print("Sessions purged\n"));

// Last: the queue tasks block the events that follow them.
// Every 5 minutes at minutes 4, 9, 14, ... (4-59/5)
$schedule->task('queue-worker')
    ->everyMinutes(5, 4, 59)
    /* ... */;
```

::: warning
An event registered after the batch can start late. If the batch runs
past its minute, the scheduler may skip the event for that minute.
:::

## Summary

- `ScheduleWorker::runByCommand()` starts `queue:worker` on each tick.
- `ScheduleEnqueuer::runByCommand()` starts `queue:enqueuer` on each tick.
- Set a `lifetime` above zero, so the worker recycles and the scheduler
  continues.
- Register enqueuer handlers in `queue.enqueuer.handlers`, because the
  command runs in a new process.
- Use `run()` to run the loop in the scheduler process.
- Without a background process, use the cron tasks with the intervals
  `2-59/5 * * * *` (enqueuer) and `4-59/5 * * * *` (worker), and register
  the queue tasks as the last events.
