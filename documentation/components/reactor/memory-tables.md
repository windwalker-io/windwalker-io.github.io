---
layout: doc
title: Memory Tables
component: reactor
---

# Memory Tables

Worker processes do not share variables. Reactor provides memory tables that workers can read and write, and it builds
user and room mappings on top of them.

`MemoryTableFactory` creates tables. When the `swoole` extension is loaded, it returns a `SwooleTable` backed by
`Swoole\Table`. Otherwise it returns an `ArrayTable`, which is local to one process.

## Using a Table

Define the columns, then call `create()` before the server starts. Columns cannot be added after the table is
created.

```php
use Windwalker\Reactor\Memory\MemoryTableInterface;
use Windwalker\Reactor\Memory\SwooleTable;

$table = new SwooleTable(1024);
$table->column('name', MemoryTableInterface::TYPE_STRING, 64);
$table->column('score', MemoryTableInterface::TYPE_INT);
$table->create();

$table->set('user:1', ['name' => 'Alice', 'score' => 10]);

$name = $table->get('user:1', 'name'); // 'Alice'
```

Column types are `TYPE_INT`, `TYPE_FLOAT`, and `TYPE_STRING`. The size argument applies only to strings. Use `delete()`,
`exists()`, and `count()` for row management.

## Two-way Mappings

`DuoMapping` stores a relation in both directions between two keys, A and B. Each side is backed by its own table, and
the tables are created automatically when the mapping is constructed. The `$mapSize` argument sets the maximum length
of the stored list for each key, with a default of `32768`.

Use `addMap()` and `removeMap()` to link and unlink keys. Use `removeA()` or `removeB()` to remove all links for one key.

## User Mappings

`UserFdMapping` links user IDs to connection IDs (file descriptors). It is built on a `DuoMapping`:

```php
use Windwalker\Reactor\Memory\MemoryTableFactory;

$factory = new MemoryTableFactory();
$userFdMapping = $factory->createUserFdMapping();

$userFdMapping->addUserFd('user-1', $fd);
$fds = $userFdMapping->getUserFds('user-1');
```

Call `removeFd()` when a connection closes to remove it from every user.

## Room Mappings

`RoomMapping` groups connections into named rooms. It is built on a `DuoMapping` and a `UserFdMapping`, and it can
find the rooms of a connection as well as the connections in a room.

Create the mappings during bootstrap, before `listen()`, and reuse them in listeners:

```php
use Windwalker\Reactor\Memory\MemoryTableFactory;
use Windwalker\Reactor\Swoole\Event\CloseEvent;
use Windwalker\Reactor\Swoole\Event\MessageEvent;
use Windwalker\Reactor\Swoole\Event\OpenEvent;
use Windwalker\Reactor\Swoole\SwooleWebsocketServer;

$factory = new MemoryTableFactory();
$userFdMapping = $factory->createUserFdMapping();
$roomMapping = $factory->createRoomMapping($userFdMapping);

$server = new SwooleWebsocketServer();

$server->onOpen(function (OpenEvent $event) use ($roomMapping) {
    $roomMapping->joinRoom('lobby', $event->swooleRequest->fd);
});

$server->onMessage(function (MessageEvent $event) use ($server, $roomMapping) {
    foreach ($roomMapping->getRoomFds('lobby') as $fd) {
        $server->getMessageEmitter()->emit($fd, $event->frame->getData());
    }
});

$server->onClose(function (CloseEvent $event) use ($roomMapping) {
    $roomMapping->leaveAllRooms($event->fd);
});

$server->listen('0.0.0.0', 9501);
```

Use `clearRoom()` to remove every connection from a room, and `getFdRooms()` to list the rooms of one connection.
