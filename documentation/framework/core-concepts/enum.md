---
layout: doc
---

# Enum

Windwalker builds on PHP's native `enum` type. A native enum gives a
fixed set of values that the type system can check. The
`EnumRichInterface` and `EnumRichTrait` add helpers for lookup,
display titles, and translation, so an enum can be used directly in
forms, grids, and views. The `g enum` command generates the file for you.

## Minimal Setup

The `g enum` command creates a backed enum that implements
`EnumRichInterface` and uses `EnumRichTrait`. Pass each case with
`--case`, and the value is the lowercased case name.

```bash
php windwalker g enum ItemState --case enabled --case disabled
```

The generated file is the template below. The `translateKey()` method
shows the language key pattern used for each case.

```php
namespace App\Enum;

use Windwalker\Utilities\Enum\EnumRichInterface;
use Windwalker\Utilities\Enum\EnumRichTrait;

enum ItemState: string implements EnumRichInterface
{
    use EnumRichTrait;

    case ENABLED = 'enabled';
    case DISABLED = 'disabled';

    protected function translateKey(string $name): string
    {
        return "app.enum.item.state.$name";
    }
}
```

Native methods such as `cases()`, `from()`, and `tryFrom()` work as
usual. The trait adds the helpers shown below.

## A Complete Example

The enum below is used to look up values from request input and to
list the choices for a form.

```php
use App\Enum\ItemState;

// Native lookup, throws ValueError if the value is unknown
$state = ItemState::from('enabled');

// Wrap accepts either a raw value or an existing case
$state = ItemState::wrap('enabled');
$state = ItemState::wrap(ItemState::ENABLED);

// tryWrap returns null for null or unknown input
$state = ItemState::tryWrap('unknown'); // null

// Options keyed by case name
// ['ENABLED', 'DISABLED']
$names = ItemState::names();

// ['ENABLED' => 'enabled', 'DISABLED' => 'disabled']
$raws = ItemState::rawValues();

// ['ENABLED' => ItemState::ENABLED, ...]
$cases = ItemState::assocCases();
```

## Native Helpers

`EnumRichTrait` uses `EnumExtendedTrait` for the lookup helpers.

- `wrap()` returns a case from a value or an existing case.
- `tryWrap()` does the same, but returns `null` on unknown input.
- `names()` returns the case names.
- `rawValues()` returns the case names mapped to their values.
- `assocCases()` returns the cases keyed by case name.

The `values()` method is deprecated. Use `assocCases()` instead.

## Preprocessing Values

Override `preprocessValue()` to clean up input before `wrap()` and
`tryWrap()` match it to a case. Use it to set a default for empty
values, or to convert old values that are still stored in the database.

```php
enum ItemState: string implements EnumRichInterface
{
    use EnumRichTrait;

    case ENABLED = 'enabled';
    case DISABLED = 'disabled';

    public static function preprocessValue(mixed $value): mixed
    {
        // Empty values fall back to the default case
        if ($value === null || $value === '') {
            return self::ENABLED;
        }

        // Convert an old value to the current one
        if ($value === 'on') {
            return 'enabled';
        }

        return $value;
    }
}

ItemState::wrap(null);   // ItemState::ENABLED
ItemState::wrap('on');   // ItemState::ENABLED
ItemState::wrap('');     // ItemState::ENABLED
```

::: info
`preprocessValue()` runs only in `wrap()` and `tryWrap()`. Native
`from()` and `tryFrom()` skip it, so call `wrap()` when the value comes
from outside the code, such as a database column or a request.
:::

::: tip
Avoid `$value ?: self::DEFAULT` for this. It also treats `0` and `'0'`
as empty. Check for `null` and `''` explicitly.
:::

This is useful when an enum is bound to an entity. Leftover empty
values or old strings in the database are converted when the entity
reads them, so the rest of the code only sees current cases.

## Titles and Metadata

Attributes such as `Title`, `Icon`, `Color`, `Meta`, and `Hidden`
attach display data to each case. `EnumMetaTrait` reads them through
`getTitle()`, `getIcon()`, `getColor()`, and `isHidden()`.

```php
use Windwalker\Utilities\Attributes\Enum\Title;

enum ItemState: string implements EnumRichInterface
{
    use EnumRichTrait;

    #[Title('Enabled')]
    case ENABLED = 'enabled';

    #[Title('Disabled')]
    case DISABLED = 'disabled';
}

ItemState::ENABLED->getTitle();          // 'Enabled'
ItemState::tryFromTitle('Disabled');     // ItemState::DISABLED
```

The full list of attributes and their options is described in the
[Enum Metadata](../../components/utilities/enum-metadata.md) page.

## Translation

When a language object is passed, `getTitle()` looks up a translation
first and falls back to the `Title` attribute. The key is built from
the dashed class name and the case name.

```php
use Windwalker\Utilities\Contract\LanguageInterface;

// Key: app.enum.item.state.ENABLED
$title = ItemState::ENABLED->getTitle($lang);

// Keyed by value, for building select options
$items = ItemState::getTransItems($lang);
// ['enabled' => 'Enabled', 'disabled' => 'Disabled']
```

::: tip
Put the translated titles in the language files under
`app.enum.item.state.*`. The key comes from the `translateKey()`
method in the enum file.
:::

## Related

- [Enum Metadata](../../components/utilities/enum-metadata.md)
  describes the `Title`, `Icon`, `Color`, `Meta`, and `Hidden`
  attributes in detail.
