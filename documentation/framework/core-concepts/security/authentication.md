---
layout: doc
title: Authentication
---

# Authentication

The standalone package has its own detailed guide: [Authentication](../../../components/authentication/index.md). This page focuses on using it inside the Windwalker framework.

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

use Windwalker\Core\Auth\Method\DatabaseMethod;
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
                DatabaseMethod::class,
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

A new starter app has no built-in user entity, so this example defines every method
itself. The config file `etc/conf/auth.config.php` lists two methods:
`database` and `ldap`. Windwalker runs them in that order. The `database`
method runs first. The `ldap` method runs only when the database method
does not succeed, and it receives the same credential array.

```php
<?php

declare(strict_types=1);

namespace App\Config;

use App\Auth\LdapMethod;
use Windwalker\Core\Auth\Method\DatabaseMethod;
use Windwalker\Core\Provider\AuthProvider;

use function Windwalker\DI\create;
use function Windwalker\ref;

return [
    'providers' => [
        AuthProvider::class,
    ],

    'authentication' => [
        'methods' => [
            // Runs first.
            'database' => ref('auth.factories.methods.database'),
            // Runs only if the database method fails.
            'ldap' => ref('auth.factories.methods.ldap'),
        ],
    ],

    'factories' => [
        'methods' => [
            'database' => create(
                DatabaseMethod::class,
                options: [
                    'table' => 'users',
                    'login_name' => ['username', 'email'],
                ],
            ),
            'ldap' => create(
                LdapMethod::class,
                host: env('LDAP_HOST'),
            ),
        ],
    ],
];
```

`App\Auth\LdapMethod` is the class from [Custom Methods](#custom-methods).
Put the cheaper local source first, so most logins never reach the
directory server.

The service below checks the login and returns the matched user data:

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

The config file `etc/conf/auth.config.php` lists the methods. The examples
use the framework's `DatabaseMethod`, and an app can add its own class.

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
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Auth\AuthService;

class LoginController
{
    public function login(
        AuthService $auth,
        AppContext $app,
        LoggerInterface $logger,
        string $username,
        string $password,
    ): bool {
        $resultSet = null;

        $result = $auth->authenticate(
            [
                'username' => $username,
                'password' => $password,
            ],
            $resultSet
        );

        if ($result === false) {
            $userMessage = null;

            foreach ($resultSet->getResults() as $name => $item) {
                $detail = $item->exception?->getMessage()
                    ?? $item->getStatus();
                $message = "Auth method $name failed: $detail";

                $logger->info($message);
                
                $userMessage ??= $this->getUserMessage($item);
            }
            
            // Show only the first error to the user.
            $app->addMessage($userMessage, 'warning');

            return $app->nav->back();
        }
        
        $app->addMessage('Login successful', 'success');

        return $app->to('home');
    }
    
    protected function getUserMessage(AuthResult $result): ?string
    {
        return match ($result->getStatus()) {
            AuthResult::EMPTY_CREDENTIAL
                => 'Please enter a username and password.',
            AuthResult::USER_NOT_FOUND,
            AuthResult::INVALID_PASSWORD,
            AuthResult::INVALID_CREDENTIAL
                => 'Invalid username or password.',
            default => null,
        };
    }
}
```

::: warning
The message names the method and its status, which can reveal whether a
username exists. Use `AppContext::addMessage()` for debugging only, and
remove it before the app goes to production.
:::

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

## Result Objects

Each method returns an `AuthResult`. `AuthService` collects them in a
`ResultSet`. The example below shows what each method is for:

```php
use Windwalker\Authentication\AuthResult;
use Windwalker\Authentication\ResultSet;

$credential = ['username' => 'alice', 'password' => 'secret'];

// Build one result per method. Use the status constant that matches
// why the attempt failed, or the named factory methods.
$failed = new AuthResult(AuthResult::INVALID_PASSWORD, $credential);
$ok = AuthResult::success($credential);
$error = AuthResult::authorizeFail(
    $credential,
    new RuntimeException('Role missing'),
);

// AuthResult::status holds the raw status string, such as 'SUCCESS'.
$status = $ok->status;
$ok->getStatus();          // Same value, through a getter.
$ok->isSuccess();          // True only for SUCCESS.
$failed->isFailure();      // True for every other status.
$error->getException();    // The Throwable, or null.
$error->exception;         // Public property, same value.
$ok->getCredential();      // The array the method received.

// A ResultSet is keyed by method name. addResult() returns the set,
// so calls can be chained.
$resultSet = new ResultSet([
    'database' => $failed,
]);
$resultSet->addResult('ldap', $ok);

$resultSet->isSuccess();        // True if any method succeeded.
$resultSet->isFailure();        // The reverse.
$resultSet->count();            // Number of methods that ran.
$resultSet->first();            // The first result, whatever its status.
$resultSet->getFirstSuccess();  // The first SUCCESS, or null.
$resultSet->getFirstFailure();  // The first failure, or null.
$resultSet->getResults();       // All results, keyed by method name.

// Loop over the results for logging.
foreach ($resultSet as $name => $result) {
    echo $name . ': ' . $result->getStatus();
}

// The auth flow sets matchedMethod when a method succeeds.
$resultSet->matchedMethod = 'ldap';
$resultSet->getMatchedMethod();  // 'ldap'
$resultSet->getMatchedResult();  // The 'ldap' AuthResult.
```

`AuthResult` also has factory methods named after each status, such as
`userNotFound()`, `emptyCredential()`, `invalidUsername()`, and
`invalidCredential()`. An unknown method name throws a
`BadMethodCallException`.

## Details

The `Authentication` class, `ResultSet`, and the built-in methods are
described in the [Authentication component](/documentation/components/authentication/).
