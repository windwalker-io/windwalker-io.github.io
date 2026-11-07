---
layout: doc
title: Security
component: session
---

# Security

A session is trust. The server decides who a visitor is based on the ID the
browser sends back, so the protection of that ID and of the data behind it
decides the security of the application. This page covers the behaviors that
protect sessions, and the settings that can weaken them.

## Session Fixation

Session fixation happens when an attacker sets a known session ID in the
victim's browser, and the victim later logs in with that ID. The attacker then
uses the same ID and inherits the logged-in session. The fix is to change the
ID at the moment the privileges change.

Call `regenerate()` after a successful login:

```php
if ($user->verifyPassword($password)) {
    $session->regenerate();

    $session->set('user_id', $user->id);
}
```

By default, `regenerate()` deletes the old session and keeps its data under
the new ID. Passing `deleteOld: false` keeps the old ID valid.

::: warning
Pass `deleteOld: false` only when the old session must remain usable. Keeping
the old ID valid after a login lets an attacker who knows that ID continue to
use the session.
:::

## Logout

On logout, remove the data and change the ID. The old ID then points to
nothing, and the browser receives a new, empty session:

```php
$session->clear();
$session->regenerate();
```

## Expiry

Sessions have an idle lifetime. Each write refreshes the timestamp, so the
lifetime extends with activity:

- The filesystem, database, and PDO handlers reject a session that has
  expired, even before the garbage collector has removed it. The lifetime
  comes from the handler's `gc_maxlifetime` option, or from PHP's
  `session.gc_maxlifetime` when the option is not set.
- The Redis handler uses its `ttl` option. It falls back to `gc_maxlifetime`,
  and then to `session.gc_maxlifetime`.

Set the lifetime on the handler when it must differ from the PHP default:

```php
use Windwalker\Session\Handler\FilesystemHandler;

$handler = new FilesystemHandler(
    '/var/lib/app/sessions',
    ['gc_maxlifetime' => 1800],
);
```

::: tip
The lifetime is idle time, not an absolute limit. A user who stays active
keeps the session alive. For a hard limit, store the login time in the
session and check it on each request:

```php
$loginAt = $session->get('login_at');

if ($loginAt === null || time() - $loginAt > 8 * 3600) {
    $session->clear();
}
```
:::

## Session IDs

The session ID is the secret that the browser presents. Two settings protect
it:

- The filesystem handler accepts only IDs with letters, digits, commas, and
  hyphens. Any other ID raises an `InvalidArgumentException`, so an ID cannot
  be used to reach other files.
- `use_strict_mode` on the bridge replaces an ID that the handler does not
  recognize with a new one. Enable it for every application that uses a
  handler that supports timestamp updates:

```php
use Windwalker\Session\Bridge\PhpBridge;

$bridge = new PhpBridge(
    ['use_strict_mode' => true],
    $handler,
);
```

::: info
Without strict mode, an unknown ID starts a new, empty session with that
same ID. The client can then choose the ID, which is the situation that
strict mode prevents.
:::

## Cookie Flags

The session cookie should be `HttpOnly`, so scripts in the page cannot read
it, and `Secure`, so it is sent only over HTTPS. The framework enables
`HttpOnly` by default. The `Secure` flag is off in the default configuration,
and `CookiesAutoSecureSubscriber` turns it on for HTTPS requests. See
[Cookies](./cookies) for details.

## Storage Location

The files and tables that hold session data contain the data of every user.
Protect them with the same care as the database:

- Keep the directory of the filesystem handler outside the web root, and
  restrict it to the application user. See the warning in
  [Storage Handlers](./handlers).
- Use a dedicated database user with access only to the session table.

## Robots

For requests from known robots, the framework switches the default session to
the `null` instance, which keeps nothing. Crawlers therefore do not create a
stored session on every page they visit.
