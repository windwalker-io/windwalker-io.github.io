---
layout: doc
title: Introduction
component: language
---

# Introduction

Windwalker Language is an i18n library for PHP. Your code refers to a
message by a stable key, such as `app.greeting`, and the library returns the
text for the current locale. Translators own the text files, and developers
own the keys. The same code then serves every language without changes.

The package is built from a few cooperating parts:

- **Language** is the core object. It stores strings per locale, resolves
  keys, falls back to a default locale, and replaces placeholders.
- **Key normalization** turns a key such as `app.greeting` into one
  canonical form, so the same message can be referenced in several styles.
- **Plural selection** chooses the right form of a message for a number,
  using rules for each locale.
- **Format registry** loads string files in formats such as INI, JSON, YAML,
  and PHP, provided by `windwalker/data`.

The package itself is standalone. Windwalker Core adds `LangService`, which
wraps a `Language` object with path-based file loading and configuration.

## Installation

```bash
composer require windwalker/language ^4.0
```

Windwalker Language 4.x requires PHP 8.4.6 or later.

## Use as Standalone Component

Create a `Language` object with the current locale and the fallback locale,
then load one file per locale:

```php
use Windwalker\Language\Language;

$lang = new Language('zh-TW', 'en-GB');

$lang->load(__DIR__ . '/languages/en-GB.ini', 'ini', 'en-GB');
$lang->load(__DIR__ . '/languages/zh-TW.ini', 'ini', 'zh-TW');

echo $lang->trans('app.greeting', name: 'Sakura');
```

With these files:

```ini
; languages/en-GB.ini
app.greeting="Hello, :name"
```

```ini
; languages/zh-TW.ini
app.greeting="你好，:name"
```

The call prints `你好，Sakura`. If a key is missing in `zh-TW`, the
fallback locale `en-GB` supplies the text.

## Use in Windwalker

Windwalker Core registers `LangService` as a shared object in the DI
container. It is configured from the `language` configuration module. Use the
existing container or application; do not create a new `LangService`.

Use the `TranslatorTrait` in any class that the container creates. It injects
`LangService` and provides `trans()` and `choice()`:

```php
use Windwalker\Core\Language\TranslatorTrait;

class DashboardView
{
    use TranslatorTrait;

    public function title(): string
    {
        return $this->trans('app.title.dashboard');
    }
}
```

Or inject the service as a constructor dependency:

```php
use Windwalker\Core\Language\LangService;

class MailService
{
    public function __construct(
        protected LangService $lang
    ) {
    }
}
```

Retrieve it from the container or the application when a constructor is
not an option:

```php
$lang = $container->get(LangService::class);

$lang = $app->retrieve(LangService::class);
```

### Configuration

The package ships `etc/language.config.php`. Override it in the host app by
placing a file with the same name in `etc/packages/`:

```php
// etc/packages/language.config.php

use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\Language\LanguagePackage;

return #[ConfigModule(
    name: 'language',
    enabled: true,
    priority: 100,
    belongsTo: LanguagePackage::class,
)]
static fn() => [
    'debug' => (bool) (env('LANG_DEBUG') ?? false),

    'locale' => env('APP_LOCALE') ?: 'en-US',

    'fallback' => 'en-US',

    'paths' => [
        '@languages',
    ],

    'providers' => [
        LanguagePackage::class,
    ],
];
```

The `paths` list tells `LangService` where to find language files. The
`debug` option only takes effect when the application is also in debug
mode; see [Debugging](/documentation/components/language/debugging).

## Topic Pages

- [Translating Strings](/documentation/components/language/translation):
  keys, placeholders, namespaces, and the lookup order.
- [Loading Files](/documentation/components/language/loading): file
  formats, file layout, and loading from packages and vendors.
- [Plural Forms](/documentation/components/language/plurals): choosing
  the right form of a message for a number with `choice()`.
- [Debugging](/documentation/components/language/debugging): marking
  missing strings and recording orphan keys during development.

## Related components

- [Data](/documentation/components/data/): the format registry used to
  parse language files.

Full signatures are in `packages/language/src/` of the `windwalker/framework`
repository.
