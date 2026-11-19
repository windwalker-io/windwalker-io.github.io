---
layout: doc
title: Environment Variables
description: How Windwalker reads .env files and server variables, and why secrets and per-machine values belong in environment variables, not code.
---

# Environment Variables

## Introduction

A Windwalker project runs on several machines: a developer's laptop,
a staging server, and production. Some values differ between them,
such as database credentials, the debug switch, and API keys.
Hard-coding these values in PHP files would require a code change for
every machine. Environment variables solve this problem. The code stays
the same, and each machine supplies its own values.

Windwalker reads environment variables from `.env` files in the project
root and from the server environment. The configuration files in `etc/`
read them with the `env()` helper, and the results become part of the
application configuration.

Use environment variables for:

- Secrets, such as `APP_SECRET`, database passwords, and API keys.
- Values that change per machine, such as the database host or the
  mail server.
- Switches for the runtime, such as `APP_ENV` and `APP_DEBUG`.

Keep the application's structure, such as routing, providers, and
package settings, in the `etc/conf/` files. See the
[configuration](/documentation/framework/getting-started/configuration)
page for that layer.

## Minimal Setup

Create a `.env` file in the project root. The `etc/define.php` file
loads it before the application boots, for both web requests and
console commands:

```dotenv
# .env
APP_ENV=dev
APP_DEBUG=1
APP_TIMEZONE=Asia/Taipei
```

Then read the values in a configuration file with `env()`:

```php
// etc/conf/app.config.php
return [
    'name' => 'Windwalker',
    'debug' => (bool) env('APP_DEBUG'),
    'mode' => env('APP_ENV', 'prod'),
    'timezone' => env('APP_TIMEZONE', 'UTC'),
];
```

The application reads each key at boot, and you access it with
`config()`:

```php
$timezone = $app->config('app.timezone'); // 'Asia/Taipei'
```

## A Complete Example

The following setup gives a development team a shared configuration,
a local development environment, and a production server that
overrides the defaults. The first three files are committed to git,
and `.env` stays on each machine:

```dotenv
# .env.base (committed, shared defaults)
APP_VERBOSITY=1
APP_TIMEZONE=UTC
DATABASE_DRIVER=mysql
DATABASE_PORT=3306
```

```dotenv
# .env.dist (committed, template with blank secrets)
APP_SECRET=
DATABASE_PASSWORD=
```

```dotenv
# .env.dev (committed, development-only values)
MAIL_ENABLED=0
```

```dotenv
# .env (per machine, ignored by git)
APP_ENV=dev
APP_DEBUG=1
APP_SECRET=base64url:...
DATABASE_HOST=127.0.0.1
DATABASE_NAME=shop
DATABASE_USER=shop
DATABASE_PASSWORD=change-me
```

On the production server, `.env.local` holds the overrides for that
machine. The server copies `.env.dist` to `.env` and then sets the
production values in `.env.local`:

```dotenv
# .env.local (production server only)
APP_ENV=prod
APP_DEBUG=0
APP_VERBOSITY=0
APP_SECRET=base64url:...
DATABASE_HOST=db.internal
DATABASE_PASSWORD=...
```

A service then checks the environment through the shared
`AppEnvironmentInterface`:

```php
use Windwalker\Core\Application\AppEnvironmentInterface;

class MailService
{
    public function __construct(
        protected AppEnvironmentInterface $env,
    ) {}

    public function shouldSend(): bool
    {
        return $this->env->getMode() === 'prod';
    }
}
```

On the development machine, `app.mode` is `dev`, and `.env.dev`
is loaded because `APP_ENV` is set. On the production server, the
overrides in `.env.local` replace the development values.

## Loading Order

Windwalker loads the files in the following order. Each later file
overwrites the values of an earlier file:

- `.env.base`: shared defaults for all environments.
- `.env`: the main file for the current machine.
- `.env.local`: machine-specific overrides.
- `.env.{APP_ENV}`: values for the current environment.
- `.env.{APP_ENV}.local`: machine-specific overrides for the current
  environment.

The environment file name depends on `APP_ENV`, and Windwalker reads
`APP_ENV` from the values loaded so far. Set `APP_ENV` in `.env.base`,
`.env`, or `.env.local`. A value that comes only from the server
environment works too, with the limit described in
[Reading and Overriding](#reading-and-overriding). Setting it only
inside `.env.dev` does not select that file, because the file is never
read.

::: warning
Values in `.env` files replace variables that the server has already
set with the same name, for example through Docker, Apache, or a
process manager. A server variable named `APP_ENV` or `APP_SECRET` is
overwritten by the file value. Set each value in one place, and use
`.env.local` on a server for values that must differ from the
committed files.
:::

::: warning
`.env.base` is tracked by git, so every value in it is published with
the code. Use it only for defaults that are safe to share, such as
the time zone or the verbosity level. Never store secrets, such as
`APP_SECRET`, database passwords, or API keys, in committed files.
Keep them in `.env`, `.env.local`, or the server environment, which
git ignores.
:::

::: tip
Commit a `.env.dist` template with blank values. Each developer and
server copies it to `.env` and fills in the values.
:::

## Reading Variables

### The env() Helper

The `env()` helper checks `$_SERVER` first, then `$_ENV`. It returns the
default only when neither array has the name:

```php
$host = env('DATABASE_HOST', '127.0.0.1');
$port = (int) env('DATABASE_PORT', 3306);
```

Environment variables are always strings. Cast the value when a
configuration needs a number or a boolean:

```php
'debug' => (bool) env('APP_DEBUG'),
'cache' => (int) env('CACHE_TTL', 3600),
```

Boolean flags accept only `0` or `1`. Set them in `.env` files as
follows:

```dotenv
APP_DEBUG=1
MAIL_ENABLED=0
```

::: warning
Never write a boolean flag as `true` or `false`. Use `1` to enable and
`0` to disable.
:::

::: info
An empty value, such as `APP_TIMEZONE=`, is set. `env()` returns an
empty string and does not use the default. Remove the line when you
want the default.
:::

::: info
Windwalker does not call `putenv()` for values from `.env` files, so
`getenv()` cannot see them. Read them with `env()`.
:::

### App Environment Settings

Three variables control the runtime environment. The configuration
stores them in the `app` section:

- `APP_ENV` sets `app.mode`. It is the environment name, such as `dev`,
  `test`, or `prod`.
- `APP_DEBUG` sets `app.debug`. Debug mode raises the default
  verbosity.
- `APP_VERBOSITY` sets `app.verbosity`. It controls how much output the
  application shows.

When `APP_ENV` is not set, the default depends on the runtime:

- Web requests use `prod`.
- The CLI server runtime uses `dev`.

The `APP_VERBOSITY` values are:

- `0`: hidden. Web pages do not show error messages.
- `1`: normal. The default outside debug mode.
- `2`: verbose. The default in debug mode.
- `3`: very verbose.

When `APP_VERBOSITY` is not set, the level is `2` in debug mode and `1`
otherwise. In debug mode, a lower value is raised to `2`, so a debug
session always shows verbose output.

::: warning
Set `APP_VERBOSITY=0` on production. On web requests, error messages
are shown in the browser at every level above `0`. Level `0` hides
them.
:::

Branch on the environment with `app.mode` or the `AppEnvironmentInterface`
service, as shown in the example above:

```php
if ($app->config('app.mode') === 'dev') {
    // Development-only behavior.
}
```

### Environment Services

Services should not depend on the whole application when they only need
the environment flags. Inject `AppEnvironmentInterface` instead. It
reads only the `app` configuration and provides these methods:

- `isDebug()`: returns the debug flag.
- `getMode()`: returns the environment name.
- `getName()`: returns the application name.
- `getVerbosity()`: returns an `AppVerbosity` case.
- `isVerbose()`: returns `true` for the verbose levels.

A service that needs the entire application can inject
`ApplicationInterface` instead. For how the container resolves these
bindings, see the [dependency injection](/documentation/framework/core-concepts/dependency-injection/dependency-injection)
page.

## Storing API Keys and Secrets

Third-party services, such as payment gateways, mail providers, and cloud
storage, issue a key and a secret. Treat each secret as a password. Keep
it out of the code and out of git, and read it from the environment.

Name each variable with the service and the purpose, in uppercase with
underscores. The default configuration follows this pattern:

- `AWS_ACCESS_KEY` and `AWS_SECRET` for a cloud storage account.
- `RECAPTCHA_KEY` and `RECAPTCHA_SECRET` for a CAPTCHA service.
- `GOOGLE_SOCIAL_ID` and `GOOGLE_SOCIAL_SECRET` for social login.

Add each key to `.env.dist` with a blank value, so the team knows it
exists. Put the real value in `.env.local` on the machine that needs it:

```dotenv
# .env.dist
PAYMENT_KEY=
PAYMENT_SECRET=
```

```dotenv
# .env.local
PAYMENT_KEY=pk_test_...
PAYMENT_SECRET=sk_test_...
```

Read the values in a configuration file with `env()`. The file below is
an example, and it must be listed in `etc/config.php` like the other
configuration files:

```php
// etc/conf/payment.config.php
return [
    'key' => env('PAYMENT_KEY'),
    'secret' => env('PAYMENT_SECRET'),
];
```

A missing value becomes `null`. Fail fast when a required secret is
absent, instead of sending an empty key to the provider:

```php
$secret = env('PAYMENT_SECRET')
    ?? throw new RuntimeException('PAYMENT_SECRET is not set.');
```

::: tip
Use test or sandbox keys in development, and production keys only on the
production server. A developer machine should never hold a live secret.
:::

Keys that a browser needs, such as a CAPTCHA site key, are public and may
appear in rendered pages. A secret key must never reach a template, a
script, or a response body. Keep the two in separate variables, as the
`RECAPTCHA_KEY` and `RECAPTCHA_SECRET` pair does.

::: warning
Do not put a secret in a URL, such as a query string. Web servers and
proxies record URLs in their access logs.
:::

::: warning
Store a secret in the database only after encrypting it with the
[encryption](/documentation/framework/core-concepts/security/encryption) service.
Plain text in a table is readable by anyone who can read a backup.
:::

Create a separate key for each environment, and use the narrowest
permissions the service offers. Rotate a key at once when it might have
leaked, and remove the key from the service's console when the team member
or the server that used it is retired.

For the master secret that the framework uses internally, see the
[App Secret](/documentation/framework/core-concepts/security/app-secret) page.


## Packages and Environment Modules

A package file in `etc/packages/` can load only in some environments
with the `env` option of the `ConfigModule` attribute. The attribute
checks `APP_ENV` directly, and it treats a missing value as `prod`:

```php
#[ConfigModule(
    name: 'cache',
    env: ['dev', 'test'],
)]
```

The other `ConfigModule` options and the merge rules are described on
the [configuration](/documentation/framework/getting-started/configuration#packages-configuration)
page.

## Common Variables

The default configuration reads the following variables. Each project
can add its own names in the `etc/` files, and each package documents
the variables it reads.

- Application: `APP_ENV`, `APP_DEBUG`, `APP_VERBOSITY`, `APP_SECRET`,
  `APP_TIMEZONE`, and `APP_SERVER_TIMEZONE`.
- Paths: `CACHE_PATH` and `TEMP_PATH`, read in `etc/define.php`.
- Database: `DATABASE_DRIVER`, `DATABASE_HOST`, `DATABASE_PORT`,
  `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and
  `DATABASE_TABLE_PREFIX`.
- Mail: `MAIL_DSN_DEFAULT`, `MAIL_FROM`, and `MAIL_REPLY_TO`.
- Queue: `QUEUE_DEFAULT`.
- Storage: `UPLOAD_STORAGE_DEFAULT`.
- Debugging: `VAR_DUMP_SERVER_HOST` and `DUMP_SERVER_HOST`.

## Environment Variable Files

Windwalker reads these files from the project root. Each file has a
different purpose, and git treats them differently:

- `.env.base`: shared defaults. Committed to git by default.
- `.env`: the values for the current machine. Ignored by git.
- `.env.local`: machine-specific overrides. Ignored by git.
- `.env.{APP_ENV}`: the values for one environment, such as `.env.dev`.
  Committed to git by default.
- `.env.{APP_ENV}.local`: machine-specific overrides for one
  environment. Ignored by git.
- `.env.dist`: a template that Windwalker does not load. Committed to
  git.

The git rules come from the project's `.gitignore`. A typical project
ignores `.env`, `.env.local`, and `.env*.local`, and keeps `.env.dist`
tracked. Check the rules before you add a file, because `.env.base`
and `.env.{APP_ENV}` are committed unless you ignore them.

::: warning
Files that git commits are published with the code. Keep secrets only
in ignored files such as `.env` and `.env.local`, and check that
`.env.base` and `.env.{APP_ENV}` contain no secrets before you commit
them.
:::

Use `.env.dist` as the template for every variable. List each key with
a blank value or a safe default, and copy the file when you set up a
machine:

```bash
cp .env.dist .env
```

When you add a new key, add it to `.env.dist` in the same change, so
that every developer and server knows it exists:

```dotenv
# .env.dist
MAIL_FROM=
MAIL_ENABLED=0
```

## Runtime Behavior

Windwalker loads the files with [Symfony Dotenv](https://symfony.com/doc/current/components/dotenv.html)
in `etc/define.php`. Dotenv writes each value to `$_SERVER` and `$_ENV`.
It does not call `putenv()` by default, so `getenv()` cannot see the
values. Read them with `env()` instead.

`env()` reads `$_SERVER` first and then `$_ENV`. The `Env` class in
`Windwalker\Utilities` performs the same lookup, and it can also set a
value for the current process:

```php
use Windwalker\Utilities\Env;

$name = Env::get('APP_NAME', 'Windwalker');

Env::set('APP_DEBUG', '1');
```

`Env::set()` writes to `$_SERVER`, `$_ENV`, and the process environment.
It changes the value only for the current PHP process and never writes
a file.

Values are always strings, and Windwalker does not convert them. Write
boolean flags as `0` or `1`, and cast numbers explicitly:

```php
'debug' => (bool) env('APP_DEBUG'),
'port' => (int) env('DATABASE_PORT', 3306),
```

::: info
Laravel's `env()` converts the strings `true`, `false`, `null`, and
`empty` to PHP values. Windwalker's `env()` returns the strings as they
are, so the same value needs `0` or `1` and an explicit cast.
:::

::: tip
Do not read `$_ENV` or `$_SERVER` directly in configuration files.
Use `env()`, so the lookup order stays the same across the project.
:::

## Reading and Overriding

Values from `.env` files replace the variables that the server has
already set. Windwalker loads each file with Dotenv's `overload` mode.
With this `.env` file:

```dotenv
# .env
APP_DEBUG=1
```

the command `APP_DEBUG=0 php ...` still reads `1`. The file overwrites
the value from the shell, Docker, or Apache. The loading order is
described in the [loading order](#loading-order) section above.

To use global variables only, such as in a Docker container, do not
ship `.env` files with the image. A `.dockerignore` file keeps them out:

```text
.env*
```

Then pass the values through the container runtime, for example
`docker run -e APP_ENV=prod -e APP_DEBUG=0 ...`. `env()` reads them
from `$_SERVER`, so no file is needed.

::: warning
The environment file name is selected from `$_ENV['APP_ENV']`, not from
`$_SERVER`. A global `APP_ENV` selects `.env.{APP_ENV}` only when PHP's
`variables_order` setting includes `E`. Without it, the selector falls
back to `prod`. Set `APP_ENV` in a `.env` file, or check the setting
before you rely on global variables.
:::

::: tip
With PHP-FPM, a pool that has `clear_env = yes` (the default) hides the
container's variables from the worker processes. Set `clear_env = no` in
the pool, or pass the values through `fastcgi_param`.
:::





