---
layout: doc
title: Roles and Actions
description: Define the role tree and the action rules in etc/access.config.php.
---

# Roles and Actions

Hard-coding "managers can edit" into controllers makes permissions hard to audit and harder to change. Luna moves that knowledge into `etc/access.config.php`. You declare who the roles are and what each role may do. The rest of the application only asks `can('edit')`.

This page covers the static configuration. It lives in code, ships with your repository, and needs no database tables for the rules themselves. To store roles or rules in the database, see [Database Roles and Rules](./database-rules).

## Roles Form a Tree

`roles` returns a tree built with `create_role()`. A role inherits every permission of its ancestors, so you only declare what each level adds. The default tree is:

```php
use function Lyrasoft\Luna\create_role;

return [
    'roles' => static fn() => [
        'superuser' => create_role('Super User'),
        'public' => create_role(
            'Public',
            children: [
                'member' => create_role(
                    'Member',
                    children: [
                        'manager' => create_role(
                            'Manager',
                            children: [
                                'admin' => create_role('Admin'),
                            ]
                        ),
                    ]
                ),
            ]
        ),
    ],
];
```

- `superuser` stands alone and passes every check.
- `public` is the base role, and every other role inherits from it.
- `member` is a registered user.
- `manager` is a member who may enter the back-office.
- `admin` is a manager with extra privileges, such as changing user roles.

The array key is the role ID, for example `manager`. It is what Luna stores in `user_role_maps.role_id` and what you pass to methods such as `userIsRole()`. The names have no built-in meaning. What a role may do is decided only by the rules you write.

To translate role titles or use other services, type-hint them on the closure. Luna calls it through the container:

```php
use Windwalker\Core\Language\LangService;

'roles' => static fn(LangService $lang) => [
    'superuser' => create_role($lang('app.role.superuser')),
    // ...
],
```

## Actions and Rules

`actions` maps an action name to the rules for each role:

```php
use Lyrasoft\Luna\Access\AccessService;

return [
    'actions' => [
        AccessService::ADMIN_ACCESS_ACTION => [
            'manager' => true,
        ],
        AccessService::SUPERUSER_ACTION => [
            'superuser' => true,
        ],
        AccessService::ROLE_MODIFY_ACTION => [
            'admin' => true,
        ],

        'create' => ['manager' => true],
        'edit' => ['manager' => true],
        'delete' => ['manager' => true],
    ],
];
```

The three constants are built in:

- `admin.access` lets a user enter the back-office.
- `super.user` marks the roles that bypass every rule.
- `role.modify` lets a user change other users' roles.

Every other name is yours. A role has one of three values for each action:

```php
'edit' => [
    'manager' => true,  // Allowed
    'admin' => null,    // Inherit (the same as omitting the role)
    'member' => false,  // Denied
],
```

- `true` allows the action for this role and for every descendant that does not say otherwise.
- `null`, or no entry, inherits the parent's result. If no ancestor says anything, the result is denied.
- `false` denies the action for this role and for **all** descendants.

```php
'create' => [
    'manager' => true,
    'admin' => true,
],

'delete' => [
    'manager' => false,
    'admin' => true, // No effect: the parent is denied.
],
```

::: warning
A `false` always wins. If a parent role is denied, `true` on a child role is silently ignored. When a permission seems to be missing, look for a `false` higher in the tree first.
:::

When a user holds several roles, one allowed role is enough. A denial in one role does not cancel an allow from another role the user also holds.

## Namespaced Actions

An action may carry a namespace, separated by `::`. Use it to group actions by feature:

```php
'actions' => [
    'edit' => ['manager' => true],

    'vendor' => ['vendor' => true],
    'product::create' => ['vendor' => true],
    'product::edit' => ['vendor' => true],
],
```

A check for `product::edit` collects the rules of `product::edit` and of the plain `edit`. A manager has no rule for `product::edit`, but still passes because of the global `edit`:

```php
$userService->can('product::edit'); // TRUE for managers and vendors
```

This lets you grant a feature-wide permission once, and still give a lower role access to a single feature.

An action can have a third part, `namespace::action::id`, that targets one item. Item-level checks are covered in [Database Roles and Rules](./database-rules#rules-for-a-single-item).

## Superuser

Any role allowed to perform `super.user` passes every check that goes through the rules. You do not need to list `superuser` in other actions.

```php
$accessService->isSuperUser($user);
```

::: warning
The superuser shortcut does not apply to [policies](./overview#policies). When an action has a policy, the policy decides alone. Call `$accessService->check()` inside the policy to include the superuser and role rules.
:::

## Selectable and Basic Roles

Two more keys control how roles reach users:

```php
return [
    // Roles an admin can pick in the user edit form
    'selectable_roles' => [
        'member',
        'admin',
        'superuser',
    ],

    // Roles given to a new user who has none selected
    'basic_roles' => [
        'member',
    ],
];
```

The selector in the user edit form appears only for a user allowed `role.modify`. By default, that means `admin` and `superuser`. New users receive `basic_roles` at registration, and when none are selected in the form.

## Naming Actions with Constants

String names are easy to mistype and hard to search. Collect them in one class and use the constants everywhere:

```php
namespace App\Access;

class Access
{
    public const string ACCOUNTING = 'accounting';

    public const string PRODUCT_EDIT = 'product::edit';
}
```

```php
use App\Access\Access;

return [
    'actions' => [
        Access::ACCOUNTING => ['manager' => true],
        Access::PRODUCT_EDIT => ['vendor' => true],
    ],
];
```

```php
$userService->can(Access::ACCOUNTING);
```

A single class makes it simple to find every place that checks a permission.

## Built-in Safeguards

`Admin\User\UserController` enforces these rules when roles change:

- Only a user allowed `role.modify` can change roles. A forged request from another user is ignored.
- A user who is not a superuser cannot edit a superuser account.
- Only a superuser can assign a superuser role.
- A superuser cannot remove their own superuser role.
- A non-superuser cannot assign roles with privileges they lack. The controller compares the two privilege sets with `compareRolesPrivileges()`.
- A non-superuser cannot switch to a user with higher privileges.

::: tip
The same comparison is available to your own code. `compareUserPrivileges($userA, $userB, '>')` is TRUE when user A holds permissions that user B lacks. Supported operators are `>`, `>=`, `=`, `<` and `<=`.
:::

::: warning
Privilege comparison reads the actions that appear in the static `actions` config. A permission that exists only as a policy or a database rule is not compared.
:::

## Related

- [AccessService](./access-service) lists every method for assigning roles and comparing privileges.
- [Database Roles and Rules](./database-rules) adds roles that administrators can create at runtime.
