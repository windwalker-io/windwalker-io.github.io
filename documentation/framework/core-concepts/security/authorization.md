---
layout: doc
title: Authorization
---

# Authorization

The standalone package has its own detailed guide: [Authorization](../../../components/authorization/index.md). This page focuses on using it inside the Windwalker framework.

Authorization decides whether an authenticated user may perform an
action. It answers a different question than
[Authentication](./authentication), which only confirms who the user is.

A policy is a named rule, such as `post.edit`. The policy receives the
user and any extra arguments, and returns `true` or `false`. Controllers,
services and templates ask the policy by name, so the rule lives in one
place instead of being repeated as `if` checks.

The `Authorization` service in the `windwalker/framework` package holds
the policies. Windwalker's core wraps it in `AuthService`, which resolves
the current user for you.

## Enabling Authorization

Register policies under the `auth.authorization.policies` parameter.
`AuthProvider` loads them when the container starts. The config file
is `etc/conf/auth.config.php`. Two forms are supported:

- Named entries: `'name' => Class::class`. The value is resolved from
  the container, then added with `addPolicy()` under the key as the
  policy name. A resolved `PolicyInterface` is added as-is.
- Unnamed entries: a `PolicyProviderInterface` class. It is resolved and
  registered with `registerPolicyProvider()`, so it can add many policies.

```php
// etc/conf/auth.config.php
return [
    'auth' => [
        'authorization' => [
            'policies' => [
                // Named: one policy, the key is its name.
                'article.edit' => ArticleEditPolicy::class,

                // Unnamed: a provider that registers many policies.
                PostPolicyProvider::class,
            ],
        ],
    ],
];
```

Unnamed entries should be providers. A non-provider entry without a
name is passed to `addPolicy()` with its integer index as the name, and
throws `InvalidArgumentException` unless the value is a valid policy.

## Example

This example is designed for this page. It uses a policy provider, an
enum policy name, and a service that checks the policy:

```php
// Designed example: policy provider for posts.
class PostPolicyProvider implements PolicyProviderInterface
{
    public function register(AuthorizationInterface $auth): void
    {
        $auth->addPolicy(
            PostPolicy::EDIT,
            fn (User $user, Post $post): bool
                => $user->id === $post->authorId
                || $user->isAdmin()
        );
    }
}

// Designed example: service that uses AuthService.
class PostService
{
    public function __construct(
        protected AuthService $auth,
    ) {
    }

    public function update(User $user, Post $post): void
    {
        if ($this->auth->cannot(PostPolicy::EDIT, $user, $post)) {
            throw new \RuntimeException('Forbidden', 403);
        }

        // Update the post...
    }
}
```

The `User` and `Post` classes, and the `PostPolicy` enum, come from
your application. The enum is shown in the next section.

## Defining Policies

A policy is either a callback or a `PolicyInterface` object.

### Callback Policies

`addPolicy()` wraps any `callable` in a `CallbackPolicy`. Use it for
simple rules:

```php
use Windwalker\Authorization\AuthorizationInterface;

// Designed example: a single rule, added to the service.
$auth->addPolicy(
    'admin.dashboard',
    fn (User $user): bool => $user->isAdmin()
);
```

Callbacks receive the user and the extra arguments passed to
`authorize()`, in the same order.

### Policy Providers

A `PolicyProviderInterface` groups related rules. Its `register()`
method receives the `AuthorizationInterface` and adds policies to it.
The `PostPolicyProvider` in the [Example](#example) shows this form.

`registerPolicyProvider()` calls `register()` immediately, so the
policies are available as soon as the provider is added.

### Custom Policy Classes

Implement `PolicyInterface` when a rule needs its own logic. The container
can inject services into the class through its constructor, as the config
entry resolves it:

```php
use Windwalker\Authorization\PolicyInterface;

class ArticleEditPolicy implements PolicyInterface
{
    public function authorize(mixed $user, mixed ...$args): bool
    {
        // Replace isAdmin() with the check in your own User class.
        if ($user?->isAdmin()) {
            return true;
        }

        $article = $args[0] ?? null;

        if ($article === null) {
            return false;
        }

        return $article->getCreatedBy() === $user->getId();
    }
}
```

Register it under a name, as shown in
[Enabling Authorization](#enabling-authorization).

### Admin Bypass

Check for administrators first, then the ownership rule. Put the
bypass in the policy so every caller gets it:

```php
use Windwalker\Authorization\AuthorizationInterface;
use Windwalker\Authorization\PolicyProviderInterface;

class ArticlePolicyProvider implements PolicyProviderInterface
{
    public function register(AuthorizationInterface $auth): void
    {
        $auth->addPolicy(
            'article.delete',
            function (mixed $user, mixed ...$args): bool {
                // Replace isAdmin() with the check in your own User class.
                if ($user?->isAdmin()) {
                    return true;
                }

                $article = $args[0] ?? null;

                return $article?->getCreatedBy() === $user?->getId();
            }
        );
    }
}
```

::: warning
Do not rely on a template check for the bypass. Each controller or
service that changes data must call the policy.
:::

### Policy Names

A policy name is a `string` or a `UnitEnum`. Enum names avoid typos:

- A backed enum uses its `value` as the policy name.
- A pure enum uses its case `name`.

```php
// Designed example: a backed enum; the value is the policy name.
enum PostPolicy: string
{
    case EDIT = 'post.edit';
    case DELETE = 'post.delete';
}

$auth->addPolicy(
    PostPolicy::EDIT,
    fn (User $user, Post $post): bool => $user->isAdmin()
);

$auth->authorize(PostPolicy::EDIT, $user, $post);
```

Any other value passed as a policy, such as an object that is neither
callable nor a `PolicyInterface`, throws an `InvalidArgumentException`.

## Checking in Code

`AuthService` (`Windwalker\Core\Auth\AuthService`) exposes three methods:

- `authorize($policy, $user = null, ...$args)`: returns the policy result.
- `can($policy, $user = null, ...$args)`: `true` when the policy allows.
- `cannot($policy, $user = null, ...$args)`: the negation of `can()`.

Pass the user as the second argument, and the policy arguments after it.
`AuthService` does not look up the user for you. Get it with
`AuthService::getUser()`, which calls the handler set by
`setUserRetrieveHandler()`. The default handler returns `null`.

```php
// Designed example: pass the user explicitly, then the arguments.
if ($this->auth->can(PostPolicy::EDIT, $user, $post)) {
    // Allowed.
}

// Designed example: let AuthService resolve the current user.
if ($this->auth->can(PostPolicy::EDIT, null, $post)) {
    // Allowed for the current user.
}
```

For controller-level checks, `RequestAssert::assertForbidden()` and
`assertUnauthorized()` throw `UnauthorizedException` with status 403 or
401 when the condition fails.

## Checking in Templates

Edge templates provide `@can` and `@cannot`. They call `can()` and
`cannot()` on `AuthService` with the same arguments, so the user comes
before the policy arguments. Pass `null` to use the current user:

```edge
@can('post.edit', null, $post)
    <a href="/posts/{{ $post->id }}/edit">Edit</a>
@endcan

@cannot('admin.dashboard', null)
    <p>You do not have access to the dashboard.</p>
@endcannot
```

The template must have `$app` in scope, because the directives call
`$app->service(AuthService::class)`.

::: tip
Hide links with `@can`, but still check the policy in the controller or
service. A hidden link is not a security control.
:::

## Unknown Policies

`authorize()` throws an `OutOfBoundsException` with the message
`Policy "..." not exists` when no policy has that name. `can()` and
`cannot()` call `authorize()`, so they throw too. Check the name first
when it comes from user input.

For the `Authorization` class and the component internals, see the
[Authorization component](/documentation/components/authorization/).

::: warning
Authorization only works where you call it. A route that does not call
`can()`, `authorize()`, or `@can` is open to every authenticated user, so
check each action that changes data.
:::

