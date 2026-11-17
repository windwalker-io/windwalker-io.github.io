---
layout: doc
title: Encryption
---

# Encryption

Encryption protects data you need to read back later, such as an API token
stored in a database or a file that a job decrypts. Windwalker's
`SodiumCipher` provides symmetric encryption, where the same key encrypts
and decrypts. It is built on libsodium, which is the recommended backend.

## Overview

Encryption suits data your application must read back later, such as an API
token saved in a database or a file a job decrypts. Hashing cannot do this,
because a hash is one-way.

The Crypt package provides the cipher and the value objects around it:

- `SodiumCipher`: the libsodium symmetric cipher. It is the recommended choice.
- `CipherInterface`: the contract for ciphers. Type-hint against it.
- `Key`: a key object. It extends `HiddenString`.
- `HiddenString`: holds a sensitive value. Call `get()` to read it.

## Minimal Usage

Create a `SodiumCipher`, generate a key, and pass the same key to `encrypt()`
and `decrypt()`:

```php
use Windwalker\Crypt\Symmetric\SodiumCipher;

$cipher = new SodiumCipher();

$key = SodiumCipher::generateKey();

$encrypted = $cipher->encrypt('secret-token', $key);

echo $cipher->decrypt($encrypted, $key)->get(); // secret-token
```

`encrypt()` returns an encoded string. `decrypt()` returns a `HiddenString`,
so call `get()` to read the plain value.

::: warning
Losing the key makes the encrypted data unrecoverable. Store keys in a secret
store or the application secret, never in the same row as the ciphertext.
:::

## Complete Example

The following example stores a generated key in a file outside the database
and encrypts a token before it is saved. The key file path is an example.

```php
use Windwalker\Crypt\Symmetric\SodiumCipher;
use Windwalker\Crypt\SecretToolkit;

$keyFile = '/var/secrets/token.key';

if (!is_file($keyFile)) {
    $keyString = SecretToolkit::genSecret(
        SODIUM_CRYPTO_STREAM_KEYBYTES
    );

    file_put_contents($keyFile, $keyString);
    chmod($keyFile, 0600);
}

$keyString = trim(file_get_contents($keyFile));

$cipher = new SodiumCipher();

$encrypted = $cipher->encrypt('api-token-123', $keyString);

// Save $encrypted to the database.

$plain = $cipher->decrypt($encrypted, $keyString);

echo $plain->get(); // api-token-123
```

## Keys

### Generate a Key

`SodiumCipher::generateKey()` returns a `Key` with random bytes. The default
length is `SODIUM_CRYPTO_STREAM_KEYBYTES`, which is 32 bytes.

```php
use Windwalker\Crypt\Symmetric\SodiumCipher;

$key = SodiumCipher::generateKey();
```

### Store a Key as a String

`Key` holds raw bytes, and `(string) $key` returns an empty string. Do not
cast a `Key` to store it. Generate the key as a prefixed string instead, with
`SecretToolkit::genSecret()`, and save that string:

```php
use Windwalker\Crypt\SecretToolkit;

$keyString = SecretToolkit::genSecret(SODIUM_CRYPTO_STREAM_KEYBYTES);

// Save $keyString to your configuration or secret store.
```

`encrypt()` and `decrypt()` accept the prefixed string directly. They decode
the prefix before use, so the stored string and the generated key match.

::: info
`Key::strip()` decodes any string that starts with a known encoding prefix.
Use a raw key of exactly 32 bytes or a prefixed string from `SecretToolkit`.
:::

## Encoders

`encrypt()` returns a text string, and `decrypt()` reads the same format. The
default encoder is `ENCODER_BASE64URLSAFE`. The third argument accepts an
encoder constant or a callable. Use the same encoder for both calls.

```php
$encrypted = $cipher->encrypt('api-token-123', $key);

$plain = $cipher->decrypt($encrypted, $key);
```

## HiddenString Handling

`HiddenString` keeps a value out of debug output and serialization:

- `get()` returns the plain value.
- `var_dump()` and `print_r()` show `[redacted]` in place of the value.
- `serialize()` throws `LogicException`.

::: warning
`HiddenString::__toString()` returns the plain value. Do not echo a
`HiddenString`, interpolate it into a string, or write it to a log. Call
`get()` only where the plain value is needed.
:::

## Repository Wrapper

The following class is a design of this manual, not a built-in helper. It
wraps the cipher for one column:

```php
use Windwalker\Crypt\Symmetric\CipherInterface;

class TokenRepository
{
    public function __construct(
        protected CipherInterface $cipher,
        protected string $keyString,
    ) {
    }

    public function encryptToken(string $token): string
    {
        return $this->cipher->encrypt($token, $this->keyString);
    }

    public function decryptToken(string $encrypted): string
    {
        return $this->cipher
            ->decrypt($encrypted, $this->keyString)
            ->get();
    }
}
```

## Key Rotation

When you rotate a key, data encrypted with the old key must still decrypt.
`RotatingCipher` is a design of this manual, not a built-in class. It
implements `CipherInterface`, so it can replace `SodiumCipher` anywhere that
interface is type-hinted. Its constructor takes only the old keys. The current
key is passed to `encrypt()` and `decrypt()` as usual.

`decrypt()` tries the key you pass first, then each old key. It catches only
`UnexpectedValueException`, which `SodiumCipher` throws when the authentication
check fails:

```php
use Windwalker\Crypt\HiddenString;
use Windwalker\Crypt\Key;
use Windwalker\Crypt\Symmetric\CipherInterface;
use Windwalker\Crypt\Symmetric\SodiumCipher;

class RotatingCipher implements CipherInterface
{
    protected SodiumCipher $cipher;

    /**
     * @param  string[]|Key[]  $oldKeys  Keys retired by rotation.
     */
    public function __construct(
        protected array $oldKeys = [],
    ) {
        $this->cipher = new SodiumCipher();
    }

    public function encrypt(
        HiddenString|string $str,
        Key|string $key,
        string|callable $encoder = ENCODER_BASE64URLSAFE
    ): string {
        // Always write with the current key, never with an old one.
        return $this->cipher->encrypt($str, $key, $encoder);
    }

    public function decrypt(
        string $str,
        Key|string $key,
        string|callable $encoder = ENCODER_BASE64URLSAFE
    ): HiddenString {
        $keys = [$key, ...$this->oldKeys];

        foreach ($keys as $candidate) {
            try {
                return $this->cipher->decrypt($str, $candidate, $encoder);
            } catch (\UnexpectedValueException) {
                // Wrong key for this value; try the next one.
            }
        }

        throw new \RuntimeException('No key could decrypt the value.');
    }

    public static function generateKey(?int $length = null): Key
    {
        return SodiumCipher::generateKey($length);
    }
}

// Current key is the newest; old keys stay until no record uses them.
$cipher = new RotatingCipher(oldKeys: [$oldKeyString]);

$encrypted = $cipher->encrypt('api-token-123', $newKeyString);

// Decrypts with $newKeyString, or falls back to $oldKeyString.
$plain = $cipher->decrypt($legacyEncrypted, $newKeyString)->get();
```

::: tip
Re-encrypt old records with the newest key during a maintenance task. Remove
an old key only after no record depends on it.
:::

::: warning
The wrapper cannot tell a wrong key from corrupt data. Both fail the MAC
check, so both end in the `RuntimeException` after every key is tried.
:::

## Use in Windwalker

In a Windwalker app, the container binds `CipherInterface` to the default
cipher configured under `crypto`. The default is `sodium`. Inject the
interface through a constructor instead of creating a cipher yourself:

```php
use Windwalker\Crypt\Symmetric\CipherInterface;

class SecretService
{
    public function __construct(
        protected CipherInterface $cipher,
    ) {
    }
}
```

Retrieve it with `$app->retrieve(CipherInterface::class)` when a constructor
is not available. Do not create a new `Container` in your code.

For the component's own configuration options, see the
[Crypt component](/documentation/components/crypt/) page.
