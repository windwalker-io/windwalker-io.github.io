---
layout: doc
title: Introduction
part: Components
chapter: Crypt
menu: components/crypt
component: crypt
---

# Introduction

The Crypt package provides encryption, password hashing, and secret
generation for PHP. It wraps OpenSSL and libsodium behind a small set of
classes: `SodiumCipher` for symmetric encryption, `PasswordHasher` and
`Hasher` for hashing, and `SecretToolkit` for
generating and encoding secrets. Sensitive values are held in
`HiddenString` and `Key` objects, which keep them out of debug output and
serialization.

## Installation

Install via composer

```bash
composer require windwalker/crypt
```

The package requires PHP 8.4.6 or later. It depends on
`paragonie/constant_time_encoding`. The `ext-sodium` and `ext-openssl`
extensions are suggested, not required. Use `SodiumCipher` when libsodium
is available.

## Use as Standalone Component

Generate a secret and encrypt a value:

```php
use Windwalker\Crypt\Symmetric\SodiumCipher;

$cipher = new SodiumCipher();

$key = SodiumCipher::generateKey();

$encrypted = $cipher->encrypt('Hello', $key);

$plain = $cipher->decrypt($encrypted, $key);

echo $plain->get(); // Hello
```

`encrypt()` returns an encoded string, using `ENCODER_BASE64URLSAFE` by
default. `decrypt()` returns a `HiddenString`, so call `get()` to read the
plain value.

Hash and verify a password:

```php
use Windwalker\Crypt\Hasher\PasswordHasher;

$hasher = new PasswordHasher();

$hash = $hasher->hash('my-password');

if ($hasher->verify('my-password', $hash)) {
    // Password is valid.
}
```

Generate a random secret string:

```php
use Windwalker\Crypt\SecretToolkit;

$secret = SecretToolkit::genSecret();
```

## Use in Windwalker

Windwalker packages are usually obtained from the existing container. Do
not create a new `Container` in your code. If `PasswordHasher` or a
cipher is bound in the host app, retrieve it from the container:

```php
$hasher = $container->get(PasswordHasher::class);
```

Or from the application:

```php
$hasher = $app->retrieve(PasswordHasher::class);
```

Inject it as a constructor dependency:

```php
use Windwalker\Crypt\Hasher\PasswordHasher;

class UserService
{
    public function __construct(
        protected PasswordHasher $hasher
    ) {
    }

    public function register(string $password): string
    {
        return $this->hasher->hash($password);
    }
}
```

Inject `CipherInterface` to depend on the cipher contract instead of a
concrete class. The host app's container provides the bound cipher:

```php
use Windwalker\Crypt\Symmetric\CipherInterface;

class TokenService
{
    public function __construct(
        protected CipherInterface $cipher
    ) {
    }

    public function seal(string $value, string $key): string
    {
        return $this->cipher->encrypt($value, $key);
    }
}
```

`SecretToolkit` exposes static helpers, so you can call it directly
without container setup.

## Core Concepts

**Secrets.** `SecretToolkit` generates secrets as raw bytes or as
strings. `genSecret()` returns a string prefixed with its encoder, such as
`base64urlsafe:...`. `decodeIfHasPrefix()` reads that prefix and decodes
the value back to raw bytes. Use `SECRET_128BIT`, `SECRET_192BIT`, and
`SECRET_256BIT` to choose a length in bytes.

**Keys and wrappers.** `Key` extends `HiddenString`. A `HiddenString`
redacts its value in `var_dump()` and `print_r()`, and blocks
serialization. Its memory is zeroed when the object is destroyed. Call
`get()` only when you need the value. It returns a copy by default.

**Encoders.** Ciphers and `SecretToolkit` accept an encoder name, such as
`ENCODER_HEX` or `ENCODER_BASE64`. You can also pass a callable to
encode the output with your own function.

## Symmetric Encryption

`SodiumCipher` uses libsodium and is the recommended cipher for all new
code. Generate a key, encrypt, and decrypt:

```php
use Windwalker\Crypt\Symmetric\SodiumCipher;

$cipher = new SodiumCipher();

$key = SodiumCipher::generateKey();

$encrypted = $cipher->encrypt('Hello', $key);

echo $cipher->decrypt($encrypted, $key)->get();
```

Store the key with a secure mechanism, such as an environment variable
or a secret manager. Do not commit it to source control.

## Password Hashing

`PasswordHasher` wraps PHP's `password_*` functions. Its constructor
takes an algorithm and options:

```php
use Windwalker\Crypt\Hasher\PasswordHasher;

$hasher = new PasswordHasher(PASSWORD_ARGON2ID);

$storedHash = $user->getPasswordHash();

if ($hasher->verify($password, $storedHash)) {
    if ($hasher->needsRehash($storedHash)) {
        $user->setPasswordHash($hasher->hash($password));
    }
}
```

Call `needsRehash()` after a successful login. When the stored hash uses
an older algorithm or cost, rehash the password and save the new value.

`Hasher` computes plain digests with a named algorithm, such as
`sha256`. Use it for checksums and signatures, not for passwords:

```php
use Windwalker\Crypt\Hasher\Hasher;

$hasher = new Hasher('sha256');

$digest = $hasher->hash('data');
```

## Secret Toolkit

Applications often need random values such as API keys, invitation
codes, CSRF tokens, or signing secrets. Generating them with
`random_bytes()` is easy, but storing them as text needs an encoding
and a way to know that encoding later. `SecretToolkit` handles both.
It generates random bytes with `random_bytes()`, encodes them with a
named encoder, and prefixes the result with the encoder name, so the
value can be decoded later without extra configuration.

All methods are static. Generate a string secret and store it:

```php
use Windwalker\Crypt\SecretToolkit;
use const Windwalker\Crypt\SECRET_256BIT;

$apiKey = SecretToolkit::genSecret(SECRET_256BIT);

// Example value: base64url:q8Xr3Vf0...
$config->set('api.key', $apiKey);
```

Later, when the value is read back, decode it. The prefix tells the
toolkit how to decode it:

```php
$raw = SecretToolkit::decode($config->get('api.key'));
```

### Generating Secrets

Use `genRawSecret()` when you need raw bytes, for example as a key for a
cipher or a signing function:

```php
use Windwalker\Crypt\SecretToolkit;
use const Windwalker\Crypt\SECRET_256BIT;

$bytes = SecretToolkit::genRawSecret(SECRET_256BIT);
```

Use `genSecretString()` to get an encoded string with a prefix. The
second argument selects the encoder, such as `ENCODER_HEX`:

```php
use Windwalker\Crypt\SecretToolkit;
use const Windwalker\Crypt\SECRET_128BIT;
use const Windwalker\Crypt\ENCODER_HEX;

$code = SecretToolkit::genSecretString(
    SECRET_128BIT,
    ENCODER_HEX
);
// Example value: hex:3f9a0c...
```

When you need the encoded value without a prefix, call
`genSecretWithoutPrefix()`. Use it only when the format is fixed
elsewhere, because the prefix is what lets the value be decoded without
knowing the encoder in advance:

```php
use Windwalker\Crypt\SecretToolkit;
use const Windwalker\Crypt\SECRET_128BIT;
use const Windwalker\Crypt\ENCODER_BASE32;

$token = SecretToolkit::genSecretWithoutPrefix(
    SECRET_128BIT,
    ENCODER_BASE32
);
```

`genSecret()` is an alias of `genSecretString()`. Passing `-1` as the
length uses `SecretToolkit::$defaultLength`, which is `SECRET_128BIT`
by default. Change it once at bootstrap to set a project-wide length:

```php
use Windwalker\Crypt\SecretToolkit;
use const Windwalker\Crypt\SECRET_256BIT;

SecretToolkit::$defaultLength = SECRET_256BIT;

$secret = SecretToolkit::genRawSecret();
```

### Encoders

The available encoders are listed in the following constants:

- `Windwalker\Crypt\ENCODER_RAW`
- `Windwalker\Crypt\ENCODER_HEX`
- `Windwalker\Crypt\ENCODER_BASE32`
- `Windwalker\Crypt\ENCODER_BASE32HEX`
- `Windwalker\Crypt\ENCODER_BASE64`
- `Windwalker\Crypt\ENCODER_BASE64URLSAFE` (the default)
- `Windwalker\Crypt\ENCODER_BASE64DOTSLASH`

Use `encode()` and `encodeIfNoPrefix()` to encode bytes you already
have:

```php
use Windwalker\Crypt\SecretToolkit;
use const Windwalker\Crypt\ENCODER_BASE64URLSAFE;
use const Windwalker\Crypt\ENCODER_HEX;

$binary = random_bytes(16);

$encoded = SecretToolkit::encode($binary, ENCODER_BASE64URLSAFE);

// Keeps the value unchanged when it already has a known prefix.
$encoded = SecretToolkit::encodeIfNoPrefix($encoded, ENCODER_HEX);
```

Use `encode()` with `$withPrefix = false` to get the bare encoded
string.

::: info
`ENCODER_RAW` returns the input unchanged. It is useful when the value
must stay binary, but the result is not safe to store in plain-text
fields.
:::

### Reading Prefixed Values

Prefixed values carry their encoder name, so the toolkit can inspect
them before decoding:

```php
use Windwalker\Crypt\SecretToolkit;

$value = 'hex:3f9a0c';

if (SecretToolkit::canDecode($value)) {
    $encoder = SecretToolkit::getEncoder($value); // "hex"
    $parts = SecretToolkit::extract($value);     // ["hex", "3f9a0c"]
    $plain = SecretToolkit::stripPrefix($value); // "3f9a0c"
}
```

`extract()` throws `InvalidArgumentException` when the value has no
colon. Check with `canDecode()` first when the input is untrusted.

Use `decode()` when the value must have a known prefix. Use
`decodeIfHasPrefix()` when the value might be a plain string. It returns
the input unchanged if no known prefix is found:

```php
use Windwalker\Crypt\SecretToolkit;

$raw = SecretToolkit::decodeIfHasPrefix($input);
```

When a value has no prefix, `decodeBy()` decodes it with the encoder you
specify:

```php
use Windwalker\Crypt\SecretToolkit;
use const Windwalker\Crypt\ENCODER_HEX;

$raw = SecretToolkit::decodeBy('3f9a0c', ENCODER_HEX);
```

::: warning
Decoding untrusted input can produce a value of unexpected length.
Check the decoded length against what your code expects before using
it as a key.
:::

## Related components

- [Session](/documentation/components/session/) for storing secrets and tokens
  between requests.
