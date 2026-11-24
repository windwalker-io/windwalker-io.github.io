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
