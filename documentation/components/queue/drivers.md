---
layout: doc
title: Drivers
component: queue
---

# Drivers

A driver is the storage backend behind a `Queue`. Every driver implements
`QueueDriverInterface`, so your producers and workers stay the same when
you change the backend. Only the way messages are stored, delivered, and
counted differs.

Choose a driver by what you need from the infrastructure:

- A database or PDO driver keeps jobs in a table. It needs no extra
  service and works well for most applications.
- SQS and RabbitMQ are managed or dedicated message brokers. They suit
  high volume or workers on several machines.
- The sync driver runs jobs inside `push()`. It is for development and
  tests.

## Database and PDO Drivers

`DatabaseQueueDriver` uses a `DatabaseAdapter` from `windwalker/database`.
`PdoQueueDriver` takes a plain `PDO` connection and behaves the same way.
Both store messages in one table. Create it from
`resources/sql/queue_jobs.sql`, or with the `queue:table` command in a
Windwalker application.

```php
use Windwalker\Queue\Driver\PdoQueueDriver;
use Windwalker\Queue\Enum\DatabaseIdType;
use Windwalker\Queue\Queue;

$queue = new Queue(
    new PdoQueueDriver(
        pdo: $pdo,
        channel: 'default',
        table: 'queue_jobs',
        timeout: 120,
        idType: DatabaseIdType::INT,
    )
);
```

The `timeout` value is the number of seconds a reserved message stays
hidden from other workers. If a worker crashes while running a job, the
message becomes visible again after this period.

::: warning
A job that runs longer than `timeout` can be picked up by a second worker
while the first one is still running it. Keep `timeout` longer than your
slowest job, or split the job into smaller ones.
:::

`idType` sets the ID type of the table. The ID column must match it:

```php
use Windwalker\Queue\Driver\PdoQueueDriver;
use Windwalker\Queue\Enum\DatabaseIdType;

$driver = new PdoQueueDriver(
    pdo: $pdo,
    idType: DatabaseIdType::UUID,
);
```

Use `DatabaseIdType::INT` for auto-increment IDs, the default, and
`DatabaseIdType::UUID` or `DatabaseIdType::UUID_BIN` for UUID IDs.

## SQS Driver

`SqsQueueDriver` sends messages to an Amazon SQS queue. It needs
`aws/aws-sdk-php`:

```php
use Windwalker\Queue\Driver\SqsQueueDriver;
use Windwalker\Queue\Queue;

$queue = new Queue(
    new SqsQueueDriver(
        key: getenv('AWS_KEY'),
        secret: getenv('AWS_SECRET'),
        channel: 'default',
        options: [
            'region' => 'ap-northeast-1',
            'version' => 'latest',
        ],
    )
);
```

The `options` array is passed to the AWS SDK client, so use the SDK's
keys, such as `region` and `version`.

The driver keeps its own attempt count in a message attribute, because SQS
counts receives on the server and cannot reset them. Retries and deferred
jobs therefore keep the correct total.

## RabbitMQ Driver

`RabbitmqQueueDriver` publishes to RabbitMQ and needs
`php-amqplib/php-amqplib`. Pass an existing connection, or let the driver
open one from the `host`, `port`, `user`, `password`, and `vhost` keys:

```php
use Windwalker\Queue\Driver\RabbitmqQueueDriver;
use Windwalker\Queue\Queue;

$queue = new Queue(
    new RabbitmqQueueDriver(
        defaultChannel: 'default',
        options: [
            'host' => 'localhost',
            'port' => 5672,
            'user' => 'guest',
            'password' => 'guest',
            'vhost' => '/',
        ],
    )
);
```

To share a connection with other code, pass it as
`'connection' => $connection`, where `$connection` is an
`AbstractConnection` from php-amqplib.

::: warning
The driver closes its connection when it is destroyed, including a
connection you passed in. Do not keep using a shared connection after the
driver is gone.
:::

## Sync Driver

`SyncQueueDriver` does not store anything. `push()` runs the job at once
and returns the job's output. `pop()` returns `null` and `size()` returns
`0`:

```php
use Windwalker\Queue\Driver\SyncQueueDriver;
use Windwalker\Queue\Queue;

$queue = new Queue(new SyncQueueDriver());

$queue->push(new ClearReportCache());
```

Without a handler, the driver calls `QueueMessage::run()` in the same
process. Set `debug` to print the output of each job:

```php
$driver = new SyncQueueDriver(
    options: ['debug' => true],
);
```

In a Windwalker application, the `sync` connection passes its own handler
that starts a separate `queue:worker --once` process, so the job runs in
its own environment.

::: warning
The job runs inside `push()`, so an exception from the job reaches the
caller of `push()`. The `$delay` argument is ignored, because nothing is
stored.
:::

## Null Driver

`NullQueueDriver` accepts every message and discards it. `pop()` returns
`null`. Choose it in place of a real driver, for example in tests:

```php
$queue = new Queue(
    getenv('APP_ENV') === 'test'
        ? new NullQueueDriver()
        : $realDriver,
);
```

## Infinity Driver

`InfinityQueueDriver` is built from one callable. Each `pop()` returns a
new message that runs the same callable, and the driver never removes it.
A worker that uses this driver runs the callable again and again, which
turns the worker into a repeating task:

```php
use Windwalker\Queue\Driver\InfinityQueueDriver;
use Windwalker\Queue\Queue;
use Windwalker\Queue\RunnerOptions;
use Windwalker\Queue\Worker;

$queue = new Queue(
    new InfinityQueueDriver(
        fn () => $cleaner->purgeExpired(),
    )
);

$worker = new Worker(
    $queue,
    new RunnerOptions(sleep: 60, maxRuns: 1440),
);

$worker->loop('default');
```

::: warning
Nothing is persisted, so a restart begins the loop again. Use this driver
only for work that is safe to repeat on a timer.
:::

::: warning
The callable is wrapped in a closure job, so it needs
`laravel/serializable-closure` and must not capture resources.
:::

## Custom Drivers

Implement `QueueDriverInterface` to add a backend. Its methods map to the
queue operations:

```php
use Windwalker\Queue\Driver\ChannelAwareDriverInterface;
use Windwalker\Queue\Driver\QueueDriverInterface;
use Windwalker\Queue\QueueMessage;

class RedisQueueDriver implements
    QueueDriverInterface,
    ChannelAwareDriverInterface
{
    public function push(QueueMessage $message): string
    {
        // Store the message, return its ID.
    }

    public function pop(?string $channel = null): ?QueueMessage
    {
        // Reserve the next message and count this run as an attempt.
    }

    // delete(), release(), defer(), size(), and getChannels()
}
```

Keep the attempt contract from the interface docblock: `pop()` counts
the run that starts, `release()` keeps that count, and `defer()` undoes
it. Implement `ChannelAwareDriverInterface` if the backend can list its
channels, because `Queue::getChannels()` and the `*` channel depend on it.
