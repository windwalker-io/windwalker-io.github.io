---
layout: doc
title: Introduction
part: Components
chapter: Queue
component: queue
menu: components/queue
---

# Introduction

Windwalker Queue moves slow or unreliable work out of the request cycle.
Your code pushes a job onto a named channel and returns immediately. A
worker process picks the job up later, runs it, and retries it when it
fails. The same API works across several backends: a database table, a
PDO connection, Amazon SQS, RabbitMQ, or a synchronous driver for local
development.

Typical uses are sending mail, resizing images, calling a slow third-party
API, or processing an order after the customer has already received a
response.

## Installation

```bash
composer require windwalker/queue ^4.0
```

Windwalker Queue 4.x requires PHP 8.4.6 or later. Some features need
optional packages:

- `aws/aws-sdk-php` for the SQS driver.
- `php-amqplib/php-amqplib` for the RabbitMQ driver.
- `laravel/serializable-closure` for closure jobs.

## Main Parts

The package is built from a few small pieces that you combine:

- **`Queue`**: the entry point for producers. It wraps one driver, and
  producers use it to add jobs and to check the backlog:

  ```php
  $queue->push(new SendWelcomeMail(42), channel: 'mail');

  $waiting = $queue->size('mail');
  ```

- **Jobs**: plain PHP objects that do the work. A job is an invokable
  class, a class with a `#[JobEntry]` method, or a closure.
- **Drivers**: the storage backends that hold messages. Each driver
  implements `QueueDriverInterface`.
- **`Worker`**: a long-running loop that consumes messages, runs jobs,
  and handles retries and failures.
- **`Enqueuer`**: an optional loop that produces jobs on demand, for
  example from a scheduled source.
- **Failer**: an optional store for jobs that failed permanently.

## Core Concepts

A pushed job is wrapped in a `QueueMessage`. The message carries the
serialized job, the channel name, the delay, and the attempt counter. The
driver only stores messages; it never runs them.

A **channel** is a named lane, such as `default`, `mail`, or `images`.
Producers choose the channel, and workers choose which channels to read.
Use separate channels when jobs have different priorities or resource
needs.

Jobs run only while a worker process is active. Pushing a job does not run
it in the current request.

## Use as Standalone Component

Create a `Queue` with a driver. The example below uses the PDO driver and
the `queue_jobs` table from `resources/sql/queue_jobs.sql`:

```php
use Windwalker\Queue\Driver\PdoQueueDriver;
use Windwalker\Queue\Queue;

$pdo = new PDO('mysql:host=localhost;dbname=app', 'user', 'secret');

$queue = new Queue(
    new PdoQueueDriver(
        pdo: $pdo,
        channel: 'default',
        table: 'queue_jobs',
    )
);

$queue->push(new SendWelcomeMail($userId), channel: 'mail');
```

Then run a worker in a separate process:

```php
use Windwalker\Queue\RunnerOptions;
use Windwalker\Queue\Worker;

$worker = new Worker($queue, new RunnerOptions(sleep: 1));

$worker->loop(['mail', 'default']);
```

## Use in Windwalker

`QueuePackage` registers the `Queue` and `QueueFailerInterface` services in
the container. The default connection is chosen by the `QUEUE_DEFAULT`
environment variable:

```bash
QUEUE_DEFAULT=database
```

Use the existing container or application; do not create a new `Container`.

Inject the queue as a constructor dependency:

```php
use Windwalker\Queue\Queue;

class OrderService
{
    public function __construct(
        protected Queue $queue
    ) {
    }

    public function afterPayment(int $orderId): void
    {
        $this->queue->push(new ProcessOrder($orderId), channel: 'orders');
    }
}
```

Or retrieve it from the container or the application:

```php
use Windwalker\Queue\Queue;

$queue = $container->get(Queue::class);

$queue = $app->retrieve(Queue::class);
```

To use a named connection, go through `QueueFactory`:

```php
use Windwalker\Core\Queue\QueueFactory;

$sqs = $container->get(QueueFactory::class)->get('sqs');
```

### Configuration

The package ships `etc/queue.config.php`, which defines the `sync`,
`sqs`, and `database` connections and the `database` failer. Override it
in the host app by placing a file with the same name in `etc/packages/`.
Connections are declared under `factories.instances`:

```php
'factories' => [
    'instances' => [
        'sqs' => static fn() => QueueFactory::sqsAdapter(
            key: env('QUEUE_SQS_KEY'),
            secret: env('QUEUE_SQS_SECRET'),
        ),
    ],
],
```

The failers are declared under `factories.failers`, as described in
[Failed Jobs](failed-jobs).

## Topic Pages

- [Writing Jobs](writing-jobs): job classes, closures, attributes,
  middleware, and the `JobController` API.
- [Drivers](drivers): the available backends and how each stores
  messages.
- [Workers](workers): the worker loop, runner options, retries,
  backoff, and stop conditions.
- [Enqueuer](enqueuer): producing jobs from handlers in a separate loop.
- [Failed Jobs](failed-jobs): storing and retrying jobs that failed
  permanently.

## Events

`Worker` and `Enqueuer` emit events for their loop, each job run, each
failure, and each stop. Register a listener with `on()`:

```php
use Windwalker\Queue\Event\JobFailureEvent;

$worker->on(
    JobFailureEvent::class,
    fn (JobFailureEvent $e) => $alerts->notify($e->exception),
);
```

See [Workers](workers#events) for the full list.

## Common Pitfalls

::: warning
A pushed job runs only when a worker consumes its channel. Forgetting to
start a worker for a channel leaves its jobs waiting.
:::

::: warning
Jobs are stored as PHP serialized objects. Anyone who can write to the
queue storage can inject a payload that is unserialized by the worker.
Restrict write access to the queue table, the broker, or the SQS queue to
trusted producers.
:::

## Related components

- [DI](/documentation/components/di/): the container that resolves job dependencies.
- [Event](/documentation/components/event/): the event dispatcher used by the runners.
