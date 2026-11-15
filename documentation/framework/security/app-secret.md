---
layout: doc
title: App Secret
---

# App Secret

## Introduction

Every Windwalker application has one master secret, stored in the
`APP_SECRET` environment variable. Framework features that need a stable
key, such as encryption and signing, derive their keys from this value.
The secret must be unique to each environment, kept out of the code, and
never shared.

This page covers the secret itself. For how environment files are loaded,
see the [environment variables](/documentation/framework/core-concepts/environment-variables)
page. For the keys of third-party services, see the
[storing API keys](/documentation/framework/core-concepts/environment-variables#storing-api-keys-and-secrets)
section of the same page.

## Minimal Setup

Generate a secret with the `crypt:secret` command:

```bash
php windwalker crypt:secret
```

The command prints a random key with the `base64url:` prefix. The prefix
tells the framework how to decode the value. Put the output in `.env.local`
on the machine that uses it:

```dotenv
# .env.local
APP_SECRET=base64url:...
```

The configuration reads the value into `app.secret`:

```php
// etc/conf/app.config.php
return [
    'secret' => env('APP_SECRET'),
];
```

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

Pass a purpose name to `getSecret()` to derive a 32-byte key with
HKDF-SHA256. Use one name for each purpose, and store the name in a
constant so that the same name is used for signing and verification:

```php
final class KeyPurpose
{
    public const DOWNLOAD_LINK = 'download-link';
}

$key = $secrets->getSecret(KeyPurpose::DOWNLOAD_LINK);
```

Calling `getSecret()` without a name returns the decoded master secret.
Use that form only when a library requires the raw secret. Prefer a
derived key in all other cases.

::: warning
A purpose name must match exactly. A changed or misspelled name derives a
different key, so existing signatures and encrypted data stop verifying.
:::

## Rotating the Secret

Changing `APP_SECRET` changes every key derived from it. Data that was
protected with the old secret cannot be verified with the new one. The
framework reads a single secret, so a rotation needs a migration plan:

- Reissue short-lived tokens, such as download links, after the change.
- Decrypt and re-encrypt stored data with the new secret, if you keep any.
- Schedule the change during a low-traffic window.

::: info
Rotate the secret after a suspected leak, and when a team member who knew
the value leaves. Routine rotation is optional, but each rotation has a
cost, as described above.
:::

## Storage and Safety

Store the secret in `.env.local` or in the server environment. Keep a
separate secret for each environment, and never reuse the production value
on a developer machine.

::: warning
Never commit `APP_SECRET` to git, and never print it in logs, error pages,
or debug output. Debug output can include `$_SERVER`, which contains every
environment variable. Keep `APP_DEBUG` at `0` on public servers.
:::

::: warning
If `APP_SECRET` is not set, `getSecret()` without a name returns an empty
string and raises no error. Calling it with a name fails with a
`ValueError`. Set the secret before you deploy the application.
:::

Keep a copy of the secret in a password manager or a secret store, so that
a lost server does not make the stored data unreadable.

## Related Pages

- [Encryption](/documentation/framework/security/encryption) for protecting
  data at rest.
- [Hashing](/documentation/framework/security/hashing) for one-way hashes
  such as passwords.
