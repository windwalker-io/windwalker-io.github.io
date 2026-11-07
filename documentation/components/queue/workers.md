---
layout: doc
title: Workers
component: queue
---

# Workers

A `Worker` is the long-running process that takes messages from the queue
and runs their jobs. It is the part of the system that does the actual
work, so it should run in its own process, started by a process
supervisor or a console command, and not inside a web request.

The worker does not know what a job does. It asks the driver for the next
message, runs it, and then settles the outcome: delete the message on
success, release it with a delay on failure, or defer it when the job
asks to wait.

## Minimal Setup

Create a `Worker` with a `Queue` and call `loop()` with the channels to
read:

```php
use Windwalker\Queue\Worker;

$worker = new Worker($queue);

$worker->loop(['mail', 'default']);
```

`loop()` returns only when the worker stops. The default `RunnerOptions`
are used when you pass none.

## How the Loop Works

`loop()` repeats one cycle until the worker is stopped:

1. Run garbage collection and emit `LoopStartEvent`.
2. Call `next()`, which pops at most one message from the channels and
   processes it.
3. Check the stop conditions described below.
4. Emit `LoopEndEvent`.
5. Sleep for `RunnerOptions::$sleep` seconds.

Because each cycle processes one message, throughput depends on `sleep`.
The following worker sleeps for half a second between cycles:

```php
$worker = new Worker(
    $queue,
    new RunnerOptions(sleep: 0.5),
);
```

**Pitfall:** the default `sleep` is one second, so one worker handles at
most one job per second. Lower `sleep` or run more worker processes for
throughput.

## Showcase

The example below sets the common options, handles failures, and runs the
worker for the `mail` and `default` channels:

```php
use Windwalker\Queue\Event\JobFailureEvent;
use Windwalker\Queue\RunnerOptions;
use Windwalker\Queue\Worker;

$worker = new Worker(
    $queue,
    new RunnerOptions(
        sleep: 0.5,
        tries: 5,
        timeout: 300,
        memoryLimit: 256,
        maxRuns: 1000,
        shuffleChannels: true,
    ),
    $logger,
);

$worker->on(
    JobFailureEvent::class,
    function (JobFailureEvent $event) use ($alerts) {
        if ($event->maxAttemptsExceeds) {
            $alerts->notify($event->exception);
        }
    },
);

$worker->loop(['mail', 'default']);
```

`$logger` is any PSR-3 logger. The worker writes its own messages and the
job logs (`JobController::log()`) to it.

## Retries and Backoff

When a job throws, the worker releases the message and makes it visible
again after a delay. A `#[JobBackoff]` attribute on the job sets that
delay. Without one, the `backoff` option applies:

```php
use Windwalker\Queue\RunnerOptions;

$worker = new Worker(
    $queue,
    new RunnerOptions(backoff: 30),
);
```

With this worker, a failed job without a `#[JobBackoff]` attribute is
retried after 30 seconds. The default is `0`, which retries at once.

Add `jitter` to randomize the delay by a ratio. The next worker retries
each failed job after 27 to 33 seconds:

```php
$worker = new Worker(
    $queue,
    new RunnerOptions(backoff: 30, jitter: 0.1),
);
```

`tries` sets the maximum number of attempts, and `0` means no limit. When
the limit is reached, the worker deletes the message and emits
`JobFailureEvent` with `maxAttemptsExceeds` set to `true`:

```php
$worker = new Worker(
    $queue,
    new RunnerOptions(tries: 3),
);
```

Jobs can also settle without throwing. See the `JobController` section in
[Writing Jobs](writing-jobs#the-jobcontroller) for `defer()`,
`retryAfter()`, and `abandoned()`.

## Stop Conditions

The worker stops after a cycle when one of its limits is reached. Each
option below is one independent stop condition:

```php
use Windwalker\Queue\RunnerOptions;

$options = new RunnerOptions(
    maxRuns: 1000,
    lifetime: 3600,
    memoryLimit: 128,
    stopWhenEmpty: true,
    restartSignal: '/var/run/app/queue.restart',
);
```

- `maxRuns` stops after that many messages have been processed.
- `lifetime` stops after that many seconds since the worker started.
- `memoryLimit` stops when memory use exceeds that many megabytes.
- `stopWhenEmpty` stops when the queue has no message.
- `restartSignal` stops when the file's timestamp is newer than the
  worker's start time.

`SIGINT` and `SIGTERM` also stop the worker, after the job in progress
finishes. `timeout` uses `SIGALRM` to stop a cycle that runs too long.

**Pitfall:** signal handling needs the `pcntl` extension. Without it, the
`timeout` option and the signal handling do nothing.

**Pitfall:** `UnrecoverableException` that escapes `next()`, for example
from a custom driver, stops the process at once with exit code `1`. Job
exceptions never reach this path, because the worker treats them as
failures.

To restart all workers after a deploy, write the current timestamp into
the `restartSignal` file. Each worker then stops after its current cycle,
and your supervisor starts it again:

```php
file_put_contents(
    '/var/run/app/queue.restart',
    (string) time(),
);
```

**Pitfall:** a worker is a long-running process. Code and configuration
changes are not seen until it restarts, so write the restart signal or run
your supervisor's restart command after every deploy.

**Pitfall:** PHP memory grows in long-running processes. Set
`memoryLimit`, `maxRuns`, or `lifetime`, and let a supervisor restart the
worker when it stops.

## Channels

Pass one channel name, an array of names, or `'*'`. Names are tried in the
order given:

```php
$worker->loop('mail');

$worker->loop(['mail', 'default']);
```

Set `shuffleChannels` to try the names in a random order each cycle:

```php
$worker = new Worker(
    $queue,
    new RunnerOptions(shuffleChannels: true),
);
```

`'*'` reads every channel the driver reports. It needs a driver that
implements `ChannelAwareDriverInterface`:

```php
$worker->loop('*');
```

## Events

Register listeners with `on()`. Each event class is a separate hook:

```php
use Windwalker\Queue\Event\AfterJobRunEvent;
use Windwalker\Queue\Event\BeforeJobRunEvent;
use Windwalker\Queue\Event\StopEvent;

$worker->on(
    BeforeJobRunEvent::class,
    fn () => $metrics->increment('jobs.started'),
);

$worker->on(
    AfterJobRunEvent::class,
    fn () => $metrics->increment('jobs.done'),
);

$worker->on(
    StopEvent::class,
    fn (StopEvent $e) => $logger->info($e->reason),
);
```

`LoopStartEvent`, `LoopEndEvent`, and `LoopFailureEvent` fire for each
cycle. `JobFailureEvent` fires when an attempt fails. `DebugOutputEvent`
carries the messages written by `JobController::log()`.
