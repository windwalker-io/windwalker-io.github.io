---
layout: doc
title: App Secret
---

# App Secret

## Introduction

Every Windwalker application has one root secret, read from the
`APP_SECRET` environment variable. The framework uses it as the input
for keys that protect data, so one value in the environment controls
every derived key. Keep it unique to each environment and out of the code.

This page covers the secret itself. For how environment files are loaded,
see [environment variables](/documentation/framework/core-concepts/applications/environment-variables).

## Minimal Setup

Generate a secret with the `crypt:secret` command:

```bash
php windwalker crypt:secret
```

The command prints a random value with the `base64url:` prefix. The
prefix tells the framework how to decode it. Add the output to your
environment file:

```dotenv
# .env.local
APP_SECRET=base64url:...
```

The application configuration reads the variable into `app.secret`:

```php
// etc/conf/app.config.php
return [
    'secret' => env('APP_SECRET'),
];
```

::: info
`crypt:secret --replace` writes to `.env` by default, not `.env.local`.
Use `--output` to write the value to a file of your choice.
:::

## A Complete Example

The following is a designed example, not a framework class. A service
that signs download links asks `SecretKeeperInterface` for a key derived
for that one purpose:

```php
use Windwalker\Core\Application\SecretKeeperInterface;

class DownloadSigner
{
    public function __construct(
        protected SecretKeeperInterface $secrets,
    ) {}

    public function sign(string $path, int $expires): string
    {
        $key = $this->secrets->getSecret('download-link');

        return hash_hmac('sha256', "$path|$expires", $key);
    }
}
```

The service receives the keeper through its constructor, so the
application container supplies it. The derived key differs from the root
secret and from keys derived for other purposes.

## A Complete Example

A service that signs download links should not use the master secret
directly. It asks `SecretKeeperInterface` for a key that is derived for
one purpose:

```php
use Windwalker\Core\Application\SecretKeeperInterface;

class DownloadSigner
{
    public function __construct(
        protected SecretKeeperInterface $secrets,
    ) {}

    public function sign(string $path, int $expires): string
    {
        $key = $this->secrets->getSecret('download-link');

        return hash_hmac('sha256', "$path|$expires", $key);
    }
}
```

The derived key is different from the master secret and from the keys
derived for other purposes. A leaked download link therefore does not
reveal a key that is used for sessions or encryption.

## Derived Keys

`getSecret()` takes an optional purpose name. With a name, it returns a
32-byte key derived with HKDF-SHA256. The name is the HKDF info string,
and no salt is used. Use one name per purpose, kept in a constant so
signing and verification use the same value (designed example):

```php
final class KeyPurpose
{
    public const DOWNLOAD_LINK = 'download-link';
}

$key = $secrets->getSecret(KeyPurpose::DOWNLOAD_LINK);
```

Without a name, `getSecret()` returns the decoded root secret. Use that
form only when a library needs the raw value.

The framework itself uses this pattern. `TaskPayload` signs task
payloads with a key derived for the `task.run` purpose.

::: warning
A purpose name must match exactly. A changed or misspelled name derives a
different key, so existing signatures stop verifying.
:::

## Empty Secret Behavior

If `APP_SECRET` is not set, `env()` returns `null`, and the keeper
returns an empty string for the unnamed call. The named call fails:

- `getSecret()` with no name returns `''` and raises no error.
- `getSecret('name')` throws a `ValueError` from `hash_hkdf()`.
- Task signing throws a `LogicException` ("An application secret is
  required") when the secret is empty.

::: warning
An unset secret does not stop unnamed calls. Check that `APP_SECRET` is
set in every environment before you deploy.
:::

## Rotating the Secret

Changing `APP_SECRET` changes every key derived from it, so signatures
and encrypted data made with the old value no longer verify. The source
does not define a rotation procedure, so plan the migration yourself.

::: warning
Rotation invalidates data protected with the old secret. Re-encrypt
stored data and reissue signed links before you retire the old value.
:::

## Storage and Safety

Keep a separate secret for each environment, and keep it out of the code.

::: warning
Never commit `APP_SECRET` to git. Do not print it in logs or error
pages. Store it in `.env.local` or in the server environment.
:::

## Related Pages

- [Encryption](/documentation/framework/core-concepts/security/encryption)
  for protecting data at rest.
- [Hashing](/documentation/framework/core-concepts/security/hashing)
  for one-way hashes such as passwords.
- [Crypt component](/documentation/components/crypt/) for the
  standalone cryptography package.
