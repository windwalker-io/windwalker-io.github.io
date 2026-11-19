---
layout: doc
description: Declare scheduled events in PHP on timetables such as every 5 minutes, and let one cron entry or worker run the ones that are due.
---

# Scheduler

The scheduler runs application code on a timetable, such as "every day at
03:00" or "every 5 minutes". You declare the events in PHP, and Windwalker
decides which ones are due. One OS cron entry, or one long-running worker,
drives all of them.

## Why Use the Scheduler

Cron jobs are usually written as separate shell lines. Each line runs a
command, and the timing lives in the crontab, far away from the code.
Once an application grows, this becomes hard to read and hard to review.

The scheduler moves the timetable into your application:

- All timed jobs are declared in one PHP file.
- Each job is a normal handler, with access to the container.
- Only one crontab line is needed, no matter how many jobs exist.

Containers add one more problem. When an application runs as several
replicas, each replica has its own system cron. Every replica would run the
same job at the same minute. Windwalker prevents this with a claim
mechanism, described in [Claims and Overlap Protection](#claims-and-overlap-protection).

## Enabling the Scheduler

The scheduler loads its events from the `schedules` key in the console
configuration. The key points to one or more PHP files:

```php
// etc/app/console.config.php
return [
    'schedules' => [
        __DIR__ . '/../../resources/registry/schedules.php',
    ],
];
```

Each file receives the `$schedule` object, which is a `Schedule` instance.
Register your events on it:

```php
// resources/registry/schedules.php
use Windwalker\Core\Schedule\Schedule;

/** @var Schedule $schedule */

$schedule->daily('clear-cache')
    ->handler(fn () => print("Cache cleared\n"));
```

::: info
The file also receives `$app`, but you do not need it for simple events.
Services are available through the handler's arguments, as shown below.
:::

## A Complete Example

The example below registers three events. It uses a shortcut for a daily
job, a cron expression for a job every five minutes, and a class-based
handler that is resolved from the container.

```php
// resources/registry/schedules.php
use App\Service\ReportService;
use Windwalker\Core\Schedule\Schedule;
use Windwalker\Core\Schedule\ScheduleEvent;

/** @var Schedule $schedule */

// Every day at midnight
$schedule->daily('purge-sessions')
    ->handler(fn () => print("Sessions purged\n"));

// Every 5 minutes
$schedule->cron(
    'sync-orders',
    '*/5 * * * *',
    function (ReportService $report): void {
        $report->syncOrders();
    }
)->tags('sync');

// Every Monday at 08:30
$schedule->task('weekly-report', '30 8 * * 1')
    ->handler(fn (ReportService $report) => $report->weekly())
    ->tags('report');
```

Then run the scheduler once to check the output:

```bash
php windwalker schedule:run
```

::: info
Handler arguments are resolved with `app->call()`. Type-hinted services are
taken from the container, so `ReportService` above needs no manual wiring.
:::

## Defining Events

There are two ways to define an event: a shortcut method, or an explicit
cron expression.

### Shortcut Methods

Shortcut methods take a name and an optional description. They are
available for the common intervals:

- `always()`: every minute, same as `* * * * *`
- `minutely()`
- `hourly()`
- `daily()`
- `weekly()`
- `monthly()`
- `yearly()` and `annually()`

```php
$schedule->hourly('refresh-stats')
    ->handler(fn () => print("Stats refreshed\n"));

$schedule->monthly('invoice-batch')
    ->handler(fn () => print("Invoices generated\n"));
```

### Cron Expressions

Use `cron()` when the shortcuts are not enough. It takes a name, a
five-field cron expression, and a handler in one call:

```php
$schedule->cron(
    'backup',
    '15 2 * * *',
    fn () => print("Backup started\n")
);
```

Use `task()` to create an event without a handler yet. The default
expression is `* * * * *`:

```php
$event = $schedule->task('backup', '15 2 * * *');
$event->handler(fn () => print("Backup started\n"));
```

::: info
Registering an event with an existing name replaces the previous one.
Keep names unique across all schedule files.
:::

### Expression Helpers

`ScheduleEvent` also provides fluent helpers that build the expression for
you. Each one sets one part of the five fields:

```php
// Every 10 minutes
$schedule->task('poll')->everyMinutes(10);

// Minute 30 of every hour
$schedule->task('check')->minuteOfHour(30);

// Every 4 hours, at minute 0
$schedule->task('ping')->everyHours(4);

// Every day at 06:00
$schedule->task('digest')->hourOfDay(6);

// Every 2 days
$schedule->task('archive')->everyDays(2);

// On the 1st of each month
$schedule->task('invoice')->dayOfMonth(1);

// Every 3 months
$schedule->task('review')->everyMonths(3);

// On Sunday (0 = Sunday, 6 = Saturday)
$schedule->task('reset')->dayOfWeek(0);
```

::: tip
Helpers return the event, so they can be chained with `handler()` and
`tags()`.
:::

## Handlers

A handler is any callable that `app->call()` can invoke. Closures,
invokable objects, and `[$object, 'method']` arrays all work:

```php
use App\Task\CleanupTask;

$schedule->daily('cleanup')
    ->handler(new CleanupTask());

$schedule->daily('cleanup-by-method')
    ->handler([CleanupTask::class, 'run']);
```

The handler receives parameters through dependency injection. Use type
hints for services and the container resolves them at run time.

## Tags

Tags label events. Assign them with `tags()`, then pass `--tags` to the
run and worker commands to limit the events they consider:

```php
$schedule->hourly('feed')->tags('import', 'frequent');
$schedule->daily('archive')->tags('maintenance');
```

## Timezones

The `--tz` option of `schedule:run`, `schedule:worker`, and
`schedule:show` sets the timezone used to evaluate the cron expressions:

```bash
php windwalker schedule:run --tz=UTC
php windwalker schedule:show --tz=Asia/Taipei
```

## Error Handling

When a handler throws, the runner records a failure and keeps going. The
other events and the loop are not affected. Attach a `catch()` closure to
handle the exception for one event:

```php
use Windwalker\Core\Schedule\ScheduleEvent;

$schedule->daily('sync-stock')
    ->handler(fn () => throw new \RuntimeException('Timeout'))
    ->catch(function (\Throwable $e): void {
        echo "Stock sync failed: " . $e->getMessage() . "\n";
    });
```

The closure is called through `app->call()`, so it can also type-hint
services. It receives the exception under the `$exception` and `$e` names
and under the `Throwable` type:

```php
->catch(function (\Throwable $exception, MailService $mail): void {
    $mail->send('ops@example.com', $exception->getMessage());
})
```

A `try`/`catch` inside the handler has the same effect for its own code.
`catch()` is different in one way: it also receives any exception that
escapes the event's run, including failures inside the scheduler itself,
which a handler-level `try`/`catch` cannot see.

If no `catch()` is set, the runner dispatches a `ScheduleFailureEvent`
with the exception, and the loop continues.

### Runner Events

The runner dispatches these events during the loop:

- `StartEvent`: the runner starts.
- `LoopStartEvent` and `LoopEndEvent`: one loop iteration.
- `BeforeScheduleRunEvent`: an event is about to run.
- `AfterScheduleRunEvent`: an event finished, with its duration.
- `ScheduleSkippedEvent`: an event was skipped, with the reason.
- `ScheduleFailureEvent`: an event threw an exception.
- `StopEvent`: the runner stopped, with the reason and run count.

They are defined under `Windwalker\Core\Schedule\Event`. Use them to log
metrics or to send alerts.

## Running the Scheduler

There are two ways to drive the events.

### Single Run: schedule:run

`schedule:run` checks the events due at the current minute, runs them, and
exits. It is meant for crontab, which calls it every minute with
`* * * * *`:

```bash
php windwalker schedule:run
php windwalker schedule:run sync-orders
php windwalker schedule:run --tags=report --tz=UTC
```

The `--clock` option sets the time used for the due check. Use `--test`
to run the selected events immediately, ignoring their schedule. This is
useful for checking a handler during development.

### Long-Running Worker: schedule:worker

`schedule:worker` keeps the process alive and checks the events once per
minute. Most Docker images do not run crontab, so the worker is the
recommended choice in containers. It needs no crontab:

```bash
php windwalker schedule:worker
php windwalker schedule:worker --once
php windwalker schedule:worker --lifetime=3600 --max-runs=100
```

Options:

- `--once` (`-o`): run one cycle and exit.
- `--lifetime` (`-L`): stop after this many seconds. `0` means unlimited.
- `--max-runs`: stop after this many event runs. `0` means unlimited.
- `--tags` and `--tz`: the same as in `schedule:run`.

The worker handles `SIGINT` and `SIGTERM` (when `pcntl` is available). It
stops after the event that is running. Use `lifetime` and `max-runs` to
restart the process regularly, so memory does not grow indefinitely.

Example Docker Compose service for the worker:

```yaml
services:
  scheduler:
    image: example/app
    command: php windwalker schedule:worker
    restart: unless-stopped
    volumes:
      - app-temp:/app/temp

volumes:
  app-temp:
```

::: warning
Run exactly one worker per application. A worker alone does not stop
duplicates when several containers mount different `@temp` directories. See
the next section.
:::

## Claims and Overlap Protection

The scheduler uses two file-based mechanisms in `@temp`. The default
filesystem lock prevents overlap for long-running tasks on one machine,
for example a task that runs longer than one minute:

- **Lock**: an event is protected by a non-blocking lock. If the previous
  run of the same event is still active, the new run is skipped with reason
  `LOCKED`.
- **Claim**: the first process that handles an event for a given minute
  records that minute. Other processes that try the same event at the same
  minute are skipped with reason `CLAIMED`. Claims are kept for one day.

This is why several replicas can share one schedule. Each event due in the
same minute runs once, no matter how many instances check it. Claims are
stored under `@temp/scheduler-claims`, and locks under
`@temp/scheduler-locks`.

The default lock is local to one machine. To prevent overlap across hosts
or containers, implement `SchedulerLockInterface`. Its `createLock()`
method returns a Symfony `LockInterface`, so you can use a shared store
such as Redis:

```php
use Windwalker\Core\Schedule\ScheduleEvent;
use Windwalker\Core\Schedule\SchedulerLockInterface;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Lock\LockInterface;
use Symfony\Component\Lock\Store\RedisStore;

class RedisSchedulerLock implements SchedulerLockInterface
{
    public function __construct(private \Redis $redis)
    {
    }

    public function createLock(ScheduleEvent $event): LockInterface
    {
        $factory = new LockFactory(new RedisStore($this->redis));

        return $factory->createLock('scheduler:' . $event->getName());
    }
}
```

Then bind your class to the interface in your DI bindings, so it replaces
the default `SchedulerLock`. In `etc/di.config.php`, add an entry to
`aliases`:

```php
// etc/di.config.php
return Arr::mergeRecursive(
    [
        // ...
        'aliases' => [
            SchedulerLockInterface::class => RedisSchedulerLock::class,
        ],
    ]
);
```

Use `aliases` to point the interface at your class. The default
`SchedulerLock` alias is set in `AppProvider`, so your entry overrides it.

::: warning
Claims and locks are files. They coordinate only processes that share the
same `@temp` directory. In Docker, mount one volume for `@temp` in every
replica. If each container has its own `@temp`, each one runs every event.
:::

## Installing the Crontab

If the application runs on Linux or macOS, `schedule:install` adds one
crontab line that calls `schedule:run` every minute:

```bash
php windwalker schedule:install
php windwalker schedule:install --tz=UTC --dry-run
php windwalker schedule:install --force
```

Options:

- `--tz` (`-t`): the timezone for the run.
- `--force` (`-f`): replace an existing entry.
- `--php-binary` (`-p`): the PHP binary to use in the crontab line.
- `--dry-run` (`-d`): print the line without writing it.

If an entry already exists and `--force` is not set, the command fails:

```bash
php windwalker schedule:install
// ERROR: RuntimeException: Schedule already exists.
```

To remove the entry, run:

```bash
php windwalker schedule:uninstall
```

::: warning
`schedule:install` and `schedule:uninstall` do not support Windows:

```bash
php windwalker schedule:install
// ERROR: RuntimeException: Schedule install not supports Windows platform.
```

Use `schedule:worker` there instead.
:::

## Inspecting Events

`schedule:show` lists all events with their expression, next due time, and
tags:

```bash
php windwalker schedule:show
php windwalker schedule:show sync-orders --tz=Asia/Taipei
```

The human-readable description of each expression needs the optional
`lorisleiva/cron-translator` package. Without it, the command still shows
the expressions and due times, and prints a warning.

## Summary

- Declare events in the files listed under `schedules`.
- Use shortcuts for simple intervals, and `cron()` for exact expressions.
- Let one system cron or one worker drive every event.
- Share `@temp` across replicas, so claims prevent duplicate runs.
- Use `catch()` for per-event error handling, and runner events for logging.
