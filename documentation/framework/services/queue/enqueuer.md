---
layout: doc
---

# Enqueuer

The worker runs jobs already in the queue. The enqueuer creates jobs. Use
it when work comes from a source, such as expired subscriptions found by
a query, or rows fetched from an external API.

## Register a Channel Handler

Register handlers on the `Enqueuer`, for example in a bootstrap file. The
handler receives an `EnqueuerController` as its first argument. Call
`$controller->enqueue()` to push a job:

```php
use Windwalker\Queue\Enqueuer;
use Windwalker\Queue\Enqueuer\EnqueuerController;

$enqueuer = $app->retrieve(Enqueuer::class);

$enqueuer->channel(
    'mail',
    function (EnqueuerController $controller) use ($app) {
        $repo = $app->make(MailRepository::class);
        $mail = $repo->findNextPending();

        if (!$mail) {
            // No pending mail.
            return null;
        }

        $controller->enqueue(new SendMailJob($mail->to, $mail->subject));

        // Enqueued mail
        return true;
    }
);
```

Returned jobs are pushed automatically (see below). Any other return
value is passed to the `AfterEnqueueEvent` listeners as the result of the
round. The `queue:enqueuer` command does not print it.

Only `null` counts as an empty round. `false` and `0` are non-empty, and
they have no special meaning to the enqueuer.

::: tip
Return a non-`null` value when the round enqueued something, such as a
message or a count. Return `null` when nothing was enqueued. With
`stopWhenEmpty` enabled, the enqueuer stops once every channel returns
`null`.
:::

::: warning
A returned value that is not a job, a `QueueMessage`, or an array of
them is not pushed, and no error is raised. Returning a string does not
queue anything.
:::

One round can push several jobs. Call `enqueue()` once for each one:

```php
$enqueuer->channel(
    'mail',
    function (EnqueuerController $controller) use ($app): string {
        $repo = $app->make(MailRepository::class);

        $count = 0;

        foreach ($repo->findPending(limit: 50) as $mail) {
            $controller->enqueue(
                new SendMailJob($mail->to, $mail->subject),
            );
            $count++;
        }

        return "Enqueued {$count} mails.";
    }
);
```

Pass a delay or another channel as extra arguments when needed:

```php
$controller->enqueue(
    new SendMailJob($mail->to, $mail->subject),
    delay: 60,
    channel: 'mail-low',
);
```

Use `default()` for channels that have no handler of their own:

```php
$enqueuer->default(function (EnqueuerController $controller): void {
    // Nothing to do for unknown channels.
});
```

## Return Jobs from a Handler

A handler can return the job instead of calling `$controller->enqueue()`.
The enqueuer pushes the returned value to the handler's channel:

```php
$enqueuer->channel(
    'report',
    function()  {
        if (!shouldGenerateReport()) {
            return null;
        }
    
        return fn() => generateReport();
    },
);
```

Return an array to push several jobs in one round:

```php
$enqueuer->channel(
    'mail',
    function()  {
        if (!shouldSendMail()) {
            return null;
        }
    
        return [
            new SendMailJob('a@example.com', 'Hello'),
            new SendMailJob('b@example.com', 'Hello'),
        ];
    },
);
```

The following values are pushed:

- A `Closure`.
- An object with an `__invoke()` method, such as a job class.
- A `QueueMessage`.
- An array containing any of the above.

A returned `QueueMessage` keeps its own channel, delay and options. The
handler's channel is used only when the message has no channel. Closures
and job objects are pushed to the handler's channel without a delay. For
a delay or a different channel, use `$controller->enqueue()` instead.

::: info
Other return values, such as `true`, strings or numbers, are not pushed.
They still count as a non-empty round, so `stopWhenEmpty` does not stop
the enqueuer. Return `null` when there is nothing to queue.
:::

## Run the Enqueuer

```bash
php windwalker queue:enqueuer mail
php windwalker queue:enqueuer mail mail-low --all-channels
```

The command takes channel names as arguments. Without arguments it runs
the handlers you registered. It accepts these options:

- `-a`, `--all-channels`: Run every channel. The driver must support
  listing channels.
- `-S`, `--shuffle-channels`: Shuffle the channel order on every loop.
- `-c`, `--connection`: The queue connection to use.
- `-o`, `--once`: Run one round only.
- `-f`, `--force`: Run even when the queue is paused.
- `-m`, `--memory`: Memory limit in megabytes. Default `128`.
- `-s`, `--sleep`: Seconds to sleep after each round. Default `1`.
- `--timeout`: Seconds a round may run. Default `60`.
- `--max-runs`: Stop after this many loops. `0` means unlimited.
- `--lifetime`: Stop after this many seconds. `0` means unlimited.
- `-e`, `--stop-when-empty`: Stop when every channel returns `null`.

The enqueuer does not accept `--tries` or `--backoff`, because the
worker applies those when it runs the job.

::: info
`-e` means different things in the two commands. On `queue:worker`, it
runs the enqueuer in the same process. On `queue:enqueuer`, it stops when
there is nothing to enqueue.
:::

## Logging

The enqueuer writes to the `system/enqueuer` logger channel. It follows the
same two-output rule as the worker: log entries are always recorded, and
console lines depend on the verbosity flag.

The enqueuer logs these events:

- Start and stop of each loop, at `info` level.
- A failed handler, at `error` level. The exception is also recorded on
  the `system/enqueuer-error` channel.
- A stop request, with the reason, printed to the console.

Messages that your handler writes through the `EnqueuerController` use the
same path. Notices are not forwarded to the log channel. They appear on the
console only when the verbosity allows them.

Use `-v` and `-vv` to see more on the console:

```bash
php windwalker queue:enqueuer mail        # emergency to error
php windwalker queue:enqueuer mail -v     # adds warning, notice, info
php windwalker queue:enqueuer mail -vv    # adds debug, start and end events
```

At `-vv`, the enqueuer also prints when each channel's enqueue starts and
ends. These lines are plain text, without a level prefix:

```text
Enqueuing Start - Channel: mail.
  Enqueue End - Channel: mail.
```

The start and stop messages are written to the log channel. Messages that
your handler writes through the controller are printed as
`[level] message` lines when the verbosity allows them.

::: info
Verbosity only changes what is printed. It does not change which entries
are written to the log channel.
:::

## Scheduling Workers and Enqueuers

The [Scheduler](/documentation/framework/services/scheduler) can start the
worker and the enqueuer for you.

- `ScheduleWorker` runs the worker logic. `runByCommand()` starts
  `queue:worker` as a separate process.
- `ScheduleEnqueuer` runs the enqueuer logic. `runByCommand()` starts
  `queue:enqueuer` as a separate process.

Both check that `windwalker/queue` is installed before they run. Use
them when a scheduled task should keep the queue fed or drained, without
a separate process-manager entry for each one. The scheduled task only
starts the process; it does not replace a long-running worker in
production.
