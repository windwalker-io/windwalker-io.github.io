---
layout: doc
title: ACL Overview
description: How Luna decides what a user may do, and how to check it in PHP, Blade and routes.
---

# ACL Overview

Almost every back-office needs the same answer: may this user do this thing? A manager can edit articles, an admin can change user roles, and a vendor can edit only their own products. Luna's ACL keeps these answers in one place. Your controllers, views and routes ask a single question, `can()`, and the ACL decides from configuration instead of from scattered `if` statements.

## The Moving Parts

- **Role**: a named group of users, such as `member` or `manager`. Roles form a tree, and a role inherits everything its ancestors are allowed to do.
- **Action**: a string that names something a user may do, such as `edit` or `product::edit`.
- **Rule**: one entry that says a role is allowed, denied, or inherits for an action.
- **Policy**: a PHP callback for decisions that rules cannot express, such as "only the author may edit".

`AccessService` evaluates roles and rules. Windwalker's `Authorization` holds the policies. Luna joins them in `AccessAuthorization`, so one `can()` call covers both.

- [Roles and Actions](./roles-and-actions) defines the role tree and how roles reach users.
- [AccessService](./access-service) lists the methods behind every check.
- [Database Roles and Rules](./database-rules) moves roles and per-item rules into the database.

## Complete Example

The default `etc/access.config.php` already defines a role tree and the actions `create`, `edit` and `delete`. This example adds a `vendor` role and an action only vendors may use, then checks it in a controller.

```php
// etc/access.config.php
use function Lyrasoft\Luna\create_role;

return [
    // ...
    'roles' => static fn() => [
        'superuser' => create_role('Super User'),
        'public' => create_role(
            'Public',
            children: [
                'member' => create_role(
                    'Member',
                    children: [
                        'vendor' => create_role('Vendor'),
                        'manager' => create_role('Manager'),
                    ]
                ),
            ]
        ),
    ],

    'actions' => [
        'create' => ['manager' => true],
        'edit' => ['manager' => true],
        'product::create' => ['vendor' => true],
    ],
];
```

```php
use Lyrasoft\Luna\Access\AccessService;
use Lyrasoft\Luna\User\UserService;

class VendorController
{
    public function register(
        UserService $userService,
        AccessService $accessService,
    ): void {
        $user = $userService->getUser();

        // Store the role for the user.
        $accessService->addRolesToUser($user, 'vendor');

        $userService->can('product::create'); // TRUE
        $userService->can('edit');            // FALSE
    }
}
```

A vendor can create products but cannot use the global `edit` action. A manager passes `product::create` too, because a namespaced action also matches the global `create` rule.

## Checking Access

All the entry points below end at `AccessService::check()`, so the answer is the same everywhere.

### In PHP

`UserService::can()` is the usual entry point. Its signature is `can($action, $user = null, ...$args)`.

```php
use Lyrasoft\Luna\User\UserService;

// The current user
$userService->can('edit');

// Another user
$user = $userService->load(123);
$userService->can('edit', $user);

// Any of, or all of, several actions
$userService->canAny(['edit', 'delete']);
$userService->canAll(['edit', 'delete']);

// Extra arguments are passed to policies
$userService->can('article.edit', null, $article);

// The User entity answers for itself
$user->can('edit');

// Role check without inheritance
$user->isRoles('sales', 'vendor');
```

The action may also be a `UnitEnum`. Plain rules ignore the extra arguments.

### In Blade

```php
@can('edit')
    <a href="{{ $editUrl }}">Edit</a>
@endcan

@cannot('edit')
    <span>Read only</span>
@endcannot

@can('article.edit', null, $article)
    ...
@endcan
```

::: info
`@can` calls Windwalker's `AuthService`, not `UserService`. The user switch mask and `UserAuthorizationHandlerInterface` are therefore not part of it.
:::

### In Routes

A hidden button does not protect a URL. Attach `AccessMiddleware` to the route or group that needs a permission:

```php
use Lyrasoft\Luna\Middleware\AccessMiddleware;

$router->group('product')
    ->middleware(
        AccessMiddleware::class,
        rules: 'product::edit',
    )
    ->register(function (RouteCreator $router) {
        // ...
    });

// One passing rule is enough
->middleware(
    AccessMiddleware::class,
    rules: ['product::edit', 'product::review'],
)
```

For decisions that need request data, pass a closure wrapped in `raw()`. The container injects its arguments. Return `true` to allow, `false` to deny, a `UriInterface` to redirect, or a response to send. A string or array return value is treated as rules to check.

```php
use Lyrasoft\Luna\User\UserService;
use Windwalker\Core\Attributes\Request\Input;

use function Windwalker\raw;

$router->any('user_edit', '/user/edit/{type}[/{id}]')
    ->controller(UserController::class)
    ->middleware(
        AccessMiddleware::class,
        rules: raw(
            function (UserService $users, #[Input] $id) {
                // Users may always edit themselves.
                if ((int) $id === (int) $users->getUser()->id) {
                    return true;
                }

                return 'user::edit';
            }
        ),
    );
```

A denied request throws `UnauthorizedException` with code 403. Change it with the `exception` and `errorCode` arguments. `exception` can also be a closure that returns a response:

```php
->middleware(
    AccessMiddleware::class,
    rules: 'product::edit',
    exception: fn() => new RedirectResponse('/login'),
)
```

::: tip
The built-in `AdminAccessMiddleware` guards the back-office with the `admin.access` action. A user without it receives a 404, so the admin URLs are not revealed.
:::

## Policies

Rules answer "may this role do this action?". They cannot answer "may this user edit this article?", because the answer depends on the article. For that, register a policy under `authorization.policies` in `etc/conf/auth.config.php`:

```php
// etc/conf/auth.config.php
return [
    // ...
    'authorization' => [
        'policies' => [
            'article.edit' => ArticleEditPolicy::class,
            VendorPolicyProvider::class,
        ],
    ],
];
```

```php
$userService->can('article.edit', null, $article);
```

Writing policy classes and providers, naming policies with enums, and the `AuthService` API are covered in the framework's [Authorization](../../../framework/core-concepts/security/authorization) guide. Luna adds two behaviors on top.

When a policy exists for an action name, it is the only thing that decides. Luna does not fall back to the rules for that name:

```php
// 'article.edit' has a policy, so the 'actions' config is not read.
$userService->can('article.edit', null, $article);

// 'edit' has no policy, so the rules decide.
$userService->can('edit');
```

::: warning
The superuser shortcut belongs to the rules, not to the policy. A superuser fails a policy that does not allow them. Call the rules from inside the policy to keep the bypass:

```php
if ($this->accessService->check('edit', $user)) {
    return true; // Global edit, including superusers
}
```
:::

A policy can also wrap a role check, such as a role without inheritance:

```php
$auth->addPolicy(
    'is.sales',
    fn(User $user) => $this->accessService
        ->userInRoles($user, ['sales', 'super_sales'])
);
```

To combine a rule and a policy, give them different names and call both:

```php
if (
    $userService->can('edit')
    || $userService->can('article.edit', null, $article)
) {
    // ...
}
```

Choose the tool by what the answer depends on:

- Use **rules** when it depends only on the user's roles.
- Use a **policy** when it depends on the data, such as the owner of an item.
- Use [database rules](./database-rules#rules-for-a-single-item) when someone must grant access to individual items at runtime.
