---
layout: doc
title: Debugging
component: language
---

# Debugging

Missing or misplaced translations are easy to overlook. A message that shows
the key by accident, or a page that falls back to English without warning,
usually surfaces only after release. Debug mode makes these cases visible
during development: found strings are wrapped in `**`, missing keys are
wrapped in `??`, and every missing key is recorded with the place where it
was requested.

## Minimal Usage

Enable debug mode on the `Language` object, then translate as usual:

```php
use Windwalker\Language\Language;

$lang = new Language('zh-TW', 'en-GB');

$lang->addString('app.greeting', '你好，:name', 'zh-TW');
$lang->setDebug(true);

echo $lang->trans('app.greeting', name: 'Sakura');
echo $lang->trans('app.farewell');
```

The first line prints `**你好，Sakura**`, because the key was found. The
second prints `??app.farewell??`, because the key does not exist.

## Showcase: Finding Untranslated Messages

During a review of the Chinese pages, a developer wants to know which keys
are missing and which keys are actually used. Debug mode records both:

```php
use Windwalker\Language\Language;

$lang = new Language('zh-TW', 'en-GB');
$lang->load(__DIR__ . '/languages/en-GB.ini', 'ini', 'en-GB');
$lang->load(__DIR__ . '/languages/zh-TW.ini', 'ini', 'zh-TW');
$lang->setDebug(true);

foreach (['app.greeting', 'app.farewell'] as $key) {
    echo $lang->trans($key), PHP_EOL;
}

$missing = $lang->getOrphans();
$used = $lang->getUsed();
```

`getOrphans()` returns the missing keys, indexed by their normalized form.
It is filled only in debug mode, so an empty array outside debug mode does
not prove that every key exists. Each entry contains the `called` method,
which is the translation call, and the `caller`, which is the line of your
code that requested the key:

```php
foreach ($missing as $key => $info) {
    $caller = $info['caller'];

    echo "$key: {$caller['file']}:{$caller['line']}\n";
}
```

`getUsed()` lists the normalized keys that were found and translated. Compare
it with the keys in your language files to find strings that nothing
references any longer.

## Debug Markers

With debug mode on, the markers show the result of each call:

- A string that was found is wrapped in `**`, for example `**Sunflower**`.
- A key that was not found is wrapped in `??`, for example
  `??A key not exists??`.

`choice()` follows the same rules, and wraps the selected form:

```php
echo $lang->choice('cart.items', 2); // **2 items**
```

## Enabling Debug Mode in Windwalker

`LangService` turns debug mode on only when two settings are both true:

- The application debug mode, `app.debug`.
- The `language.debug` option in the language configuration.

Setting `LANG_DEBUG` alone has no effect while the application is not in
debug mode. In debug mode, `LangService` also stops loading the fallback
file for other locales, so a missing key in a translation is not hidden by
the English file.

Keep both settings off in production. The markers change the text that users
see, and the orphan entries contain file paths and line numbers from the
server, which reveal the structure of the application.
