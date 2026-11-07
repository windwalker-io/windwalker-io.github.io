---
layout: doc
title: Introduction
component: reactor
---

# Introduction

Reactor is the Swoole integration package for Windwalker. It provides server classes built on Swoole's HTTP,
WebSocket, and TCP servers. Incoming Swoole requests are converted to PSR-7 messages and passed through the same
middleware and event flow as other Windwalker HTTP components. Reactor also includes memory tables and room mappings
for sharing state between worker processes.

Running a server requires the `swoole` PHP extension. Some helpers fall back to plain PHP behavior when the extension
is not loaded.

## Installation

Install the package with Composer:

```bash
composer require windwalker/reactor ^4.0
```

Requirements:

- PHP 8.4.6 or later
- The `swoole` PHP extension

## Use in Windwalker

Installing the package registers two server entry scripts under the `swoole` engine: `swoole:website` for HTTP and
`swoole:websocket` for WebSocket. Start them with the `server:start` command:

```bash
php windwalker server:start swoole:website
php windwalker server:start swoole:websocket
```

The entry scripts share the running server instance in the container, so services can receive it by type-hint:

```php
use Windwalker\Reactor\Swoole\SwooleHttpServer;

class ServerStatusService
{
    public function __construct(protected SwooleHttpServer $server)
    {
    }

    public function status(): array
    {
        return $this->server->getServersInfo();
    }
}
```

## Use as Standalone Component

Without the framework, create a server, attach listeners, and call `listen()`:

```php
use Windwalker\Http\Event\RequestEvent;
use Windwalker\Reactor\Swoole\SwooleHttpServer;

$server = new SwooleHttpServer();

$server->onRequest(function (RequestEvent $event) use ($server) {
    $event->response = $server->getHttpFactory()
        ->createResponse(200)
        ->withHeader('Content-Type', 'text/plain')
        ->withBody($server->getHttpFactory()->createStream('Hello, Reactor!'));
});

$server->listen('0.0.0.0', 9501);
```

## Pages

- **Servers**: server classes, the `server:start` command, configuration, sub-servers, and the coroutine server.
- **HTTP**: request handling, middleware, and the HTTP event flow.
- **WebSocket**: connection events, sending messages, and rooms.
- **Memory Tables**: shared memory tables and the user and room mappings built on them.
