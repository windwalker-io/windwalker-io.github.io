---
layout: doc
title: Sub-servers and Protocols
component: reactor
---

# Sub-servers and Protocols

One Swoole server listens on one port. A sub-server adds a listener on
another port, so one process can serve HTTP on one port and WebSocket on
another. Sub-servers are useful when clients need different protocols
on different ports, such as a website and a real-time channel.

## How Sub-servers Work

`createSubServer()` returns a copy of the parent server that is
configured as a sub-server. The parent starts every sub-server when the
parent calls `listen()`. A sub-server does not open its port on its
own.

The optional argument sets protocol flags. Combine them with `|`:

| Constant              | Swoole setting             |
|-----------------------|----------------------------|
| `Protocol::HTTP`      | `open_http_protocol`       |
| `Protocol::HTTP2`     | `open_http2_protocol`      |
| `Protocol::WEBSOCKET` | `open_websocket_protocol`  |
| `Protocol::MQTT`      | `open_mqtt_protocol`       |

## Example

```php
use Windwalker\Reactor\Protocol;
use Windwalker\Reactor\Swoole\SwooleServer;

$server = new SwooleServer();

$websocket = $server->createSubServer(
    Protocol::WEBSOCKET,
);

$websocket->onMessage(function ($event) {
    // Handle WebSocket frames on port 9502.
});

$websocket->listen('0.0.0.0', 9502);

$server->listen('0.0.0.0', 9501);
```

## Pitfalls

::: warning
- **Protocol flags go to the parent.** `createSubServer()` writes the
  flags to the parent server's settings, not to the sub-server. If the
  parent also serves HTTP, check the combined flags before you start.
:::

::: warning
- **Calling `listen()` on a sub-server only registers it.** The port
  opens when the parent calls `listen()`. Calling the sub-server's
  `listen()` after the parent has started does nothing.
:::

- **Tip:** **Bind errors appear at parent start.** A port that is already
  in use fails during the parent's `listen()`, not when the sub-server is
  created.
