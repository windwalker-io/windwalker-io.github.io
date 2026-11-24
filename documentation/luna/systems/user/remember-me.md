---
layout: doc
description: How Luna's Remember Me keeps users logged in, and how to change it.
---

# Remember Me

Remember Me keeps a user logged in after the session ends, so they do not have to log in again on the next visit. Luna stores a long-lived token in a cookie and in the `remember_tokens` table. When the session has no user, `UserHandler` checks this token and logs the user in again.

The feature is off by default. You enable it in the `user` config and then ask for it on each login.

## How It Works

A remember token is a pair of random values. The browser keeps both values in one cookie. The database keeps only the selector and a SHA-256 hash of the validator.

- **Selector**: a 16-byte random value. It is stored as-is and used to find the row.
- **Validator**: a 32-byte random value. It is stored only as a hash. The raw value exists only in the cookie.

The cookie value is the selector and validator joined together and encoded with Base64URL. On each check, `RememberMeService` looks up the row by selector and compares the hash of the cookie validator with `hash_equals()`. A stolen database row is not enough to forge a cookie.

The lifecycle has four steps:

1. **Start**: a login with the `remember` option creates a token row and sets the cookie.
2. **Restore**: a later request with no `login_user_id` in the session finds the cookie, validates it, and logs the user in.
3. **Renew**: each restore rotates the validator and extends `expired_at`, so an active user stays logged in.
4. **Forget**: logout deletes the row and removes the cookie.

## Enabling Remember Me

Turn it on in the `user` config. The defaults are shown here:

```php
// etc/user.config.php (in your host app)
return [
    'remember' => [
        'enabled' => true,
        'expires' => '+100days',
        'cookie_name' => 'WINDWALKER_REMEMBER',
        'clear_probability' => 1,
        'clear_divisor' => 100,
    ],
];
```

With `enabled` set to `false`, `startNewRemember()` returns `null`, and no
token is created or restored.

Then pass `remember` in the login options. Luna's front and admin login
controllers already do this from the form checkbox:

```php
use Lyrasoft\Luna\User\UserService;

$userService->login($user, ['remember' => true]);
```

See [Login and Logout](./login-and-logout) for the full login call.

::: info
The login views show the checkbox only when `RememberMeService::isEnabled()` is true.
:::

## Changing the Lifetime and Cookie

`expires` accepts any string that `chronos()` understands. The
`RememberMeService` falls back to `100days` when the key is empty.

```php
// etc/user.config.php (in your host app)
return [
    'remember' => [
        'enabled' => true,
        'expires' => '+30days',
        'cookie_name' => 'MYAPP_REMEMBER',
    ],
];
```

Renewal uses the same `expires` value, so the lifetime is a sliding window. A
user who returns before it runs out gets a fresh window.

The cookie expires at the same time as the database row. Changing
`cookie_name` logs out every existing remember-me user, because their old
cookie is no longer read.

## Cleaning Up Expired Tokens

`clearExpired()` runs after each renew and each forget. It deletes expired
rows with a random chance:

```php
// etc/user.config.php (in your host app)
return [
    'remember' => [
        'clear_probability' => 1,
        'clear_divisor' => 100,
    ],
];
```

This means a 1 in 100 chance per call. Raise `clear_probability` to clean up
more often, or set it to `0` to skip cleanup in this code path. Expired rows
are then left for your own cron job.

::: tip
For a busy site, run a scheduled `delete` on `remember_tokens` where
`expired_at` is in the past, and keep the probability low.
:::

## Reacting to Token Events

`RememberMeService` emits two [events](/documentation/framework/core-concepts/events). Both carry the `RememberToken` entity
and the service.

- `RememberTokenStartEvent`: a new token was created at login. It also
  carries the raw `$validator`.
- `RememberTokenRenewEvent`: an existing token was renewed. It also carries
  the new raw `$validator`.

Use them for an audit log or a per-device record:

```php
namespace App\Subscriber;

use Lyrasoft\Luna\User\Event\RememberTokenStartEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;

#[EventSubscriber]
class RememberTokenSubscriber
{
    #[ListenTo(RememberTokenStartEvent::class)]
    public function onStart(RememberTokenStartEvent $event): void
    {
        $token = $event->token;

        // Store the device or IP with the new remember token
        $token->params = [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ];
    }
}
```

Register the subscriber in the `listeners` section of your
`etc/user.config.php`, the same way the built-in subscribers are registered.

::: warning
Do not put the raw `$validator` into a log or database row. It is the secret
half of the cookie. The database only has the hash.
:::

## Changing When a Token Is Created

`RememberMeSubscriber` creates a token when the login options contain
`remember`. To decide the condition yourself, stop using the built-in
subscriber and write your own. Remove `RememberMeSubscriber::class` from the
`UserService::class` listeners, then add a subscriber like this:

```php
namespace App\Subscriber;

use Lyrasoft\Luna\Services\RememberMeService;
use Lyrasoft\Luna\User\Event\AfterLoginSessionEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;

#[EventSubscriber]
class RememberPolicySubscriber
{
    public function __construct(
        protected RememberMeService $rememberMeService,
    ) {}

    #[ListenTo(AfterLoginSessionEvent::class)]
    public function afterLogin(AfterLoginSessionEvent $event): void
    {
        // Only remember when the user asked and is not an admin
        if (
            ($event->options['remember'] ?? false)
            && !$this->isAdmin($event)
        ) {
            $this->rememberMeService->startNewRemember($event->user->id);
        }
    }

    protected function isAdmin(AfterLoginSessionEvent $event): bool
    {
        return false;
    }
}
```

Register it under `UserService::class` in `etc/user.config.php`.

::: warning
If you keep `RememberMeSubscriber` and add another subscriber, both run.
Each one creates its own token, so the user gets two cookies.
:::

## Changing How a Token Is Restored

The restore check lives in `UserHandler::getLoginUserId()`. It calls
`RememberMeService::getRenewableTokenItem()`, which returns `null` when the
cookie is missing, the row is gone, the token is expired, or the validator
does not match. To change the restore rules, extend the handler and override
`getLoginUserId()`. See [User Handler](./user-handler) for how to bind your
handler.

## Revocation

Remember tokens are revoked in these cases:

- **Logout**: [`UserHandler::logout()`](./login-and-logout#logging-out) calls `RememberMeService::forget()`,
  which deletes the current row and the cookie.
- **Password reset**: the front password reset revokes all remember tokens of
  the user.

::: info
`forget()` only removes the token from the current browser. Other devices keep
their own tokens until they log out or the token expires.
:::

## Related Topics

- [Login and Logout](./login-and-logout) covers the login call and the
  `remember` option.
- [Authentication](./authentication) covers the login chain.
- [User Handler](./user-handler) covers custom restore and logout behavior.
