---
layout: doc
title: Bridges
component: session
---

# Bridges

A session has to be loaded when it starts, kept in memory while the request
runs, and written back when it ends. A bridge owns these steps. `Session`
delegates them to the bridge and does not know where the data is stored.

Windwalker ships two bridges. They differ in whether they use PHP's global
session functions:

- `PhpBridge` keeps the data in its own array and reads and writes it through a
  handler. It does not depend on global state.
- `NativeBridge` wraps PHP's `session_*()` functions and `$_SESSION`. It
  follows PHP's own session behavior and its save handler.

The framework's `filesystem` and `database` instances use `PhpBridge`. The
`native` instance uses `NativeBridge`.

## Why PhpBridge

Consider a long-running process, such as a Swoole server, that handles many
requests. Each request needs its own session. `$_SESSION` is a single global
array, so two sessions in one process would overwrite each other. Because
`PhpBridge` holds its data in an object, every request can have its own
session, and the process can serve them all. The examples in this guide use
`PhpBridge`.

## Minimal Setup

Pass the options, a handler, and optionally a serializer to the bridge. Then
pass the bridge to `Session`:

```php
use Windwalker\Session\Bridge\PhpBridge;
use Windwalker\Session\Handler\FilesystemHandler;
use Windwalker\Session\Session;

$bridge = new PhpBridge(
    [],
    new FilesystemHandler('/var/lib/app/sessions'),
);

$session = new Session(['name' => 'APP_SESSID'], $bridge);
```

When no handler is given, `PhpBridge` uses `NativeHandler`, which is PHP's
default save handler.

## Showcase

The following script handles one request end to end. It starts the session,
stores a value, and writes the session at the end:

```php
use Windwalker\Session\Bridge\PhpBridge;
use Windwalker\Session\Handler\FilesystemHandler;
use Windwalker\Session\Session;

$bridge = new PhpBridge(
    [
        'use_strict_mode' => true,
        'lazy_write' => true,
    ],
    new FilesystemHandler('/var/lib/app/sessions'),
);

$session = new Session(['name' => 'APP_SESSID'], $bridge);

$session->set('cart', ['sku-1', 'sku-2']);

// Writes the data and removes it from memory.
$session->stop();
```

## Lifecycle

A session has three stages.

**Start.** The first call to `get()`, `set()`, or `def()` starts the session. The bridge reads the data from the handler and makes it
available as the storage array. You can also call `start()` explicitly.

**Use.** Values are read from and written to the in-memory storage. Nothing is
written to the handler during this stage.

**End.** `stop()` writes the data through the handler and removes it from
memory. The session-level `auto_commit` option, which is `true` by default,
registers the same step to run when the script ends. Set it to `false` if you
want to control the end of the session yourself.

```php
$session = new Session(
    ['name' => 'APP_SESSID', 'auto_commit' => false],
    $bridge,
);
```

::: info
`lazy_write` is disabled unless you set it. When it is enabled and the data
has not changed during the request, only the session timestamp is updated.
This requires a handler that supports timestamp updates, such as the
filesystem, database, and PDO handlers.
:::

## Session IDs

The session ID is read from the cookie when the session starts. If the
request has no ID, the bridge creates a new one.

`use_strict_mode` makes the bridge replace an ID that the handler does not
recognize with a new one. This prevents a client from choosing an arbitrary
ID. The option applies to handlers that support timestamp updates. See
[Security](./security) for details.

## Regenerating and Forking

`regenerate()` changes the ID while keeping the data. Use it when the
privileges of a session change, such as after a login. See
[Security](./security) for the reasons.

`fork()` creates a second session that has a copy of the current data. The
original session remains valid. Forking without an ID creates a new ID for
the copy:

```php
$copy = $session->fork();

$copy->set('mode', 'draft');
```

Pass an ID to `fork()` to choose the new ID. This is available only with
`PhpBridge`:

```php
$copy = $session->fork('c0ffee-1234');
```

::: info
`NativeBridge` does not support `fork()` with a specific ID. It throws a
`LogicException`.
:::

## Native Bridge

`NativeBridge` works with PHP's global session functions. Use it when your
application already relies on `$_SESSION` or on PHP's
`session.save_handler`:

```php
use Windwalker\Session\Bridge\NativeBridge;
use Windwalker\Session\Session;

$session = new Session(
    ['name' => 'APP_SESSID'],
    new NativeBridge(),
);
```

::: info
Because `$_SESSION` is process-wide, all `NativeBridge` sessions in one
process share the same data. Use `PhpBridge` when a process handles several
sessions.
:::
