---
layout: doc
title: Introduction
part: Components
chapter: Authentication
menu: components/authentication
component: authentication
---

# Introduction

The Authentication component verifies a user's credentials. It does not
store users or manage sessions. Instead, it runs a list of
authentication methods against a credential array and reports the result.

Real applications often accept logins from several sources, such as a
local user table, an API token, or a remote directory. Authentication
keeps these sources behind one call, so the calling code only checks
whether the login succeeded.

## Installation

Install via composer

```bash
composer require windwalker/authentication ^4.0
```

## Main Parts

- **Authentication**: holds the methods and runs them in order.
- **MethodInterface**: the contract for a single authentication method.
  `Method\ArrayMethod` is a built-in implementation.
- **AuthResult**: the outcome of one method, with a status code.
- **ResultSet**: the collected results from all methods tried.

See [Authentication Methods](./authentication-methods) and
[Results](./results) for details.

## Use as Standalone Component

Create the component with one or more methods. Each key is a name
you choose for the method.

```php
use Windwalker\Authentication\Authentication;
use Windwalker\Authentication\Method\ArrayMethod;

$users = [
    'admin' => [
        'password' => password_hash('secret', PASSWORD_DEFAULT),
    ],
];

$auth = new Authentication([
    'array' => new ArrayMethod($users),
]);

$result = $auth->authenticate([
    'username' => 'admin',
    'password' => 'secret',
]);

if ($result->isSuccess()) {
    echo 'Welcome, admin!';
} else {
    echo 'Login failed.';
}
```

`authenticate()` tries each method in order and stops at the first
success. The returned `ResultSet` records which method matched through
`getMatchedMethod()`.

## Use in Windwalker

In a Windwalker application, the host app registers `Authentication` in
the DI container. Declare it as a constructor dependency:

```php
use Windwalker\Authentication\Authentication;

class LoginService
{
    public function __construct(
        private Authentication $auth,
    ) {
    }

    public function login(string $username, string $password): bool
    {
        $result = $this->auth->authenticate([
            'username' => $username,
            'password' => $password,
        ]);

        return $result->isSuccess();
    }
}
```

## Getting Started

A complete flow has three steps: create the methods, run
`authenticate()`, and read the result.

```php
use Windwalker\Authentication\Authentication;
use Windwalker\Authentication\Method\ArrayMethod;

$auth = new Authentication();

$auth->addMethod(
    'array',
    new ArrayMethod([
        'alice' => [
            'password' => password_hash('alice-pass', PASSWORD_DEFAULT),
        ],
    ])
);

$result = $auth->authenticate([
    'username' => 'alice',
    'password' => 'wrong-pass',
]);

if ($result->isFailure()) {
    $failure = $result->getFirstFailure();

    echo $failure->getStatus();
}
```

Each method receives the same credential array, so every method must
accept the keys your form sends.

::: warning
Store only password hashes, created with `password_hash()`. Never
store plain-text passwords in the users array. The default verifier
is `password_verify()`, so a plain-text value will never match.
:::
