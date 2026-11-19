---
layout: doc
description: Start child OS processes from a running request or command through the application sub-process API, instead of raw exec or shell_exec calls.
---

# Sub-Process

A sub-process is a separate operating-system process that your application starts from inside a running request or command. Windwalker runs its own background work this way: the task runner, the queue worker, the queue enqueuer, and the scheduler all start PHP child processes that execute `windwalker` commands. The `ApplicationInterface` exposes the same mechanism to your code, so you can reuse it without writing your own wrapper around Symfony Process.

## The Problem It Solves

Calling `shell_exec()` or `exec()` directly has three common problems:

- The child process does not know which PHP binary to use.
- The working directory depends on where the parent was started.
- Errors and output are hard to capture and check.

The `ProcessRunnerTrait` solves these problems. It creates a Symfony `Process` that uses the same PHP binary, runs from the project root, and gives you the output, the exit code, and the errors in one object.

## Starting a Child Process

Call `runProcess()` on the application. Pass an array of arguments, and read the output from the returned `Process`.

```php
// Inside a service or command that has $app injected.
$process = $app->runProcess(['php', 'windwalker', 'list']);

echo $process->getOutput();
echo $process->getExitCode(); // 0 means success
```

The method runs the child, waits for it to finish, and returns the `Process` object. The child's output is not printed unless you ask for it, as shown in the next section.

::: info
`runProcess()` never throws because the child failed. Check `isSuccessful()` or `getExitCode()`, or use `mustRunProcess()` to throw on failure.
:::

## A Complete Example

The following service runs a queue worker once, checks the result, and logs any error output.

```php
use Windwalker\Core\Application\ApplicationInterface;

class QueueDrainer
{
    public function __construct(
        protected ApplicationInterface $app,
    ) {
    }

    public function drain(): bool
    {
        $process = $this->app->runProcess(
            ['php', 'windwalker', 'queue:worker', '--once'],
            null,
            false,
        );

        if (!$process->isSuccessful()) {
            // ERROR: exit code 1 or higher when the worker fails
            logger()->error($process->getErrorOutput());

            return false;
        }

        return true;
    }
}
```

The array form is safe because no shell is involved, so the arguments do not need quoting. The working directory is the project root and the `php` binary is found through the `PATH` that the trait sets, so the command runs the same way from a web request and from the console.

## Understanding `runProcess()`

The signature is:

```php
public function runProcess(
    string|array|Process $process,
    mixed $input = null,
    bool|callable|OutputInterface $output = false,
): Process
```

### The `$process` Parameter

Pass one of three types:

- `array`: the command and its arguments, run without a shell. This is the recommended form.
- `string`: a full shell command line, such as `'php windwalker list'`. It is passed to the shell, so quoting rules apply.
- `Process`: a Symfony `Process` that you created yourself. Use it when you need options that the trait does not set.

```php
// Array form: no shell, arguments are passed as they are.
$app->runProcess(['php', 'windwalker', 'cache:clear']);

// String form: the shell parses the line.
$app->runProcess('php windwalker cache:clear');
```

::: warning
Never concatenate user input into a string command. Input such as `; rm -rf` would run as a separate shell command. Use the array form, or escape each value with `escapeshellarg()` when you must use a string.
:::

### The `$input` Parameter

`$input` is written to the child's standard input (`stdin`). Use it to send data that is too large or too sensitive for the command line, such as a JSON payload.

```php
$payload = json_encode(['id' => 10, 'action' => 'sync']);

$process = $app->runProcess(
    ['php', 'windwalker', 'task:run', '--stdin'],
    $payload,
);
```

When `$input` is `null`, nothing is sent and the trait does not call `setInput()`.

### The `$output` Parameter

`$output` controls what happens to the child's output while it runs. It accepts four kinds of value:

- `false` (default): the output is discarded. You can still read it from the returned `Process` with `getOutput()` and `getErrorOutput()`.
- `true`: the application's default output callback is used. In a console command, stdout is written to the console output and stderr is written to the console error output.
- An `OutputInterface` (or `IOInterface`): the output is sent to that object using the same rules as `true`.
- A `callable`: your function receives each chunk of output as it arrives.

```php
use Symfony\Component\Process\Process;

// Silent: read the result afterwards.
$process = $app->runProcess(['php', 'windwalker', 'list']);
$text = $process->getOutput();

// Show output in the console while the child runs.
$app->runProcess(['php', 'windwalker', 'list'], null, true);

// Stream output through your own function.
$app->runProcess(
    ['php', 'windwalker', 'queue:worker', '--once'],
    null,
    function (string $type, string $buffer): void {
        $stream = $type === Process::ERR ? 'stderr' : 'stdout';

        echo "[{$stream}] {$buffer}";
    },
);
```

The callable receives two arguments: `$type` is `Process::OUT` or `Process::ERR`, and `$buffer` is the text received so far. The buffer may contain part of a line, so do not assume one call equals one line.

::: info
The base trait's default callback does nothing. Output is written to the console only in classes where the console application overrides `getProcessOutputCallback()`. Passing your own callable is the reliable way to receive output in every context.
:::

### Extending the Symfony Process Options

The trait sets three things on every process it creates: the timeouts are set to `0` (no limit), the environment is replaced with a clean `PATH`, and the working directory is the project root. When you need a different value, build the `Process` yourself with `createProcess()`, change the options, and pass it to `runProcess()`.

```php
$process = $app->createProcess(['php', 'windwalker', 'queue:worker']);

$process->setTimeout(300);       // Stop after 5 minutes in total.
$process->setIdleTimeout(60);    // Stop if no output for 60 seconds.
$process->setInput('extra');     // Send data to stdin.

$app->runProcess($process);
```

Because `createProcess()` already applies the PATH and working directory, your changes do not remove them. You can use any other Symfony Process method on the object before running it, such as `setEnv()` to add an environment variable.

```php
$process = $app->createProcess(['php', 'windwalker', 'cache:clear']);

$env = $process->getEnv();
$env['APP_ENV'] = 'testing';

$process->setEnv($env);

$app->runProcess($process);
```

::: warning
`setEnv()` replaces the whole environment for the child. Read the current values with `getEnv()` and add to them, as shown above, or the child loses the `PATH` that the trait set.
:::

## Running a Process and Requiring Success

`mustRunProcess()` takes the same arguments as `runProcess()`. It runs the child and throws a `Symfony\Component\Process\Exception\ProcessFailedException` if the exit code is not `0`. Use it when a failure should stop the current operation.

```php
use Symfony\Component\Process\Exception\ProcessFailedException;

try {
    $app->mustRunProcess(['php', 'windwalker', 'schedule:run']);
} catch (ProcessFailedException $e) {
    // ERROR: The command "php windwalker schedule:run" failed.
    logger()->error($e->getMessage());
}
```

Use `runProcess()` when you want to decide what a failure means yourself. Use `mustRunProcess()` when a non-zero exit code is always a bug, such as a deployment step that must not continue.

## Creating a Process Without Running It

`createProcess()` returns a configured `Process` without starting it. It accepts the same string or array as `runProcess()`. Use it when you need to start a child in the background and read its output while it runs.

```php
$process = $app->createProcess([
    'php',
    'windwalker',
    'task:run',
    '--stdin',
    '--ipc',
]);

$process->setTimeout(120);
$process->setInput($payload);
$process->start();

while ($process->isRunning()) {
    echo $process->getIncrementalOutput();

    usleep(100_000);
}

$process->checkTimeout();

echo $process->getIncrementalOutput();
echo $process->getExitCode();
```

`start()` returns immediately. `isRunning()` tells you whether the child is still working, and `getIncrementalOutput()` returns only the output that arrived since the last call. The framework's `TaskRunner` uses this pattern to collect results while a task is running.

Call `wait()` instead of the loop when you do not need the intermediate output:

```php
$process->start();
$process->wait();
```

::: tip
Call `checkTimeout()` in a polling loop. It throws a `Symfony\Component\Process\Exception\ProcessTimedOutException` when a time limit is exceeded.
:::

## Timeouts and Exit Codes

Every process created by `createProcess()` has no time limit by default. A child that hangs will block your request or command forever, so set a timeout deliberately.

- `setTimeout(float $seconds)`: the total run time. `null` disables it.
- `setIdleTimeout(float $seconds)`: the maximum time without any output.

```php
use Symfony\Component\Process\Exception\ProcessTimedOutException;

$process = $app->createProcess(['php', 'windwalker', 'queue:worker']);
$process->setTimeout(600);

try {
    $app->mustRunProcess($process);
} catch (ProcessTimedOutException $e) {
    // ERROR: The process exceeded the timeout of 600 seconds.
    logger()->error($e->getMessage());
}
```

The exit code is an integer. `0` means success, and any other value means the child reported a failure. `getExitCode()` returns `null` if the process has not finished. Read it after `run()`, `mustRun()`, or `wait()`.

```php
$process = $app->runProcess(['php', 'windwalker', 'not:exists']);

// ERROR: Exit code is not 0 when the command is unknown.
var_dump($process->getExitCode());
var_dump($process->isSuccessful());
```

## Reading Output and Errors

The child writes to two streams. Standard output contains normal results, and standard error contains warnings and failures. Read them separately after the process finishes:

```php
$process = $app->runProcess(['php', 'windwalker', 'list']);

$stdout = $process->getOutput();
$stderr = $process->getErrorOutput();
```

Use a callable, as shown earlier, when you need both streams while the child is still running.

## Using the Framework Commands

The framework starts its own background work through the same trait. These commands are useful as examples, and you can call them the same way:

- `php windwalker task:run`: runs a task with a JSON payload on stdin.
- `php windwalker queue:worker`: processes queued jobs. Add `--once` to run a single job and exit.
- `php windwalker queue:enqueuer`: pushes scheduled work into the queue.
- `php windwalker schedule:run`: runs the schedules that are due now.

```php
// Run every due schedule once, and fail loudly on error.
$app->mustRunProcess(
    ['php', 'windwalker', 'schedule:run', '--tz=UTC'],
    null,
    true,
);
```

::: info
The scheduler's cron entry runs `schedule:run` every minute outside your application. Use `runProcess()` only for work that should run inside your own request or command.
:::
