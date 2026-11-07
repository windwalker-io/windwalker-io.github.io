---
layout: doc
title: Failed Jobs
component: queue
---

# Failed Jobs

A job that keeps failing after all its attempts is removed from the queue.
Without a record, that work is lost. A failer keeps a copy of each such
message, so you can inspect it, fix the cause, and push it again.

The failer is separate from the queue. The `Worker` deletes a message
after its final failed attempt, but it does not write the failed copy
anywhere. Your application must call the failer, usually from a
`JobFailureEvent` listener. In a Windwalker application, `queue:worker`
does this for you.

## Minimal Setup

`DatabaseQueueFailer` stores failed jobs in the `queue_failed_jobs` table,
whose schema is in `resources/sql/queue_failed_jobs.sql`:

```php
use Windwalker\Queue\Enum\DatabaseIdType;
use Windwalker\Queue\Failer\DatabaseQueueFailer;

$failer = new DatabaseQueueFailer(
    db: $db,
    table: 'queue_failed_jobs',
    idType: DatabaseIdType::INT,
);

$failer->add(
    connection: 'default',
    channel: 'mail',
    body: json_encode($message),
    exception: (string) $exception,
);
```

`$db` is a `DatabaseAdapter` from `windwalker/database`.

::: warning
The stored body contains the serialized job. Treat the failed-jobs table as
sensitive, like the queue table, and restrict access to it.
:::

## Showcase

The example below records each permanently failed job from a worker, then
lists and retries them:

```php
use Windwalker\Queue\Event\JobFailureEvent;
use Windwalker\Queue\Worker;

$worker = new Worker($queue);

$worker->on(
    JobFailureEvent::class,
    function (JobFailureEvent $event) use ($failer) {
        if (!$event->maxAttemptsExceeds) {
            return;
        }

        $failer->add(
            connection: 'default',
            channel: $event->message->getChannel(),
            body: json_encode($event->message),
            exception: (string) $event->exception,
        );
    },
);

$worker->loop(['mail', 'default']);
```

Read and clear the records with the same failer. Each call does one thing:

```php
$failedCount = $failer->size();

foreach ($failer->all() as $failed) {
    // Inspect or alert on each failed job.
}

// Remove entries that match the conditions.
$failer->remove(['channel' => 'mail']);

// Empty the table.
$failer->clear();
```

Use `get()` to find one entry by its conditions. The conditions format
depends on the failer, so check the failer's source before you rely on it.

To send failed jobs back to the queue, run `queue:retry` in a Windwalker
application:

```bash
php windwalker queue:retry --all --failer=database
```

::: warning
A retried job runs its code again. Check that the job is idempotent before
you retry a batch.
:::

## Failer Configuration

In a Windwalker application, failers are registered under
`factories.failers` in the `queue` configuration. `failer_default` selects
the one used when none is named:

```php
'failer_default' => 'database',

'factories' => [
    'failers' => [
        'database' => static fn (
            DatabaseServiceFactory $f,
        ) => new DatabaseQueueFailer(
            db: $f->get(),
            table: 'queue_failed_jobs',
        ),
    ],
],
```

Add another entry to `failers` to store failed jobs elsewhere, then pick
it with `--failer`.
