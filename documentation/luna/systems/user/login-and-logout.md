---
layout: doc
description: Log users in and out in code, and use the session-level login events.
---

# Login and Logout

`attemptToLogin()` checks credentials and then logs the user in. Use `login()` and `logout()` directly when Luna has already verified the user. Typical cases are a new account after registration, an administrator switching to another user, or a console command.

## Logging In

`login()` accepts a user entity, or the conditions that `load()` accepts:

```php
use Lyrasoft\Luna\Entity\User;
use Lyrasoft\Luna\User\UserService;

class RegisterController
{
    public function afterRegister(
        UserService $userService,
        User $user
    ): void
    {
        // Log in with an entity you already have
        $userService->login($user);

        // Or load the user by conditions, then log in
        $userService->login(['id' => $user->id]);

        // Start a remember-me token as well
        $userService->login(
            $user,
            ['remember' => true]
        );
    }
}
```

`login()` returns `true` when the session is updated. It returns `false` when the conditions match no user:

```php
// ERROR: returns false, no user has id 999999
$ok = $userService->login(['id' => 999999]);
```

::: warning
`login()` does not run `LoginAuthEvent`, so it does not check whether the account is verified or enabled. Log in only users you have checked yourself.
:::

`login()` also does not update `last_login`. The Front `AuthController` does that after `attemptToLogin()`. Update the column yourself if you need it.

## Remember Me

The `remember` option is read by `RememberMeSubscriber`, which starts a remember-me token after the session is set. See [Remember Me](./remember-me) for how tokens work and how to change them.

## Logging Out

Call `logout()` to end the current session:

```php
use Lyrasoft\Luna\User\UserService;
use Windwalker\Core\Router\Navigator;

class LogoutController
{
    public function logout(UserService $userService, Navigator $nav)
    {
        $userService->logout();

        return $nav->to('login');
    }
}
```

`logout()` destroys and regenerates the session, forgets the remember-me token, and clears the handler's user cache. The `$user` argument is accepted, but the default `UserHandler` ignores it.

## Session Events

Two events wrap `login()`. They run for every login, including `attemptToLogin()`:

- `BeforeLoginSessionEvent` runs before the user is loaded. It has `$user`, which can be an entity, an array of conditions or a scalar. It also has `$options`.
- `AfterLoginSessionEvent` runs after the handler's `login()`. It has `$user`, `$result` and `$options`.

For the login-flow events such as `BeforeLoginEvent` and `LoginAuthEvent`, see [Authentication](./authentication#login-events).

```php
use Lyrasoft\Luna\User\Event\AfterLoginSessionEvent;
use Lyrasoft\Luna\User\Event\BeforeLoginSessionEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;

#[EventSubscriber]
class SessionLogSubscriber
{
    #[ListenTo(BeforeLoginSessionEvent::class)]
    public function beforeLogin(BeforeLoginSessionEvent $event): void
    {
        // Change the options before the handler logs in
        $event->options['source'] = 'web';
    }

    #[ListenTo(AfterLoginSessionEvent::class)]
    public function afterLogin(AfterLoginSessionEvent $event): void
    {
        // $event->user is the logged-in entity
        $userId = $event->user->id;
    }
}
```

Register the subscriber in the `UserService::class` listener list, as shown in [Authentication](./authentication#login-events).

::: warning
The session is already changed when `AfterLoginSessionEvent` runs. Setting `$event->result = false` makes `login()` return `false`, but the user stays logged in.
:::

## Other UserService Methods

These methods cover roles, multiple actions, identity and password hashing:

```php
use Lyrasoft\Luna\Entity\User;
use Lyrasoft\Luna\User\UserService;

class ExampleService
{
    public function run(UserService $userService, User $user): void
    {
        // Role checks by role name, or a UserRole entity
        $isEditor = $userService->isRole('editor', $user);

        // Super user check for the current user
        $isSuper = $userService->isSuperUser();

        // All UserRole entities of the user
        $roles = $userService->getUserRoles($user);

        // True if any or all of the actions are allowed
        $canAny = $userService->canAny(['post.edit', 'post.delete']);
        $canAll = $userService->canAll(['post.view', 'post.edit']);

        // The value of login_name, such as the email
        $identity = $userService->getUserIdentity($user);

        // Generate a random password for a new account
        $plain = UserService::genRandomPassword(20);

        // Hash the password into $user->password
        $user->password = $plain;
        $user = $userService->hashPasswordForSave($user, $plain);
    }
}
```

::: info
When SRP is enabled, `hashPasswordForSave()` builds the verifier from `$user->password`, not from the `$password` argument. Set `$user->password` to the plain password before you call it.
:::

## Related Topics

- [Authentication](./authentication) explains `attemptToLogin()` and the login-flow events.
- [Users](./users) explains loading users and the user handler.
- [Social Sign-In](./social-sign-in) explains login through third-party providers.
- [Remember Me](./remember-me) explains the persistent login cookie.
