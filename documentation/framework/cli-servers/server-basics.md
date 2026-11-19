---
layout: doc
---

# Server Basics

A long-running server needs more than a PHP script. Its parent process has to
know the server's process IDs and port, its output must reach the terminal,
and it must stop cleanly when you ask it to. The CLI server layer provides
these services. It has three parts that work together:

- Console commands: `server:start` and `server:stop` (`ServerStartCommand`
  and `ServerStopCommand`). They read the server name, choose an engine, and
  find the main file.
- Engines: `PhpNativeEngine` runs `php -S`. `SwooleEngine` starts your main
  file as a child process and supervises it.
- Runtime: `CliServerRuntime` runs inside the server process. It loads the
  state, writes output, reports errors, and runs garbage collection.

The main file is the entry script that creates the server. The console command
reaches it through the server registry, as described in
[Server Command](/documentation/framework/console/commands/server) and
[Reactor Servers](/documentation/components/reactor/servers).

## How the Parts Fit Together

The console process and the server process share data through a JSON state
file. The console process writes the file, the server process reads it on boot,
and the server process writes its process IDs back into it when it starts.

```text
php windwalker server:start swoole:website
        |
        v
ServerStartCommand     finds the main file in the registry
        |
        v
SwooleEngine::run()    console process (parent)
  |- writes state file -------------------+
  |- starts child: php <main> <state>     |
  |- loops: shows output, watches files   |
        |                                 |
        v                                 v
main file (child process)     @temp/servers/swoole-website-state.json
  CliServerRuntime::boot()  <-- reads on boot
  $server->listen()
  StartEvent -> ServerStartedListener --> writes PIDs and ports
```

The state file path is built from the engine and name, for example
`@temp/servers/swoole-website-state.json`. The console passes the path to the
main file as its first argument, so `$argv[1]` holds it.

## Booting the Runtime

The bundled main files load the runtime with `bin/server-boot.php` from the
core package. Call it before any other Windwalker code runs:

```php
use Windwalker\Core\CorePackage;

/** @var Container $container */
$container = (include CorePackage::path('bin/server-boot.php'))(
    'swoole',
    $argv,
);
```

`CliServerRuntime::boot()` parses `$argv[1]`, loads the state, and selects an
inspector for the engine. The `swoole` engine uses `SwooleInspector`, and the
`test` engine uses `TestInspector`. Any other engine name throws an
`InvalidArgumentException`. The boot script then boots the application and
returns its DI container.

`SwooleInspector` enables the built-in database connection pool only when the
server runs one worker. With several workers, each process keeps its own
database connection, so a shared pool adds no value.

After boot, read the state from anywhere in the process:

```php
use Windwalker\Core\CliServer\CliServerRuntime;

$state = CliServerRuntime::getServerState();

$options = $state->getStartupOptions();
$port = $state->getPort();
$workers = $options['workers'] ?? swoole_cpu_num();
```

`getStartupOptions()` returns the values the console passed in, such as
`workers`, `task_workers`, `max_requests`, `app`, and `watch`.

## Complete Example

The installed `servers/swoole_website.php` follows the same sequence as the
example below. This shorter version keeps the essential steps in order:

```php
<?php

declare(strict_types=1);

namespace App;

use Windwalker\Core\Application\WebApplication;
use Windwalker\Core\CliServer\CliServerRuntime;
use Windwalker\Core\CliServer\Swoole\Subscriber\ServerStartedListener;
use Windwalker\Core\CliServer\Swoole\Subscriber\SwooleProcessSubscriber;
use Windwalker\Core\CorePackage;
use Windwalker\DI\Container;
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Reactor\Swoole\Event\StartEvent;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

use function Swoole\Coroutine\run;

include __DIR__ . '/../vendor/autoload.php';
include __DIR__ . '/../etc/define.php';

// 1. Boot the runtime. It reads the state file from $argv[1].
/** @var Container $container */
$container = (include CorePackage::path('bin/server-boot.php'))(
    'swoole',
    $argv,
);

CliServerRuntime::registerErrorReporting(
    include WINDWALKER_ETC . '/conf/error-reporting.php',
);

// 2. Apply the startup options to the Swoole server.
$state = CliServerRuntime::getServerState();
$options = $state->getStartupOptions();
$workers = $options['workers'] ?? swoole_cpu_num();

/** @var SwooleHttpServer $server */
$server = $container->resolve(SwooleHttpServer::factory());
$server->set('worker_num', $workers);
$server->set('max_request', $options['max_requests'] ?? 500);

// Tell the database pool how many workers exist.
$state->setWorkerNumber($workers);

// 3. Share the server and attach the runtime listeners.
$container->share(SwooleHttpServer::class, $server);
$server->subscribe(new SwooleProcessSubscriber($container));
$server->on(StartEvent::class, new ServerStartedListener());

// 4. Create the application and handle requests with it.
$app = new WebApplication($container->createChild());
$app->loadConfig(__DIR__ . '/app/' . ($options['app'] ?? 'main') . '.php');

$server->onRequest(function (RequestEvent $event) use ($app) {
    $app->runCliServerRequest($event);

    CliServerRuntime::gc();
});

$server->onStart(function (StartEvent $event) {
    CliServerRuntime::logNewLine(1);
    CliServerRuntime::logLine('Press Ctrl+C to stop the server');
    CliServerRuntime::logNewLine(1);
});

// 5. Boot the application inside a coroutine, then listen.
run(fn() => $app->bootForServer($server));

try {
    $server->listen('0.0.0.0', $state->getPort() ?: 9501);
} catch (\Throwable $e) {
    CliServerRuntime::handleThrowable($e);
}
```

::: tip
Start from the installed script rather than this example. It also sets the
process mode and the websocket listeners, which are covered in
[Reactor Servers](/documentation/components/reactor/servers).
:::

## Startup Sequence

The parent and the child run in order, as follows:

- The parent refuses to start if `isRunning()` finds a live server process.
- The parent writes the state file, then starts the main file with
  `APP_ENV` and `WINDWALKER_CLI_SERVER=1` in its environment.
- With `--watch`, the parent also starts a file watcher on the paths in
  the `reactor.watch` config, plus the main file.
- The child boots the runtime, configures the server, and calls `listen()`.
- On `StartEvent`, `ServerStartedListener` writes the master and manager
  PIDs and the listening ports back into the state file.

The child can check that it runs under the CLI server with the environment
variable. Use `getenv()`, because `env()` reads only `$_SERVER` and `$_ENV`:

```php
if (getenv('WINDWALKER_CLI_SERVER') === '1') {
    // Running under server:start.
}
```

### Detecting the Runtime

Services that run in both environments can ask the application which runtime
it is in. `getType()` returns an `AppType`:

- `AppType::WEB`: a PHP-FPM or Apache request.
- `AppType::CLI_WEB`: a long-running server, such as the Swoole server.
- `AppType::CONSOLE`: a console command.

```php
use Windwalker\Core\Application\AppType;

if ($app->getType() === AppType::CLI_WEB) {
    // Long-running server: no state may leak between requests.
}
```

The database package uses the same check to decide whether to create a
connection pool. See [Swoole Web Server](./swoole-web-server#connection-pool).

::: info
The `php` engine does not boot `CliServerRuntime` and writes no state file.
Its child process is the built-in web server, so the sequence above applies
only to the `swoole` engine.
:::

## Process Titles and Tasks

On Linux, `SwooleProcessSubscriber` sets the process title for the manager,
workers, and task workers. The title combines the application name and the
server name, so `ps` shows which server a process belongs to:

```text
swoole: worker - myapp:website
swoole: task - myapp:website
```

The same subscriber runs `TaskEvent` payloads on task workers. A payload
must be callable, or the task throws:

```text
// ERROR: Currently task data must be a callable
```

## Output and Logging

Use the static helpers instead of `echo` inside a server process. They write
to the same console output that `server:start` shows:

- `CliServerRuntime::logLine()` writes a line, with Symfony formatting tags.
- `CliServerRuntime::log()` writes without a newline.
- `CliServerRuntime::logNewLine()` writes empty lines.
- `CliServerRuntime::getStyledOutput()` returns a `SymfonyStyle` for titles
  and blocks.

The output verbosity comes from the state, so `-v` on `server:start` also
applies to the server process. `WebApplication` logs each request through
`CliServerClient`, which prints the method, route, status, process ID, memory,
and duration:

```text
  [GET][main] /hello ...... [200] pid: 1234 - 12.00MB - 3ms
```

::: info
In the CLI runtime, `WebApplication::log()` writes the message to the console
and also sends it to the logger. Messages appear in the terminal even when
the logger is configured for a file.
:::

## Error Handling

`CliServerRuntime::handleThrowable()` decides how an error appears in the
terminal. Client errors, with a 4xx code, show a short message and the file
where the error was thrown:

```text
// ERROR: (404) Route not found
//   # File: /app/src/Controller/UserController.php:42
```

Other errors render as a block with the exception class and the message. Add
`-v` to `server:start` to show the stack trace for both kinds.

`registerErrorReporting()` sends `display_errors` to `stderr`. The error level
depends on `APP_ENV`:

```php
CliServerRuntime::registerErrorReporting(
    include WINDWALKER_ETC . '/conf/error-reporting.config.php',
);
```

::: tip
Set `APP_ENV=prod` to use the level in the config file. Any other value,
including an unset variable, reports all errors.
:::

## Garbage Collection

Long-running processes keep objects in memory between requests. The runtime
calls `gc_collect_cycles()` every fiftieth call to `CliServerRuntime::gc()`.
The counter is per process. The bundled scripts call `gc()` after each request.
Change the interval in the main file:

```php
use Windwalker\Core\CliServer\CliServerRuntime;

// Collect cycles every 100 requests instead of 50.
CliServerRuntime::$gcThrottle = 100;
```

`SwooleProcessSubscriber` also collects cycles on every `ResponseEvent` when
memory usage is above 50 MB. That threshold is set in the subscriber, not in
the config.

## Stopping and Reloading

A Swoole server stops in three ways:

- Press `Ctrl+C`, or send `SIGINT` or `SIGTERM` on Linux and macOS. The
  command calls `stopServer()`.
- Run `server:stop swoole:website`. The command checks `isRunning()`, then
  stops the server.
- End the parent process. The `finally` block in `runServerProcess()` stops
  the server.

::: warning
`stopServer()` sends `SIGKILL` to the manager, the workers, and the master.
Requests in progress are cut off, and no shutdown handler runs. Do not use
`server:stop` while a request writes data that must finish.
:::

With `--watch`, a changed file sends `SIGUSR1` to the master process. Swoole
then reloads the workers, and the master keeps running.

::: tip
Use `--watch` only in development. The reload picks up changes in the
workers, but it does not restart the main file or the console process.
:::

The `php` engine has no state and cannot be stopped by `server:stop`. Press
`Ctrl+C` in its terminal instead. The command prints this warning:

```text
// ERROR: Server engine: php not supports stop command
```

## Related

- [Server Command](/documentation/framework/console/commands/server)
- [Swoole Web Server](/documentation/framework/cli-servers/swoole-web-server)
- [Swoole WebSocket](/documentation/framework/cli-servers/swoole-websocket)
- [Reactor Servers](/documentation/components/reactor/servers)
- [HTTP Server](/documentation/components/http/server)
