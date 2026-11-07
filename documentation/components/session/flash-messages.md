---
layout: doc
title: Flash Messages
component: session
---

# Flash Messages

A flash message is a short message that is shown once. The classic case is
the Post/Redirect/Get pattern. A form is saved, and the server redirects the
browser to another page. The redirect ends the request, so the message must
survive into the next request, and it must disappear after it is shown.
`FlashBag` handles both steps. It stores messages in the session and removes
them when you read them.

## Minimal Setup

Flash messages need a session. Use `addFlash()` on the session object, and
read them with `getFlashes()`:

```php
$session->addFlash('Profile saved.');
```

Calling `addFlash()` starts the session if it is not started yet.

## Showcase

The following example saves a form and redirects. The next request reads the
message and shows it:

```php
// Request 1: save the form and redirect.
$profile->save($data);

$session->addFlash('Profile saved.', 'success');

return $response
    ->withStatus(303)
    ->withHeader('Location', '/profile');
```

```php
// Request 2: the profile page reads the messages.
$flashes = $session->getFlashes();

// ['success' => ['Profile saved.']]
```

`getFlashes()` returns every message grouped by type, and it removes them
from the session. A reload of the page shows no message.

## Types and Multiple Messages

The second argument of `addFlash()` is the message type. It defaults to
`info`. Use the type to let the view choose a style, such as a Bootstrap
alert class. Pass an array to add several messages at once:

```php
$session->addFlash(
    [
        'Your address was updated.',
        'A confirmation email was sent.',
    ],
    'success',
);

$session->addFlash('The coupon has expired.', 'warning');
```

## Reading Part of the Messages

`getFlashes()` clears everything. When a layout needs only one type, use the
flash bag directly. `get()` removes one type and returns its messages.
`peek()` reads the messages without removing them:

```php
$bag = $session->getFlashBag();

$errors = $bag->get('error');

$pending = $bag->peek();
```

Use `peek()` in a middleware or a template that should not consume the
messages. Use `get()` or `getFlashes()` in the code that renders them.

## Details

The bag keeps its messages under the `_flash` key of the session storage. This
has two consequences:

- Flash messages follow the session. They are removed when the session expires
  or is destroyed, and they are stored by the same handler.
- Messages reach the next page only when that request starts the same session.
  The browser must send the session cookie back, as it does after a redirect.

::: tip
Keep flash messages short and use them for feedback only. Store data that the
next page needs as part of the request, such as an ID in the URL, rather than
in a flash message.
:::
