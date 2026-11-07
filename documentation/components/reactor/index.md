---
layout: doc
title: Introduction
component: reactor
---

# Introduction

Reactor connects Windwalker to Swoole. A Swoole server is a long-running
PHP process: it boots once and then handles requests and WebSocket frames
as events. This model is fast, but it changes how code behaves. Read the
core concepts below before you write a server.

## Core Concepts

**Long-running workers.** Each worker process boots the application once.
Services, static properties, and globals survive from one request to the
next. Code that is safe under PHP-FPM can leak state here. Keep request
data in the request object. Use [memory tables](./memory-tables) only for
state that must be shared between workers.

**Events instead of callbacks.** Each Swoole callback is translated into a
Windwalker event object, such as `RequestEvent` or `MessageEvent`.
Listeners receive that object, can read it, and can change it. This is the
same event model as the rest of Windwalker.

**One server, one port.** A server listens on one port. A
[sub-server](./sub-servers) adds another port with its own protocol.

**Swoole is required to serve.** The `swoole` extension must be loaded to
run a server. Some helpers and the memory factory fall back to plain PHP
when it is missing. The fallback runs the code, but it does not serve
requests and does not share memory between processes.

## Installation

Install the package with Composer:

```bash
composer require windwalker/reactor ^4.0
```

Requirements:

- PHP 8.4.6 or later
- The `swoole` PHP extension

## Use in Windwalker

Install the preset server scripts with `pkg:install` (see
[Servers](./servers)). After that, they are available under the `swoole`
engine: `swoole:website` for HTTP and `swoole:websocket` for WebSocket.
Start one with the `server:start` command:

```bash
php windwalker server:start swoole:website
```

Services in the same process can type-hint the running server:

```php
use Windwalker\Reactor\Swoole\SwooleHttpServer;

class ServerStatusService
{
    public function __construct(
        protected SwooleHttpServer $server,
    ) {
    }

    public function status(): array
    {
        return $this->server->getServersInfo();
    }
}
```

The `swoole:websocket` script shares its server under the
`SwooleHttpServer` key as well, but that instance is a
`SwooleWebsocketServer`. Type-hint `SwooleServer` or
`SwooleWebsocketServer` in WebSocket code.

## Use as Standalone Component

Without the framework, create a server, attach a listener, and call
`listen()`:

```php
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();

$server->onRequest(function (RequestEvent $event) use ($server) {
    $factory = $server->getHttpFactory();

    $event->response = $factory
        ->createResponse(200)
        ->withHeader('Content-Type', 'text/plain')
        ->withBody(
            $factory->createStream('Hello, Reactor!')
        );
});

$server->listen('0.0.0.0', 9501);
```

## Pages

- [Servers](./servers): server classes, the `server:start` command,
  configuration, lifecycle events, and runtime helpers.
- [HTTP](./http): how requests become events, and how middleware and
  responses fit together.
- [WebSocket](./websocket): connection events, sending messages, and
  working with connections.
- [Sub-servers and Protocols](./sub-servers): serving several protocols
  on several ports.
- [Coroutine Server](./coroutine-server): the single-process coroutine
  HTTP server.
- [Memory Tables](./memory-tables): shared state between workers, and
  the user and room mappings built on it.

## Common Pitfalls

::: warning
- **Blocking code stalls the worker.** A slow synchronous call, such as a
  `sleep()` or a blocking network request, delays every other request
  that the same worker is handling.
:::

::: warning
- **State leaks between requests.** A service that stores request data in
  a property keeps that data for the next request in the same worker.
:::

::: warning
- **Public binding.** Listening on `0.0.0.0` exposes the server to the
  network. In production, bind to a specific address or put a reverse
  proxy in front of the server.
:::

::: warning
- **Runtime control from user input.** Do not pass user data into
  `shutdown()`, `reload()`, or `stop()`.
:::
