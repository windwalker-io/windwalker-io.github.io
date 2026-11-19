---
layout: doc
title: Swoole Web Server
description: Run a Windwalker application on a long-lived Swoole HTTP server, covering setup, worker options, static files, processes, timers, shared state and coroutines.
---

# Swoole Web Server

A Swoole web server runs your application as a long-lived HTTP server. The
application boots once per worker, and it stays in memory between requests.
Each request goes straight to the router, without a new PHP process.

The engine runs the `swoole_website` script from the Reactor package. The
script wires the server to a `WebApplication`, so your routes, controllers,
and views work as they do under PHP-FPM. The sequence of the console
command and the runtime is covered in [Server Basics](./server-basics).

This page is grouped by topic: setup, request handling, processes and
concurrency, state and architecture, and operations.

## Setup

### Enabling the Web Server

Install the preset script with the `swoole_website` tag, then start it with
the `swoole:website` name:

```bash
composer require windwalker/reactor

php windwalker pkg:install windwalker/reactor --tag swoole_website

php windwalker server:start swoole:website --port=8080
```

The tag copies `servers/swoole_website.php` and registers the name
`website` under the `swoole` engine. The Swoole extension must be loaded.
Use `\Windwalker\swoole_installed()` to check it.

### Startup Options

The options of `server:start` control the Swoole server before it starts.
The script reads them from the state file:

```bash
php windwalker server:start swoole:website \
    --port=8080 \
    --workers=4 \
    --task-workers=2 \
    --max-requests=500
```

- `--workers`: the number of worker processes. The default is the CPU count.
- `--task-workers`: the number of task worker processes.
- `--max-requests`: the number of requests a worker handles before it is
  restarted. The default is `500`.
- `--watch`: reloads the workers when a file in `reactor.watch` changes.
  Use it only in development.

#### Choosing the Worker Count

These are starting points, not framework settings. Measure before you change
them.

- Start at the CPU count, which is the default. For handlers that mostly wait
  for I/O, Swoole deployments often use 1 to 4 times the cores.
- Measure the memory of one worker after boot. Each worker holds its own copy
  of the application.
- Cap the count by memory. Keep the total at about 70% of the RAM you can
  give the server.

```php
// Estimate workers from the RAM you can give the server.
function estimateWorkers(int $availableMb, int $perWorkerMb): int
{
    $byMemory = intdiv((int) ($availableMb * 0.7), $perWorkerMb);

    return max(1, min(swoole_cpu_num(), $byMemory));
}
```

Each worker also has its own database connection, so more workers need a
higher connection limit on the database.

::: info
With one worker, the database connection pool is enabled. With several
workers, each process keeps its own connection. See
[Server Basics](./server-basics#booting-the-runtime).
:::

### Customizing the Main File

The script is plain PHP. Change it in your project, and keep the Windwalker
boot code at the top:

```php
// servers/swoole_website.php

$server->onStart(function (StartEvent $event) {
    // Your start logic.
});
```

Add the listeners and the Swoole settings before the call to `listen()`. A
listener attached after `listen()` is never registered with Swoole. See
[Reactor Servers](/documentation/components/reactor/servers) for the
available settings and events.

::: tip
To use a different entry script, register it under a new name in
`resources/registry/servers.php`, or pass `--main` to `server:start`.
:::

## Request Handling

### How the Script Handles Requests

The installed script has the same steps in every project, so you can read
it and change it directly. The request steps are the important part:

```php
// servers/swoole_website.php, the request listener

$server->onRequest(function (RequestEvent $event) use ($app) {
    $app->runCliServerRequest($event);

    CliServerRuntime::gc();
});
```

`WebApplication::runCliServerRequest()` creates an application context for
the request, runs the middleware and the controller, and writes the response
to the event. It also logs the request line in the terminal. After the
request, `CliServerRuntime::gc()` runs the garbage collector on a schedule.

Other steps of the script configure the server before it starts. They are
the worker settings, the `SwooleProcessSubscriber` for process titles, and
the `ServerStartedListener` that saves the process IDs to the state file.

### Static Files

The preset script does not serve static files. Every request goes to
`runCliServerRequest()`, so a path such as `/assets/app.css` reaches the router
and no file is read from your public folder. Choose one of two approaches.

#### Serving Files with a Middleware

Pass `FileProcessMiddleware` to the server factory. The cati runtime config
does the same:

```php
use Windwalker\Http\Middleware\FileProcessMiddleware;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

use function Windwalker\DI\create;

/** @var SwooleHttpServer $server */
$server = $container->resolve(
    SwooleHttpServer::factory(
        middlewares: [
            create(
                FileProcessMiddleware::class,
                publicPath: WINDWALKER_PUBLIC,
                options: [
                    'headers' => [
                        'X-Content-Type-Options' => 'nosniff',
                    ],
                ],
            ),
        ],
    )
);
```

::: tip
`FileProcessMiddleware` needs the `symfony/mime` package. Without it, the
constructor throws a `DomainException`.
:::

#### Letting Swoole Serve Files

Swoole can send a file before any PHP code runs. Set `document_root` and
`enable_static_handler` together:

```php
$server->set([
    'document_root' => WINDWALKER_PUBLIC,
    'enable_static_handler' => true,
]);
```

::: warning
A file that Swoole serves does not trigger the request event. PHP middleware,
such as the headers of `FileProcessMiddleware`, does not run for that file.
:::

#### Static Files in Production

A common setup puts a reverse proxy, such as Nginx or Caddy, in front of the
server. The proxy serves `public/` and sets cache headers, and it forwards
only dynamic paths to Swoole. Give versioned asset names a long cache lifetime,
so a browser reuses them between deployments.

## Processes and Concurrency

### Workers and Processes

Each worker is a separate PHP process. The master process owns the listening
socket, and in `SWOOLE_PROCESS` mode it also owns the client connections. Each
worker boots the application once, and it keeps its own memory, coroutine
scheduler, timers, and database connections.

#### One Worker or Several

With one worker, every request runs in the same process. With several workers,
each request may run in any idle worker. A value kept in process memory is
therefore not shared:

```php
// Each worker counts only the requests it handled itself.
class Visits
{
    public static int $count = 0;
}
```

Use one worker when handlers depend on in-process state, such as a pool.
Use several workers for stateless handlers, and keep shared state in a shared
table or in Redis.

#### Sharing State with Swoole Table

`Swoole\Table` lives in shared memory, so every worker reads and writes the
same rows. Create the table before the server starts, because its columns and
size are fixed:

```php
use Swoole\Table;

$visits = new Table(1024);
$visits->column('count', Table::TYPE_INT);
$visits->create();

$server->onRequest(function (RequestEvent $event) use ($visits) {
    $visits->incr('home', 'count');
});
```

Windwalker builds its tables through `MemoryTableFactory`. The factory returns a
`SwooleTable` when the extension is loaded, and an `ArrayTable` otherwise. An
`ArrayTable` lives in one process, so it is not shared. Both implement
`MemoryTableInterface`, which defines `column()`, `create()`, `set()`, `get()`,
`exists()`, and `delete()`.

To keep your own table, wrap it in a class and share the class in the
container. `RoomMapping` is built the same way by the WebSocket provider:

```php
use Windwalker\DI\Container;
use Windwalker\Reactor\Memory\MemoryTableFactory;
use Windwalker\Reactor\Memory\MemoryTableInterface;

class PresenceMapping
{
    public function __construct(protected MemoryTableInterface $table)
    {
        $this->table->column('since', MemoryTableInterface::TYPE_INT);
        $this->table->create();
    }

    public function join(string $user): void
    {
        $this->table->set($user, ['since' => time()]);
    }
}

$container->share(
    PresenceMapping::class,
    fn(Container $container) => new PresenceMapping(
        $container->get(MemoryTableFactory::class)
            ->createMemoryTable(1024)
    ),
);
```

Resolve the class during boot, before the server starts. The columns must be
created before the table is used, and `create()` runs in the constructor.

The table is a row cap, not a growing store. For the sizing rules and the
Windwalker memory tables, see
[Memory Tables](/documentation/components/reactor/memory-tables).

#### Timers

A timer belongs to the process that created it. With N workers, a timer that
every worker starts runs N times:

```php
use Swoole\Timer;

$server->onWorkerStart(function ($server, int $workerId) {
    // Runs in every worker, so the job runs once per worker.
    Timer::tick(60_000, fn() => refreshLocalCache());

    // Runs in one worker only.
    if ($workerId === 0) {
        Timer::tick(60_000, fn() => sendDailyReport());
    }
});
```

A timer does not guarantee at-least-once execution. A worker can exit, for
example after `--max-requests`, and its timers stop with it. For delayed work
that must run, such as an `after()`-style job, store the job in Redis or
another external store, and let a permanent process poll it. Use timers inside
one process for housekeeping, such as clearing a local cache.

::: warning
Do not start timers in `onStart`. The callback runs in the master process, and
a timer there can keep the server from shutting down.
:::

For a job that must run once for the whole server, register a user process with
`addProcess()` before `listen()`. Swoole creates the process when the server
starts. Its lifecycle matches the master and manager processes, and a reload
does not restart it. Shutdown sends it `SIGTERM`. Put the timer inside the
process, so the job runs in one place only:

```php
use Swoole\Process;
use Swoole\Timer;

$server->addProcess(new Process(function () {
    Timer::tick(60_000, fn() => sendDailyReport());
}));

$server->listen('0.0.0.0', 9501);
```

For a job that must run in every worker, start the timer in `onWorkerStart`.
Each worker starts its own timer, and the timer stops when its worker exits.

#### Coroutines

Windwalker runs request handlers in coroutines when `enable_coroutine` is on.
`\Windwalker\go()` starts background work in a coroutine. A coroutine runs in
the event loop of one worker, so a blocking call that is not coroutine-aware
blocks every client of that worker. With one worker, that is every client.

- Use clients that are hooked for coroutines, such as PDO and Redis clients
  with Swoole hooks on.
- Keep CPU loops short. Move heavy work to task workers, as described in
  [Reactor Servers](/documentation/components/reactor/servers).
- Keep one-off jobs in a single worker, as shown in the timer example.

Swoole runs the request, message, open, close, and worker-start callbacks in a
coroutine automatically when `enable_coroutine` is on, which is the default.
Timer callbacks do too. Inside these events you can use non-blocking clients
without calling `go()`. `onStart` is not in that list, so start a coroutine
there with `go()`.

`\Windwalker\go()` works in both environments. With the `swoole` extension, it
starts a coroutine. Without the extension, it calls the handler synchronously.
Code that uses `go()` therefore runs in a PHP-FPM application and in a Swoole
server alike. Inside an event, `go()` starts an extra coroutine, which suits
background work that should not delay the response.

The rules for blocking calls still apply. A coroutine-aware client yields while
it waits, and a blocking call does not.

### Connection Pool

The database package creates a connection pool only in the `CLI_WEB` runtime,
and only when the Swoole inspector allows it. The inspector allows the pool
with one worker. The pool's maximum size comes from the worker count, which is
one in this mode. See the
[Connection Pool](/documentation/components/pool/connection-pool) component for
how the pool works.

Use the pool with one worker when you want the database connection reused
across requests. With several workers, each process keeps its own connection,
as described in [Startup Options](#startup-options).

## State and Architecture

### Application State Between Requests

The worker process stays alive across requests. Objects that you store in
static properties or global variables remain in memory for the next request
that the worker handles.

::: warning
Do not store per-request data in static properties, globals, or singletons.
The next request handled by the same worker can read it. Keep request data
in the request or the application context, which is created for every
request.
:::

Use `--max-requests` to restart a worker after a number of requests. This
limits the memory that a long-running worker can keep, but it does not
remove shared state within one worker's lifetime.

#### Application Layers

Windwalker splits the container into three layers, and each has its own
lifetime:

- `AppLayer::RUNTIME`: the process, created once at boot.
- `AppLayer::APP`: the application, which lives as long as the server.
- `AppLayer::REQUEST`: one request, discarded when the request ends.

Anything bound at the request layer is released after each request. The
[Application Layers](/documentation/framework/core-concepts/applications/layers)
page explains the layers, and the
[Request Lifecycle](/documentation/framework/core-concepts/applications/request-lifecycle)
page follows one request through them.

#### Injecting Services Safely

Inject services through a constructor or a handler parameter, so the container
decides how long each one lives. Avoid fetching a service from a static
accessor, because that bypasses the layer that owns it.

Keep request data in request-layer objects, never in static properties or
globals. A service that holds a user's data must be declared at
`AppLayer::REQUEST`, as the layers page shows with `providedIn`:

```php
class CartController
{
    public function show(CartService $cart): ResponseInterface
    {
        // CartService is created for this request only.
    }
}
```

## Operations

### Stopping and Reloading

Stop the server with `Ctrl+C` in its terminal, or with
`server:stop swoole:website`. The stop command kills the processes at once,
so requests in progress are cut off. See
[Server Basics](./server-basics#stopping-and-reloading) for the details.

## Related

- [Server Basics](./server-basics)
- [Swoole WebSocket](./swoole-websocket)
- [Server Command](/documentation/framework/console/commands/server)
- [Reactor Servers](/documentation/components/reactor/servers)
