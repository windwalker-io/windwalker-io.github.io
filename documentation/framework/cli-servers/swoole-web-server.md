---
layout: doc
title: Swoole Web Server
---

# Swoole Web Server

A Swoole web server runs your application as a long-lived HTTP server. The
application boots once per worker, and it stays in memory between requests.
Each request goes straight to the router, without a new PHP process.

The engine runs the `swoole_website` script from the Reactor package. The
script wires the server to a `WebApplication`, so your routes, controllers,
and views work as they do under PHP-FPM. The sequence of the console
command and the runtime is covered in [Server Basics](./server-basics).

## Enabling the Web Server

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

Open `http://localhost:8080` in a browser. Each request is written to the
terminal with its method, route, status code, process ID, memory, and
duration, as described in [Server Basics](./server-basics#output-and-logging).

## Startup Options

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

::: info
With one worker, the database connection pool is enabled. With several
workers, each process keeps its own connection. See
[Server Basics](./server-basics#booting-the-runtime).
:::

## How the Script Handles Requests

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

## Customizing the Main File

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

## Application State Between Requests

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

## Stopping and Reloading

Stop the server with `Ctrl+C` in its terminal, or with
`server:stop swoole:website`. The stop command kills the processes at once,
so requests in progress are cut off. See
[Server Basics](./server-basics#stopping-and-reloading) for the details.

## Related

- [Server Basics](./server-basics)
- [Swoole WebSocket](./swoole-websocket)
- [Server Command](/documentation/framework/console/commands/server)
- [Reactor Servers](/documentation/components/reactor/servers)
