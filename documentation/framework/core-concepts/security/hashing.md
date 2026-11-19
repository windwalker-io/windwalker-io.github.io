---
layout: doc
title: Hashing
description: When to use PasswordHasher for passwords and Hasher for general digests, and why passwords must never be stored with a fast digest.
---

# Hashing

Hashing turns input into a fixed-length digest. The digest cannot be turned
back into the input. Windwalker provides two classes for two jobs:

- `PasswordHasher` stores and checks passwords.
- `Hasher` computes general digests, such as checksums.

:::info
The standalone package has its own detailed guide: [Crypt](../../../components/crypt/index.md). This page focuses on using it inside the Windwalker framework.
:::

## Passwords and Digests

A password store must resist guessing. `PasswordHasher` wraps PHP's
`password_*` functions. Each hash uses a random salt, and the hash string
records the algorithm and options. Verification reads them from the hash.

`Hasher` uses a fast digest, `sha256` by default. It adds no salt and uses
no secret key. Digests suit checking that data has not changed. They do not
prove who created the data, and they do not protect passwords.

::: warning
Never store passwords with `Hasher`. Fast, unsalted digests let an attacker
test guesses at high speed. Use `PasswordHasher`.
:::

## Setup

Create the hashers directly, or inject them into the services that use them:

```php
use Windwalker\Crypt\Hasher\Hasher;
use Windwalker\Crypt\Hasher\PasswordHasher;

$passwords = new PasswordHasher();
$digests = new Hasher();
```

With no arguments, `PasswordHasher` uses PHP's default algorithm and no
options. `Hasher` uses `sha256`, returns hexadecimal output, and has no
options. The Crypt component page lists the other constructor arguments.

## Register and Log In

This example shows the full flow. `UserRepository` is an application class
that you write. The hasher is injected through the constructor:

```php
use Windwalker\Crypt\Hasher\PasswordHasher;

interface UserRepository
{
    public function findByEmail(string $email): ?array;

    public function create(string $email, string $hash): void;

    public function updateHash(int $id, string $hash): void;
}

class AccountService
{
    public function __construct(
        protected PasswordHasher $hasher,
        protected UserRepository $users,
    ) {
    }

    public function register(string $email, string $password): void
    {
        if ($this->users->findByEmail($email) !== null) {
            throw new \RuntimeException('Email already registered.');
        }

        $this->users->create(
            $email,
            $this->hasher->hash($password)
        );
    }

    public function login(string $email, string $password): bool
    {
        $user = $this->users->findByEmail($email);

        if ($user === null) {
            return false;
        }

        if (!$this->hasher->verify($password, $user['password_hash'])) {
            return false;
        }

        if ($this->hasher->needsRehash($user['password_hash'])) {
            $this->users->updateHash(
                $user['id'],
                $this->hasher->hash($password)
            );
        }

        return true;
    }
}
```

Use it like this:

```php
$service = new AccountService(new PasswordHasher(), $users);

$service->register('ann@example.com', 'correct horse battery');

$service->login('ann@example.com', 'wrong-guess'); // false
$service->login('ann@example.com', 'correct horse battery'); // true
```

::: tip
Store the hash in a column of at least 255 characters. PHP's manual
recommends this so that longer future algorithms fit.
:::

::: info
When no user matches, `login()` returns early. The response time then
differs from a failed password check. If that matters, run a dummy
`verify()` on the early-return path too.
:::

## Hash and Verify

`hash()` returns a new salted hash on every call, so two hashes of the same
password differ. `verify()` checks a plain password against a stored hash:

```php
$hash = $passwords->hash('my-password');

$passwords->verify('my-password', $hash); // true
$passwords->verify('other-password', $hash); // false
```

Use `getInfo()` to read the algorithm and options recorded in a hash:

```php
$info = $passwords->getInfo($hash);

echo $info['algoName']; // bcrypt
```

### Choosing an Algorithm and Options

Pass the algorithm and its options to the constructor. The constants are
the ones PHP defines, such as `PASSWORD_BCRYPT` and `PASSWORD_ARGON2ID`.
Argon2 requires a PHP build with Argon2 support:

```php
use Windwalker\Crypt\Hasher\PasswordHasher;

$bcrypt = new PasswordHasher(PASSWORD_BCRYPT, ['cost' => 12]);

$argon = new PasswordHasher(PASSWORD_ARGON2ID);
```

`PasswordHasher::algos()` lists the algorithms available in the running PHP.
`getAlgo()`, `setAlgo()`, `getOptions()`, and `setOptions()` read and change
the configuration. Each setter returns `$this` for chaining.

## Migrate Hashes with needsRehash

Hashes made with an old algorithm or cost still verify. `needsRehash()`
reports whether a stored hash differs from the current configuration:

```php
$old = new PasswordHasher(PASSWORD_BCRYPT, ['cost' => 10]);
$new = new PasswordHasher(PASSWORD_BCRYPT, ['cost' => 12]);

$hash = $old->hash('secret');

$new->verify('secret', $hash); // true
$new->needsRehash($hash); // true
```

Call `needsRehash()` only after `verify()` succeeds, as the login example
does. Rehash with the plain password you just verified. The stored hash
cannot be rehashed on its own.

## Digests with Hasher

`Hasher` takes the algorithm, a binary-output flag, and options:

```php
use Windwalker\Crypt\Hasher\Hasher;

$digests = new Hasher('sha512');

$digest = $digests->hash('report contents');

$raw = (new Hasher('sha256', true))->hash('report contents');
```

Use `Hasher::algos()` to list the supported algorithms. Store and compare
the hexadecimal output unless a format needs raw bytes.

## Constant-Time Comparison

`Hasher::equals()` and `PasswordHasher::equals()` call `hash_equals()`. The
known value comes first. Compare a stored digest with a digest of the value
that the user sent:

```php
use Windwalker\Crypt\Hasher\Hasher;

$digests = new Hasher();

$expected = $tokenRecord['digest'];

if ($digests->equals($expected, $digests->hash($givenToken))) {
    // The token matches.
}
```

::: warning
Compare secrets and digests with `equals()`, not with `===`. A comparison
that stops at the first differing byte can leak timing information.
:::

## Generate Random Passwords

`PasswordHasher::genRandomPassword()` is static. It draws bytes with
`random_bytes()` and returns a password of 20 characters by default. The
default character set is `PasswordHasher::SEED_ALNUM`, which is letters and
digits. Pass a length and an optional seed string:

```php
use Windwalker\Crypt\Hasher\PasswordHasher;

$default = PasswordHasher::genRandomPassword();

$longer = PasswordHasher::genRandomPassword(32);

$symbols = PasswordHasher::genRandomPassword(
    24,
    PasswordHasher::SEED_ALNUM_SPECIAL_CHARS
);
```

For a temporary account, store only the hash of the generated password:

```php
$temporary = PasswordHasher::genRandomPassword();

$users->updateHash($userId, $passwords->hash($temporary));

// Give $temporary to the user once, and require a change at login.
```

::: warning
Never log a generated password, and never store it in plain text. Show it
once, and make the user change it. A leaked log line exposes the account.
:::

## Related

- [Crypt component](/documentation/components/crypt/) for the full
  constructor options and the other ciphers.
- [Authentication](./authentication) for how login methods use these checks.
