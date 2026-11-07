---
layout: doc
title: Servers
component: reactor
---

# Servers

A Reactor server wraps one Swoole server. It owns the listening socket,
attaches the Swoole callbacks that have listeners, and turns each
callback into a Windwalker event. You work with those events instead of
Swoole's callback signatures.

## Server Classes

The class decides which Swoole server it wraps:

- `SwooleServer` wraps `Swoole\Server`. Use it for raw TCP, or as the base
  of a server with several protocols.
- `SwooleHttpServer` wraps `Swoole\Http\Server`.
- `SwooleWebsocketServer` wraps `Swoole\WebSocket\Server`.
- `SwooleCoroutineServer` runs a coroutine HTTP server in a single
  process. See [Coroutine Server](./coroutine-server).

## Installing the Server Files

Composer installs only the configuration file automatically. The server
entry scripts are installed with `pkg:install`, using the composer
package name and a tag for each script:

```bash
php windwalker pkg:install windwalker/reactor --tag swoole_website
php windwalker pkg:install windwalker/reactor --tag swoole_websocket
```

The command copies the script to `servers/` in your application and
registers it under the `swoole` engine, so `server:start` can find it.
The `swoole_websocket` tag also generates `App\Web\WsApplication`.

Options that matter here:

- `--dry-run` lists the files that would be created, without writing
  anything. Use it first.
- `--force` overwrites files that already exist. It also replaces any
  changes you made to an installed script, so do not use it after you
  customize a script.

## The `server:start` Command

The command takes a server name in `engine:name` format. After the
scripts are installed, the names are `swoole:website` and
`swoole:websocket`:

```bash
php windwalker server:start swoole:website --port=8080
```

The options you will use most often:

| Option           | Purpose                                              |
|------------------|------------------------------------------------------|
| `--host`         | Host, optionally with a port, as `host[:port]`.      |
| `--port`         | Port to listen on. An unused port is chosen if omitted. |
| `--workers`      | Number of worker processes. Defaults to the CPU count. |
| `--max-requests` | Requests a worker handles before it is recycled.     |
| `--app`          | Application config loaded by the website script.     |
| `--watch`        | Restart the server when files change.                |

`--watch` watches the paths in the `reactor.watch` config and restarts the
server on change. It is meant for development. Do not use it in
production.

## Entry Scripts

The scripts are copied into the `servers/` directory of your application,
so you can change them directly. Each script follows the same sequence:

1. Boot the Windwalker runtime with the `swoole` engine.
2. Create the server from its factory and apply the worker options.
3. Share the server with the container and attach lifecycle listeners.
4. Attach the request or WebSocket listeners.
5. Call `listen()` on the port.

Add your own listeners before `listen()` is called. A listener attached
later is never registered with Swoole.

## Writing Your Own Main File

The preset scripts are not required. A server name is resolved to a main
file, and `--main` replaces that file with any path you choose.

### Swoole Server

A standalone Swoole script creates the server and listens on a port. It
needs only the autoloader:

```php
<?php

declare(strict_types=1);

use Windwalker\Http\Event\RequestEvent;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

require __DIR__ . '/../vendor/autoload.php';

$server = new SwooleHttpServer();

$server->onRequest(function (RequestEvent $event) use ($server) {
    $factory = $server->getHttpFactory();

    $event->response = $factory
        ->createResponse(200)
        ->withBody(
            $factory->createStream('Hello from Swoole')
        );
});

$server->listen('0.0.0.0', 9501);
```

Save it as `servers/hello-swoole.php` and run it directly:

```bash
php servers/hello-swoole.php
```

To run it with `server:start swoole:...`, the file must also boot the
Windwalker runtime and read the port and options from the server state.
Copy one of the preset scripts as a starting point. Without `--main`, a
`swoole:` name must be registered, or the command fails.

::: warning
- A standalone script ignores `--port`, `--workers`, and the other
  command options. Set them in the script, or read them from the state.
:::

- **Tip:** Port `9501` is hard-coded in the example above. Change it when
  another process already uses it.

, such as `worker_num`,
`task_worker_num`, and `max_request`:

```php
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();

$server->set('worker_num', 4);
$server->set('max_request', 500);
```

The settings are sent to Swoole when the native server is created. That
happens on the first `listen()` call or the first `getSwooleServer()`
call. A setting changed after that point does not reach the running
server.

Use the factory to create a server through the container. It applies the
configuration and resolves middleware entries through the container:

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

Be aware of the process mode. `new SwooleServer()` defaults to
`SWOOLE_BASE`, while `factory()` defaults to `SWOOLE_PROCESS`. The
entry scripts use the factory. In `SWOOLE_PROCESS` mode the reactor and
the workers run as separate processes, so a value set in one process is
not visible in another. Use memory tables for shared state.

### Registering a Server Name

`server:start` resolves `swoole:<name>` through the registry file
`resources/registry/servers.php` in your application. Each engine maps
its names to main file paths, relative to the application root:

```php
<?php

declare(strict_types=1);

return [
    'swoole' => [
        'website' => 'servers/swoole_website.php',
        'websocket' => 'servers/swoole_websocket.php',
        'hello' => 'servers/hello-swoole.php',
    ],
];
```

`pkg:install` adds the entries for the preset scripts. For your own
script, add a line by hand, as shown for `hello`. The name is the key
after the colon, so `swoole:hello` uses the `hello` entry.

Notes:

- `--main` skips the registry for one run. Use it while you develop a
  script.
- If the name is missing from the registry and `--main` is not given,
  the command fails.
- `pkg:install` does not overwrite an existing name. It shows a warning
  and skips that entry.

## Configuration

`set()` and `setConfig()` store Swoole settings, such as `worker_num`,
`task_worker_num`, and `max_request`:

```php
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();

$server->set('worker_num', 4);
$server->set('max_request', 500);
```

The settings are sent to Swoole when the native server is created. That
happens on the first `listen()` call or the first `getSwooleServer()`
call. A setting changed after that point does not reach the running
server.

Use the factory to create a server through the container. It applies the
configuration and resolves middleware entries through the container:

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

Be aware of the process mode. `new SwooleServer()` defaults to
`SWOOLE_BASE`, while `factory()` defaults to `SWOOLE_PROCESS`. The
entry scripts use the factory. In `SWOOLE_PROCESS` mode the reactor and
the workers run as separate processes, so a value set in one process is
not visible in another. Use memory tables for shared state.

## Lifecycle Events

Use `on<Name>()` to listen to a Swoole event. The name maps to the event
class in `Windwalker\Reactor\Swoole\Event`, so `onStart()` attaches
`StartEvent`:

```php
use Windwalker\Reactor\Swoole\Event\StartEvent;

$server->onStart(function (StartEvent $event) {
    $swoole = $event->swooleServer;
    $reactor = $event->server;
});
```

Most events expose `swooleServer` and `server`. The handshake event is an
exception and does not carry the server reference.

## Stopping and Native Methods

`stop()` stops the server or one worker. Methods that Reactor does not
define, such as `reload()`, `shutdown()`, `task()`, and `tick()`, are
forwarded to the native Swoole server. They work only after the native
server exists. Calling one earlier throws `BadMethodCallException`.

## Runtime Helpers

Reactor provides four functions in the `Windwalker` namespace. They let
the same code run with or without the `swoole` extension. Call them with
the fully qualified name, starting with a backslash:

```php
\Windwalker\swoole_installed();
```

### `\Windwalker\run()`

With Swoole loaded, creates a coroutine scheduler, runs the handler inside
a coroutine, and blocks until all coroutines started inside it finish.
Without Swoole, it calls the handler synchronously and returns when the
handler returns. Use it as the entry point of code that needs coroutines:

```php
\Windwalker\run(function () {
    // Runs inside a coroutine when Swoole is loaded.
});
```

### `\Windwalker\go()`

With Swoole loaded, starts the handler in a new coroutine. The call
returns immediately, and the handler runs asynchronously while the caller
continues. Without Swoole, it calls the handler synchronously, so the
handler finishes before `go()` returns. Code written for `go()` must not
depend on the order of execution, and it must work in both modes:

```php
\Windwalker\go(function () {
    // Async with Swoole. Synchronous without Swoole.
});
```

Wrap the calling code in `\Windwalker\run()` to make the coroutine scope
explicit.

### `\Windwalker\swoole_in_coroutine()`

Returns `true` when the current code runs inside a Swoole coroutine.
Returns `false` when Swoole is not loaded:

```php
if (\Windwalker\swoole_in_coroutine()) {
    // Running inside a coroutine.
}
```

### `\Windwalker\swoole_installed()`

Returns `true` when the `swoole` extension is loaded:

```php
if (!\Windwalker\swoole_installed()) {
    throw new \RuntimeException('The swoole extension is required.');
}
```

Code that relies on coroutine behavior runs differently without Swoole.
Check `\Windwalker\swoole_installed()` when that difference matters.

For the Swoole syntax behind these functions, including the short-name
functions such as `go()` and `Co\run()`, see the
[Swoole short-name methods reference](https://wiki.swoole.com/en/#/other/alias?id=short-name-methods).
