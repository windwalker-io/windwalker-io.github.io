---
layout: doc
title: Language
---

# Language

Internationalization (i18n) lets one application serve users in several
languages. Without it, every label, message, and email is hard-coded in one
language. With it, the code asks for a key such as `user.welcome`, and the
framework returns the text that matches the current locale, such as
`Welcome` for `en-US` or `歡迎` for `zh-TW`.

## Enabling the Language Service

The Core `LangService` is registered as a shared service. Inside a Windwalker
application, obtain it from the container or inject it into a class:

```php
use Windwalker\Core\Language\LangService;

// Resolve from the container
$lang = $container->get(LangService::class);

// Or inject it in a constructor
class ReportService
{
    public function __construct(
        protected LangService $lang,
    ) {
    }
}
```

Classes that use the `TranslatorTrait` receive the service through
`#[Inject] LangService $lang`, so they can call `$this->trans()` directly.

For standalone use, the underlying `Windwalker\Language\Language` class
can be created without the framework. Use it when you have no container.

## Setup

### Configuration

The language configuration lives in `etc/packages/language.config.php`.
Core provides these defaults:

```php
// Core defaults, roughly
return [
    'locale' => env('APP_LOCALE') ?: 'en-US',
    'fallback' => 'en-US',
    'paths' => ['@languages'],
    'debug' => env('LANG_DEBUG'),
];
```

Override the values in your project config. The host application sets
`locale` to `zh-TW`:

```php
// etc/packages/language.config.php
return [
    'locale' => 'zh-TW',
    'fallback' => 'en-US',
];
```

- `locale`: the default locale used when the application starts.
- `fallback`: the locale used when a key is missing in the current locale.
- `paths`: directories scanned for translation files, resolved by path alias.
- `debug`: wraps translated strings and missing keys to make them visible.
  Debug output needs both `app.debug` and `language.debug` enabled.

### File Formats

Translation files are loaded through the `FormatRegistry`. The supported
formats are:

- `ini`
- `json`
- `php`
- `yaml` (also accepted as `yml`)

Place each locale in its own directory under `resources/languages`, using
the locale code as the directory name. Use the same file name in each
locale:

```text
resources/languages/
├── en-US/
│   └── main.ini
└── zh-TW/
    └── main.ini
```

A sample `main.ini` file:

```ini
; resources/languages/en-US/main.ini
user.welcome = "Welcome, :name"
user.logout = "Log out"
```

The same keys in the other supported formats:

```json
{
    "user": {
        "welcome": "Welcome, :name",
        "logout": "Log out"
    }
}
```

```php
<?php
// resources/languages/en-US/main.php
return [
    'user.welcome' => 'Welcome, :name',
    'user.logout' => 'Log out',
];
```

```yaml
# resources/languages/en-US/main.yaml
user.welcome: "Welcome, :name"
user.logout: "Log out"
```

::: info
The `Language::load()` method defaults to `ini`, while
`LangService::loadFile()` defaults to `php`. Pass the format explicitly
to avoid surprises.
:::

For basic usage with components, see
[Language Component](/documentation/components/language/) and
[Translation](/documentation/components/language/translation).

## Complete Example

The following example reads a translation for the current locale.
It loads the `main` file, sets the locale, and prints the result:

```php
<?php

use Windwalker\Core\Language\LangService;

// Obtain the shared language service
$lang = $container->get(LangService::class);

// Load the translation file for the current locale
$lang->loadFile('main', 'ini');

// Translate a key with a placeholder
echo $lang->trans('user.welcome', ['name' => 'Alice']);
// Output with zh-TW: 歡迎, Alice (depends on your translation)

// Missing keys return the key itself
echo $lang->trans('user.unknown');
// Output: user.unknown
```

::: info
When a key is missing in every loaded file, `trans()` returns the key itself.
This keeps pages readable during development, but it can hide missing
translations in production.
:::

## Basic Features

### Default Locale Setup

The `LanguagePackage` registers `LangService` as a shared service during
registration. The `LangService` constructor creates a `Language` object
from `language.locale` and `language.fallback`, and registers the
`language.paths` directories. Each request therefore starts with the
configured default locale, without any extra code.

### Switching the Locale

The shared `LangService` forwards `setLocale()` and `getLocale()` to its
inner `Language` object:

```php
// Change the locale for the current request
$lang->setLocale('en-US');

// Read the locale in use
echo $lang->getLocale(); // en-US
```

::: warning
`setLocale()` changes the shared service for the rest of the request.
Use the clone method described below when the change should be temporary.
:::

### Loading Translation Files

Translation files are loaded per locale. Use `loadFile()` for one file or
`loadAll()` to load every file in the locale directory:

```php
// Load one file for the current locale
$lang->loadFile('main', 'ini');

// Load every ini file from the locale directory
$lang->loadAll('ini');

// Load the files shipped with a vendor package
$lang->loadAllFromVendor(SomeVendorPackage::class, 'ini');
```

`loadAllFromVendor()` takes the package class as its first argument. The
host application uses it in its `FrontMiddleware` to load vendor files at
request time.

## Dynamic Locale Switching

The built-in language mechanism is static. It reads the locale from
configuration when the application starts, and it does not detect the
user's language, read the URL, or store a preference. These features depend
on each project, so you implement them yourself, for example:

- Switching locale by a URL segment or query parameter.
- Choosing a locale by route.
- Detecting the browser's `Accept-Language` header.
- Remembering the user's choice in the session.

The middleware below lets the user switch the locale with
`?lang=en-US`. It validates the value, stores it in the session, and
applies it to the language service:

```php
<?php

namespace App\Middleware;

use Psr\Http\Message\ServerRequestInterface;
use Windwalker\Core\Language\LangService;
use Windwalker\Core\Middleware\AbstractLifecycleMiddleware;
use Windwalker\Session\Session;

class LocaleMiddleware extends AbstractLifecycleMiddleware
{
    public function __construct(
        protected LangService $lang,
        protected Session $session,
    ) {
    }

    protected function preprocess(ServerRequestInterface $request)
    {
        $allowed = ['en-US', 'zh-TW'];

        // Read the locale from the query string
        $locale = $request->getQueryParams()['lang'] ?? null;

        if ($locale !== null && in_array($locale, $allowed, true)) {
            $this->session->set('locale', $locale);
        }

        // Fall back to the value stored in the session
        $locale = $this->session->get('locale');

        if ($locale !== null && in_array($locale, $allowed, true)) {
            $this->lang->setLocale($locale);
        }
    }
}
```

Register the middleware in the route that needs it, as described in
[Middleware](/documentation/framework/core-concepts/http-routing/middleware).

::: warning
Never trust a locale value from the URL without checking it against a list
of allowed locales. An unchecked value can load files from unexpected
paths or store arbitrary data in the session. The example above validates
the value before it is used.
:::

::: tip
Keep the list of allowed locales in one place, such as the project config,
so the middleware and the language configuration do not drift apart.
:::

## Other Locales

### Cloning for Another Locale

`LangService::cloneForLocale()` returns a copy of the service with another
locale. The original service keeps its locale, so you can translate other
languages without changing the rest of the request:

```php
// The original stays in its current locale
$zh = $lang->cloneForLocale('zh-TW');
$zh->loadFile('main', 'ini');

echo $zh->trans('user.logout'); // Output: 登出
echo $lang->trans('user.logout'); // Output: Log out
```

### Background Email in the User's Locale

A background job often runs outside the request that created it. It should
use the locale stored with the user, not the locale of the worker process.
The example below sends a notification in the user's preferred locale:

```php
<?php

use Windwalker\Core\Language\LangService;

class SendWelcomeMail
{
    public function __construct(
        protected LangService $lang,
    ) {
    }

    public function handle(object $user): void
    {
        // Use the user's preferred locale, stored in your user table
        $userLang = $this->lang->cloneForLocale($user->locale);
        $userLang->loadFile('main', 'ini');

        $subject = $userLang->trans(
            'user.welcome',
            ['name' => $user->name],
        );
        $body = $userLang->trans('user.logout');

        // Replace with your project's mailer
        // $this->mailer->send($user->email, $subject, $body);
    }
}
```

::: tip
Store each user's preferred locale in the database, and pass it to the job.
Do not rely on the locale of the request that queued the job.
:::

## Related Documentation

- [Language Component](/documentation/components/language/)
- [Translation](/documentation/components/language/translation)
- [Middleware](/documentation/framework/core-concepts/http-routing/middleware)
