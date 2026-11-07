---
layout: doc
title: Introduction
component: session
---

# Introduction

Windwalker Session provides an object-oriented interface to PHP sessions.
Instead of reading and writing `$_SESSION` directly, your code works with a
`Session` object that can be created, tested, and passed around like any
other service. The same object works in a classic request and response
application and in a long-running process where several sessions must
coexist.

The package has five main parts:

- **Session**: `Session`, the object your code uses to read and write values,
  and to stop or regenerate the session. See [Bridges](./bridges).
- **Bridges**: `PhpBridge` and `NativeBridge`, which control how a session is
  started and where its data lives during a request. See [Bridges](./bridges).
- **Handlers**: the storage backends, such as files, a database, or Redis.
  See [Storage Handlers](./handlers).
- **Cookies**: `Cookies` and `ArrayCookies`, which carry the session ID between
  the browser and the server. See [Cookies](./cookies).
- **Flash messages**: `FlashBag`, one-time messages that survive a redirect.
  See [Flash Messages](./flash-messages).

## Installation

Install the package with Composer. It requires PHP 8.4.6 or later.

```bash
composer require windwalker/session ^4.0
```

The filesystem handler needs `windwalker/filesystem`, and the database
handler needs `windwalker/database`.

## Use as Standalone Component

Create a bridge with a handler, then pass the bridge to a `Session`. The
session starts on first access, so you do not call `start()` yourself.

```php
use Windwalker\Session\Bridge\PhpBridge;
use Windwalker\Session\Handler\FilesystemHandler;
use Windwalker\Session\Session;

$handler = new FilesystemHandler('/var/lib/app/sessions');
$bridge = new PhpBridge(['use_strict_mode' => true], $handler);

$session = new Session(['name' => 'APP_SESSID'], $bridge);

$session->set('user_id', 42);

$userId = $session->get('user_id');
```

When you do not pass a cookies object, `Session` creates a `Cookies` object
that sends the session cookie with `setcookie()`. See [Cookies](./cookies)
for other options.

## Use in Windwalker

The package registers the session services in the container. `Session` is
shared, and `SessionInterface` is an alias for it. Inject it through a
constructor, or retrieve it from the application:

```php
class CartService
{
    public function __construct(
        protected Session $session
    ) {
    }

    public function add(string $sku): void
    {
        $cart = $this->session->get('cart') ?? [];
        $cart[] = $sku;

        $this->session->set('cart', $cart);
    }
}
```

```php
$session = $app->retrieve(Session::class);
```

### Configuration

The package configuration is `session.config.php`. The `default` key selects
the instance used when no tag is given. It can be set with the `SESSION_DEFAULT`
environment variable. Other keys control the cookie parameters, the session
options, and the handler definitions. Override them in the host application's
`etc/packages/session.config.php` file.

## Core Concepts

A session is a set of data identified by an ID. The ID travels in a cookie,
and the data is stored by a handler. The bridge connects the two: it loads the
data when the session starts and writes it back when the session ends.

`Session` is lazy. Calls such as `get()`, `set()`, and `has()` start the
session on first use. Ending the session, either explicitly with `stop()` or at
the end of the script when `auto_commit` is enabled, writes the data through
the handler.

Because the bridge, the handler, and the cookies are separate objects, you can
change where data is stored without changing the code that reads and writes
values.

## Topic Pages

- [Bridges](./bridges): `PhpBridge` and `NativeBridge`, the session lifecycle,
  and forking a session.
- [Storage Handlers](./handlers): the built-in handlers, where each one stores
  data, and the options that control them.
- [Cookies](./cookies): carrying the session ID, the cookie options, and PSR-7
  cookies.
- [Flash Messages](./flash-messages): one-time messages across a redirect.
- [Security](./security): session fixation, expiry, session IDs, and cookie
  flags.

## Related components

- [Filesystem](/documentation/components/filesystem/index): the filesystem
  abstraction behind `FilesystemHandler`.
- [Database](/documentation/components/database/index): the adapter used by
  `DatabaseHandler`.
- [HTTP](/documentation/components/http/index): the PSR-7 request that provides
  cookies to `ArrayCookies`.
