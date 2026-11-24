---
layout: doc
description: Tags in Luna CMF, how tag maps link them to content, and how to override them.
---

# Tag

Tags label content with keywords so visitors can browse related items across
categories. One tag can apply to many articles, and one article can have many
tags.

## Fields

The `Tag` entity (`Lyrasoft\Luna\Entity\Tag`) stores these fields:

- `id`, `title`, `alias`: identity and URL slug.
- `state`: the publish state.
- `language`: the language code. `*` means all languages.
- `params`: JSON settings.

## Tag Maps

Tags are linked to content through `TagMap` (`Lyrasoft\Luna\Entity\TagMap`).
Each row has a `tagId`, a `targetId`, and a `type`. The `type` tells which
kind of content the `targetId` refers to, so one table serves articles, pages,
and other content.

Deleting a tag removes its `tag_maps` rows automatically.

## TagService

`TagService` (`Lyrasoft\Luna\Services\TagService`) is registered as a shared
object by Luna. It writes tag maps and creates tags that do not exist yet.
Inject it into a controller or service.

```php
use Lyrasoft\Luna\Services\TagService;

// Replace all tag maps of article 5 with tags 1, 2 and 3
$tagService->flushTagMaps('article', 5, [1, 2, 3]);

// Same, but IDs prefixed with "new#" create a new tag first
$tagService->flushTagMapsFromInput(
    'article',
    5,
    [1, 'new#PHP', 'new#Luna']
);

// Only create the new tags and get the real IDs back
$ids = $tagService->createTagsIfNew([1, 'new#PHP']);
// ['0' => 1, '1' => '12']

// Remove maps
$tagService->clearMapsOfTarget('article', 5); // all tags of a target
$tagService->clearMapsOfTag('article', 3);    // all targets of a tag

// Query tags used by a type, optionally limited to some targets
$query = $tagService->getTagListQuery('article', [5, 6]);
```

## Refreshing Tag Maps

`flushTagMaps()` rebuilds the maps of one target. It takes the `type`, the
`targetId`, and the full list of tag IDs, so it replaces the existing maps
instead of appending. The `type` can be a string or a `BackedEnum`.

A typical use is the `afterSave` hook of an edit controller. The form posts
the tag IDs, and new tags typed by the user arrive as `new#Title`:

```php
$controller->afterSave(
    function (AfterSaveEvent $event) use ($tagService, $app) {
        $entity = $event->entity;

        $tagService->flushTagMapsFromInput(
            'article',
            $entity->id,
            (array) ($app->input('item')['tags'] ?? [])
        );
    }
);
```

Use `flushTagMapsFromInput()` for user input, and `flushTagMaps()` when the
IDs already exist. Pass a callback as the last argument to configure each
new `Tag` before it is saved:

```php
$tagService->flushTagMapsFromInput(
    'article',
    $entity->id,
    $tagIds,
    function (Tag $tag) {
        $tag->language = '*';

        return $tag;
    }
);
```

Change the `new#` prefix with `setNewTagPrefix()`.

::: warning
Passing an empty list to `flushTagMaps()` removes every tag map of that
target.
:::

## Creating Tags with the Prefix

A tag that does not exist yet has no ID. The form sends it as
`{prefix}{title}`, and `TagService` creates the tag and swaps the value for
the new ID. The default prefix is `new#`.

```php
$tagService->createTagsIfNew(['5', 'new#PHP', 'new#Go']);
// ['5', '21', '22']  (PHP and Go are created with state = 1)

// Only values that start with the prefix are treated as new
$tagService->createTagsIfNew(['5', 'PHP']);
// ['5', 'PHP']
```

Values without the prefix are kept as they are, so the prefix and
`flushTagMapsFromInput()` must use the same string. To use another prefix:

```php
$tagService->setNewTagPrefix('add#');

$tagService->createTagsIfNew(['add#Rust']); // creates "Rust"
$tagService->createTagsIfNew(['new#Rust']); // ['new#Rust'], not created
```

The front-end must produce the same prefix, see the next section.

## Using TagListField

`TagListField` (`Lyrasoft\Luna\Field\TagListField`) is a select field that
loads `Tag` rows ordered by title, with `id` as the value and `title` as the
label. It extends Unicorn's `SqlListField`. For the other content selection
fields, see [Content Selection Fields](../systems/form-fields/content-selection-fields).

```php
use Lyrasoft\Luna\Field\TagListField;

$form->add('tags', TagListField::class)
    ->label('Tags')
    ->multiple(true);
```

The field alone only lets users pick existing tags. To let them type new
ones, enable `create` in Tom Select and return the prefixed value:

```ts
import { useTomSelect } from '@windwalker-io/unicorn-next';

useTomSelect('#input-item-tags', {
  create: (input: string) => {
    return {
      value: `new#${input}`,
      text: input,
    };
  },
});
```

The select posts `item[tags][]`, mixing real IDs and `new#Title` values.
Pass them to `flushTagMapsFromInput()` on save:

```php
$tagService->flushTagMapsFromInput(
    'article',
    $entity->id,
    (array) ($app->input('item')['tags'] ?? [])
);
```

To show the current tags when editing, load the tag IDs of the target into
the form data, for example from `getTagListQuery()`.

::: warning
Keep the prefix in the front-end `create` callback the same as
`TagService::getNewTagPrefix()`. If they differ, the title is saved as a
tag ID and `(int)` turns it into `0`.
:::

## Overriding with pkg:install

Install the admin and model parts of the tag module:

```shell
php windwalker pkg:install lyrasoft/luna --tag tag_admin
php windwalker pkg:install lyrasoft/luna --tag tag_model
```

::: tip
Use `type` in `TagMap` queries. Without it, a `targetId` can match a
different kind of content with the same ID.
:::
