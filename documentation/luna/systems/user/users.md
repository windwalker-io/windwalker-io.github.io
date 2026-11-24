---
layout: doc
description: How Luna stores users and how UserService exposes them.
---

# Users

Luna needs one place to load the current user, check permissions and log users in or out. `UserService` is that place. It delegates the storage details to a [user handler](./user-handler), so you can change how users are loaded without touching the code that calls it.

## Basic Usage

Inject `UserService` into any controller, service or action and ask it for the current user:

```php
use Lyrasoft\Luna\User\UserService;

class ProfileController
{
    public function show(UserService $userService): array
    {
        $user = $userService->getUser();

        if (!$user->isLogin()) {
            return ['message' => 'Guest'];
        }

        return ['email' => $user->getEmail()];
    }
}
```

`getUser()` always returns a user object. Guests are represented by a user object whose `isLogin()` returns `false`.

Use `getLoggedInUser()` when the page must not work for guests. It throws a 401 `UnauthorizedException` if nobody is logged in:

```php
$user = $userService->getLoggedInUser();
```

To load a user by ID or other conditions, use `load()` or `mustLoad()`:

```php
// Returns null if not found
$user = $userService->load(['email' => 'foo@example.com']);

// Throws 404 if not found
$user = $userService->mustLoad(['id' => 10]);
```

## User Entity

The entity class is set by `entity` in `etc/user.config.php`. The default is `Lyrasoft\Luna\Entity\User`. Your code type-hints the entity, so you can use its columns directly:

```php
use Lyrasoft\Luna\Entity\User;

/** @var User $user */
$user = $userService->getUser();

$id = $user->id;
```

The login field is set by `login_name`. The default is `email`, so login accounts are identified by email. `LunaAuthMethod` accepts `extra_login_names` (default `['email']`) as alternatives.

## Changing How Users Are Loaded

`UserService` uses `UserHandlerInterface` for every user lookup, login and logout. The default implementation is `UserHandler`, which reads the logged-in user ID from the session. It falls back to a [remember-me](./remember-me) token when the session has no user.

Bind your own handler in the module config. The binding is set under `bindings`:

```php
// etc/user.config.php (in your host app)
use App\User\MyUserHandler;
use Lyrasoft\Luna\User\Handler\UserHandlerInterface;

return [
    'bindings' => [
        UserHandlerInterface::class => MyUserHandler::class,
    ],
];
```

Implement `UserHandlerInterface` and its methods `load()`, `login()`, `logout()`, `getUserEntityClass()` and `createUserEntity()`. To keep the default session behavior, extend `UserHandler` instead of implementing the interface from scratch.

::: tip
Extend `UserHandler` and override only the method you need. The session and remember-me logic in `login()` and `logout()` is easy to get wrong.
:::

## Permission Checks

`UserService::can()` checks an action for the current user. It runs three checks in this order:

- The user-switch mask stored in the session.
- Your handler, if it implements `UserAuthorizationHandlerInterface`.
- Windwalker Core's [`AuthService`](/documentation/framework/core-concepts/security/authorization).

```php
if ($userService->can('post.edit', $post)) {
    // Allowed
}
```

To add your own rules, implement `UserAuthorizationHandlerInterface` in your handler:

```php
use Lyrasoft\Luna\User\Handler\UserAuthorizationHandlerInterface;
use Lyrasoft\Luna\User\Handler\UserHandler;

class MyUserHandler extends UserHandler implements
    UserAuthorizationHandlerInterface
{
    public function authorize(
        string|\UnitEnum $action,
        mixed $user = null,
        ...$args
    ): bool {
        if ($action === 'post.edit') {
            return $user?->id === $args[0]?->authorId;
        }

        // Fall through to Windwalker Core's AuthService
        return false;
    }
}
```

::: info
Returning `false` does not deny the action. `can()` then asks Core's `AuthService`, which is how role-based rules are checked.
:::

## Related Topics

- [Authentication](./authentication) explains how users log in and which events run.
- [Login and Logout](./login-and-logout) explains programmatic login, logout and session events.
- [Social Sign-In](./social-sign-in) explains how users are created from third-party profiles.
- [User Handler](./user-handler) explains how to write your own handler.
