---
layout: doc
---

# Concurrency

Use `TaskRunner` to run PHP work in separate child processes, so several
computations can run at the same time without blocking the current request.
Each task is a closure or an invokable object. The child process boots the
application, resolves the task's parameters through dependency injection,
runs it, and sends the return value back to the parent.

## The Problem It Solves

PHP runs one statement after another. A page that needs three slow
results, such as a remote API call, a report, and a thumbnail, waits for
each one in turn. `TaskRunner` starts all three child processes first and
then collects the results, so the total wait is closer to the slowest
task than to the sum of all of them.

Child processes also keep their memory and failures apart from the parent.
A task that crashes, exits, or hits its timeout does not take the parent
down. The parent receives a `TaskExecutionException` instead.

::: info
`TaskRunner` is not a durable queue. Tasks run only while the parent is
waiting for them. If the parent process stops, the children are not
resumed later. Use a message queue when work must survive a restart.
:::

## Enabling TaskRunner

`TaskRunner` needs the `windwalker/promise` package, which provides the
`Promise` class used for every result.

```bash
composer require windwalker/promise
```

Get the runner from the application. The container creates it on first use.

```php
use Windwalker\Core\Task\TaskRunner;

$runner = $app->retrieve(TaskRunner::class);
```

## A Minimal Example

Pass a closure to `run()`, then call `wait()` on the returned promise. The
value that `wait()` returns is a `TaskResult`, and its `value` property holds
what the closure returned.

```php
use Windwalker\Core\Task\TaskRunner;

$runner = $app->retrieve(TaskRunner::class);

$promise = $runner->run(
    function () {
        return array_sum(range(1, 1000000));
    }
);

$result = $promise->wait();

echo $result->value; // 500000500000
```

`run()` starts the child process right away. `wait()` blocks until the
child finishes and then returns the `TaskResult`. Nothing is lost if you
call `wait()` later, because the child keeps running in the background.

## Running Several Tasks Together

Start the tasks first, then wait for them. This is where the parallel
speed-up comes from.

```php
use Windwalker\Core\Task\TaskRunner;

$runner = $app->retrieve(TaskRunner::class);

$p1 = $runner->run(fn () => fetchRemoteRates());
$p2 = $runner->run(fn () => buildMonthlyReport());
$p3 = $runner->run(fn () => generateThumbnail('photo.jpg'));

$rates = $p1->wait()->value;
$report = $p2->wait()->value;
$thumb = $p3->wait()->value;
```

All three children are running while the parent waits on the first
promise. By the time `$p2->wait()` is called, it may already be done.

::: warning
There is no concurrency limit. Each `run()` call starts a new PHP process.
Starting hundreds of tasks at once can exhaust memory and file descriptors
on the host. Batch large workloads yourself.
:::

## Running a Batch with mustRunMultiple()

`runMultiple()` takes an array of tasks and returns a promise. The array
keys are kept in the results. `mustRunMultiple()` is the blocking version.

```php
use Windwalker\Core\Task\TaskRunner;

$runner = $app->retrieve(TaskRunner::class);

$results = $runner->mustRunMultiple([
    'rates' => fn () => fetchRemoteRates(),
    'report' => fn () => buildMonthlyReport(),
    'thumb' => fn () => generateThumbnail('photo.jpg'),
]);

foreach ($results as $key => $settled) {
    if ($settled->status->isFulfilled()) {
        echo $key . ': ' . $settled->value->value . "\n";
    }
}
```

`runMultiple()` uses `Promise::allSettled()`. It never rejects, even when
some tasks fail. Each entry is a `SettledResult` with two properties:

- `status`: a `PromiseState`, either `FULFILLED` or `REJECTED`.
- `value`: the `TaskResult` for a fulfilled task, or the exception for a
  rejected one.

```php
use Windwalker\Core\Task\TaskExecutionException;

foreach ($results as $key => $settled) {
    if ($settled->status->isRejected()) {
        $e = $settled->value; // The thrown exception

        echo $key . ' failed: ' . $e->getMessage() . "\n";
    }
}
```

Passing an empty array returns an empty result set and starts no children.

::: info
`runMultiple()` throws `InvalidArgumentException` before any child starts
if one of the values is not an object.
:::

## Writing Tasks

A task is either a closure or an object with a public `__invoke()` method.
Both are sent to the child process as signed, serialized data.

### Closures

A closure can use values that are plain data, such as strings, numbers,
and arrays.

```php
$runner->run(function () {
    return strtoupper('hello');
});
```

A closure runs with its own scope. It cannot see variables from the
calling code unless they are passed through `use`.

```php
$name = 'Windwalker';

$runner->run(function () use ($name) {
    return 'Hello, ' . $name;
});
```

::: warning
Do not capture services, database connections, or other live objects in a
closure. They cannot be serialized, so the task fails before it starts.
:::

```php
$pdo = $app->retrieve(PDO::class);

// ERROR: Serialization of 'PDO' is not allowed
$runner->run(function () use ($pdo) {
    return $pdo->query('SELECT 1')->fetchAll();
});
```

### Invokable Objects

An invokable object is safer for larger tasks. Declare the services it
needs as constructor parameters or `__invoke()` parameters. The child
process resolves them from its own container, so only the object's own
properties are serialized.

```php
namespace App\Task;

use App\Service\OrderImporter;

class ImportOrders
{
    public function __construct(
        public string $source,
    ) {
    }

    public function __invoke(OrderImporter $importer): int
    {
        // Runs in the child; $importer is injected there.
        return $importer->import($this->source);
    }
}
```

```php
use App\Task\ImportOrders;

$runner = $app->retrieve(TaskRunner::class);

$result = $runner->run(new ImportOrders('api'))->wait();

echo $result->value;
```

::: info
Parameters are resolved in the child process, not in the parent. Only
data passed through the object's properties crosses the process boundary.
:::

### Return Values

The value returned by a task is sent back as JSON. Return arrays, strings,
numbers, booleans, or `null`. Convert objects to arrays before returning.

```php
$runner->run(function () {
    return [
        'count' => 42,
        'items' => ['a', 'b'],
    ];
});
```

## Task Options

Pass a `TaskRunnerOptions` object as the second argument of `run()` or
`submit()`. Each option has a default.

```php
use Windwalker\Core\Task\TaskRunnerOptions;

$options = new TaskRunnerOptions(
    timeout: 120,
    onOutput: null,
    captureOutput: true,
    name: 'report',
    resultTtl: 300,
);

$promise = $runner->run($task, $options);
```

- `timeout`: seconds before the child is stopped. The default is `60`.
  Use `null` for no limit.
- `onOutput`: a callable that receives output as it appears. See below.
- `captureOutput`: keep the child's output in `TaskResult::$output`. The
  default is `true`.
- `name`: a label used in error messages. `submit()` sets it from the key.
- `resultTtl`: seconds the child's result stays in the transport. The
  default is `300`.

### Timeouts

A child that runs longer than `timeout` is stopped. The promise rejects
with a `TaskExecutionException`, and the original timeout exception is
available as `getPrevious()`.

```php
use Windwalker\Core\Task\TaskExecutionException;
use Windwalker\Core\Task\TaskRunnerOptions;

try {
    $runner->mustRun(
        fn () => sleep(100),
        new TaskRunnerOptions(timeout: 5),
    );
} catch (TaskExecutionException $e) {
    // ERROR: The process "..." exceeded the timeout of 5 seconds.
    echo $e->getMessage();
}
```

::: warning
Set a timeout for every task that calls an external service. The default
of 60 seconds is only a fallback. A task with no timeout can keep a child
process alive indefinitely.
:::

### Streaming Output

`onOutput` receives each chunk the child writes to its standard output or
error stream. It is called as the parent polls the children, so it runs
during `wait()` or `mustRun()`.

```php
use Windwalker\Core\Task\TaskRunnerOptions;

$options = new TaskRunnerOptions(
    onOutput: function (string $name, string $type, string $chunk): void {
        echo "[{$name}] {$chunk}";
    },
);

$runner->run($task, $options)->wait();
```

`$type` is `out` for standard output or `err` for standard error.

With `captureOutput: false`, the buffers are cleared after each poll, so
long-running output does not grow the parent's memory.

## Handling Errors

There are three ways to receive a failure, depending on the method you use.

### Promise and wait()

`wait()` throws `UncaughtException` when the promise was rejected. The
task's own exception is available through `getReason()`, and the same
object is also the `previous` exception.

```php
use Windwalker\Core\Task\TaskExecutionException;
use Windwalker\Promise\Exception\UncaughtException;

try {
    $result = $runner->run($task)->wait();
} catch (UncaughtException $e) {
    $reason = $e->getReason();

    if ($reason instanceof TaskExecutionException) {
        echo $reason->exitCode; // Exit code of the child
        echo $reason->stderr;   // Standard error text
        echo $reason->remoteClass; // Class of the child's exception
    }
}
```

### mustRun()

`mustRun()` is a shortcut for `run()->wait()`. It returns the `TaskResult`
directly and rethrows the failure reason.

```php
$result = $runner->mustRun($task);

echo $result->value;
```

If the child throws an exception, `mustRun()` throws a
`TaskExecutionException`. The original class name is in `remoteClass`.

### mustRunMultiple()

`mustRunMultiple()` never throws for a single failed task. Check each
`SettledResult` before using its value, as shown in the batch example.

## Custom Result Transports

A child sends its result through a transport. The default transport is
`CacheTaskResultTransport`, which stores each result in a file cache at
`@cache/task-results`. You can change the folder with the
`TASK_RUNNER_CACHE_DIR` environment variable.

```ini
TASK_RUNNER_CACHE_DIR=task-results
```

::: warning
A result is deleted when the parent reads it. If the parent does not read
it within `resultTtl` seconds, the cache entry expires and the parent
reports that the child exited without a result.
:::

To store results elsewhere, implement `TaskResultTransportInterface`.
The interface has three methods:

- `publish(string $taskId, array $result, int $ttl): void`
- `receive(string $taskId): ?array`
- `delete(string $taskId): void`

For a quick custom transport, use `CallbackTaskResultTransport` with three
closures, one for each method.

## Running a Task from the Command Line

The child process runs the `task:run` command. You rarely call it directly,
but it helps when debugging. It needs one of `--code`, `--file`, or
`--stdin`, and the task payload must be signed.

```bash
php windwalker task:run --stdin --no-interaction < payload.txt
```

::: warning
The payload is signed with the application secret for `task.run`. Anyone
who can submit a payload can run code in your application with the
application's privileges. Keep the secret private. Signing prevents
tampering. It is not a sandbox.
:::

## Reminders

- Start all tasks before waiting on any of them to get parallel execution.
- Pass only plain data into closures. Use invokable objects for services.
- Set a `timeout` for any task that calls an external system.
- Limit the number of tasks you start at once. There is no built-in limit.
- There is no cancel method. Stop long tasks with `timeout`.
- Results live only as long as `resultTtl`. Read them promptly.
