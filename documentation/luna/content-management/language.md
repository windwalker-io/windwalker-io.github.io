---
layout: doc
description: Languages in Luna CMF, their fields, and how the language code is used.
---

# Language

The language table lists the languages a site serves. Content entities such as
articles and menus use a `language` code to decide where they show.

## Fields

The `Language` entity (`Lyrasoft\Luna\Entity\Language`) stores these fields:

- `id`, `title`, `alias`: identity and display name.
- `titleNative`: the name in the language itself, such as `Deutsch`.
- `code`: the language code that content uses, such as `en-US`.
- `image`: a flag or icon.
- `description`: a short note for admins.
- `sitename`: the site name shown for this language.
- `meta`: SEO meta data, see [MetaData](../utilities/metadata).
- `state`: the publish state.
- `ordering`: the sort order in language menus.

## How Content Uses Languages

A value of `*` shows the item in every language. A matching code, such as
`en-US`, shows it only in that language. Set the value in the admin form or
on the entity's `language` property, and use the same code as `Language::$code`.

::: tip
Use `*` for shared content, such as a site-wide menu, so you do not
have to duplicate it for each language.
:::

## Overriding

Luna's `install()` has no `language` module group. Use
`php windwalker pkg:install lyrasoft/luna --dry-run` to see which files a
package install would copy, before you change anything.
