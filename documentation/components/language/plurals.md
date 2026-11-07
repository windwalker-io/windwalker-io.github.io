---
layout: doc
title: Plural Forms
component: language
---

# Plural Forms

Languages do not pluralize in the same way. English has two forms, `1 apple`
and `2 apples`, while Chinese uses one form for every number. A translation
needs to choose the right wording for a number, and `choice()` does this
selection for you. The key stores all forms of the message, and the number
decides which one is returned.

## Minimal Usage

Store every form in one string, separated by `|`, and pass the number to
`choice()`:

```php
use Windwalker\Language\Language;

$lang = new Language('en-GB', 'en-GB');

$lang->addString('shop.apples', 'one apple|:count apples', 'en-GB');

echo $lang->choice('shop.apples', 1);
echo $lang->choice('shop.apples', 3);
```

The first call prints `one apple`, and the second prints `3 apples`. The
`:count` placeholder is filled with the number automatically.

## Showcase: A Cart Summary

A cart summary shows the number of items in the user's locale. Both files
use conditional segments, so the same code handles zero, one, and many
items in each language:

```ini
; languages/en-GB.ini
cart.items="{0} No item|[1] one item|[2,*] :count items"
```

```ini
; languages/zh-TW.ini
cart.items="{0} 購物車是空的|[1,*] 共 :count 件商品"
```

```php
use Windwalker\Language\Language;

function cartLabel(Language $lang, int $count): string
{
    return $lang->choice('cart.items', $count);
}

$lang = new Language('en-GB', 'en-GB');

$lang->load(__DIR__ . '/languages/en-GB.ini', 'ini', 'en-GB');

echo cartLabel($lang, 0); // No item
echo cartLabel($lang, 1); // one item
echo cartLabel($lang, 3); // 3 items
```

With the `en-GB` locale, the calls above print `No item`, `one item`, and
`3 items`. With `zh-TW`, the same calls return `購物車是空的`, `共 1 件商品`,
and `共 3 件商品`.

## Two Ways to Write Forms

A message can use one of two styles. Use conditional segments for languages
with several forms, and plain segments for a simple one-or-many split.

**Conditional segments** start with a condition in braces or brackets. The
first segment whose condition matches the number is returned:

- `{0}` matches exactly zero, and `{2}` matches exactly two.
- `[1,5]` matches any number from one to five.
- `[2,*]` matches two and every number above it.
- `[*,1]` matches one and every number below it.

**Plain segments** have no condition. The locale's plural rules select one
of them by position. English uses the first segment for one and the second
for every other number. Chinese always uses the first segment.

```php
$lang->addString(
    'shop.files',
    '{0} No files|[1] One file|[2,*] :count files',
    'en-GB'
);

echo $lang->choice('shop.files', 0);  // No files
echo $lang->choice('shop.files', 1);  // One file
echo $lang->choice('shop.files', 12); // 12 files
```

Use only one style within a message. A plain segment is positioned among all
segments, including conditional ones, so mixing the styles selects the wrong
text:

```php
$lang->addString(
    'shop.mixed',
    '{0} No item|one item|:count items',
    'en-GB'
);

echo $lang->choice('shop.mixed', 1); // No item, not "one item"
```

Conditional segments always win over plural positions, so a message that
mixes both styles should be written entirely with conditions.

## Locale and Fallback

The plural rules come from the locale in which the string was found. If the
current locale is `zh-TW` but the string exists only in the fallback
`en-GB`, the English rules apply to that string:

```php
$lang = new Language('zh-TW', 'en-GB');

$lang->addString('shop.apples', 'one apple|:count apples', 'en-GB');

echo $lang->choice('shop.apples', 3); // 3 apples
```

The `:count` placeholder is replaced after the form is selected, so you can
use it in any segment. Other named arguments passed to `choice()` are
replaced in the same way.

## Counting Decimal Numbers

`choice()` converts the number to an integer before it selects the segment.
The `:count` placeholder still receives the original value, so a decimal
number can show a form that does not match its count:

```php
$lang->addString(
    'shop.items',
    '[1] :count item|[2,*] :count items',
    'en-GB'
);

echo $lang->choice('shop.items', 1.5); // 1.5 item
```

Round the number before the call when the selected form should match the
displayed value.
