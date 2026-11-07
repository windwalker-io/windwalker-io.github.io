---
layout: doc
title: Memory Tables
component: reactor
---

# Memory Tables

Worker processes do not share variables. Memory tables are a fixed-schema
table in shared memory that every worker process can read and write. The
room and user mappings are built on them, so memory tables are the
foundation for shared state in Reactor.

`MemoryTableFactory` creates tables. With the `swoole` extension loaded,
it returns a `SwooleTable` backed by `Swoole\Table`. Without it, it
returns an `ArrayTable`, which lives in one process only and is not
shared.

## Choosing a Structure

Each structure solves a different problem. The table shows where each
one usually fits:

| Structure    | Typical use                                              | Main advantage                                  |
|--------------|----------------------------------------------------------|-------------------------------------------------|
| `SwooleTable`| Shared counters, rate limits, feature flags, presence    | Every worker reads and writes the same rows.    |
| `ArrayTable` | Tests and single-process development                     | Works without the `swoole` extension.           |
| `DuoMapping` | Two-way relations, such as groups and members            | One call finds the relation from either side.   |
| `UserFdMapping` | Pushing to every open tab or device of one user       | Finds all connections of a user directly.       |
| `RoomMapping`| Chat rooms, live dashboards, multiplayer lobbies         | Finds all connections in a room directly.       |

The main advantage of all of them is that the data stays in shared
memory on the same machine. A worker reads it without a network round
trip to an external store, and without serializing rows. The trade-offs
are real: the size is fixed when the table is created, the data is
local to one machine, and it is lost when the server restarts. For large
data or data that must survive restarts, use a database or a cache
server instead.

## Using a Table

A table has a fixed schema. Define the columns, then call `create()`
before the server starts. Columns cannot be added after the table is
created:

```php
use Windwalker\Reactor\Memory\MemoryTableInterface;
use Windwalker\Reactor\Memory\SwooleTable;

$table = new SwooleTable(1024);

$table->column(
    'name',
    MemoryTableInterface::TYPE_STRING,
    64,
);
$table->column('score', MemoryTableInterface::TYPE_INT);

$table->create();

$table->set('user:1', ['name' => 'Alice', 'score' => 10]);

$name = $table->get('user:1', 'name'); // 'Alice'
```

The column types are `TYPE_INT`, `TYPE_FLOAT`, and `TYPE_STRING`. The
size argument applies only to strings.

### Why Use a Shared Table

- **Shared by all workers.** A write in one worker is visible to every
  other worker on the same machine.
- **No serialization.** Rows are stored as typed columns in shared
  memory, so reads do not decode strings or objects.
- **No network hop.** A lookup does not travel to Redis, Memcached, or a
  database, which keeps the latency low for hot data.
- **Predictable memory.** The size is set when the table is created, so
  the memory use is known before the server starts.

## Pitfalls

::: warning
- **Create the table before the server starts.** A table created later
  is not visible to the worker processes.
:::

::: warning
- **Strings are fixed-size.** Set a size large enough for the longest
  value. Longer values are truncated.
:::

::: warning
- **The fallback is not shared.** `ArrayTable` works in tests and in
  single-process code, but workers do not see each other's writes.
:::

## Two-way Mappings

`DuoMapping` stores a relation in both directions between two keys, A and
B. It keeps one table per direction and creates both tables when it is
constructed. Each key's list of linked values is stored as JSON in one
string column. The `$mapSize` argument sets that column's size, so the
number of links per key is limited by it. The default is `32768` bytes.

**Why use it:**

- A lookup works from either side with the same method family, such as
  `getBListOfA()` and `getAListOfB()`.
- Adding or removing a link updates both directions in one call, so the
  two sides cannot drift apart.

## User Mappings

`UserFdMapping` links user IDs to connection IDs. It is built on a
`DuoMapping`, and it lets you find every connection of a user:

```php
use Windwalker\Reactor\Memory\MemoryTableFactory;

$factory = new MemoryTableFactory();
$users = $factory->createUserFdMapping();

$users->addUserFd('user-1', $fd);

$fds = $users->getUserFds('user-1');
```

A user can have several connections, such as several browser tabs.
Call `removeFd()` when a connection closes, so the mapping does not keep
a dead connection.

**Why use it:**

- It finds every connection of a user directly, without scanning all
  connections.
- A user can have several connections, such as multiple browser tabs or
  devices, and each one is tracked separately.
- Cleanup is one call. `removeFd()` removes a closed connection from
  every user.

## Room Mappings

`RoomMapping` groups connections into named rooms. It is built on a
`DuoMapping` and a `UserFdMapping`. Create the mappings once, during
bootstrap, and reuse them in listeners:

```php
use Windwalker\Reactor\Memory\MemoryTableFactory;
use Windwalker\Reactor\Swoole\Event\CloseEvent;
use Windwalker\Reactor\Swoole\Event\MessageEvent;
use Windwalker\Reactor\Swoole\Event\OpenEvent;
use Windwalker\Reactor\Swoole\SwooleWebsocketServer;

$factory = new MemoryTableFactory();
$users = $factory->createUserFdMapping();
$rooms = $factory->createRoomMapping($users);

$server = new SwooleWebsocketServer();

$server->onOpen(function (OpenEvent $event) use ($rooms) {
    $rooms->joinRoom('lobby', $event->swooleRequest->fd);
});

$server->onMessage(function (MessageEvent $event) use ($server, $rooms) {
    foreach ($rooms->getRoomFds('lobby') as $fd) {
        $server->getMessageEmitter()->emit(
            $fd,
            $event->frame->getData(),
        );
    }
});

$server->onClose(function (CloseEvent $event) use ($rooms) {
    $rooms->leaveAllRooms($event->fd);
});

$server->listen('0.0.0.0', 9501);
```

Use `getFdRooms()` to list the rooms of one connection, and
`clearRoom()` to remove every connection from a room.

**Why use it:**

- Any worker can read the member list of a room. A broadcast therefore
  reaches every member, even when the members are connected to
  different workers.
- Joining and leaving a room are one call each, and the membership is
  shared, so every worker sees the same state.

Mappings live in memory. They are lost when the server restarts, and theyare not written to disk. Rebuild them from your own data on startup if
they must survive a restart.
