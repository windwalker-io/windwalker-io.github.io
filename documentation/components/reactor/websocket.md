---
layout: doc
title: WebSocket
component: reactor
---

# WebSocket

A WebSocket server sees each client as a connection, identified by a
file descriptor (`fd`). The server dispatches events for the handshake,
the connection, each incoming message, and the disconnection. You read
messages in `MessageEvent` and send data back through the message
emitter.

## Event Sequence

| Event                     | When it runs                                       |
|---------------------------|----------------------------------------------------|
| `BeforeHandshakeResponse` | Before the handshake response is sent.             |
| `Handshake`               | During the handshake.                              |
| `Open`                    | After the connection is established.               |
| `Message`                 | When a client sends a frame.                       |
| `Close`                   | When the TCP connection closes.                    |
| `Disconnect`              | When the WebSocket connection is removed.          |

`OpenEvent` carries two requests. `$event->request` is a
`WebSocketRequest`, and `$event->swooleRequest` is the native request
with the handshake data. `MessageEvent::$fd` and `MessageEvent::$frame`
identify the sender and the payload.

## Echo Example

```php
use Windwalker\Reactor\Swoole\Event\MessageEvent;
use Windwalker\Reactor\Swoole\Event\OpenEvent;
use Windwalker\Reactor\Swoole\SwooleWebsocketServer;

$server = new SwooleWebsocketServer();

$server->onOpen(function (OpenEvent $event) {
    echo "Connected: {$event->swooleRequest->fd}\n";
});

$server->onMessage(function (MessageEvent $event) use ($server) {
    $server->getMessageEmitter()->emit(
        $event->fd,
        'Echo: ' . $event->frame->getData(),
    );
});

$server->listen('0.0.0.0', 9501);
```

## Sending Messages

`getMessageEmitter()` returns a `MessageEmitterInterface`. Its
`emit(int $fd, string $data)` method sends text to one connection. It
returns `false` when the connection is gone, so check the result when
delivery matters.

The emitter exists only after the native server has been created. Call
it from listeners, not from code that runs before `listen()`. Calling it
earlier throws `RuntimeException`.

## Frames

`MessageEvent::$frame` is a `WebSocketFrameInterface`. Inside the server
it wraps Swoole's native `Swoole\WebSocket\Frame`. The interface exposes
the sender's connection ID and the payload, which covers most handlers:

```php
use Windwalker\Reactor\Swoole\Event\MessageEvent;

$server->onMessage(function (MessageEvent $event) {
    $fd = $event->frame->getFd();
    $data = $event->frame->getData();

    // Decode and handle $data here.
});
```

For the frame's opcode, such as text or binary, use the wrapper's
native frame. Check the type first, because the interface does not
provide it:

```php
use Windwalker\Reactor\Swoole\WebSocketFrameWrapper;

$frame = $event->frame;

if ($frame instanceof WebSocketFrameWrapper) {
    $opcode = $frame->getFrame()->opcode;
}
```

Binary payloads are also returned as a string. Do not assume the payload
is JSON or UTF-8 text without checking the opcode.

The plain `WebSocketFrame` class is a value object that the framework
creates itself, for example in `CloseEvent::createWebSocketFrame()`.
Its `withFd()` and `withData()` methods return a changed copy and leave
the original frame unchanged.

## Connections Are Not Users

An `fd` identifies a socket, not a person. Swoole can reuse an `fd` after
its connection closes, so never store an `fd` as a permanent identifier.
To tie a connection to a user, see the mappings in
[Memory Tables](./memory-tables).

## Security

Messages come from any client that can reach the port. Treat
`$event->frame->getData()` as untrusted input. Validate it before you use
it, and check authorization in `Open` or `Handshake` before the
connection can send anything.

## Framework Entry Script

The `swoole:websocket` script generates `App\Web\WsApplication`. It
extends the WebSocket application base class and provides `init()`,
`started()`, `opening()`, and `closing()` hooks. The script calls `init()`
at startup, `started()` when the server starts, `opening()` on each
connection, and `closing()` when a connection closes. Put your
application logic in these hooks rather than in the entry script.
