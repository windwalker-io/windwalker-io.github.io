---
layout: doc
title: Introduction
part: Components
component: pool
---

# Introduction

Windwalker Pool is a small, protocol-neutral connection pool. It keeps a set
of reusable connection objects, lends them to callers, and takes them back
when the caller is done. Opening a database or network connection is slow and
uses server resources, so a pool lets many short operations share a few open
connections instead of opening one for each.

The package does not know about any protocol. Your connection class talks to
the server, and the pool decides when to create, reuse, and retire it.

## Installation

```bash
composer require windwalker/pool ^4.0
```

Windwalker Pool 4.x requires PHP 8.4.6 or later. The `SwooleStack` needs the
Swoole extension. The other stacks do not.

## Main Parts

- `ConnectionPool`: the pool you create and use. It extends `AbstractPool`,
  which implements the borrowing and returning logic.
- `ConnectionInterface` and `AbstractConnection`: the connection contract.
  You extend `AbstractConnection` and implement the protocol methods.
- `PoolOptions`: sizes, timeouts, lifetime, and health-check settings.
- Stacks (`SingleStack`, `PhpStack`, `SwooleStack`): the storage where idle
  connections wait for the next caller.

## Use as Standalone Component

```php
use Windwalker\Pool\ConnectionPool;
use Windwalker\Pool\PoolOptions;
use Windwalker\Pool\Stack\PhpStack;

$pool = new ConnectionPool(
    new PoolOptions(maxSize: 4, minSize: 1),
    new PhpStack(),
);

$pool->setConnectionBuilder(
    fn () => new PdoConnection($dsn, $user, $password)
);

$pool->init();

$conn = $pool->getConnection();

// Use the connection, then return it to the pool.
$conn->release();
```

`PdoConnection` is a connection class you write. The
[Connections](/documentation/components/pool/connections) page shows a
complete implementation.

## Use in Windwalker

The package has no service provider of its own. The Database package creates
a pool for each database connection when the application runs in the Swoole
CLI server with pooling enabled. Your code uses the database driver as usual,
and the pool works behind it.

Get the shared driver from the container, using the name of a connection in
`database.connections`:

```php
$driver = $container->get('database.connection.driver.local');
```

See [Connection Pools](/documentation/components/database/connections) in the
Database documentation for the configuration.

## Core Concepts

A pool owns its connections. Callers borrow one with `getConnection()` and
return it with `release()`. A borrowed connection is not available to other
callers until it is released or dropped.

Every connection is in one of three states:

- `INACTIVE`: idle in the stack and ready to be borrowed.
- `ACTIVE`: borrowed by a caller.
- `ABANDONED`: marked for removal. The next borrow or release drops it.

The pool tracks two counts. `count()` returns the number of idle connections,
and `totalCount()` returns all open connections, including borrowed ones.

## Topic Pages

- [Connection Pool](/documentation/components/pool/connection-pool): sizing,
  borrowing and returning, and closing the pool.
- [Connections](/documentation/components/pool/connections): writing a
  connection class, its states, and leak detection.
- [Health and Lifetime](/documentation/components/pool/health-and-lifetime):
  retiring old connections and checking their health.
- [Swoole Stack](/documentation/components/pool/swoole-stack): waiting for
  connections and running timers in a coroutine server.

## Related components

- [Database](/documentation/components/database/): uses pools for its
  connections in the Swoole CLI server.
