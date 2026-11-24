---
layout: doc
description: Categories in Luna CMF, their fields, and how to extend or override them.
---

# Category

Categories group articles, pages, and other content into a tree. Luna stores them as a nested set, so each category can have child categories. The category type decides which content kind a branch holds.

## Fields

The `Category` entity (`Lyrasoft\Luna\Entity\Category`) stores these fields:

- `id`, `title`: identity and display name.
- `type`: the category type, which separates kinds of content.
- `image`, `description`: display data.
- `state`: the publish state.
- `language`: the language code. `*` means all languages.
- `params`: JSON settings.

The `#[NestedSet('categories', 'category')]` attribute on the entity manages the
tree columns, so the tree structure is not a field you set directly.

## Using Categories

Assign an article to a category with `categoryId`, then list the articles of a
category by its ID.

```php
// Find a category and read its settings.
$category = $categoryRepository->findOne(['id' => 3]);

$perPage = $category->params['per_page'] ?? 20;
```

::: info
Move categories through the entity's nested-set API, not by editing
the tree columns, so the tree stays valid.
:::

## Overriding with pkg:install

Category modules use the `category` group. Install the admin, front, and model
parts with these tags:

```shell
php windwalker pkg:install lyrasoft/luna --tag category_admin
php windwalker pkg:install lyrasoft/luna --tag category_front
php windwalker pkg:install lyrasoft/luna --tag category_model
```

::: warning
`pkg:install` skips existing files. Add `--force` to overwrite files you
changed, which discards your edits.
:::
