---
layout: doc
title: Loading Files
component: language
---

# Loading Files

Translation texts live in files, one set per locale, so translators can work
on them without touching PHP code. `Language` reads a file into its string
table, and Windwalker Core's `LangService` finds the files by path and loads
them for the current locale.

## Minimal Usage

For standalone use, call `load()` with the file, its format, and the locale
the strings belong to:

```php
use Windwalker\Language\Language;

$lang = new Language('en-GB', 'en-GB');

$lang->load(__DIR__ . '/languages/en-GB/main.ini', 'ini', 'en-GB');
```

`load()` accepts a file path or raw content. Check that the file exists
before loading it, so a wrong path is detected early:

```php
$file = __DIR__ . '/languages/en-GB/main.ini';

if (is_file($file)) {
    $lang->load($file, 'ini', 'en-GB');
}
```

In a Windwalker application, the `LangService` described in the
[Introduction](/documentation/components/language/) resolves paths for you.
It reads the `language.paths` configuration, which defaults to the
`@languages` alias, and loads files from the locale and fallback folders:

```php
// $lang is the LangService from the Introduction.
$lang->loadAll('ini');
```

## Showcase: A Module with Its Own Strings

A module keeps its messages in a folder named after the module, so the
locale folders can be merged across the application. Under the application's
language path, the layout looks like this:

```text
resources/languages/
├── en-US/
│   ├── main.ini
│   └── shop.ini
└── zh-TW/
    ├── main.ini
    └── shop.ini
```

The module loads the file it needs. `LangService` looks in both the current
locale and the fallback locale, and the current locale wins when both define
a key:

```php
// $lang is the LangService from the Introduction.
$lang->loadFile('shop', 'ini');
```

When the application uses a package that ships its own strings, load them
with `loadAllFromVendor()`. The package must provide its files under
`resources/languages` in its own folder. Pass the package class or its
package name, and both resolve to the same folder:

```php
use Unicorn\UnicornPackage;

$lang->loadAllFromVendor(UnicornPackage::class, 'ini');

$lang->loadAllFromVendor('windwalker/unicorn', 'ini');
```

## File Formats

The format is the name of a handler in the format registry of
`windwalker/data`. The common formats are:

| Format | Name to pass | Notes |
|--------|--------------|-------|
| INI | `ini` | Parsed with `parse_ini_string()`. Quote values that contain special characters. |
| JSON | `json` | A flat object of keys and strings. |
| YAML | `yaml` or `yml` | Requires `symfony/yaml`. |
| PHP | `php` | The file returns an array of keys and strings. |

Pass `null` as the format to detect it from the file extension, so `.yml`
files are read as YAML and `.json` files as JSON.

A JSON file is a flat map from keys to strings:

```json
{
    "order.shipped": "Order :orderId has been shipped."
}
```

A PHP file returns the same kind of array:

```php
<?php

declare(strict_types=1);

return [
    'order.shipped' => 'Order :orderId has been shipped.',
];
```

The same flat structure applies to every format. A YAML file uses the same
keys, and requires `symfony/yaml` to be installed:

```yaml
order.shipped: "Order :orderId has been shipped."
```

```php
$lang->load(__DIR__ . '/languages/en-GB.yml', 'yaml', 'en-GB');
```

## Locale and Fallback Loading

`LangService` reads the fallback locale's file first, then the requested
locale's file, outside debug mode. The later file overrides any key it
defines, so a translation only needs to include the keys that differ from
the fallback. In debug mode, the fallback file is not loaded for other
locales, so missing keys stay visible; see
[Debugging](/documentation/components/language/debugging).

Use `loadFile()` for one file and `loadAll()` for every file in the
configured paths. Both accept the format as a string. `loadFile()` defaults
to the PHP format, so pass the format explicitly for INI or JSON files:

```php
$lang->loadFile('shop', 'json');
```

Vendor packs listed in the `language.vendors` container parameter are loaded
before each request. The parameter is keyed by format, and each format lists
the packages to load:

```php
// The value of the language.vendors container parameter.
[
    'ini' => [
        UnicornPackage::class,
    ],
];
```

## Switching the Locale

`LangService` is a shared object, so `setLocale()` on it changes the locale
for everything that uses it. For a temporary locale, such as a mail sent to a
customer in another language, use `cloneForLocale()`, which returns a copy:

```php
$de = $lang->cloneForLocale('de-DE');

echo $de->trans('order.shipped', orderId: 1024);
```