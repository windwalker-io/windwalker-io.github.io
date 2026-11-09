---
layout: doc
title: Introduction
part: Components
chapter: Authorization
menu: components/authorization
component: authorization
---

# Introduction

The Authorization component provides a simple ACL (access control list) layer. You register named policies, each one a callable or a `PolicyInterface` object, and then ask whether a given user may perform an action. Policies keep permission rules in one place, so controllers and services do not need to repeat the same checks.

## Installation

Install via composer

```bash
composer require windwalker/authorization ^4.0
```

## Use as Standalone Component

Create an `Authorization` instance and register policies with `addPolicy()`. Each policy receives the user and any extra arguments, and returns a `bool`.

```php
use Windwalker\Authorization\Authorization;

$auth = new Authorization();

$auth->addPolicy(
    'post.edit',
    fn (User $user, Post $post): bool
        => $user->id === $post->authorId
        || $user->isAdmin()
);

if ($auth->authorize('post.edit', $currentUser, $post)) {
    // Allowed
}
```

Policy names may be strings or `UnitEnum` cases. Enum names are converted to their values, so the same enum can be used in both `addPolicy()` and `authorize()`.

Calling `authorize()` with a name that was never registered throws an `OutOfBoundsException`. Check first with `hasPolicy()` if the name may be unknown.

## Use in Windwalker

Assume the host app has already configured DI. Get the shared `Authorization` instance from the container, or declare it as a constructor dependency:

```php
use Windwalker\Authorization\AuthorizationInterface;

class PostService
{
    public function __construct(
        protected AuthorizationInterface $auth,
    ) {
    }

    public function update(User $user, Post $post): void
    {
        if (!$this->auth->authorize('post.edit', $user, $post)) {
            throw new \RuntimeException('Forbidden');
        }

        // Update the post
    }
}
```

## Getting Started

Use policy classes for rules that are larger than a closure. A class implements `PolicyInterface`, and a provider implements `PolicyProviderInterface` to register several policies at once:

```php
use Windwalker\Authorization\AuthorizationInterface;
use Windwalker\Authorization\PolicyProviderInterface;

class PostPolicyProvider implements PolicyProviderInterface
{
    public function register(AuthorizationInterface $auth): void
    {
        $auth->addPolicy('post.edit', fn (User $u, Post $p): bool
            => $u->id === $p->authorId);

        $auth->addPolicy('post.delete', fn (User $u): bool
            => $u->isAdmin());
    }
}

$auth = new Authorization();
$auth->registerPolicyProvider(new PostPolicyProvider());
```

::: info
`registerPolicyProvider()` calls `register()` immediately, so policies are available as soon as the method returns.
:::

::: warning
A policy only answers the question you ask. The component does not enforce access on its own. Always check the result of `authorize()` before performing the protected action.
:::
