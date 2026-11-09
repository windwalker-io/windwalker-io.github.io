---
layout: doc
title: Results
part: Components
chapter: Authentication
menu: components/authentication
component: authentication
---

# Results

Every authentication method returns an `AuthResult`. The
`Authentication` object collects these into a `ResultSet`. Together,
they tell the application whether the login worked, which method
matched, and why a method failed.

To learn how methods are set up, see
[Authentication Methods](./authentication-methods).

## AuthResult Statuses

`AuthResult` holds a status code. Use the constants to compare it.

| Constant | Meaning |
|---|---|
| `SUCCESS` | The credential is valid. |
| `EMPTY_CREDENTIAL` | A required credential value is empty. |
| `USER_NOT_FOUND` | No user matches the username. |
| `INVALID_USERNAME` | The username is not accepted. |
| `INVALID_PASSWORD` | The password does not match. |
| `INVALID_CREDENTIAL` | The credential is not valid for this method. |
| `AUTHORIZE_FAIL` | The user was found but is not allowed to log in. |

Check a single result with `isSuccess()`, `isFailure()`, or
`getStatus()`:

```php
use Windwalker\Authentication\AuthResult;

$result = new AuthResult(
    AuthResult::INVALID_PASSWORD,
    ['username' => 'alice', 'password' => 'wrong'],
);

if ($result->isFailure()) {
    echo $result->getStatus(); // INVALID_PASSWORD
}
```

## Showcase

The example below runs two methods, then reads each outcome. It shows
how a `ResultSet` keeps the failure from the first method alongside
the success from the second.

```php
use Windwalker\Authentication\Authentication;
use Windwalker\Authentication\Method\ArrayMethod;

$auth = new Authentication([
    'array' => new ArrayMethod([
        'alice' => [
            'password' => password_hash('alice-pass', PASSWORD_DEFAULT),
        ],
    ]),
    'backup' => new ArrayMethod([
        'bob' => [
            'password' => password_hash('bob-pass', PASSWORD_DEFAULT),
        ],
    ]),
]);

$results = $auth->authenticate([
    'username' => 'bob',
    'password' => 'bob-pass',
]);

if ($results->isSuccess()) {
    $matched = $results->getMatchedResult();

    echo $results->getMatchedMethod(); // backup
    echo $matched->getCredential()['username']; // bob
}
```

## ResultSet

`authenticate()` returns a `ResultSet`. Use these methods to read it:

- `isSuccess()` and `isFailure()` check the overall outcome.
- `getMatchedMethod()` returns the name of the method that succeeded.
- `getMatchedResult()` returns that method's `AuthResult`.
- `getFirstSuccess()` and `getFirstFailure()` return the first
  matching result of each kind.
- `getResults()` returns all results keyed by method name.

The set is also iterable and countable. Loop over it to log every
method's outcome:

```php
foreach ($results as $name => $result) {
    echo $name . ': ' . $result->getStatus() . "\n";
}

echo count($results);
```

`getFirstSuccess()` and `getFirstFailure()` return `null` when no
result of that kind exists, so check before reading them:

```php
$failure = $results->getFirstFailure();

if ($failure !== null) {
    $logger->info('Login failed: ' . $failure->getStatus());
}
```

::: tip
Log the first failure's status when a login fails. It shows the
reason, such as `USER_NOT_FOUND`, without exposing the credential.
:::

## Credential in Results

Each `AuthResult` keeps the credential it was checked with, through
`getCredential()`. Do not return this array to the browser or write
it to logs, because it may contain a password or token.

::: warning
A result can hold the raw credential and the exception thrown by a
method. Never send `getCredential()` or `getException()` to the user
on a failed login.
:::
