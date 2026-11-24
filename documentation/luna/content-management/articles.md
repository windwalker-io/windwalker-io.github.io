---
layout: doc
description: Articles in Luna CMF, their fields, and how to extend or override them.
---

# Articles

Articles are the main written content of a Luna site, such as news posts, blog entries, or product descriptions. Each article belongs to a category, can be tagged, and is displayed by the front-end article module.

## Fields

The `Article` entity (`Lyrasoft\Luna\Entity\Article`) stores these fields:

- `id`, `title`, `alias`: identity and URL slug.
- `categoryId`: the owning category.
- `pageId`: an optional page built with the page builder.
- `type`: the article type.
- `image`: the cover image.
- `introtext` and `fulltext`: the summary and the full body.
- `state`: the publish state.
- `ordering`: the sort order.
- `language`: the language code. `*` means all languages.
- `extra` and `params`: JSON data for custom values.
- `created`, `modified`, `createdBy`, `modifiedBy`: audit fields.

## Admin Edit Form

The article edit form is built in `Module\Admin\Article\Form\EditForm`. It edits the title, alias, category, state, and body fields listed above.

## Extending Articles

Add custom values to `params` or `extra` instead of altering the table. These are JSON columns, so you can store extra data without a migration.

```php
// Read a custom value from an article.
$article = $articleRepository->findOne(['id' => 1]);

$color = $article->params['color'] ?? null;
```

::: tip
Keep custom keys in `params` for settings and in `extra` for data
that the front end reads from the article.
:::

## Overriding with pkg:install

Copy the admin, front, and model parts with these tags:

```shell
php windwalker pkg:install lyrasoft/luna --tag article_admin
php windwalker pkg:install lyrasoft/luna --tag article_front
php windwalker pkg:install lyrasoft/luna --tag article_model
```

Each tag copies its files into `App\Module\...`, `App\Entity`, or
`App\Repository`. Edit the copies to change the behavior.

::: warning
`pkg:install` skips files that already exist in your app. Run it again
with `--force` to overwrite your edits. `--dry-run` previews the changes.
:::
