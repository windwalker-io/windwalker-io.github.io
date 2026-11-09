---
layout: doc
title: Enum Metadata
component: utilities
---

# Enum Metadata

A native PHP enum holds a value and a name, but nothing for display. A
select box needs a label, a status badge needs a color, and an admin page
may need an icon or a set of extra settings. Keeping these in a `match`
or a parallel array means every new case has to be updated in several
places. Attributes on the enum cases keep this data next to the case it
describes.

## Minimal Setup

Use `EnumRichTrait` in an enum that implements `EnumRichInterface`, then
put attributes on the cases:

```php
use Windwalker\Utilities\Attributes\Enum\Title;
use Windwalker\Utilities\Enum\EnumRichInterface;
use Windwalker\Utilities\Enum\EnumRichTrait;

enum Status: string implements EnumRichInterface
{
    use EnumRichTrait;

    #[Title('Draft')]
    case Draft = 'draft';
}

Status::Draft->getTitle(); // Draft
```

`EnumMetaTrait` provides the metadata getters without the translation
helpers of `EnumRichTrait`.

## Showcase: A Status Selector

The following enum provides the labels, colors, and icons for an
editor's status field. Each case carries its own metadata:

```php
use Windwalker\Utilities\Attributes\Enum\Color;
use Windwalker\Utilities\Attributes\Enum\Hidden;
use Windwalker\Utilities\Attributes\Enum\Icon;
use Windwalker\Utilities\Attributes\Enum\Meta;
use Windwalker\Utilities\Attributes\Enum\Title;
use Windwalker\Utilities\Enum\EnumRichInterface;
use Windwalker\Utilities\Enum\EnumRichTrait;

enum Status: string implements EnumRichInterface
{
    use EnumRichTrait;

    #[Title('Draft'), Icon('fa-pencil'), Color('gray')]
    #[Meta(['weight' => 1])]
    case Draft = 'draft';

    #[Title('Published'), Icon('fa-check'), Color('green')]
    case Published = 'published';

    #[Hidden, Title('Archived'), Color('red')]
    case Archived = 'archived';
}

Status::getTitles();
// [
//     'draft' => 'Draft',
//     'published' => 'Published',
//     'archived' => 'Archived',
// ]

Status::getColors();
// ['draft' => 'gray', 'published' => 'green', 'archived' => 'red']

Status::Draft->getIcon(); // fa-pencil
Status::Draft->getMeta(); // ['weight' => 1]
```

`getTitles()` and `getColors()` return arrays keyed by the case value,
which is what a select box or a badge map needs. A case without an
attribute returns an empty string or an empty array, so the methods never
fail for a missing attribute.

## Titles and Translations

`Title` takes a plain string, a translation key, or both:

```php
#[Title('Published')]
case Published = 'published';

#[Title(string: 'Published', lang: 'status.published')]
case Published = 'published';
```

The rule for `getTitle()` depends on whether you pass a language object:

- Without a language object, or when the attribute has no `lang` key, the
  method returns the `string` of the `Title`.
- With a language object, the method first looks for the translation of
  the case, using the key `app.enum.<enum-name>.<CASE>` built by
  `EnumRichTrait`. If that translation exists, it is returned. Otherwise,
  the `lang` key of the `Title` attribute is translated.

```php
Status::Published->getTitle();       // Published
Status::Published->getTitle($lang);  // translated, or the Title key
```

::: info
`Title` must have a `string` or a `lang`. An empty `Title` throws an
`InvalidArgumentException` when the attribute is read.
:::

`getTransItems()` builds the same kind of array as `getTitles()`, using
the language object for each case.

## Hidden Cases

`Hidden` marks a case for the interface, so you can ask `isHidden()`:

```php
Status::Archived->isHidden(); // true
Status::Draft->isHidden();    // false
```

`Hidden` does not remove the case from `cases()`, `getTitles()`, or
`fromTitle()`. Code that builds a list for users must check `isHidden()`
itself.

## Metadata Methods

The trait provides a getter and a collection method for each attribute:

- `getTitle()` and `getTitles()` for `Title`.
- `getIcon()` and `getIcons()` for `Icon`.
- `getColor()` and `getColors()` for `Color`.
- `getMeta()` and `getMetas()` for `Meta`.

`fromTitle()` returns the case whose title matches a string, and
`tryFromTitle()` returns `null` when no title matches:

```php
Status::fromTitle('Draft');       // Status::Draft
Status::tryFromTitle('Unknown');  // null
```

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `getTitle()` | `?LanguageInterface $lang = null, ...$args` | Title of the case, translated when a language is given. |
| `getTitles()` | None | Titles keyed by case value. |
| `getTransItems()` | `LanguageInterface $lang, ...$args` | Translated titles keyed by case value. |
| `fromTitle()` | `string $title` | The case with a matching title. |
| `tryFromTitle()` | `string $title` | The case with a matching title, or `null`. |
| `getIcon()` / `getIcons()` | None | Icon of the case, or all icons. |
| `getColor()` / `getColors()` | None | Color of the case, or all colors. |
| `getMeta()` / `getMetas()` | None | Meta array of the case, or all meta arrays. |
| `isHidden()` | None | Whether the case has `Hidden`. |
| `Title` attribute | `string $string = '', string $lang = ''` | Title text and optional translation key. |
| `Icon` attribute | `string $icon` | Icon name. |
| `Color` attribute | `string $color` | Color name. |
| `Meta` attribute | `array $meta` | Arbitrary data for the case. |
| `Hidden` attribute | None | Marks the case as hidden. |

## Related

- [Attributes](./attributes): the generic attribute reader that these
  attributes build on.
