---
layout: doc
title: Servers
component: reactor
---

# Servers

Reactor wraps Swoole's server classes in Windwalker classes. Each class dispatches events to listeners and can be
configured with the same settings that Swoole accepts.

| Class                   | Swoole class                      | Typical use                                         |
|-------------------------|-----------------------------------|-----------------------------------------------------|
| `SwooleServer`          | `Swoole\Server`                   | Generic TCP server, or a base for sub-servers.      |
| `SwooleHttpServer`      | `Swoole\Http\Server`              | HTTP server.                                        |
| `SwooleWebsocketServer` | `Swoole\WebSocket\Server`         | WebSocket server.                                   |
| `SwooleCoroutineServer` | `Swoole\Coroutine\Http\Server`    | HTTP server running inside a coroutine.             |

## The `server:start` Command

The command accepts a server name in `engine:name` format. The installed entry scripts are `swoole:website` and
`swoole:websocket`.

```bash
php windwalker server:start swoole:website --port=8080 --workers=4
```

Common options:

| Option           | Description                                                                              |
|------------------|------------------------------------------------------------------------------------------|
| `--host`         | Host, optionally with a port, in `host[:port]` format.                                   |
| `--port`         | Port to listen on. If omitted, an unused port is selected.                               |
| `--workers`      | Number of worker processes. Defaults to the CPU count.                                   |
| `--task-workers` | Number of task worker processes. Defaults to the CPU count.                              |
| `--max-requests` | Requests a worker handles before it is recycled.                                         |
| `--app`          | Application config name loaded by the website entry script. Default: `main`.             |
| `--watch`        | Restart the server when files in the `reactor.watch` patterns change.                    |

## Entry Scripts

The installed scripts in `servers/` follow the same steps:

1. Boot the Windwalker runtime with the `swoole` engine.
2. Create the server through its factory and set worker options from the command line.
3. Share the server with the container and subscribe lifecycle listeners.
4. Attach the request or WebSocket listeners.
5. Call `listen()` on the configured port.

Use these scripts as a starting point when you need custom server behavior. Add your own `on<Event>()` listeners before
`listen()` is called.

## Configuration

Settings passed to `set()`, `setConfig()`, or a factory's `$config` argument are sent to Swoole when the native server
is created. The native server is created on the first call to `listen()` or `getSwooleServer()`.

```php
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();
$server->set('worker_num', 4);
$server->set('max_request', 500);
```

Common Swoole keys include `worker_num`, `task_worker_num`, `max_request`, and `task_max_request`. Any key supported
by Swoole's `Swoole\Server::set()` can be used.

### Creating Servers Through DI

Each server class provides a `factory()` method that returns a closure for `Container::resolve()`. The factory applies
the configuration and middleware list, and resolves middleware entries through the container.

```php
use Windwalker\DI\Container;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

/** @var Container $container */
$server = $container->resolve(
    SwooleHttpServer::factory(
        config: ['worker_num' => 4],
    )
);
```

## Events

Register a listener with `on()` and the event class name, or with the `on<Name>()` shortcut. The shortcut maps the
Swoole event name to its event class in `Windwalker\Reactor\Swoole\Event`:

```php
use Windwalker\Reactor\Swoole\Event\StartEvent;

$server->onStart(function (StartEvent $event) {
    // $event->swooleServer is the native Swoole server.
    // $event->server is the Reactor server instance.
});
```

A Swoole callback is attached only when at least one listener exists for that event before `listen()` is called. The
HTTP and WebSocket events are described on their own pages.

## Sub-servers and Protocols

A sub-server listens on an additional port. It shares the parent's configuration, and the parent starts it when
`listen()` is called on the parent.

`Protocol` flags enable protocols on a server. Combine them with `|`:

| Constant              | Swoole setting             |
|-----------------------|----------------------------|
| `Protocol::HTTP`      | `open_http_protocol`       |
| `Protocol::HTTP2`     | `open_http2_protocol`      |
| `Protocol::WEBSOCKET` | `open_websocket_protocol`  |
| `Protocol::MQTT`      | `open_mqtt_protocol`       |

```php
use Windwalker\Reactor\Protocol;
use Windwalker\Reactor\Swoole\SwooleServer;

$server = new SwooleServer();

$websocket = $server->createSubServer(Protocol::WEBSOCKET);
$websocket->listen('0.0.0.0', 9502);

$server->listen('0.0.0.0', 9501);
```

## Stopping and Native Methods

`stop()` stops the server or a single worker. Methods of the native Swoole server that Reactor does not define, such as
`reload()`, `shutdown()`, `task()`, and `tick()`, are forwarded to the native server. Call them only after the server
has started, otherwise a `BadMethodCallException` is thrown.

## Coroutine HTTP Server

`SwooleCoroutineServer` runs a `Swoole\Coroutine\Http\Server` inside `Windwalker\run()`. It routes all requests on `/`
through its middleware chain. Use `SwooleCoroutineServer::factory()` to create it through DI. The `ssl` and `reusePort`
options are set on the instance, not on the native server.

## Helper Functions

The functions in the `Windwalker` namespace let code run with or without Swoole:

| Function                              | Description                                                                 |
|---------------------------------------|-----------------------------------------------------------------------------|
| `Windwalker\run(callable $handler)`   | Run the handler in a coroutine scheduler when Swoole is loaded.             |
| `Windwalker\go(callable $handler)`    | Start a coroutine when Swoole is loaded. Otherwise, call the handler.       |
| `Windwalker\swoole_in_coroutine()`    | Whether the current code runs inside a Swoole coroutine.                    |
| `Windwalker\swoole_installed()`       | Whether the `swoole` extension is loaded.                                   |
