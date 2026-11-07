---
layout: doc
title: Enqueuer
component: queue
---

# Enqueuer

An `Enqueuer` is a loop that creates jobs instead of consuming them. Use
it when work comes from a source you poll, such as a feed, a directory, a
list of due reminders, or an external API. Your code does not need to push
the jobs itself; the enqueuer calls a handler for each channel, and the
handler decides what to add to the queue.

The enqueuer is an optional add-on. It is useful on its own in a dedicated
process, or attached to a `Worker` so one process both produces and runs
jobs.

## Minimal Setup

Register a handler for a channel, then run the loop on that channel:

```php
use Windwalker\Queue\Enqueuer;
use Windwalker\Queue\Enqueuer\EnqueuerController;

$enqueuer = new Enqueuer($queue);

$enqueuer->channel(
    'feeds',
    function (EnqueuerController $controller) use ($feeds) {
        foreach ($feeds->due() as $feed) {
            $controller->enqueue(
                new ImportFeed($feed->id),
                channel: 'import',
            );
        }
    },
);

$enqueuer->loop('feeds');
```

`EnqueuerController::enqueue()` pushes to the queue. Without a `channel`
argument, the job goes to the enqueuer's channel name:

```php
$enqueuer->channel('feeds', function (EnqueuerController $c) {
    // Pushed to the 'feeds' channel.
    $c->enqueue(new ImportFeed(1));

    // Pushed to the 'import' channel, with a 60 second delay.
    $c->enqueue(new ImportFeed(2), delay: 60, channel: 'import');
});
```

## Showcase

The example below uses a default handler for channels that have no handler
of their own, sets an option that stops the loop when nothing is produced,
and reports failures:

```php
use Windwalker\Queue\Enqueuer;
use Windwalker\Queue\Enqueuer\EnqueuerController;
use Windwalker\Queue\Event\EnqueueFailureEvent;
use Windwalker\Queue\RunnerOptions;

$enqueuer = new Enqueuer(
    $queue,
    new RunnerOptions(sleep: 30, stopWhenEmpty: false),
    $logger,
);

$enqueuer->default(
    function (EnqueuerController $controller) use ($reminders) {
        foreach ($reminders->due() as $reminder) {
            $controller->enqueue(
                new SendReminder($reminder->id),
                channel: 'mail',
            );
        }
    },
);

$enqueuer->on(
    EnqueueFailureEvent::class,
    function (EnqueueFailureEvent $event) use ($alerts) {
        $alerts->notify($event->exception);
    },
);

$enqueuer->loop(['reminders', 'feeds']);
```

`default()` handles any channel that has no handler registered with
`channel()`. `loop()` calls `next()` for each channel name, which runs the
matching handler.

**Pitfall:** the default `sleep` is one second. For a source that changes
slowly, use a longer interval, as set in the `RunnerOptions` above, to
avoid polling it too often.

## Attaching to a Worker

A worker can run the enqueuer on each cycle before it pops a message from
the queue. Set the enqueuer and the channels it should use:

```php
use Windwalker\Queue\Worker;

$worker = new Worker($queue);

$worker->enqueuer = $enqueuer;
$worker->enqueuerChannels = ['feeds'];

$worker->loop(['import', 'mail']);
```

If the enqueuer's handler returns a job object or a closure, the worker
runs it immediately in its own process and does not store it. If the
handler returns `null`, the worker continues with the queue as usual. In a
Windwalker application, the `queue:worker --enqueuer` command enables this
mode.

## Handler Return Values

A handler's return value affects two things. With `stopWhenEmpty`, a
handler that returns `null` for every channel stops the loop. A handler
that returns any value keeps it running:

```php
$enqueuer = new Enqueuer(
    $queue,
    new RunnerOptions(stopWhenEmpty: true),
);

// Stops the loop when there is nothing to enqueue.
$enqueuer->channel('feeds', function (EnqueuerController $c) use ($feeds) {
    $due = $feeds->due();

    foreach ($due as $feed) {
        $c->enqueue(new ImportFeed($feed->id), channel: 'import');
    }

    return $due ?: null;
});
```

When the enqueuer is attached to a worker, a returned job is run by that
worker right away and is not stored. A returned `QueueMessage` is handled
the same way:

```php
$enqueuer->channel('health', fn () => new CheckHealth());
```

Return nothing from a handler that only pushes jobs with
`$controller->enqueue()`.

**Pitfall:** an exception thrown by a handler is caught, reported as
`EnqueueFailureEvent`, and the loop continues. If you do not listen for
that event, the failure is silent.

**Pitfall:** a handler that runs on every cycle sees the same source again.
Mark items as queued, for example in a column or a cache key, so each item
becomes one job.
