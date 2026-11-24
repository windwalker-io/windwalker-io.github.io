---
layout: doc
title: LocaleService
description: Read and change the current locale, look up languages, detect the browser language, and build language-aware URLs.
---

# LocaleService

`Lyrasoft\Luna\Services\LocaleService` is the entry point for Luna i18n at runtime. It answers which languages are available, which one is current, and whether i18n is enabled. It wraps Windwalker's [`LangService`](/documentation/framework/services/language), so changing the locale here also affects `@lang()` and `$this->trans()`.

Inject it directly, or use `Lyrasoft\Luna\Locale\LocaleAwareTrait`, which provides `$this->localeService`, `isLocaleEnabled()`, `getLocale()`, and `getFallbackLocale()`.

```php
use Lyrasoft\Luna\Locale\LocaleAwareTrait;
use Lyrasoft\Luna\Services\LocaleService;

class ProductRepository
{
    use LocaleAwareTrait;
}

// Or inject it
public function __construct(
    protected LocaleService $localeService
) {
}
```

## Status Checks

```php
// Is luna.i18n.enabled true?
$localeService->isEnabled();

// Is i18n enabled and luna.i18n.uri_prefix true?
$localeService->isUriPrefixEnabled();

// Is i18n enabled for the stage (luna.i18n.{stage}.enabled)?
// Defaults to the current stage of the application.
$localeService->isStageEnabled();
$localeService->isStageEnabled('front');
$localeService->isStageEnabled('admin');
```

Reusable packages should check `isEnabled()` before joining or filtering by language, so they work when i18n is off.

## Current Locale

```php
// Current locale, such as 'en-US'
$localeService->getLocale();

// Fallback locale from etc/packages/language.config.php
$localeService->getFallback();

// Change the locale for the rest of the request.
// Updates both LangService and the language.locale config.
$localeService->setLocale('ja-JP');
```

`LocaleMiddleware` calls `setLocale()` for you. Call it yourself only for special cases, such as rendering an email in the recipient's language.

`setLocale()` does not check that the language exists or is enabled.

## Languages

Languages come from the `languages` table. Only records with `state = 1` are loaded, ordered by `ordering`, and the result is cached for the request. Each item is a `Lyrasoft\Luna\Entity\Language` with `id`, `title`, `titleNative`, `alias`, `code`, `image`, and others.

```php
// Collection of enabled languages, keyed by alias
$languages = $localeService->getAvailableLanguages();

// The language of the current locale, or null
$language = $localeService->getCurrentLanguage();

// Only its code, or null
$localeService->getCurrentLanguageCode(); // 'en-US'

// Find one language. Each returns Language or null.
$localeService->getLanguageByAlias('en'); // URL prefix
$localeService->getLanguageByCode('en-US'); // Locale
$localeService->getLanguageById(1);
```

Disabled languages are not found by any of these methods. If the current locale belongs to a disabled language, `getCurrentLanguage()` returns `null`.

## Browser Language

```php
// Best match of the Accept-Language header among enabled languages
$code = $localeService->getBrowserLanguage();

// Match against your own list, with a custom default
$code = $localeService->getBrowserLanguage(
    ['zh-TW', 'en-US'],
    default: 'zh-TW'
);
```

If nothing matches, the default `en-US` is returned. This method requires the `willdurand/negotiation` package and throws `DomainException` when it is missing. `LocaleMiddleware` uses it when `useBrowser` is enabled.

## URLs

```php
// The current route without the language prefix, as a Uri.
// Query parameters are kept.
$uri = $localeService->getRouteWithoutCode();

// Build the same page in another language, such as for hreflang
$url = $app->getSystemUri()->root(
    $language->alias . '/' . $uri->getPath()
);
```

To switch languages with a link, use the `<x-locale-dropdown>` component instead. See [Enabling Multilingual](./enabling-multilingual#language-switching).

### Navigator Prefix

When `uriPrefix` is on, `LocaleMiddleware` registers a listener on `Navigator` that prepends the current language alias to every route built through the middleware's route group. `listenNavigatorBuildEventOnce()` registers such a listener only once per request:

```php
use Windwalker\Core\Router\Event\AfterRouteBuildEvent;

$localeService->listenNavigatorBuildEventOnce(
    $nav,
    function (AfterRouteBuildEvent $event) {
        // Modify $event->url
    }
);
```

Most applications never call it directly.

The listener reads the `locale_prefix` extra option of the route being built: `false` skips the prefix, and a string replaces the current alias.

## Language Codes and Flags

```php
// Normalize case: 'en_us' => 'en_US', 'zh-tw' => 'zh-TW'
LocaleService::formatLangCode('zh-tw');

// CSS classes for the flag icon of a language's image
// Also loads the flag icon assets.
$class = $localeService->getFlagIconClass($language->image);
// 'flag-icon flag-icon-us'

$class = $localeService->getFlagIconClass(
    $language->image,
    LocaleService::FLAG_SQUARE
);
// 'flag-icon flag-icon-us flag-icon-squared'
```

```blade
<span class="{{ $localeService->getFlagIconClass($lang->image) }}"></span>
```

- `FLAG_NORMAL`: the default rectangular flag.
- `FLAG_SQUARE`: a square flag.

## Seeders

```php
// Codes of all enabled languages, plus '*'
$langCodes = LocaleService::getSeederLangCodes($orm);
```

See [Content Translation](./content-translation#database) for a full seeder example.

## Associations

```php
// Save the language associations of an item.
// For language '*', the item's association is deleted instead.
$localeService->saveLangAssociations(
    'product',
    'en-US',
    $item->id,
    ['zh-TW' => 6, 'ja-JP' => 8]
);
```

This is the method behind `#[LangAssoc]`. It throws `ValidateFailException` when `$associations` contains `$targetId`. For direct control, use [AssociationService](./association-service).

## Constants

`LocaleService` also defines `STAGE_FRONT`, `STAGE_ADMIN`, `STAGE_CURRENT`, `STAGE_EITHER`, and `STAGE_BOTH` flags. Luna does not use them internally, and applications normally do not need them.

## Related

- [Enabling Multilingual](./enabling-multilingual)
- [Content Translation](./content-translation)
- [AssociationService](./association-service)
