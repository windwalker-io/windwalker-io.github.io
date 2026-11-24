---
layout: doc
title: Enabling Multilingual
description: Turn on Luna i18n, configure languages, resolve the locale, and prepare JavaScript translations and SEO.
---

# Enabling Multilingual

Windwalker's [`language` package](/documentation/framework/services/language) translates static strings (`@lang()`, `$this->trans()`). That is not a multilingual website: visitors also need to switch languages at runtime and see different **database content** for each language. Luna's i18n layer adds that. It detects the current locale from the URL, session, or browser, and lets content be filtered per language.

This page covers the site-wide setup. Making a specific entity multilingual is covered in [Content Translation](./content-translation).

## Plan Before You Build

Decide the primary language first. It is the `fallback` locale in `etc/packages/language.config.php`:

```php
return [
    'language' => [
        // The current locale
        'locale' => 'zh-TW',

        // Used when a translation key is missing in the current locale
        'fallback' => 'zh-TW',
    ],
];
```

Every item should exist in the fallback language, so that a missing translation always has something to fall back to.

## Enable i18n

i18n is off by default. Enable it in `etc/packages/luna.config.php`:

```php
return [
    'luna' => [
        // ...
        'i18n' => [
            'enabled' => true,
            'uri_prefix' => true,
            'front' => [
                'enabled' => true,
            ],
            'admin' => [
                'enabled' => false, // Only when admin UI needs i18n
            ],
            'types' => [
                // Per-type options, see Content Translation
            ],
        ],
    ],
];
```

- `enabled`: master switch. When `false`, `LocaleMiddleware` passes requests through.
- `uri_prefix`: add the language alias to front-end URLs, such as `/en/...`.
- `front.enabled` / `admin.enabled`: enable per stage.
- `types`: per-type options such as `edit_route`.

## Languages

Available languages live in the `languages` table, managed from the admin **Language** page. Only records with `state = 1` are offered to users and editors.

To enable languages by default, set `state` in `resources/migrations/data/languages.json` before running the migration:

```json
{
    "code": "en-US",
    "alias": "en",
    "state": "1"
}
```

`code` is the locale (`en-US`) and `alias` is the URL prefix (`en`).

## Resolve the Locale

Add `Lyrasoft\Luna\Middleware\LocaleMiddleware` to the front-end routes. The locale is resolved in this order:

1. The language matched from the URL prefix, which is remembered in the session.
2. The locale previously stored in the session (`sessionKey`, default `locale`).
3. The browser's `Accept-Language` header, only if `useBrowser` is enabled and the visitor is not a robot.

```php
use Lyrasoft\Luna\Middleware\LocaleMiddleware;

$router->group('front')
    ->middleware(
        LocaleMiddleware::class,
        useBrowser: true, // Detect from the browser
        uriPrefix: true // Prefix URLs with the language alias
    );
```

`excludes` lets you skip routes. `uriPrefix` only takes effect when `luna.i18n.uri_prefix` is also `true`.

::: tip
Enable `useBrowser` on public sites. Search engines crawl from different regions, and this lets them reach the right language home page. It requires the `willdurand/negotiation` package.
:::

## Language Switching

Place a language dropdown anywhere in a Blade view:

```blade
<x-locale-dropdown class="..." />
```

`LocaleController::switch()` changes the locale and redirects to the same page under the new language prefix.

## Translations in JavaScript

Send the keys a page needs with `UnicornScript::translate()`, then read them with `__()`:

```php
use Unicorn\Script\UnicornScript;

public function prepare(AppContext $app, View $view): mixed
{
    $this->unicornScript->translate('app.product.add_to_cart');

    // ...
}
```

```ts
import { __ } from '@windwalker-io/unicorn-next';

__('app.product.add_to_cart');

// sprintf
__('app.product.stock', 'A', 5);

// Named parameters
__('app.product.stock', { title: 'Hello', num: 123 });
```

For keys needed on every page, call `translate()` in `FrontMiddleware` instead.

## SEO

Mark language alternatives with `hreflang` so search engines index the right version:

```php
foreach ($languages as $language) {
    if ($language->code !== $localeService->getLocale()) {
        $htmlFrame->addHreflang(
            $language->code,
            $url // The same page under $language->alias
        );
    }
}
```

`LocaleService::getRouteWithoutCode()` returns the current route without the language prefix, which helps build `$url`.

If a search engine keeps indexing the wrong language for the home page, add `hreflang` to every page first. As a second option, detect the crawler in a middleware and redirect it using `LocaleService::getBrowserLanguage()`.

::: warning
Redirecting crawlers by `User-Agent` can be treated as cloaking. Prefer `hreflang`.
:::

## Related

- [Content Translation](./content-translation)
- [LocaleService](./locale-service)
- [AssociationService](./association-service)
