---
layout: doc
title: Authentication Methods
part: Components
chapter: Authentication
menu: components/authentication
component: authentication
---

# Authentication Methods

An authentication method checks one source of credentials. The
`Authentication` object holds several methods and runs them in order.
This lets an application accept logins from a local table, a token
store, or another source without changing the calling code.

To enable methods, create them and pass them to the `Authentication`
object. See the [Introduction](./index) for the minimal setup.

## Showcase

The example below combines two methods. The first is a custom method
that accepts an API token. The second checks a local user list.

```php
use Windwalker\Authentication\AuthResult;
use Windwalker\Authentication\Authentication;
use Windwalker\Authentication\Method\ArrayMethod;
use Windwalker\Authentication\Method\MethodInterface;

class TokenMethod implements MethodInterface
{
    public function __construct(
        private array $tokens,
    ) {
    }

    public function authenticate(array $credential): AuthResult
    {
        $token = $credential['token'] ?? '';

        if ($token === '') {
            return new AuthResult(AuthResult::EMPTY_CREDENTIAL, $credential);
        }

        if (!isset($this->tokens[$token])) {
            return new AuthResult(AuthResult::INVALID_CREDENTIAL, $credential);
        }

        return new AuthResult(AuthResult::SUCCESS, $credential);
    }
}

$auth = new Authentication([
    'token' => new TokenMethod([
        'abc123' => ['username' => 'api-bot'],
    ]),
    'array' => new ArrayMethod([
        'admin' => [
            'password' => password_hash('secret', PASSWORD_DEFAULT),
        ],
    ]),
]);

$results = $auth->authenticate(['token' => 'abc123']);

echo $results->getMatchedMethod(); // token
```

The `token` method runs first and matches, so the `array` method is
never called. Put methods that accept a credential shape in an order
that avoids reading keys the credential does not contain.

## ArrayMethod

`ArrayMethod` checks a username and password against a user list. The
list is keyed by username, and each entry holds a password hash.

```php
use Windwalker\Authentication\Method\ArrayMethod;

$method = new ArrayMethod([
    'alice' => [
        'password' => password_hash('alice-pass', PASSWORD_DEFAULT),
    ],
]);

$method->setUsers([
    'bob' => [
        'password' => password_hash('bob-pass', PASSWORD_DEFAULT),
    ],
]);

$users = $method->getUsers();
```

The credential array must contain both `username` and `password`
keys. Use `setVerifyHandler()` to replace the default
`password_verify()` check. The handler receives the plain password and
the stored hash:

```php
$method->setVerifyHandler(
    fn (string $password, string $hash): bool
        => hash_equals($hash, hash('sha256', $password)),
);
```

## Custom Methods

To support a new source, implement `MethodInterface`. It has one
method, `authenticate(array $credential): AuthResult`. Return
`new AuthResult(AuthResult::SUCCESS, $credential)` on success, or a
status constant on failure, as the showcase does.

Methods are added and removed by name:

```php
$auth->addMethod('token', new TokenMethod([]));

$auth->removeMethod('token');

$method = $auth->getMethod('array');
```

::: info
Methods run in the order they were added. Put the cheapest or most
common method first to avoid extra work on every login.
:::
