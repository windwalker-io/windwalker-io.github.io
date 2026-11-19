---
layout: doc
title: Swoole WebSocket
description: Build a Swoole WebSocket server with Windwalker routes, rooms, user mappings, message parsers, middleware, Redis publishing and connection authentication.
---

# Swoole WebSocket

A WebSocket connection stays open after the handshake, so the server can push
data to a client at any time. A PHP-FPM request ends before that can happen.
The Swoole WebSocket server keeps every connection in a worker process, and
it runs your handlers for three kinds of event: opening a connection, receiving
a message, and closing a connection.

Windwalker adds a routing layer on top of the Reactor events. Routes match the
path of a connection or the name of a message, and handlers receive a context
and a request that belong to that one event. This page covers the setup, the
connections, the routes, the messages, and the authentication. The process
model is covered in [Server Basics](./server-basics), and the HTTP side in
[Swoole Web Server](./swoole-web-server).

## Setup

### Enabling the WebSocket Server

Install the preset script with the `swoole_websocket` tag, then start it with
the `swoole:websocket` name:

```bash
composer require windwalker/reactor

php windwalker pkg:install windwalker/reactor --tag swoole_websocket

php windwalker server:start swoole:websocket --port=9501
```

The tag copies `servers/swoole_websocket.php`, registers the name `websocket`
under the `swoole` engine, and generates `App\Web\WsApplication` in the `Web`
folder of your source directory. The generated class is the application that
your handlers run in.

::: warning
`--force` on `pkg:install` overwrites the copied script and the generated
`WsApplication`. Back up your changes first.
:::

### Configuration

The script loads `etc/app/websocket.config.php`. It needs the router and the
WebSocket routing middleware:

```php
<?php

declare(strict_types=1);

use Windwalker\Core\Provider\RouterProvider;
use Windwalker\WebSocket\Middleware\WebSocketRoutingMiddleware;

return [
    'routing' => [
        'routes' => [
            __DIR__ . '/../../routes/websocket.route.php',
        ],
        'providers' => [
            RouterProvider::class,
        ],
    ],

    'middlewares' => [
        WebSocketRoutingMiddleware::class,
    ],
];
```

The `routing.routes` entry points to the route file. Group the message routes
in one route file per feature, and list each file there. The `middlewares`
list is covered in [Middlewares](#middlewares).

### Customizing the Main File

The installed script is plain PHP. Add your settings and listeners in its
custom sections, before the call to `listen()`:

```php
// servers/swoole_websocket.php

$server->onStart(function (StartEvent $event) {
    // Your start logic.
});
```

A listener attached after `listen()` is never registered with Swoole, so keep
every `on...()` call above the `listen()` call. See
[Reactor Servers](/documentation/components/reactor/servers) for the Swoole
settings and events.

::: tip
Keep the Windwalker boot code at the top of the script. Edit only the
sections marked as custom.
:::

### Customizing WsRootApplication

The generated `App\Web\WsApplication` extends `WsRootApplication`. Override its
hooks to add your own logic. Each hook runs at one fixed point of the server
lifecycle:

- `init()`: runs once when the server initializes, before `listen()`.
- `started()`: runs when the server starts.
- `opening()`: runs on every new connection, before the `OPEN` routes.
- `closing()`: runs when a connection closes, before the `CLOSE` routes.
- `booting()`: receives the container during application boot.

```php
namespace App\Web;

use Windwalker\Reactor\WebSocket\WebSocketRequestInterface;
use Windwalker\WebSocket\Application\WsRootApplication;

class WsApplication extends WsRootApplication
{
    protected function init(): void
    {
        // Runs once at startup.
    }

    protected function opening(WebSocketRequestInterface $request): void
    {
        // Runs for every new connection.
    }
}
```

::: warning
`opening()` and the `OPEN` routes run after the connection is open. Check the
authorization there, before the client can send any message.
:::

## Complete Example: A Chat Room

This example uses the parts a WebSocket application needs: the configuration
from above, a route file, the handlers, and a client. The client connects to
`/chat/{room}`, sends messages named `chat.send`, and receives messages named
`chat.message`.

A client can join a room in two ways. The first sends a message to a fixed
route, and the room name comes from a message field or a handshake header. The
second puts the room in the connection path, as the `OPEN` route below does.
The handler joins the room while the connection opens, so the client needs no
extra message to join.

The route file declares one `OPEN` handler and one message handler:

```php
<?php

// routes/websocket.route.php

declare(strict_types=1);

use Windwalker\Reactor\Swoole\Room\RoomMapping;
use Windwalker\WebSocket\Application\WsAppContext;
use Windwalker\WebSocket\Application\WsAppRequest;
use Windwalker\WebSocket\Router\WsRouterCreator;

/** @var WsRouterCreator $router */

$router->open('/chat/{room}')
    ->controller(
        function (WsAppContext $app, RoomMapping $rooms, string $room) {
            $rooms->joinRoom($room, $app->getFd());
        }
    );

$router->message('chat.send')
    ->controller(
        function (
            WsAppContext $app,
            WsAppRequest $request,
            RoomMapping $rooms,
        ) {
            $room = (string) $request->input('room');
            $text = trim((string) $request->input('text'));

            $fdRooms = $rooms->getFdRooms($app->getFd());

            // Only members of the room may post to it.
            if (!in_array($room, $fdRooms, true)) {
                return;
            }

            $app->pushTo(
                $rooms->getRoomFds($room),
                'chat.message',
                ['room' => $room, 'text' => $text],
            );
        }
    );
```

A browser client connects with the standard `WebSocket` API:

```js
const ws = new WebSocket('ws://localhost:9501/chat/lobby');

ws.onopen = () => {
    ws.send(JSON.stringify([
        'chat.send',
        { room: 'lobby', text: 'Hello' },
    ]));
};

ws.onmessage = (event) => {
    const [name, payload] = JSON.parse(event.data);

    console.log(name, payload.text);
};
```

::: info
The `OPEN` handler joins the room, but the route does not check who the client
is. Add your own check before `joinRoom()` for a private room.
:::

## Connections

### Events and Objects

The script attaches four events. Each event exposes these objects:

- `StartEvent`: the server has started.
  - `$event->swooleServer` is the native `Swoole\Server`.
  - `$event->server` is the Reactor server wrapper.
- `OpenEvent`: a client has connected.
  - `$event->request` is the `WebSocketRequest` of the handshake.
  - `$event->swooleRequest` is the native Swoole request.
- `MessageEvent`: a client sent a frame.
  - `$event->fd` is the sender's connection ID.
  - `$event->data` is the payload string.
  - `$event->frame` is the `WebSocketFrameInterface`.
- `CloseEvent`: a connection closed.
  - `$event->fd` is the connection ID that closed.
  - `$event->createWebSocketFrame()` creates a frame for that `fd`.

### Contexts and Requests

Every event runs in its own application context. The `WsAppContext` is the
handler's service container, and the `WsAppRequest` is the request it handles.
`open`, `message`, and `close` each create a new pair, so a handler never sees
the data of another event:

- `WsAppContext` provides `getFd()`, `getData()`, `pushSelf()`, `pushTo()`,
  and the services of the request container.
- `WsAppRequest` provides `getFd()`, `getData()`, `input()`, and
  `getUrlVars()`. It wraps the `WebSocketRequestInterface`.

The web application returns a response to the browser. A WebSocket application
does not. The script ignores the value returned by `runContextByRequest()`, so
reply with `pushSelf()`:

```php
$router->message('chat.ping')
    ->controller(function (WsAppContext $app) {
        $app->pushSelf('chat.pong', ['at' => time()]);
    });
```

### Remembered Requests

The request of each open connection is stored in a memory table, so a later
`MESSAGE` or `CLOSE` event can read the handshake data. The table holds a
request up to `reactor.websocket.request_registry.length`, which defaults to
`2048` bytes:

```text
// ERROR: Too large request
```

A handshake with many cookies or long headers can exceed this limit, and
storing the request then throws. Measure a typical handshake, then raise
`request_registry.length` in the config file if yours is larger. The value must
hold the JSON of its URI, attributes, and headers.

The table needs one row per open connection. If
`reactor.websocket.request_registry.size` is not set, its size follows the
`--max-requests` startup option, which defaults to `500`. Set the size
explicitly when you expect more connections.

The bundled script stores the request in its `onOpen` listener, right after the
handshake, before your `open` handler runs. A connection is therefore remembered
without any code of yours, and a later message can read it. Call
`rememberRequest()` again only to replace the stored copy with one that has more
data, such as a `user_id` attribute after verification. Each call overwrites the
entry for that `fd`. The `onClose` listener removes the entry. The methods are
public, so you can also manage the entries yourself:

```php
$app->rememberRequest($request);            // Store, keyed by fd.
$request = $app->getRememberedRequest($fd); // Read.
$app->forgetRequest($fd);                   // Remove.
```

::: warning
`forgetRequest()` does not close the connection. A later message on that
connection fails, because its request is no longer stored:

```text
// ERROR: Request of: 5 not found.
```

Call `forgetRequest()` only when you also close the connection.
:::

### Rooms and User Mappings

Two shared memory tables track connections. The WebSocket provider creates them,
and every worker reads the same data:

- `RoomMapping` groups `fd` values into named rooms.
- `UserFdMapping` maps a user ID to its `fd` values, so one user can have
  several connections.

Inject them into a handler, or retrieve them from the application:

```php
use Windwalker\Reactor\Swoole\Room\RoomMapping;
use Windwalker\Reactor\Swoole\Room\UserFdMapping;

$router->message('user.login')
    ->controller(function (
        WsAppContext $app,
        UserFdMapping $users,
        RoomMapping $rooms,
        WsAppRequest $request,
    ) {
        $users->addUserFd($request->input('userId'), $app->getFd());
        $rooms->joinRoom('lobby', $app->getFd());
    });
```

`RoomMapping` provides `joinRoom()`, `leaveRoom()`, `getRoomFds()`,
`getFdRooms()`, and `clearRoom()`. `UserFdMapping` provides `addUserFd()`,
`getUserFds()`, `removeUserFd()`, and `removeUser()`.

When a connection closes, the application removes its `fd` from every room and
from every user mapping. Your code does not need to clean up.

Both tables are fixed in size, and Swoole rounds `size` to a power of two. Set
the limits in `etc/app/websocket.config.php` with
`reactor.websocket.user_mapping.size` and
`reactor.websocket.user_mapping.length`. The room mapping uses the same
settings. Plan the values as follows:

- `size` counts rows. Each mapping keeps one table from users or rooms to
  connections, and one back. Use the larger of the expected peaks, round up
  to a power of two, and leave headroom. The usable rows are slightly fewer
  than `size`.
- `length` holds the JSON list of connection IDs in one row. Each ID takes
  about `digits + 3` bytes. The default `32768` fits roughly 4,000 five-digit
  IDs in one room.

## Routing

### Routes

WebSocket routes use `WsRouterCreator`, which has three entry points:

- `open($pattern)`: matches the path of the connection, such as
  `/chat/{room}`. Variables in the pattern are passed to the handler.
- `message($name)`: matches the message name that the parser reads from the
  frame. The name `chat.send` matches `/chat.send`.
- `close($pattern)`: matches the path of a closing connection.

Attach the handler with `controller()`. Handlers receive the context and the
URL variables by name, and they can type-hint services from the container:

```php
$router->open('/presence/{room}')
    ->controller(function (WsAppContext $app, string $room) {
        // Variables from the pattern are passed by name.
    });

$router->message('user.typing')
    ->controller(function (WsAppContext $app, WsAppRequest $request) {
        // Read the parsed message with $request->input().
    });
```

::: tip
The closures in this section keep the examples short. In a project, move each
handler into a controller, as shown in [Controllers](#controllers).
:::

The message route receives the payload as parsed data. Read it with `input()`,
which accepts a field name:

```php
$room = $request->input('room');
$text = $request->input('text');
```

::: info
A message whose name has no route throws `RouteNotFoundException`. The script
passes it to `CliServerRuntime::handleThrowable()`, which writes it to the
console.
:::

### Controllers

Attach a controller method with the standard `controller(Class, 'method')`
form. URL variables reach the method through parameters with the same names,
and services are injected by type:

```php
// routes/websocket.route.php

$router->open('/chat/{room}')
    ->controller(ChatController::class, 'open');

$router->message('chat.send')
    ->controller(ChatController::class, 'send');
```

```php
// App\Module\WebSocket\ChatController

namespace App\Module\WebSocket;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\Request\Input;
use Windwalker\Reactor\Swoole\Room\RoomMapping;
use Windwalker\WebSocket\Application\WsAppContext;

#[Controller]
class ChatController
{
    public function open(
        WsAppContext $app,
        RoomMapping $rooms,
        string $room,
    ): void {
        $rooms->joinRoom($room, $app->getFd());
    }

    public function send(
        WsAppContext $app,
        RoomMapping $rooms,
        #[Input] string $room,
        #[Input] string $text,
    ): void {
        if (!in_array($room, $rooms->getFdRooms($app->getFd()), true)) {
            return;
        }

        $app->pushTo(
            $rooms->getRoomFds($room),
            'chat.message',
            ['room' => $room, 'text' => $text],
        );
    }
}
```

Parameter attributes from
[Request & Input](/documentation/framework/core-concepts/http-routing/request-and-input)
work in WebSocket handlers, with these sources:

- `#[Input]` reads the parsed message payload.
- `#[QueryParam]` reads the query string of the connection URL.
- `#[RouteParam]` or `#[UrlVar]` reads the URL variables.
- `#[Header('Name')]` reads a header of the stored handshake request.

`#[BodyValue]` does not work. It accepts only an HTTP `AppRequest`:

```text
// ERROR: BodyValue attribute can only be used with
//   Windwalker\Core\Http\AppRequest,
//   Windwalker\WebSocket\Application\WsAppRequest given.
```

### Middlewares

Global middlewares run for every event, which means `open`, `message`, and
`close`. Declare them under `middlewares` in `etc/app/websocket.config.php`.
Their order matters:

```php
// etc/app/websocket.config.php

'middlewares' => [
    \App\Middleware\DialSimulatorMiddleware::class,
    \Windwalker\WebSocket\Middleware\WebSocketRoutingMiddleware::class,
    \App\Middleware\WsEventUserMiddleware::class,
],
```

- Put a middleware that changes the parser before the routing middleware.
- The routing middleware matches the route and parses the message. Put
  middlewares that need the parsed request after it.

::: tip
Every event runs the global middlewares. A middleware that queries the
database runs that query on every message, so keep it light.
:::

Route and group middlewares work on WebSocket routes too. Attach one with
`->middleware()` on a route or a group, as in the HTTP routing. For the full
syntax, including arguments, closures, and factories, see
[Middleware](/documentation/framework/core-concepts/http-routing/middleware).

## Messages

### Message Format

The default parser is `SimpleMessageParser`. It reads and writes a JSON array
with two items: the message name, and the payload:

```json
["chat.send", {"room": "lobby", "text": "Hello"}]
```

The payload is the parsed data of `WsAppRequest`. The name is the route target.
Invalid JSON throws a `JsonException` before any route runs.

#### SimpleMessageParser

`SimpleMessageParser`, the default, carries one payload: `["name", payload]`.
The route target is the name. Read the payload with `input()`:

```php
// ["chat.send", {"room": "lobby", "text": "Hello"}]

$room = $request->input('room');
$payload = $request->input(); // Collection of the whole payload
```

Push a message with the name and the payload:

```php
$app->pushTo($fd, 'chat.message', ['text' => 'Hi']);
// ["chat.message",{"text":"Hi"}]
```

::: warning
Validate every field that you read with `input()`. A client can send any
payload, including a missing field or a value of the wrong type.
:::

#### ChainingArgumentsParer

`ChainingArgumentsParer` carries positional arguments: `["name", arg1, arg2]`.
The parsed data is the argument list, so named fields do not apply. Read the
arguments by index with `input()`:

```php
// ["chat.send", "lobby", "Hello"]

$room = $request->input(0);         // "lobby"
$text = $request->input(1);         // "Hello"
$both = $request->input(0, 1);      // Collection ["lobby", "Hello"]
$args = $request->input();          // Collection of all arguments
```

Push with the same positional form:

```php
$app->pushTo($fd, 'chat.message', 'lobby', 'Hello');
// ["chat.message","lobby","Hello"]
```

#### SocketIoParser

`SocketIoParser` accepts Engine.IO v4 and Socket.IO v5 text frames. An event
packet such as `42["chat.send", "lobby", "Hello"]` routes by its event name,
and its parsed data is the argument list, as with `ChainingArgumentsParer`.
Other packets route as `socket.io:<type>` or `engine.io:<type>`, and their
parsed data is the whole packet. The full packet is always available in the
`socketio` attribute, which holds the namespace and the acknowledgement ID.
Read the event arguments by index, as with `ChainingArgumentsParer`:

```php
// 42["chat.send", "lobby", "Hello"]

$room = $request->input(0);         // "lobby"
$text = $request->input(1);         // "Hello"
$both = $request->input(0, 1);      // Collection ["lobby", "Hello"]
$args = $request->input();          // Collection of all arguments
```

```php
$packet = $request->getAttribute('socketio');

$namespace = $packet['namespace'];
$ackId = $packet['id'];
```

Outgoing events need the Socket.IO prefix. `pushTo()` builds it through the
parser's `format()`, so use `pushTo()` for events:

```php
$app->pushTo($fd, 'chat.message', 'Hi');
// 42["chat.message","Hi"]

$app->pushTo(
    $fd,
    name: 'chat.message',
    args: ['Hi'],
    namespace: '/chat',
);
// 42/chat,["chat.message","Hi"]
```

Build a frame directly with the parser's `format()` when you need the raw
packet. It accepts positional arguments, or named ones for the full packet:

```php
$parser = $app->getParser();

$parser->format('hi', 1);
// 42["hi",1]

$parser->format(
    name: 'hi',
    args: [1],
    namespace: '/chat',
    id: 5,
);
// 42/chat,5["hi",1]

$parser->format(
    type: SocketIoParser::ACK,
    id: 1,
    args: ['ok'],
);
// 431["ok"]

$parser->format(engine: SocketIoParser::ENGINE_PONG);
// 3
```

Reply to an acknowledgement with the ID from the attribute. `pushRawTo()` sends
the string as it is, without the prefix:

```php
$app->pushTo(
    $fd,
    type: SocketIoParser::ACK,
    id: $ackId,
    args: ['ok'],
);
// 431["ok"]
```

::: warning
The parser does not run the handshake or the heartbeat. A Socket.IO client
does not connect until the server sends the open and connect packets. Send
them in the `opening()` hook, and send `2` pings on a timer. Use
`transports: ['websocket']` in the client, because the parser handles no
HTTP long-polling.
:::

#### Choosing a parser

- Use `SimpleMessageParser` when messages are named objects.
- Use `ChainingArgumentsParer` when a client sends positional arguments.
- Use `SocketIoParser` when the client is a Socket.IO client.

::: tip
There is no `MessageBuilderInterface` in the framework, and none is needed.
The parser already formats outgoing messages in `format()`, and `pushTo()`
calls it. A separate builder would repeat that logic. Put a custom format in
the parser, and use `pushRawTo()` only for a string that already has its wire
format.
:::

### Custom Message Parsers

Replace the parser when a protocol uses a different format. Choose the scope
that fits: the config, the application, or a single event in a middleware. The
parser is resolved from the `WebSocketParserInterface` contract. The `parse()`
method reads the raw data, and `handleRequest()` sets the route target and the
payload:

```php
namespace App\Api\Dial;

use Windwalker\Reactor\WebSocket\WebSocketRequestInterface;
use Windwalker\WebSocket\Parser\WebSocketParserInterface;

class DialSimulatorParser implements WebSocketParserInterface
{
    public function parse(string $data): mixed
    {
        return explode(',', $data) + ['', ''];
    }

    public function format(...$args): string
    {
        return implode(',', $args);
    }

    public function handleRequest(
        WebSocketRequestInterface $request,
    ): WebSocketRequestInterface {
        [$task, $payload] = $this->parse($request->getData());

        return $request->withRequestTarget(
            'simulator/' . strtolower($task)
        )->withParsedData($payload);
    }
}
```

#### Bind per event in a middleware

A middleware binds the parser for the events it needs:

```php
public function process(
    ServerRequestInterface $request,
    RequestHandlerInterface $handler,
): ResponseInterface {
    $path = ltrim($request->getUri()->getPath(), '/');

    if (str_starts_with($path, 'dialing')) {
        $this->app->getContainer()->bind(
            WebSocketParserInterface::class,
            DialSimulatorParser::class,
        );
    }

    return $handler->handle($request);
}
```

The binding lives in the container of the current event, so other events keep
the default parser. The check reads the connection path, not the message path,
because a message request carries the URI of its connection. The middleware can
choose the parser by path or by route, so each route can use its own parsing
strategy.

#### Bind globally in the config

Put the binding in the `di` section of `etc/app/websocket.config.php`. Every
event uses the parser:

```php
// etc/app/websocket.config.php

return [
    // ...

    'di' => [
        'bindings' => [
            WebSocketParserInterface::class => DialSimulatorParser::class,
        ],
    ],
];
```

#### Bind globally in the application

Override `boot()` in `App\Web\WsApplication`. Bind the parser on the root
container after the parent boot. Every event context is created from that
container, so every event uses the parser:

```php
// App\Web\WsApplication

public function boot(): void
{
    parent::boot();

    $this->getContainer()->bindShared(
        WebSocketParserInterface::class,
        DialSimulatorParser::class,
    );
}
```

::: tip
Use this method when the parser depends on a runtime value. Otherwise, the
config is simpler. A middleware binding still overrides either one for the
events it handles.
:::

### Pushing Messages

Use `pushSelf()` to reply to the sender and `pushTo()` to reach other
connections. `pushTo()` formats the arguments with the parser, and it accepts
one `fd` or an array of them:

```php
$app->pushTo(5, 'chat.message', ['text' => 'Hi']);
$app->pushTo([5, 9, 12], 'chat.message', ['text' => 'Hi']);
```

`pushRawTo()` sends a string without the parser. Use it for data that already
has the wire format:

```php
$app->pushRawTo(5, '["chat.message",{"text":"Hi"}]');
```

The methods return `true` when every send succeeds. A connection that has
closed returns `false`, so check the result when delivery matters.

### Publishing from Redis

Processes that serve HTTP or run console jobs cannot reach a connection,
because a `fd` exists only in the WebSocket server. They publish to Redis, and
the server subscribes to the channels and pushes to the matching room. A model
or service can publish after it saves data:

```php
// Publisher, in any process that has a Redis connection

$redis->publish(
    'dial:event:' . $eventId,
    json_encode($data, JSON_THROW_ON_ERROR),
);
```

The server subscribes in `started()`, and it pushes each message to the room:

```php
// App\Web\WsApplication

protected function started(): void
{
    $rooms = $this->service(RoomMapping::class);

    \Windwalker\go(function () use ($rooms) {
        $redis = new \Redis();
        // Read the host and port from your config.
        $redis->connect('127.0.0.1', 6379);
        $redis->setOption(\Redis::OPT_READ_TIMEOUT, -1);

        $redis->psubscribe(
            ['dial:*'],
            function (
                \Redis $redis,
                string $pattern,
                string $key,
                string $msg,
            ) use ($rooms) {
                $data = json_decode($msg, true, 512, JSON_THROW_ON_ERROR);

                $fds = $rooms->getRoomFds('event:' . $data['eventId']);

                foreach ($fds as $fd) {
                    $this->pushTo($fd, 'dial/update', $data);
                }
            }
        );
    });
}
```

`started()` runs in the master process, because Swoole calls `onStart` there.
`go()` starts the subscription in a coroutine, so `started()` returns at once.

::: info
The subscription runs in the master process whatever the worker count, so one
worker or many use the same hook. With `SWOOLE_PROCESS`, the default mode of the
Reactor factory, the master also owns the client connections, so `pushTo()`
reaches them in either case.
:::

::: warning
`psubscribe()` blocks until the connection closes. It must run inside a
coroutine with Swoole's I/O hooks enabled. Without the hooks, it blocks the
whole event loop.
:::

::: tip
Check `class_exists(\Redis::class)` before you publish when Redis is optional.
Catch and log errors inside the callback, so that a failed message is visible.
:::

## Authentication

### Authenticating Connections

Authentication can run at two points. The `opening()` hook reads the handshake
cookies, because the connection request is available there. A message route
can also verify a token that the client sends. Either way, store the result on
the remembered request, so later messages can read it.

```php
// App\Web\WsApplication

protected function opening(WebSocketRequestInterface $request): void
{
    $sessionId = $request->getCookieParams()['SESSID'] ?? '';

    $request = $request->withAttribute('session_id', $sessionId);

    $this->rememberRequest($request);
}
```

A message route verifies the token, maps the connection to the user, and
rejects the client on failure:

```php
$router->message('auth/token')
    ->controller(function (
        WsAppContext $app,
        TokenService $tokens,
        UserFdMapping $users,
    ) {
        $request = $app->getAppRequest()->getServerRequest();

        try {
            // Your token check. It throws when the token is invalid.
            $userId = $tokens->verify((string) $app->input('token'));
        } catch (\Throwable $e) {
            $app->pushSelf('error', $e->getMessage());

            $app->service(SwooleWebsocketServer::class)
                ->getSwooleServer()
                ->disconnect($app->getFd());

            return;
        }

        $users->addUserFd('user:' . $userId, $app->getFd());

        $app->rememberRequest(
            $request->withAttribute('user_id', $userId)
        );

        $app->pushSelf('authed');
    });
```

Read the stored value in later messages:

```php
$userId = $app->getAppRequest()
    ->getServerRequest()
    ->getAttribute('user_id');
```

::: tip
Prefix the keys in `UserFdMapping` and `RoomMapping`, such as `user:`,
`interviewer:`, or `event:`. One table can then hold several kinds of
identifiers without collisions.
:::

### Validating in Middleware

Checking each handler separately is easy to miss. A global middleware can
check every message in one place. Place it after `WebSocketRoutingMiddleware`,
so the request target already holds the parsed message name:

```php
// etc/app/websocket.config.php

'middlewares' => [
    \Windwalker\WebSocket\Middleware\WebSocketRoutingMiddleware::class,
    \App\Middleware\WsAuthMiddleware::class,
],
```

```php
// App\Middleware\WsAuthMiddleware

namespace App\Middleware;

use Windwalker\Core\Security\Exception\UnauthorizedException;

class WsAuthMiddleware implements MiddlewareInterface
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ): ResponseInterface {
        if (
            $request->getMethod() === 'MESSAGE'
            && !$request->getAttribute('user_id')
            && $request->getRequestTarget() !== 'auth.token'
        ) {
            throw new UnauthorizedException('Login required.', 401);
        }

        return $handler->handle($request);
    }
}
```

`OPEN` and `CLOSE` events also need an entry point. Route them to controller
methods, so the connection itself is validated. The `open` method reads the
token from the connection URL with `#[QueryParam]`:

```php
$router->open('/chat/{room}')
    ->controller(ChatController::class, 'open');

$router->close('/chat/{room}')
    ->controller(ChatController::class, 'close');
```

Keep the `OPEN` check in the handler, not in the middleware. `OPEN` is the first
event that establishes identity, so no `user_id` exists yet. A middleware that
requires one would reject every new connection. The `open` method verifies the
token, then stores the identity, and this separate step is expected. `CLOSE`
can use the middleware, because the identity is already stored. The cleanup in
`closeConnection()` runs in a `finally` block, so rooms and mappings are
released even when a check throws.

```php
public function open(
    WsAppContext $app,
    TokenService $tokens,
    string $room,
    #[QueryParam] string $token = '',
): void {
    try {
        $userId = $tokens->verify($token);
    } catch (\Throwable) {
        $app->pushSelf('error', 'Invalid token.');

        $app->service(SwooleWebsocketServer::class)
            ->getSwooleServer()
            ->disconnect($app->getFd());

        return;
    }

    $app->rememberRequest(
        $app->getAppRequest()
            ->getServerRequest()
            ->withAttribute('user_id', $userId),
    );
}
```

## Security

A `fd` identifies a connection, not a user. Store user identity in
`UserFdMapping`, and check it before a handler changes any room or sends data
to another connection.

Messages come from any client that can reach the port. Check the origin and
the authorization in the `OPEN` route or the `opening()` hook, before the
client sends its first message.

## Related

- [Server Basics](./server-basics)
- [Swoole Web Server](./swoole-web-server)
- [Reactor Servers](/documentation/components/reactor/servers)
- [Reactor WebSocket](/documentation/components/reactor/websocket)
- [Reactor Memory Tables](/documentation/components/reactor/memory-tables)
