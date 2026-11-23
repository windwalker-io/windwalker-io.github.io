---
layout: doc
title: SlugHelper
description: Create URL-safe aliases from titles in any language.
---

# SlugHelper

Records need an alias for their URL, such as `/articles/my-first-post`.
Titles arrive in any language, with accents and punctuation, and the alias
must stay URL-safe. `SlugHelper` converts a title into that alias. It is a
set of static methods with no dependencies, so there is nothing to
register or inject.

## Complete Example

Use the typed alias when one exists, and fall back to the title.

```php
use Unicorn\Utilities\SlugHelper;

final class ArticleSaver
{
    public function prepare(array $data): array
    {
        $data['alias'] = SlugHelper::safe(
            $data['alias'] ?: $data['title'],
        );

        return $data;
    }
}
```

```php
SlugHelper::safe('Tom & Jerry #1 Show!');
// 'tom-jerry-1-show'
```

## Generating Slugs

`safe()` is the method to use for saved aliases. It calls `slugify()` and
adds a fallback when nothing is left. The two differ only when the input
has no usable characters.

```php
// Default: transliterate to ASCII.
SlugHelper::slugify('Café Déjà vu');     // 'cafe-deja-vu'
SlugHelper::slugify('你好 世界 Hello');   // 'ni-hao-shi-jie-hello'

// utf8 = true: keep letters from other scripts.
SlugHelper::slugify('Café Déjà vu', true); // 'café-déjà-vu'
SlugHelper::slugify('你好 世界', true);    // '你好-世界'

// slugify() returns an empty string when nothing is left.
SlugHelper::slugify('!!!');              // ''
```

Transliteration uses PHP's `transliterator_transliterate()`, which needs
the `intl` extension. When the optional `THL\Pinyin` library is installed,
`slugify()` uses it first for Chinese text.

`slugify()` handles Japanese, Korean, Cyrillic, and German text without
extra setup. With `utf8 = true`, the letters stay as typed.

```php
SlugHelper::slugify('日本語のタイトル');   // 'ri-ben-yunotaitoru'
SlugHelper::slugify('한국어 제목');        // 'hangug-eo-jemog'
SlugHelper::slugify('Привет мир');       // 'privet-mir'
SlugHelper::slugify('Straße Über');      // 'strasse-uber'

SlugHelper::slugify('한국어 제목', true);  // '한국어-제목'
SlugHelper::slugify('Привет мир', true); // 'привет-мир'
```

`slugify()` always uses the rule `Any-Latin; Latin-ASCII; Lower()`, and it
has no option to change it. To use another rule, run the ICU transliterator
yourself and pass the result to `OutputFilter::stringURLSafe()`:

```php
use Windwalker\Filter\OutputFilter;

$text = transliterator_transliterate(
    'Any-Latin; Latin-ASCII; [:Punctuation:] Remove; Lower()',
    'Crème & Café 2026!',
);

OutputFilter::stringURLSafe($text); // 'creme-cafe-2026'
```

::: info
`slugify()` defaults to a 12-word limit and `safe()` to 16. The limit only
matters with a `default` value (see below).
:::

## Fallbacks and Limits

The `default` argument is used only when `$alias` is empty. `defaultLimit`
caps how many words it keeps.

```php
// Keeps the first 4 words of the default.
SlugHelper::slugify('', false, 'A very long default title', 4);
// 'a-very-long-default'

SlugHelper::safe('', false, 'Untitled draft'); // 'untitled-draft'
```

`safe()` never returns an empty string. When nothing is left, it returns a
timestamp in `Y-m-d-H-i-s` format:

```php
SlugHelper::safe('!!!'); // '2026-11-23-14-32-04'
```

::: warning
Two records that fall back to the timestamp in the same second get the
same alias. Add a unique index on the alias column and append a suffix
when a save collides.
:::

## Splitting Text

`breakWords()` splits text into tokens. Each Han character becomes its own
token, which lets `limitWords()` count words in Chinese, Japanese, and
Korean text.

```php
SlugHelper::breakWords('Hello 世界');
// ['Hello ', '世', '界']

SlugHelper::limitWords('Hello 世界 Привет', 2);
// 'Hello 世'
```
