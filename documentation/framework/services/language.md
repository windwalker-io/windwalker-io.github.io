---
layout: doc
title: Language
---

# Language

Internationalization (i18n) lets one application serve users in several
languages. The code asks for a key such as `user.welcome`, and the framework
returns the text for the current locale, such as `Welcome` for `en-US` or
`歡迎` for `zh-TW`. Translations live in files, one directory per locale, so
translators can change text without touching code.

The language system has two layers:

- `Windwalker\Language\Language`: the standalone translator. It has no
  framework dependency.
- `Windwalker\Core\Language\LangService`: the Core service. It implements
  `LanguageInterface` and wraps a `Language` object.

## Enabling the Language Service

`LanguagePackage` registers `LangService` as a shared service. Obtain it
from the container, or inject it into a constructor:

```php
use Windwalker\Core\Language\LangService;

// Resolve from the container
$lang = $container->get(LangService::class);

// Or inject it into a constructor
class ReportService
{
    public function __construct(
        protected LangService $lang,
    ) {
    }
}
```

## Setup

### Configuration

The project config is `etc/packages/language.config.php`. The host
application uses these keys:

```php
// etc/packages/language.config.php
return [
    'debug' => (bool) (env('LANG_DEBUG') ?? false),
    'locale' => 'zh-TW',
    'fallback' => 'en-US',
    'paths' => [
        '@languages',
    ],
];
```

- `debug`: marks untranslated strings and stores them as orphans. Debug
  output needs both `app.debug` and `language.debug` enabled.
- `locale`: the locale used when the application starts.
- `fallback`: the locale used when a key is missing in the current locale.
- `paths`: directories scanned for translation files. `@languages` resolves
  to `resources/languages`.

### Translation Files

Place each locale in its own directory, and use the same file name in
every locale:

```text
resources/languages/
├── en-US/
│   └── main.ini
└── zh-TW/
    └── main.ini
```

```ini
; resources/languages/en-US/main.ini
user.welcome = "Welcome, :name"
user.logout = "Log out"
```

Placeholders use the `:name` form. `Language::replace()` replaces each
`:key` with the matching value from the arguments.

The file extension must always be written explicitly, for example
`main.ini` or `main.php`. This is a requirement left over from legacy
behavior, so do not rely on the format argument alone to find the file.

## Complete Example

The example below loads the translation files in a middleware, translates
inside a service, and returns the text in the current locale:

```php
<?php

// app/Module/Front/FrontMiddleware.php
namespace App\Module\Front;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Windwalker\Core\Language\TranslatorTrait;
use Windwalker\Core\Middleware\AbstractLifecycleMiddleware;

class FrontMiddleware extends AbstractLifecycleMiddleware
{
    use TranslatorTrait;

    protected function preprocess(ServerRequestInterface $request): void
    {
        // Load every ini file for the current locale
        $this->lang->loadAll('ini');
    }

    protected function postProcess(ResponseInterface $response): void
    {
    }
}
```

> !review
> 翻譯插入參數時，優先用 `name: $name` 形式，blade 也一樣
> 但可示範陣列方式是可選選項

```php
<?php

// app/Service/WelcomeService.php
namespace App\Service;

use Windwalker\Core\Language\LangService;

class WelcomeService
{
    public function __construct(
        protected LangService $lang,
    ) {
    }

    public function greeting(string $name): string
    {
        return $this->lang->trans('user.welcome', ['name' => $name]);
    }
}
```

```php
echo $welcome->greeting('Alice');
// ZH-TW: 歡迎, Alice
// EN-US: Welcome, Alice
```

## Loading Translation Files

Each middleware loads the files its area needs. A front-end request should
not load admin strings, and the reverse holds too.

### Loading in Middleware

Load files in `preprocess()` of the middleware for each area. The host
application's `FrontMiddleware` loads its vendor packages first, then
its own files:

```php
<?php

namespace App\Module\Front;

use Lyrasoft\Luna\LunaPackage;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Unicorn\UnicornPackage;
use Windwalker\Core\Language\TranslatorTrait;
use Windwalker\Core\Middleware\AbstractLifecycleMiddleware;

class FrontMiddleware extends AbstractLifecycleMiddleware
{
    use TranslatorTrait;

    protected function preprocess(ServerRequestInterface $request): void
    {
        // Vendor files, loaded for the current locale
        $this->lang->loadAllFromVendor(UnicornPackage::class, 'ini');
        $this->lang->loadAllFromVendor(LunaPackage::class, 'ini');

        // Project files in resources/languages
        $this->lang->loadAll('ini');
        
        // Or load one file for the current locale
        $this->lang->loadFile('main.ini', 'ini');
    }

    protected function postProcess(ResponseInterface $response): void
    {
    }
}
```

The admin middleware follows the same pattern. It loads the same vendor
packages and the project files that the admin area uses:

```php
<?php

namespace App\Module\Admin;

use Lyrasoft\Luna\LunaPackage;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Unicorn\UnicornPackage;
use Windwalker\Core\Language\TranslatorTrait;
use Windwalker\Core\Middleware\AbstractLifecycleMiddleware;

class AdminMiddleware extends AbstractLifecycleMiddleware
{
    use TranslatorTrait;

    protected function preprocess(ServerRequestInterface $request): void
    {
        $this->lang->loadAllFromVendor(UnicornPackage::class, 'ini');
        $this->lang->loadAllFromVendor(LunaPackage::class, 'ini');
        $this->lang->loadAll('ini');
    }

    protected function postProcess(ResponseInterface $response): void
    {
    }
}
```

### Loading One File

`loadFile()` loads a single file for the current locale. The file name
must include its extension, and the format argument must match it:

```php
// Load one file for the current locale
$lang->loadFile('main.ini', 'ini');

// Load one file for another locale
$lang->loadFile('main.ini', 'ini', 'en-US');
```

### Loading All Files

`loadAll()` loads every file of the given format from the locale directories
in `language.paths`. The `loadAllFromPath()` method does the same for one
directory, and `loadAllFromVendor()` reads `resources/languages` inside a
vendor package:

```php
// Every ini file in the configured paths
$lang->loadAll('ini');

// Every ini file in one directory
$lang->loadAllFromPath('@languages', 'ini');

// Every ini file shipped with a package class
$lang->loadAllFromVendor(UnicornPackage::class, 'ini');
```

`loadAllFromVendor()` accepts a package class or a vendor name.

## Switching the Locale Dynamically

The multi-language mechanism described above is static. The locale is
read from the configuration, and the files are loaded for it. Windwalker
does not decide the locale for each request by itself. Dynamic switching,
routing by locale, automatic detection of the user's language, and
remembering the choice in the session are features your project must
implement. The rest of this section builds a small example that does
these things with one middleware.

The example works like this:

- The URL carries the locale as a query parameter, such as `?locale=en-US`.
- A `LocaleMiddleware` sets the locale on `LangService`.
- The chosen locale is saved in the session, so later requests without
  a `locale` parameter keep the same language.

### A Minimal LocaleMiddleware

The middleware reads `locale` from the query string. If it is missing or
not supported, it uses the session value. It then saves the locale and
sets it on `LangService`:

```php
<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Windwalker\Core\Language\LangService;
use Windwalker\Session\Session;

class LocaleMiddleware implements MiddlewareInterface
{
    public const SESSION_KEY = 'user.locale';

    public const SUPPORTED = ['zh-TW', 'en-US'];

    public const DEFAULT = 'zh-TW';

    public function __construct(
        protected LangService $lang,
        protected Session $session,
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $locale = $request->getQueryParams()['locale'] ?? null;

        if (!in_array($locale, self::SUPPORTED, true)) {
            $locale = $this->session->def(
                self::SESSION_KEY,
                self::DEFAULT
            );
        }

        $this->session->set(self::SESSION_KEY, $locale);
        $this->lang->setLocale($locale);

        return $handler->handle($request);
    }
}
```

::: warning
Always check the query value against a whitelist before you store it.
Without the check, any value in the URL is saved to the session and
passed to the language loader.
:::

Register the middleware before the middleware that loads the language
files, so the files are loaded for the new locale.

### Linking to Another Locale

Switch links only need the `locale` parameter:

```html
<a href="?locale=en-US">English</a>
<a href="?locale=zh-TW">繁體中文</a>
```

## Translating in Your Own Service

Inject `LangService` into any service class, and translate inside its
methods. The service does not need to know which locale is active; the
shared service already holds it:

```php
use Windwalker\Core\Language\LangService;

class InvoiceService
{
    public function __construct(
        protected LangService $lang,
    ) {
    }

    public function statusLabel(string $status): string
    {
        return $this->lang->trans("invoice.status.$status");
    }

    public function itemCount(int $count): string
    {
        // Pick the plural form for the count
        return $this->lang->choice('invoice.items', $count);
    }
}
```

`LangService` also implements `Windwalker\Utilities\Contract\LanguageInterface`.
Type-hint that interface when the code only needs translation, and does not
need the Core features.

## Translating in Blade Templates

Blade views receive `$lang` as a global variable. The `@lang` and
`@translate` directives both output `$lang(...)`, and `@choice` outputs
`$lang->choice(...)`:

```blade
<h1>@lang('user.welcome', ['name' => $user->name])</h1>
<a href="/logout">@translate('user.logout')</a>

<span>@choice('cart.items', $count)</span>
```

::: warning
The directives echo the translated text without escaping. Do not pass
user-provided text as the key or as an argument unless you escape it.
:::

## Using the TranslatorTrait

`TranslatorTrait` injects `LangService` into the `$lang` property with
`#[Inject]`. The class must be created by the container, such as a view,
a middleware, or a service registered in DI. The trait adds these methods:

```php
use Windwalker\Core\Language\TranslatorTrait;

class DashboardView
{
    use TranslatorTrait;

    public function prepareMetadata(): void
    {
        // Translate a key
        $title = $this->trans('unicorn.title.dashboard');

        // Translate with a plural form
        $items = $this->choice('cart.items', 3);

        // Check whether a key exists in the current locale
        $exists = $this->hasLang('user.welcome');

        // Access the underlying LangService object
        $lang = $this->getLang();
    }
}
```

`useLangNamespace()` replaces `$this->lang` with a namespaced copy created by
`LangService::extract()`. The copy returns the same translations, and it
keeps a link to the parent service:

```php
// Translate with a namespace, then restore the default
$this->useLangNamespace('invoice');
echo $this->trans('status.paid');
```

## LangService and LanguageInterface

`LangService` implements `LanguageInterface`. The interface defines
`get()`, `trans()`, `choice()`, `replace()`, and `has()`. Code that depends
only on the interface works with either implementation.

`LangService` adds these capabilities, compared with the standalone
`Language` object:

- It is built from the container config, and reads `language.locale`,
  `language.fallback`, and `language.paths`.
- It resolves path aliases such as `@languages` and `@vendor/...`.
- `loadFile()`, `loadFileFromPath()`, and `loadFileFromVendor()` load one
  file from a path, a vendor package, or the locale directory.
- `loadAll()`, `loadAllFromPath()`, and `loadAllFromVendor()` load every
  file of one format.
- `cloneForLocale()` returns a copy with another locale.
- `extract()` returns a namespaced copy with a parent link.
- `__invoke()` allows the service to be called like a function.
- Unknown methods, such as `setLocale()` and `getLocale()`, are forwarded
  to the inner `Language` object.

## Other Locales

### Cloning for Another Locale

`cloneForLocale()` returns a copy with another locale. The original keeps its
locale, so you can translate other languages without changing the request:

```php
// The original stays in its current locale
$zh = $lang->cloneForLocale('zh-TW');
$zh->loadFile('main.ini', 'ini');

echo $zh->trans('user.logout'); // 登出
echo $lang->trans('user.logout'); // Log out
```

### Background Email in the User's Locale

A background job often runs outside the request that created it. It should
use the locale stored with the user, not the locale of the worker process:

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
        $userLang->loadFile('main.ini', 'ini');

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
- [Loading Files](/documentation/components/language/loading)
- [Translation](/documentation/components/language/translation)
- [Plurals](/documentation/components/language/plurals)
- [Middleware](/documentation/framework/core-concepts/http-routing/middleware)
