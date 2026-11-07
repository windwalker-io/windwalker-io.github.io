---
layout: doc
title: Coroutine Server
component: reactor
---

# Coroutine Server

`SwooleCoroutineServer` runs Swoole's coroutine HTTP server in a single
process. It does not use worker processes. Each request runs in its own
coroutine, which makes it a lightweight choice for small services, tools,
and development. For production traffic that needs several workers, use
`SwooleHttpServer`.

The server registers one handler for `/`. Route other paths in the
middleware chain.

## Creating the Server

`listen()` runs the server inside `Windwalker\run()`, so the call blocks
until the server stops:

```php
use Windwalker\Reactor\Swoole\SwooleCoroutineServer;

$server = new SwooleCoroutineServer();

$server->setSsl(false);
$server->setConfig(['worker_num' => 1]);

$server->listen('0.0.0.0', 9503);
```

`ssl` and `reusePort` are properties of the Reactor server, set with
`setSsl()` and `setReusePort()`. They are not Swoole settings.

Use the factory to create the server through the container:

```php
use Windwalker\DI\Container;
use Windwalker\Reactor\Swoole\SwooleCoroutineServer;

/** @var Container $container */
$server = $container->resolve(
    SwooleCoroutineServer::factory(
        config: ['worker_num' => 1],
        ssl: false,
    )
);
```

## Pitfalls

- **One process means shared state.** Services and globals are shared by
  every request in the process, the same as the other server types.
  There is only one process, so the workers' memory-sharing concern does
  not apply.
- **Blocking code blocks every coroutine.** A synchronous call that does
  not yield stops all other requests in the process.
- **`stop()` must be called from running code.** Call it from a request
  listener or a timer after the server has started.
