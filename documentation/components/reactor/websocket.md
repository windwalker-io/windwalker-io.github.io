---
layout: doc
title: WebSocket
component: reactor
---

# WebSocket

`SwooleWebsocketServer` dispatches events for the WebSocket handshake, connections, messages, and disconnections. Use
the `Open` and `Message` events to receive data, and the message emitter to send it back.

## Connection Events

| Event                     | Purpose                                                                                          |
|---------------------------|--------------------------------------------------------------------------------------------------|
| `BeforeHandshakeResponse` | Runs before the handshake response is sent. Use it to change response headers.                   |
| `Handshake`               | Runs during the handshake.                                                                       |
| `Open`                    | A connection is established. `$event->request` is a `WebSocketRequest`, and `$event->swooleRequest` is the native request. |
| `Message`                 | A frame is received. `$event->fd` is the connection ID and `$event->frame` holds the payload.    |
| `Close`                   | The TCP connection is closed. Its `fd` property identifies the connection.                       |
| `Disconnect`              | The WebSocket connection is disconnected.                                                        |

## Echo Example

```php
use Windwalker\Reactor\Swoole\Event\MessageEvent;
use Windwalker\Reactor\Swoole\Event\OpenEvent;
use Windwalker\Reactor\Swoole\SwooleWebsocketServer;

$server = new SwooleWebsocketServer();

$server->onOpen(function (OpenEvent $event) {
    echo "Connected: fd {$event->swooleRequest->fd}\n";
});

$server->onMessage(function (MessageEvent $event) use ($server) {
    $server->getMessageEmitter()->emit($event->fd, 'Echo: ' . $event->frame->getData());
});

$server->listen('0.0.0.0', 9501);
```

## Sending Messages

`getMessageEmitter()` returns a `MessageEmitterInterface`. Its `emit(int $fd, string $data)` method sends text to a
connection and returns `false` if the connection no longer exists.

The emitter is available only after the native server has been created, so call it inside listeners or after
`listen()` has started. Calling it earlier throws a `RuntimeException`. Replace the default implementation with
`setMessageEmitter()` if you need custom delivery.

## Frames and Requests

- `WebSocketFrame` holds the connection ID and payload. Use `getFd()` and `getData()`.
- `WebSocketRequest` is the request stored for a connection. Use `getFd()`, `getFrame()`, and `getData()`.
- A `MessageParserInterface` can convert the payload to structured data, which is then available with
  `getParsedData()`.

## Application Class

The `swoole:websocket` installation generates `App\Web\WsApplication`. It extends the WebSocket application base class
and provides `init()`, `started()`, `opening()`, and `closing()` hooks for your own code. The entry script calls them
at startup, on connection open, and on connection close.

## Rooms and Users

Connections can be grouped into rooms and linked to user IDs. Rooms are stored in shared memory and are described in
[Memory Tables](./memory-tables).
