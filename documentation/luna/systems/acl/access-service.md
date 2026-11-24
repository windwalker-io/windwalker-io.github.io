---
layout: doc
title: AccessService
description: Inject AccessService and use it to check permissions, manage user roles and walk the role tree.
---

# AccessService

`AccessService` is the engine behind every `can()` call. A user is connected to a role through the `user_role_maps` table. The registration form and the user admin already write it. In your own code, use `AccessService` to check permissions, assign roles, find users and compare privileges. It is registered as a shared object, so every consumer gets the same instance and its caches.

## Getting the Service

```php
use Lyrasoft\Luna\Access\AccessService;
use Lyrasoft\Luna\User\UserService;

class VendorService
{
    // Constructor injection
    public function __construct(
        protected AccessService $accessService,
    ) {
    }
}

// Inject into a controller method
public function save(AccessService $accessService): void
{
    // ...
}

// From the container or the application
$accessService = $container->get(AccessService::class);
$accessService = $app->service(AccessService::class);

// From UserService
$accessService = $userService->getAccessService();
```

`UserService` also proxies the most common methods: `userIsRole()`, `isSuperUser()` and `getUserRoles()`.

## Arguments

Most methods share the same argument types:

- `$user`: a `User` entity, a user ID, or `null` for the current user.
- `$role`: a `UserRole` entity, a role ID (string or int), or a backed enum. Methods that take several roles also accept an array of them.
- `$action`: a string or a `UnitEnum`.

```php
// All three are the same role
$accessService->userIsRole($user, 'manager');
$accessService->userIsRole($user, $managerRole);
$accessService->userIsRole($user, Role::MANAGER);
```

## Checking Permissions

```php
// Full check: policy first, then superuser and rules
$accessService->can('edit', $user);
$accessService->check('edit', $user); // Same as can()

// Rules only, for one role or a list of roles
$accessService->checkRoleAllowAction($role, 'edit');
$accessService->checkRolesAllowAction([$a, $b], 'edit');

// Which roles may perform the action?
$roles = $accessService->getRolesAllowAction('edit');

// Raw tri-state for a role against a rule list.
// Returns TRUE, FALSE or NULL (nothing says anything).
$accessService->checkRoleAllowForRules(
    $role,
    $accessService->getRules('edit'),
);

// The rules that apply to an action name
$rules = $accessService->getRules('product::edit');
```

`can()` and `check()` skip rules when the action has a policy. The `checkRole*` methods read rules only and never see policies. They do not apply the superuser shortcut either.

## Superuser

```php
$accessService->isSuperUser($user);       // Does the user pass super.user?
$accessService->isSuperUserRole($role);   // Does the role pass super.user?
$accessService->getSuperUserRoles();      // All roles allowed super.user
```

## Reading and Changing User Roles

```php
// Roles of a user, from the whole tree
$roles = $accessService->getUserRoles($user);

// Same, but skips unpublished roles. check() uses this one.
$roles = $accessService->getEnabledUserRoles($user);

// Add roles. Roles the user already has are skipped.
// Returns the created UserRoleMap objects.
$accessService->addRolesToUser($user, ['member', 'vendor']);

// Add with extra column values for the map table
$accessService->addRolesToUser(
    $user,
    'vendor',
    extra: ['column' => 'value'],
);

// Add from UserRoleMap objects (their roleId is used)
$accessService->addRoleMapsToUser($user, [$map1, $map2]);

// Remove roles
$accessService->removeRoleFromUser($user, ['vendor']);
```

The roles of a user are cached for the request. `addRolesToUser()`, `addRoleMapsToUser()` and `removeRoleFromUser()` clear that cache. Changes made by other code, such as raw SQL, are not seen until the next request.

## Checking One Specific Role

`can()` follows inheritance: a manager passes every check that a member passes. Sometimes you need the opposite, such as "hide this banner from sales staff only". Ask about the role directly:

```php
// TRUE only if the user is mapped to this role
$accessService->userIsRole($user, 'sales');

// TRUE if the user is mapped to any of them
$accessService->userInRoles($user, ['sales', 'super_sales']);
```

These methods do not look at the tree. A user with a higher role does not match unless that user is also mapped to the checked role.

## Finding Users by Role

```php
// Users mapped to the role
$users = $accessService->getUserByRoles('manager');

// Also users whose roles are descendants of it in the tree
$users = $accessService->getUserByRoles(
    'manager',
    includesSuperior: true,
);

// Also users who hold a superuser role
$users = $accessService->getUserByRoles(
    ['manager'],
    includeSuperUser: true,
);

// The same query, to add conditions or paginate
$query = $accessService->getUserByRolesQuery('manager');
```

`getUserByRoles()` returns a `Collection` of `User`. `getUserByRolesQuery()` returns the `SelectorQuery` it is built on.

## The Role Tree

Roles have parent and child relationships. In the default tree, a child such as `admin` is more privileged than its parent `manager`.

```php
// Is manager an ancestor of admin?
$accessService->isChildRole('admin', 'manager');  // TRUE
$accessService->isParentRole('manager', 'admin'); // TRUE
$accessService->isSuperior('manager', 'admin');   // Alias

// Ancestors and descendants, keyed by role ID
$parents = $accessService->getParentRoles('admin');
$parents = $accessService->getParentRoles('admin', includeSelf: true);
$children = $accessService->getDescendantRoles('manager');

// The user's roles, plus every role below them in the tree
$allowed = $accessService->getAllowedRolesForUser($user);

// The whole tree, as a flat list or as nodes
$roles = $accessService->getRoles();            // UserRole[]
$nodes = $accessService->getRoleFlatNodes();    // NodeInterface[]
$node = $accessService->getRoleNodeById('manager');
$tree = $accessService->getRolesTree();         // Root node

// Static roles only, or database roles only
$tree = $accessService->loadStaticRoles();
$tree = $accessService->loadDBRoles();
```

`isParentRole()` and `isChildRole()` return `FALSE` when the reference role has no descendants. Use `getAllowedRolesForUser()` to hide role options from users who should not hand out higher roles.

## Comparing Privileges

Two methods compare what two users, or two role lists, may do. The operators are `>`, `>=`, `=`, `<` and `<=`, and any other value throws `InvalidArgumentException`.

```php
// Does A hold permissions that B lacks, and nothing less?
$accessService->compareUserPrivileges($userA, $userB, '>');

$accessService->compareRolesPrivileges($rolesA, $rolesB, '>=');
```

- `>`: A has something B lacks, and B has nothing A lacks.
- `>=`: B has nothing A lacks.
- `=`: both sets are the same.
- `<` and `<=`: the mirror of `>` and `>=`.

The comparison walks the action names in the static `actions` config, plus `super.user`.

::: warning
A permission that exists only as a policy or a database rule is not compared.
:::

## Configuration Helpers

```php
$accessService->getBasicRoles();       // UserRole[] from basic_roles
$accessService->getSelectableRoles();  // Role IDs from selectable_roles
$accessService->canSelectUserRoles();  // Selector shown, and role.modify?
$accessService->isDbRolesEnabled();    // roles_db_enabled
$accessService->isDbActionsEnabled();  // actions_db_enabled

// Raw rule sources
$rules = $accessService->loadStaticRules();
$rules = $accessService->loadDBRules('product::edit::123');

// Convert between roles and IDs
$role = $accessService->wrapUserRole('manager'); // ?UserRole
$id = $accessService->unwrapRole($role);         // ?string
```

`wrapUserRole()` returns `null` when no role has that ID.

## Constants

```php
AccessService::SUPERUSER_ACTION;     // super.user
AccessService::ADMIN_ACCESS_ACTION;  // admin.access
AccessService::ROLE_MODIFY_ACTION;   // role.modify
```

## Related

- [Roles and Actions](./roles-and-actions) defines the tree and the rules this service reads.
- [ACL Overview](./overview) shows the everyday `can()` entry points.
- [Database Roles and Rules](./database-rules) covers the database-backed sources.
