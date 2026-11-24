---
layout: doc
title: Content Translation
description: Make an entity multilingual with a language column, and optionally link translated versions with associations.
---

# Content Translation

Once [i18n is enabled](./enabling-multilingual), each entity decides whether it is multilingual. There are two levels:

- **Language column**: a record belongs to one language, or to `*` (all languages), and queries filter on the current locale. No extra tables.
- **Associations** (optional): link the versions of the same content, so the site and the admin can jump between translations.

Start with the language column. Add associations only when you need the links.

## Language Column

### Database

```php
$schema->char('language')
    ->length(7)
    ->comment('Language');

$schema->addIndex('language');
```

Add a matching `language` property to the entity. In seeders, use the enabled languages as sample data:

```php
use Lyrasoft\Luna\Services\LocaleService;

$langCodes = LocaleService::getSeederLangCodes($orm);

// $langCodes contains each enabled code, plus '*'
$item->language = $faker->randomElement($langCodes);
```

### Edit Form

```php
use Lyrasoft\Luna\Field\LanguageListField;

$form->add('language', LanguageListField::class)
    ->label($this->trans('luna.field.language'))
    ->option($this->trans('luna.language.all'), '*');
```

The selected code is saved into the `language` column.

For reusable packages, add this field only when `LocaleService::isEnabled()` is true, so the package works without i18n.

### Admin List

Join the `language` table in the repository with the alias `lang`, then render the label:

```php
use Lyrasoft\Luna\Entity\Language;
use Lyrasoft\Luna\Locale\LocaleAwareTrait;

class ProductRepository
{
    use LocaleAwareTrait;

    public function getListSelector(): ListSelector
    {
        $selector = $this->createSelector();

        if ($this->localeService->isEnabled()) {
            $selector->leftJoin(
                Language::class,
                'lang',
                'lang.code',
                'product.language'
            );
        }

        return $selector;
    }
}
```

```blade
<th>
    <x-sort field="product.language">
        @lang('luna.field.language')
    </x-sort>
</th>

<td>
    <x-lang-label :item="$item"></x-lang-label>
</td>
```

### Front-end Lists

Filter lists to the current locale plus all-language items:

```php
$selector->where(
    'product.language',
    'in',
    ['*', $this->getLocale()]
);
```

Wrap it in a repository method so every caller gets the same rule:

```php
public function getAvailableListSelector(): ListSelector
{
    $selector = $this->createSelector()
        ->from(Product::class)
        ->where('product.state', 1);

    if ($this->localeService->isEnabled()) {
        $selector->where(
            'product.language',
            'in',
            ['*', $this->getLocale()]
        );
    }

    return $selector;
}
```

### Front-end Item Pages

A list filter does not protect direct URLs. Reject items that belong to another language:

```php
use Lyrasoft\Luna\Locale\LocaleAwareTrait;
use Windwalker\Core\Router\Exception\RouteNotFoundException;

public function prepare(AppContext $app, View $view): mixed
{
    $item = $this->repository->mustGetItem($app->input('id'));

    if ($item->language !== $this->getLocale()) {
        throw new RouteNotFoundException();
    }

    // ...
}
```

Items with language `*` fail this strict comparison. If you allow them, check `['*', $locale]` instead.

### Copying Items

When an item is copied, for example to start a new translation, hook into the entity's `BeforeCopyEvent` and `AfterCopyEvent` to adjust the copy, such as unpublishing it. These events do not distinguish between a normal copy and a language copy.

## Associations

A language column does not say that the English "Product A" is the translation of the Chinese "產品 A". Without that link, the language switcher cannot jump to the matching page, and editors must find each version by hand.

Luna stores these links in an association table. All versions of one item share a `hash`, and each row records its language `key` and the `target_id` of that version.

Associations are not limited to languages. In principle they can link any group of items. This documentation only covers the multilingual use. To link other kinds of items, follow the same approach and implement it yourself, using [AssociationService](./association-service) with your own `type` and `key` values.

### Association Model

Associations are generic. Languages are only one use.

- `type`: the purpose, usually the entity name, such as `product`.
- `target_id`: the record ID.
- `key`: the language code for translations, such as `en-US`.
- `hash`: shared by every row of the same group.

A `target_id` can belong to only one group per type. If it had several hashes, there would be no way to tell which group it belongs to when looking up its translations. To use associations for another purpose, use a different `type` and your own `key` values, so the groups stay separate.

A group always has at least two items. A group with only one item has no meaning, because a link needs two ends, and Luna enforces this when writing:

- `createAssociations()` does nothing when given fewer than two members.
- `saveAssociations()` removes the old group, then rebuilds it only if at least one other item remains. If the editor clears every other version, the group disappears instead of keeping a single row.
- The `hash` is calculated from the type and all members (`key` and `target_id`), so a group is identified by its whole membership, not by one item.

If deleting one item leaves a single row behind, it is harmless. The next `createAssociations()` or `saveAssociations()` that involves the item unlinks that row first and refreshes the group.

`type` accepts a string, a `UnitEnum`, or an entity class. An entity class becomes its snake-case short name, so `Product::class` is `product`. For translations, use the entity class.

### Association Edit Form

Replace `LanguageListField` with `LocaleSwitchField`. Place it outside any fieldset, so it can be rendered in the title bar:

```php
use Lyrasoft\Luna\Field\LocaleSwitchField;

$form->add('language', LocaleSwitchField::class)
    ->label($this->trans('luna.field.language'))
    ->table(Product::class)
    ->required(true)
    ->allowCreateEmpty(true)
    ->useDefaultFallback(true);
```

Render it in the edit view and pass the current ID:

```blade
<x-title-bar :form="$form" ns="item">
    @if ($vm->isLocaleEnabled())
        <x-slot name="end">
            <?php $form['item/language']->currentId($item?->id) ?>
            <x-field :field="$form['item/language']" no-label />
        </x-slot>
    @endif
</x-title-bar>
```

The edit view needs `Lyrasoft\Luna\Locale\LocaleAwareTrait`.

The switch opens a dialog listing every language. An existing version shows **Switch** (the current page is saved first). A missing version shows **Create**, which copies from the current item or the default language, or creates an empty item.

Field options:

```php
$field
    ->languageField('language') // Column name
    ->titleField('title') // Label and copy suffix
    ->table(Product::class) // Entity to query
    ->assocType('product') // Guessed from the table if omitted
    ->routeName('product_edit') // Guessed from the table
    ->currentId($item?->id) // Mark the current version
    ->allowCreateEmpty(false) // Default: false
    ->canChangeSelfLang(true) // Default: true
    ->useDefaultFallback(false) // Default: false
    ->showAllOption(true); // Default: true, the "*" option
```

- Use `allowCreateEmpty(false)` when an entity cannot be a blank record, such as one with required enums.
- Use `useDefaultFallback(true)` to force the fallback language to be created first.

::: warning
When an editor changes an item's own language, it leaves its association group and cannot be reattached. Use `canChangeSelfLang(false)` to forbid it.
:::

### Save Handler

Add `#[LangAssoc]` to the controller's `save()` method. It saves the associations when the form is submitted. Language `*` items are removed from their group.

```php
use Lyrasoft\Luna\Attributes\LangAssoc;

#[LangAssoc]
public function save(
    AppContext $app,
    CrudController $controller,
    Navigator $nav,
): mixed {
    // ...
}
```

### Association Admin List

Use `x-lang-dropdown` to jump between linked versions. `type` must match the association type, and `language` is the joined `lang` object:

```blade
<x-lang-dropdown
    type="product"
    :table="$item::class"
    :item="$item"
    :language="$item->lang"
    class="w-100"
    label-field="code"
/>
```

`label-field="code"` shows `en-US` instead of the full language title.

### Custom Edit Routes

When editors switch versions, Luna redirects to the entity's edit page. The default route name is the lowercase entity name plus `_edit`, such as `product_edit`. Override it per type in `luna.config.php`:

```php
use Windwalker\Core\Router\Navigator;

'types' => [
    'product' => [
        'edit_route' => function (Navigator $nav, Product $item) {
            return $nav->to('product_edit')->id($item->id);
        },
    ],
],
```

The key must match the association type.

### Front-end Item Pages with Associations

When the requested item is in another language, look up its translation and redirect:

```php
use Lyrasoft\Luna\Locale\LocaleAwareTrait;
use Lyrasoft\Luna\Services\AssociationService;

public function prepare(AppContext $app, View $view): mixed
{
    $item = $this->repository->mustGetItem($app->input('id'));
    $locale = $this->getLocale();

    if ($item->language !== $locale) {
        $assoc = $this->associationService
            ->getRelativeItemByIdAndKey(
                Product::class,
                $item->id,
                $locale
            );

        if (!$assoc) {
            throw new RouteNotFoundException('Assoc not found');
        }

        $item = $this->repository->mustGetItem($assoc->targetId);

        return $this->nav->self()
            ->id($item->id)
            ->alias($item->alias);
    }

    // ...
}
```

Redirecting gives each language version its own URL. Without it, one URL serves two languages, which hurts SEO.

### Seeders

Create associations after all language versions exist:

```php
$assocIds = [];

foreach ($langCodes as $langCode) {
    if ($langCode === '*') {
        continue;
    }

    $item = $mapper->createEntity();
    $item->language = $langCode;

    $this->orm->createOne($item);

    $assocIds[$langCode] = $item->id;
}

$associationService->createAssociations(
    Product::class,
    $assocIds
);
```

### Deleting Entities

Associations are not removed automatically. Clean them up in the delete event:

```php
use Windwalker\ORM\Attributes\AfterDeleteEvent;

#[AfterDeleteEvent]
public static function afterDelete(
    AfterDeleteEvent $event,
    AssociationService $associationService
): void {
    $associationService->deleteAssociationByTargetId(
        static::class,
        $event->entity->id
    );
}
```

If every translation depends on the main language, delete them together:

```php
if ($item->language === 'zh-TW') {
    $ids = $associationService
        ->getTargetIdMapsByOneTargetId(static::class, $item->id);

    $event->orm->deleteWhere(
        static::class,
        ['id' => array_values($ids)]
    );
}
```

## Related

- [AssociationService](./association-service)
