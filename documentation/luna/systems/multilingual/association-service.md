---
layout: doc
title: AssociationService
description: Create, delete, and query Luna associations, and join translated items in one query.
---

# AssociationService

`Lyrasoft\Luna\Services\AssociationService` manages the association table behind [language associations](./content-translation#associations). A group of rows shares one `hash`. Each row has a `type`, a `key` (a language code for translations), and a `target_id`.

Inject it in a view model, controller, or seeder. In every method, `$type` accepts a string, a `UnitEnum`, or an entity class, which is normalized by `toTypeString()`.

## Write

```php
// Create a group. Pass every member in one call, at least two.
// Fewer than two members does nothing.
$associationService->createAssociations(
    Product::class,
    [
        'zh-TW' => 6,
        'en-US' => 7,
        'ja-JP' => 8,
    ]
);

// Save the group of one item. The old group is removed first
// and rebuilt with $targetId under $key. Empty IDs are ignored.
$associationService->saveAssociations(
    Product::class,
    'zh-TW', // Key of the current item
    6, // Current item ID
    ['en-US' => 7, 'ja-JP' => 8]
);

// Add the item to its existing group under a new key.
// Does nothing if the item has no group yet.
$associationService->addAssociation(Product::class, 'ja-JP', 8);
```

`createAssociations()` first unlinks every given ID from any group it belonged to, so an ID is never in two groups. Always pass all members at once.

::: warning
`saveAssociations()` throws `ValidateFailException` when `$targetId` also appears in `$associations`. An item cannot be associated with itself.
:::

`LocaleService::saveLangAssociations($type, $lang, $targetId, $associations)` wraps `saveAssociations()` for languages. When `$lang` is `*`, it deletes the item's association instead.

## Delete

```php
// Remove only this item's row. The rest of the group keeps its hash.
$associationService->deleteAssociationByTargetId(
    Product::class,
    $item->id
);

// Remove the whole group the item belongs to
$associationService->deleteAllAssociationsByTargetId(
    Product::class,
    $item->id
);

// Remove a group by hash
$associationService->deleteAllAssociationsByHash($type, $hash);
```

## Read Rows

These return `Association` objects, with `key`, `targetId`, and `hash`.

```php
// Rows of the other versions (excluding self)
$associationService->getRelativeItemsByTargetId($type, $id);

// Rows of the whole group (including self)
$associationService->getAssociationItemsByTargetId($type, $id);

// The item's own row, or null
$associationService->getAssociationByTargetId($type, $id);

// The row of another version by language key, or null
$associationService->getRelativeItemByIdAndKey($type, $id, 'en-US');

// The same lookups by hash. Pass $id to exclude that item
// from getRelativeItemsByHash().
$associationService->getRelativeItemsByHash($type, $hash, $id);
$associationService->getAssociationItemsByHash($type, $hash);
```

## Read ID Maps

```php
// ['en-US' => 7, 'ja-JP' => 8] (excluding self)
$associationService->getTargetIdMapsByOneTargetId($type, $id);

// ['zh-TW' => 6, 'en-US' => 7, 'ja-JP' => 8] (including self)
$associationService->getAllTargetIdMapsByOneTargetId($type, $id);
```

## Read Entities

```php
// The translated entity in one language, or null
$en = $associationService->getRelatedTargetItem(
    Product::class,
    $item->id, // Current ID, in any language
    'en-US'
);

// All other versions as entities
$others = $associationService->getRelatedTargetItems(
    Product::class,
    $item->id
);

// If $type does not map to an entity, name the entity as the last
// argument of both methods.
$en = $associationService->getRelatedTargetItem(
    'product_translation',
    $item->id,
    'en-US',
    Product::class
);
```

## Helpers

```php
// Normalize a type: entity class => snake-case short name,
// BackedEnum => value, UnitEnum => name.
AssociationService::toTypeString(Product::class); // 'product'

// The group hash for a type and a [key => id] map.
// The same members always produce the same hash.
AssociationService::getHash(Product::class, $assocIds);

// The mapper of the Association entity, for custom queries.
$associationService->getMapper();
```

## Join Query Helpers

Front-end lists usually only need the current language. When one query needs data from two languages, such as the title in the current language and the ID in the fallback language, join the association table with `smartJoin()`:

```php
$fallback = $this->lang->getFallback();
$locale = $this->lang->getLocale();

$items = $orm->from(Manufacturer::class, 'manufacturer')
    ->tap(
        fn ($query) => AssociationService::smartJoin(
            $query,
            keyFrom: $locale,
            thatAlias: 'fallback',
            keyThat: $fallback
        )
    )
    ->where('fallback.state', 1)
    ->where('manufacturer.state', 1)
    ->where('manufacturer.language', $locale)
    ->groupByJoins()
    ->all(Manufacturer::class);

foreach ($items as $item) {
    $item->title; // Current language
    $item->fallback->id; // Fallback language ID
}
```

`smartJoin()` reads the main table and alias from the query's `from`, and throws `InvalidArgumentException` when there is none. `prepareJoin()` takes them explicitly:

```php
AssociationService::prepareJoin(
    $query,
    table: Manufacturer::class,
    fromAlias: 'manufacturer',
    keyFrom: $locale,
    thatAlias: 'fallback',
    keyThat: $fallback
);
```

`$item->fallback` is plain data, so convert it with `$orm->toEntity()` when you need an entity. For a list field that only needs `id` and `title`, select those columns, return `Collection`, and skip `groupByJoins()`.

## Related

- [Content Translation](./content-translation)
