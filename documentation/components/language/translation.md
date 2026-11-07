---
layout: doc
title: Translating Strings
component: language
---

# Translating Strings

Translation in Windwalker is a lookup by key. Code asks for `order.shipped`,
and the `Language` object returns the text stored under that key for the
current locale. Keys stay the same in every language, so developers can
change the wording of a message without touching the code that uses it.

## Minimal Usage

Load a file for the locale and call `trans()`. Placeholders are filled from
named arguments:

```php
use Windwalker\Language\Language;

$lang = new Language('en-GB', 'en-GB');

$lang->load(__DIR__ . '/languages/en-GB.ini', 'ini');

echo $lang->trans('order.shipped', orderId: 1024);
```

```ini
; languages/en-GB.ini
order.shipped="Order :orderId has been shipped."
```

The call prints `Order 1024 has been shipped.`

## Showcase: Order Notifications

A shop sends the same message in several places. The key is referenced
in code, and each locale file provides its own wording:

```php
use Windwalker\Language\Language;

function shippedNotice(Language $lang, int $orderId): array
{
    return [
        'subject' => $lang->trans('order.shipped.subject'),
        'body' => $lang->trans(
            'order.shipped.body',
            orderId: $orderId,
        ),
    ];
}

$lang = new Language('en-GB', 'en-GB');

$lang->load(__DIR__ . '/languages/en-GB.ini', 'ini', 'en-GB');
$lang->load(__DIR__ . '/languages/zh-TW.ini', 'ini', 'zh-TW');

$notice = shippedNotice($lang, 1024);

$lang->setLocale('zh-TW');

$notice = shippedNotice($lang, 1024);
```

```ini
; languages/en-GB.ini
order.shipped.subject="Your order has shipped"
order.shipped.body="Order :orderId has been shipped."
```

```ini
; languages/zh-TW.ini
order.shipped.subject="您的訂單已出貨"
order.shipped.body="訂單 :orderId 已出貨。"
```

Switch the locale with `setLocale()` before the call, or pass the locale to
`get()` and `has()` when you need to query another locale.

## Keys and Normalization

Every key is normalized before lookup. Any character outside `A-Z`, `a-z`,
and `0-9` becomes a dot, and the result is lowercased. These calls refer to
the same string:

```php
$lang->trans('order.shipped');
$lang->trans('Order.Shipped');
```

The normalized form is the key stored in `getUsed()` and `getOrphans()`; see
[Debugging](/documentation/components/language/debugging).

Because of normalization, different spellings can map to one key. Keep keys
distinct after normalization, since `foo_bar` and `foo.bar` are the same key.

## Placeholders

`Language` supports two kinds of placeholders. Use whichever suits the text:

```php
// Named placeholders, written as :name in the text.
$lang->trans('app.greeting', name: 'sakura');

// Positional placeholders, written as sprintf() codes.
$lang->trans('beautiful.flower', 'Sakura');
```

```ini
app.greeting="Hello :name, :NAME, :Name"
beautiful.flower="The %s is beautiful."
```

With the named form, `:name` is replaced by the value, `:NAME` by its
uppercase version, and `:Name` by its first letter in uppercase. Longer names
are replaced first, so `:foobar` is not broken by a `:foo` argument.

Positional placeholders are applied with `sprintf()`, so a literal `%` in the
text must be written as `%%` when positional arguments are passed:

```ini
discount.save="Save %d%% today"
```

```php
echo $lang->trans('discount.save', 10); // Save 10% today
```

`replace()` applies the same rules to any string, and is useful when the
text is not coming from a key:

```php
$lang->replace('Hi :name', ['name' => 'Sakura']);
```

Wrap text that must never be translated or replaced with `raw()`. It
returns the wrapped string as is:

```php
use function Windwalker\raw;

$lang->trans(raw('Windwalker {key}'));
```

Named arguments must be passed by name. An array passed as the second
argument is treated as a positional value, so `:name` is not replaced:

```php
// Not replaced:
$lang->trans('app.greeting', ['name' => 'Sakura']);

// Replaced:
$lang->trans('app.greeting', name: 'Sakura');
```

## Looking Up a Key

Use `has()` to check whether a key exists, and `get()` when you need the
locale that provided the string:

```php
if ($lang->has('order.shipped')) {
    // ...
}

[$locale, $text] = $lang->get('order.shipped');
```

`get()` returns `[null, $key]` when the key is not found. The lookup order
is:

1. The requested locale, which defaults to the current locale.
2. The fallback locale.
3. The parent `Language`, if the object was created with `extract()`.

When no string is found, `trans()` returns the key, with placeholders
applied to it. This keeps missing messages readable instead of empty:

```php
echo $lang->trans('order.cancelled');
// order.cancelled
```

Without debug mode, a missing key appears as the key itself, so it is easy to
overlook. Enable debug mode during development to see them clearly; see
[Debugging](/documentation/components/language/debugging).

## Adding Strings at Runtime

Strings can also be added in code, which is useful for tests or for values
built at runtime:

```php
$lang->addString('app.name', 'Windwalker', 'en-GB');

$lang->addStrings([
    'common.yes' => 'Yes',
    'common.no' => 'No',
], 'en-GB');
```

Keys added this way are normalized like any other key.

## Namespaces

A large application often groups keys by module. `extract()` returns a child
`Language` that prefixes every key with a namespace:

```php
$orders = $lang->extract('shop.orders');

echo $orders->trans('shipped', orderId: 1024);
```

```ini
shop.orders.shipped="Order :orderId has been shipped."
```

The child resolves `shipped` as `shop.orders.shipped`. Keys that the child
does not have are looked up in the parent, so shared strings remain
available.
