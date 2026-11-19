---
layout: doc
description: How to pass data between components with AppState, keeping values for one request or persisting them in a session, cookie, or database.
---

# Shared State

`AppState` is a shared state object for passing data between
components. A value can live only for the current request, or be
persisted across requests in a session, cookie or database.

## Getting AppState

Inject `AppState` into a constructor, or get it from the application
context:

```php
use Windwalker\Core\State\AppState;

class CartService
{
    public function __construct(
        protected AppState $state,
    ) {
    }
}

// From an AppContext-aware object
$state = $app->getState();

// Read a single value directly
$user = $app->state('user');
```

## Persistence Drivers

`AppState` keeps two layers:

- **Memory**: a collection that lives for the current request. `set()`
  writes here only.
- **Driver**: a persistence backend that survives requests. `remember()`
  writes here.

The driver is selected by the `$driver` argument of `remember()`,
`get()`, `has()`, `forget()` and `all()`:

- `null`, `true` or `'session'`: the session driver (default for
  `remember()`).
- `'cookie'`: the cookies driver.
- `'database'`: the database driver.
- `false`: no persistence (`NullPersistence`).

## Basic Usage

```php
// Memory only: shared within the same request
$state->set('locale', 'zh-TW');

// Persisted in the session: shared across pages
$state->remember('user_id', 42);

// Read: memory first, then the driver
$locale = $state->get('locale');
$userId = $state->get('user_id');

// Read from the cookie driver only
$theme = $state->get('theme', 'cookie');

if ($state->has('user_id')) {
    // ...
}

// Remove from the driver
$state->forget('user_id');
```

`get()` checks memory first, then the driver. `has()` checks the
driver first, then memory.

`remember()` defaults to the session driver, so values are shared
across pages. `set()` writes only to memory, so values are shared only
within the same request.

## Prefixes

`withPrefix()` returns a copy of the state with every key prefixed.
Use it to keep keys from different modules apart:

```php
$cartState = $state->withPrefix('cart.');

$cartState->remember('count', 3);
// Stored as "cart.count"

$count = $cartState->get('count');
```

## Reading All Values

`all()` yields driver values first, then memory values. `dump()` returns
the same content as an array.

```php
foreach ($state->all() as $key => $value) {
    // ...
}
```

## Reminders

::: warning
`forget()` removes the value from the driver only. A value set with
`set()` stays in memory, so `get()` still returns it for the rest of the
request.
:::

::: warning
`getAndForget()` reads the value from memory and the driver, then calls
`forget()` on the default driver. It does not forward the `$driver`
argument to the removal step, so a value stored in another driver can
survive. Call `forget($key, $driver)` explicitly when you use a
non-session driver.
:::

::: tip
Store only small, non-sensitive values in cookies and the database
driver. Keep secrets such as tokens out of `AppState`, or store them
only in the server session.
:::
