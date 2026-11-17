---
layout: doc
title: Authentication
---

# Authentication

Authentication checks a user's credentials and answers one question: is
this login valid? It does not decide what the user may do. For that, see
[Authorization](/documentation/components/authorization/).

Applications often accept logins from several sources, such as a local
user table and a company directory. Windwalker runs the methods in order
and stops at the first success, so the calling code makes one call for
all of them.

## How the Parts Fit Together

- **Methods** implement `Windwalker\Authentication\Method\MethodInterface`.
  Each method checks one source and returns an `AuthResult`.
- **AuthProvider** (`Windwalker\Core\Provider\AuthProvider`) reads the
  `auth.authentication.methods` parameter and registers each method.
- **AuthService** (`Windwalker\Core\Auth\AuthService`) is the entry point
  your code calls. It wraps the authentication and authorization parts.

## Enabling Authentication

The host app enables the provider and lists the methods in
`etc/conf/auth.config.php`. The method names are your choice.

```php
<?php

declare(strict_types=1);

namespace App\Config;

use Lyrasoft\Luna\Auth\LunaAuthMethod;
use Windwalker\Core\Provider\AuthProvider;

use function Windwalker\DI\create;
use function Windwalker\ref;

return [
    'providers' => [
        AuthProvider::class,
    ],

    'authentication' => [
        'methods' => [
            'database' => ref('auth.factories.methods.database'),
        ],
    ],

    'factories' => [
        'methods' => [
            'database' => create(
                LunaAuthMethod::class,
                options: [],
            ),
        ],
    ],
];
```

`create()` builds the method through the container, so its constructor
dependencies, such as the database and config, are injected. `ref()`
points the method list at that factory.

Inject `AuthService` where you need it. Do not create a container yourself:

```php
use Windwalker\Core\Auth\AuthService;

class LoginService
{
    public function __construct(
        protected AuthService $auth,
    ) {
    }
}
```

## Complete Example

The following example is designed for this page. It uses the host's
configured methods to check a login and returns the matched user data.

```php
use Windwalker\Core\Auth\AuthService;

class LoginService
{
    public function __construct(
        protected AuthService $auth,
    ) {
    }

    public function login(string $username, string $password): ?array
    {
        $resultSet = null;

        $result = $this->auth->authenticate(
            [
                'username' => $username,
                'password' => $password,
            ],
            $resultSet
        );

        if ($result === false) {
            return null;
        }

        // The matched credential holds the user row the method merged in.
        return $result->getCredential();
    }
}
```

The host's login controller (`Lyrasoft\Luna\Module\Front\Auth\AuthController`)
uses the same flow through `UserService::attemptToLogin()`, which is not
part of this example.

## Built-in Database Method

`Windwalker\Core\Auth\Method\DatabaseMethod` checks a row in a user table.
Its constructor takes a database adapter, the config object, and options.
The container injects the first two. Set the options in the `create()` call:

```php
'database' => create(
    DatabaseMethod::class,
    options: [
        'table' => 'users',
        'login_name' => ['username', 'email'],
        'id_name' => 'id',
        'password_algo' => PASSWORD_DEFAULT,
    ],
),
```

- `table`: the user table. It is required.
- `login_name`: the column or columns to match. Pass an array to accept
  several login names, such as username and email.
- `id_name`: the primary key column. Defaults to `id`.
- `password_algo`: the algorithm passed to `password_hash()`. Defaults to
  `PASSWORD_DEFAULT`.

The method returns `EMPTY_CREDENTIAL` when the login name or password is
missing, `USER_NOT_FOUND` when no row matches, and `INVALID_PASSWORD` when
the hash does not match.

::: warning
When a password hash needs rehashing, `DatabaseMethod` writes the new hash
to the table after a successful login. Make sure the table is writable by
the application.
:::

The host's Luna method (`Lyrasoft\Luna\Auth\LunaAuthMethod`) follows the
same pattern. It resolves the user table from `user.entity` through the
ORM, and it accepts `email` as an extra login name by default.

## Custom Methods

A method implements `MethodInterface` and returns an `AuthResult`. The
result's status tells the caller why the attempt failed. The following
LDAP method is an example designed for this page, not a built-in class.
It checks a user against an LDAP server:

```php
use Windwalker\Authentication\AuthResult;
use Windwalker\Authentication\Method\MethodInterface;

class LdapMethod implements MethodInterface
{
    public function __construct(
        protected string $host,
    ) {
    }

    public function authenticate(array $credential): AuthResult
    {
        $username = $credential['username'] ?? '';
        $password = $credential['password'] ?? '';

        if ($username === '' || $password === '') {
            return new AuthResult(
                AuthResult::EMPTY_CREDENTIAL,
                $credential
            );
        }

        $conn = ldap_connect($this->host);
        $dn = 'uid=' . ldap_escape($username, '', LDAP_ESCAPE_DN)
            . ',dc=example,dc=com';

        if (@ldap_bind($conn, $dn, $password)) {
            return new AuthResult(AuthResult::SUCCESS, $credential);
        }

        return new AuthResult(
            AuthResult::INVALID_CREDENTIAL,
            $credential
        );
    }
}
```

::: warning
Escape user input before putting it into an LDAP distinguished name.
Without `ldap_escape()`, a crafted username can change the query.
:::

## Combining Methods

Pass a credential array to `AuthService::authenticate()`. Pass a
`ResultSet` variable as the second argument to receive the outcome of
every method that ran:

```php
use Psr\Log\LoggerInterface;
use Windwalker\Core\Auth\AuthService;

class LoginService
{
    public function __construct(
        protected AuthService $auth,
        protected LoggerInterface $logger,
    ) {
    }

    public function login(string $username, string $password): bool
    {
        $resultSet = null;

        $result = $this->auth->authenticate(
            [
                'username' => $username,
                'password' => $password,
            ],
            $resultSet
        );

        if ($result === false) {
            foreach ($resultSet->getResults() as $name => $item) {
                $this->logger->info(
                    "Auth method $name failed: " . $item->getStatus()
                );
            }

            return false;
        }

        return true;
    }
}
```

Methods run in the order of the configuration. If one method fails, the
next one is tried. The first `SUCCESS` ends the chain, and the failures of
earlier methods are still available in the `ResultSet`.

::: tip
Log the detailed status codes, but show users one generic message such
as "Invalid username or password."
:::

::: warning
Do not show `USER_NOT_FOUND` and `INVALID_PASSWORD` to end users. Those
two messages let attackers find which usernames exist.
:::

## Details

The `Authentication` class, `ResultSet`, and the built-in methods are
described in the [Authentication component](/documentation/components/authentication/).
