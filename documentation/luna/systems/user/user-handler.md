---
layout: doc
description: Write your own user handler to change how Luna loads, logs in and authorizes users.
---

# User Handler

A user handler is the class that `UserService` calls for every storage-level task. It loads users, stores the login state and creates user entities. Write your own handler when the default session-based storage does not fit your app, for example when users come from an external API, or when you want to add custom authorization or authentication rules.

## The Handler Contract

`UserHandlerInterface` requires five methods:

```php
namespace Lyrasoft\Luna\User\Handler;

use Lyrasoft\Luna\User\UserEntityInterface;

interface UserHandlerInterface
{
    public function load(mixed $conditions = null): ?UserEntityInterface;

    public function login(mixed $user, array $options = []): bool;

    public function logout(mixed $user = null): bool;

    public function getUserEntityClass(): string;

    public function createUserEntity(array $data = []): object;
}
```

`UserService` calls these methods through `getUserHandler()`. Its `getUser()`, `load()`, `login()`, `logout()` and `createUserEntity()` methods all delegate here.

::: warning
Do not implement `UserHandlerInterface` from scratch unless you need a completely different storage. The default `UserHandler` also holds the [remember-me](./remember-me) and session-sync logic. Copying it is easy to get wrong.
:::

## Extending the Default Handler

Most custom handlers extend `UserHandler`. The constructor takes the app context, session, ORM and the `user` config, so the subclass inherits all of them. Override only the methods you need.

```php
namespace App\User;

use App\Entity\Member;
use Lyrasoft\Luna\User\Handler\UserHandler;

class MyUserHandler extends UserHandler
{
    public function getUserEntityClass(): string
    {
        // Use your own entity for all users
        return Member::class;
    }
}
```

Then bind the handler in the module's user config, as described in [Users](./users#changing-how-users-are-loaded):

```php
// etc/user.config.php
use App\User\MyUserHandler;
use Lyrasoft\Luna\User\Handler\UserHandlerInterface;

return [
    'bindings' => [
        UserHandlerInterface::class => MyUserHandler::class,
    ],
];
```

::: tip
`UserHandler` reads the entity class from the `entity` key in the `user` config. If the only change is the entity, set that key instead of overriding `getUserEntityClass()`.
:::

## Custom Loading

`load()` receives the conditions that `UserService::load()` gets. It can be `null`, a scalar ID, an array of columns, or an object. It must return a user entity or `null`.

This example loads a user from an external API. It is the same idea as a token-based login, with no session:

```php
namespace App\User;

use Lyrasoft\Luna\User\Handler\UserHandler;
use Lyrasoft\Luna\User\UserEntityInterface;

class ApiUserHandler extends UserHandler
{
    public function load(mixed $conditions = null): ?UserEntityInterface
    {
        // Let the default handler load the current session user
        if (!$conditions) {
            return parent::load($conditions);
        }

        if (!isset($conditions['token'])) {
            return parent::load($conditions);
        }

        $data = $this->fetchFromApi($conditions['token']);

        if (!$data) {
            return null;
        }

        return $this->createUserEntity($data);
    }

    protected function fetchFromApi(string $token): ?array
    {
        // Call your identity service here
        return null;
    }
}
```

::: warning
Do not map `$conditions` directly to a SQL `WHERE` clause in a custom `load()`. Only accept the keys you expect. Otherwise a caller can load any user by passing an arbitrary column.
:::

`createUserEntity()` builds the entity from an array. Pass the same array keys as the database columns.

## Custom Login and Logout

[`UserService::login()`](./login-and-logout#session-events) emits `BeforeLoginSessionEvent`, then calls the handler's `login()`, then emits `AfterLoginSessionEvent`. The default `UserHandler::login()` stores the user ID in the session, resets the user cache, and syncs the database session. It does not use `$options`.

```php
namespace App\User;

use Lyrasoft\Luna\User\Handler\UserHandler;

class TokenUserHandler extends UserHandler
{
    public function login(mixed $user, array $options = []): bool
    {
        $result = parent::login($user, $options);

        // Record the login in your own store, for example an audit log
        $this->writeAuditLog($user);

        return $result;
    }

    public function logout(mixed $user = null): bool
    {
        $this->writeAuditLog(null);

        return parent::logout($user);
    }

    protected function writeAuditLog(mixed $user): void
    {
        // Your logging code
    }
}
```

::: info
`UserHandler::logout()` ignores the `$user` argument. It always ends the current session. To log out a different user, your handler must do that itself.
:::

## Custom Authorization

`UserService::can()` asks the handler first when it implements `UserAuthorizationHandlerInterface`. If the handler returns `true`, access is granted. If it returns `false`, `UserService` falls back to [`AuthService`](/documentation/framework/core-concepts/security/authorization). So the handler can only grant extra access, not deny it.

```php
namespace App\User;

use Lyrasoft\Luna\User\Handler\UserAuthorizationHandlerInterface;
use Lyrasoft\Luna\User\Handler\UserHandler;
use UnitEnum;

class MyUserHandler extends UserHandler implements
    UserAuthorizationHandlerInterface
{
    public function authorize(
        string|UnitEnum $action,
        mixed $user = null,
        ...$args
    ): bool {
        // Owners can edit their own posts
        if ($action === 'post.edit') {
            $post = $args[0] ?? null;

            return $post !== null
                && $user !== null
                && $post->getAuthorId() === $user->getId();
        }

        return false;
    }
}
```

For how `can()`, `canAny()` and `canAll()` are called, see [Users](./users).

## Custom Authentication

When the handler implements `UserAuthenticationHandlerInterface`, [`UserService::authenticate()`](./authentication#the-login-flow) calls it before the `AuthService`. It must return a `ResultSet`.

```php
namespace App\User;

use Lyrasoft\Luna\User\Handler\UserAuthenticationHandlerInterface;
use Lyrasoft\Luna\User\Handler\UserHandler;
use Windwalker\Authentication\AuthResult;
use Windwalker\Authentication\ResultSet;

class MyUserHandler extends UserHandler implements
    UserAuthenticationHandlerInterface
{
    public function authenticate(array $credential): ResultSet
    {
        $resultSet = new ResultSet();

        if (($credential['token'] ?? '') === 'valid-token') {
            $resultSet->addResult(
                'token',
                new AuthResult(AuthResult::SUCCESS, $credential)
            );
        }

        return $resultSet;
    }
}
```

::: warning
A failed result does not stop authentication. `UserService::authenticate()` then runs the normal `AuthService` methods, such as the password check. Only the `SUCCESS` result short-circuits the chain.
:::

## Checking Your Handler

Verify the binding first. `UserService::getUserHandler()` returns the object the container built, so its class name shows whether your binding is active:

```php
$handler = $userService->getUserHandler();

echo get_class($handler); // App\User\MyUserHandler
```

Then test one login and one logout in a real request, because the session and remember-me paths only run there.

## Related Topics

- [Users](./users) covers `UserService`, the entity and the binding.
- [Login and Logout](./login-and-logout) covers programmatic login and the session events.
- [Authentication](./authentication) covers the login chain.
