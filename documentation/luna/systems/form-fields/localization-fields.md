---
layout: doc
description: Use LocaleSwitchField to link translations of a record and LanguageListField to pick a site language in Luna forms.
---

# Localization Fields

A multilingual site stores each record once per language. Luna provides two fields for this. `LanguageListField` lets an editor pick the language of a record. `LocaleSwitchField` shows the translations of a record and lets the editor create or link them, so every language version of an article, category, or page stays connected.

Both fields work only when localization is enabled for the site. Forms in Luna check `isLocaleEnabled()` before they add them.

## Language List

`LanguageListField` lists the active languages stored in the `Language` entity, using the language `code` as its value. It shows only the records where `state` is `1`, sorted by `ordering`, and renders each option with its flag.

```php
use Lyrasoft\Luna\Field\LanguageListField;

$form->add('language', LanguageListField::class)
    ->label('Language')
    ->option('- Select -', '')
    ->option('All', '*');
```

Use the `option()` method to add a placeholder or an "All" choice.

::: tip
Add `onchange('this.form.submit()')` to a grid filter, so the list reloads as soon as the editor picks a language.
:::

## Locale Switch

`LocaleSwitchField` renders a panel of the translations of the current record. The field needs a table, which must be an entity with a primary key. Call `table()` with the entity class of the record you edit.

```php
use Lyrasoft\Luna\Entity\Article;
use Lyrasoft\Luna\Field\LocaleSwitchField;

$form->add('language', LocaleSwitchField::class)
    ->label('Language')
    ->table(Article::class)
    ->required(true)
    ->allowCreateEmpty(true);
```

The field loads the translations of the record through `AssociationService`. If your language column has another name, set it with `languageField()`.

## Complete Example

This example edits an article. The language field lets the editor choose the language, and the locale switch links the article to its translations.

```php
use Lyrasoft\Luna\Entity\Article;
use Lyrasoft\Luna\Field\LocaleSwitchField;
use Windwalker\Form\Form;

class ArticleEditForm
{
    public function define(Form $form): void
    {
        $form->add('id', HiddenField::class);

        $form->add('language', LocaleSwitchField::class)
            ->label('Language')
            ->table(Article::class)
            ->required(true)
            ->allowCreateEmpty(true)
            ->showAllOption(false)
            ->canChangeSelfLang(false);

        $form->add('title', TextField::class)
            ->label('Title')
            ->required(true);
    }
}
```

The option names above map to the properties of `LocaleSwitchField`:

- `allowCreateEmpty()` lets the editor create a translation with no content. If it is off, a new translation must copy from an existing language version.
- `canChangeSelfLang()` controls whether the editor can change the language of a saved record. It defaults to `true`.
- `showAllOption()` shows an "All" (`*`) language choice. It is on by default.
- `useDefaultFallback()` falls back to the default language when the value is empty. It is off by default.

::: warning
Changing the language of a record that already has translations can break its links to them. Keep `canChangeSelfLang(false)` on live sites.
:::

## Default Fallback

When a record has no language value, `LanguageListField` can use the default language as its value. Turn this on with `defaultAsFallback()`.

```php
$form->add('language', LanguageListField::class)
    ->defaultAsFallback(true);
```

::: info
The fallback only applies when the value is empty. An existing record keeps its saved language.
:::

## Related

- [Captcha Fields](captcha-fields.md)
- [Content Selection Fields](content-selection-fields.md)
