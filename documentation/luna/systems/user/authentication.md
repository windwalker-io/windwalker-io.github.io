---
layout: doc
description: How Luna logs users in, which events run, and how to extend the flow.
---

# Authentication

Login in Luna is a chain of steps. `UserService::attemptToLogin()` runs the chain, and each step can be replaced or extended. Use this page to understand the order of the steps and where to hook your own code.

## Basic Usage

Pass the credentials to `attemptToLogin()`. It returns an `AuthResult` on success or `false` on failure. The optional `ResultSet` is filled in by reference, so you can read why the login failed:

```php
use Lyrasoft\Luna\User\UserService;
use Windwalker\Authentication\ResultSet;

class LoginController
{
    public function login(UserService $userService): void
    {
        $resultSet = new ResultSet();

        $result = $userService->attemptToLogin(
            [
                'email' => 'foo@example.com',
                'password' => 'secret',
            ],
            [],
            $resultSet,
        );

        if (!$result) {
            // The ResultSet holds the failed step, such as the
            // password check or the account check.
            $isSuccess = $resultSet->isSuccess();
        }
    }
}
```

The built-in `AuthController` in the Front module uses the same call. Read it at `src/Module/Front/Auth/AuthController.php` to see the complete flow.

## The Login Flow

`attemptToLogin()` runs these steps in order:

- `BeforeLoginEvent` runs first. Listeners may change the credential.
- `authenticate()` checks the credential. Your handler runs here if it implements `UserAuthenticationHandlerInterface`.
- `LoginAuthEvent` runs inside `verifyLoginAccess()` to check whether the account may log in.
- `login()` stores the user in the session.
- `AfterLoginEvent` runs last.

If the credential or account check fails, `LoginFailEvent` runs and the method returns `false`.

## Authentication Method

The default password check is `LunaAuthMethod`. It looks up the user by `login_name` and `extra_login_names`, then checks the password.

To replace the password check, implement `UserAuthenticationHandlerInterface` in your handler. `UserService::authenticate()` then delegates to your `authenticate(array $credential): ResultSet` method instead of `LunaAuthMethod`.

::: warning
Only the handler that `UserService` resolves is used. Bind your class to `UserHandlerInterface` in `bindings`, or the default `UserHandler` is used.
:::

## Login Events

Listen to login events to add rules around the flow. Each event is in `Lyrasoft\Luna\User\Event`:

- `BeforeLoginEvent`: receives `$credential` and `$options`.
- `LoginAuthEvent`: receives `$user`. Use it to block accounts.
- `AfterLoginEvent`: the login succeeded.
- `LoginFailEvent`: the login failed.

Register a subscriber on the `UserService::class` listener list in your host app's `etc/user.config.php`:

```php
// etc/user.config.php (in your host app)
use App\Subscriber\LoginLogSubscriber;
use Lyrasoft\Luna\Subscriber\RememberMeSubscriber;
use Lyrasoft\Luna\Subscriber\UserAuthSubscriber;
use Lyrasoft\Luna\User\UserService;

return [
    'listeners' => [
        UserService::class => [
            UserAuthSubscriber::class,
            RememberMeSubscriber::class,
            LoginLogSubscriber::class,
        ],
    ],
];
```

Then write the subscriber with `#[EventSubscriber]` and `#[ListenTo]`:

```php
use Lyrasoft\Luna\User\Event\BeforeLoginEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;

#[EventSubscriber]
class LoginLogSubscriber
{
    #[ListenTo(BeforeLoginEvent::class)]
    public function beforeLogin(BeforeLoginEvent $event): void
    {
        $email = $event->credential['email'] ?? '';

        // Record the attempt
    }
}
```

To block a login and show a message, throw `AuthenticateFailException` from `LoginAuthEvent`, as `UserAuthSubscriber` does. `verifyLoginAccess()` catches it only there. An exception thrown from `BeforeLoginEvent` is not caught and reaches your caller.

## Blocking Unverified or Disabled Users

`UserAuthSubscriber` listens to `LoginAuthEvent`. It checks two things:

- If the user implements `UserVerifiedEntityInterface`, or has `isVerified()`, an unverified account is blocked with code `40101`.
- If the user implements `UserEnabledEntityInterface`, or has `isEnabled()`, a disabled account is blocked with code `40102`.

```php
// ERROR: 40101 not.activated (unverified account)
// ERROR: 40102 not.enabled (disabled account)
```

The subscriber also accepts an optional `\Closure` in its constructor, which runs as an extra check.

## Remember Me

Remember-me is off by default. Enable it with `remember.enabled` in `etc/user.config.php`. Luna then sets the cookie named by `remember.cookie_name` (default `WINDWALKER_REMEMBER`) for `remember.expires` (default `+100days`). `RememberTokenStartEvent` and `RememberTokenRenewEvent` run when the token is created or renewed.

::: info
`UserService::logout()` is the method that ends the session. Use it instead of clearing the session by hand.
:::

## Related Topics

- [Users](./users) explains the handler that loads and stores users.
- [Social Sign-In](./social-sign-in) explains login through third-party providers.
