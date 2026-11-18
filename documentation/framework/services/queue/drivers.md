---
layout: doc
---

# Drivers

The queue stores and delivers jobs through a driver. This page covers the
built-in `database` driver first, then how to write a custom driver.

A driver is the storage backend that holds queued jobs. The queue config
key selects the connection, and each connection uses one driver. The
framework ships the database driver built in, so you can start without
installing anything else.

## Database Driver

The `database` driver stores jobs in tables so a separate worker can run
them.

### Using the Database Driver

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

## Custom Drivers

This section covers how to add your own queue driver, such as one backed by
Redis, and register it in the queue configuration.

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

## More drivers

Other drivers are documented in the queue component pages:

- [SQS Driver](/documentation/components/queue/drivers#sqs-driver): Amazon SQS message broker.
- [RabbitMQ Driver](/documentation/components/queue/drivers#rabbitmq-driver): RabbitMQ message broker.
- [Redis Driver](/documentation/components/queue/drivers#redis-driver): Redis list-based queue, needs `ext-redis`.
- [Sync Driver](/documentation/components/queue/drivers#sync-driver): Runs jobs inside `push()`, for development.
- [Null Driver](/documentation/components/queue/drivers#null-driver): Discards jobs, for tests.
- [Infinity Driver](/documentation/components/queue/drivers#infinity-driver): Runs one callable repeatedly.
