---
layout: doc
title: Database Roles and Rules
description: Store roles and per-item rules in the database instead of the config file.
---

# Database Roles and Rules

The static config is ideal while the roles are known when you write the code. It cannot help in two situations. An administrator may need to create a role without a deployment. An owner may need to grant a colleague access to one product, and not to all products.

Luna can read both from the database. The two features are independent, and both are off by default:

```php
// etc/access.config.php
return [
    'roles_db_enabled' => true,
    'actions_db_enabled' => true,
    // ...
];
```

- `roles_db_enabled` merges rows of `user_roles` into the role tree.
- `actions_db_enabled` merges rows of `rules` into the action rules.

Luna provides the tables and the entities `UserRole` and `Rule`. It does not provide an admin screen for them, so your application writes the rows.

## Database Roles

`UserRole` is a nested-set entity with a root row, which Luna's migration creates. A top-level role hangs under the root, and a child role sets `parentId` to its parent:

```php
use Lyrasoft\Luna\Entity\UserRole;
use Unicorn\Enum\BasicState;

$role = new UserRole();
$role->title = 'Editor';
$role->state = BasicState::PUBLISHED;
$role->parentId = 1; // The root row

$role = $orm->createOne(UserRole::class, $role);
```

From here, a database role behaves like a static one. Assign it with `addRolesToUser()` and use its numeric ID in rules:

```php
$accessService->addRolesToUser($user, $role);
$accessService->userIsRole($user, $role); // TRUE
```

Set `state` to unpublished to switch a role off. `getEnabledUserRoles()` skips it, so its users lose the permissions without being unassigned.

::: warning
Database roles attach to the top of the tree, next to the static roles. A database role cannot be placed under a static role such as `member`, and it does not inherit the static rules. Give it its own rules, or reference it in rules explicitly.
:::

::: warning
A static role ID that is numeric, such as `'5'`, collides with the database role of the same ID. The database role wins in lookups. Use readable string IDs for static roles.
:::

Deleting a database role also deletes its user mappings and its rules.

## Rules in the Database

A row in `rules` is one entry of the `actions` config. The `role_id` column can hold a static role ID such as `manager`, or the ID of a database role.

```php
use Lyrasoft\Luna\Entity\Rule;

$rule = new Rule();
$rule->roleId = 'manager';
$rule->name = 'article::publish';
$rule->type = 'article';
$rule->action = 'publish';
$rule->targetId = '';
$rule->allow = true;

$orm->createOne(Rule::class, $rule);
```

`name` is the full action string, and `type`, `action` and `targetId` are its three parts. Keep them consistent. Luna loads database rules by matching the exact action string being checked, so a rule saved as `article::publish` answers `can('article::publish')` and nothing else.

## Rules for a Single Item

Often a user may edit their own products, and not the products of others. The static config cannot list every product, but the database can. Use an action with an ID as its third part: `namespace::action::id`.

First, declare the actions in the static config. The vendor gets `create` globally, and an `edit.own` rule that applies only where an item rule exists. The manager gets a global `edit.own`:

```php
'actions' => [
    'product::create' => ['vendor' => true],
    'product::edit' => ['vendor' => true],
    'edit.own' => ['manager' => true],
],
```

Then, when a vendor saves product 123, write the item rule:

```php
$rule = new Rule();
$rule->roleId = 'vendor';
$rule->name = 'product::edit.own::123';
$rule->type = 'product';
$rule->action = 'edit.own';
$rule->targetId = '123';
$rule->allow = true;

$orm->createOne(Rule::class, $rule);
```

Now the checks differ per item:

```php
// Vendor with a rule for product 123
$userService->can('product::edit.own::123'); // TRUE
$userService->can('product::edit.own::124'); // FALSE

// Vendor, no ID
$userService->can('product::edit.own');      // FALSE

// Manager: the global edit.own matches every ID
$userService->can('product::edit.own::124'); // TRUE
```

Use this to build a list that links only the editable rows:

```php
@foreach ($items as $item)
    @can('product::edit.own::' . $item->id)
        <a href="{{ $nav->to('product_edit')->id($item->id) }}">
            {{ $item->title }}
        </a>
    @else
        {{ $item->title }}
    @endcan
@endforeach
```

Keep `product::edit` for entering the edit page, and `product::edit.own::ID` for choosing the item. Splitting them lets a user open the form without being able to save someone else's item. Guard the save the same way:

```php
if (!$userService->can('product::edit.own::' . $id)) {
    throw new UnauthorizedException('Permission denied');
}
```

An item rule with `allow` set to `false` denies that item for the role, even when a global rule would allow it.

Luna ties item rules to the role, not to the item. Delete an item's rules yourself when you delete the item.

::: tip
When ownership is a column on the item, a [policy](./overview#policies) is simpler and needs no rows. Use database item rules when access is granted explicitly by someone, not derived from the data.
:::

## Related

- [Roles and Actions](./roles-and-actions) explains how action names and inheritance resolve.
- [User Roles](./access-service) covers assigning roles, including database roles.
- [Policies](./overview#policies) covers dynamic checks that need no database rows.
