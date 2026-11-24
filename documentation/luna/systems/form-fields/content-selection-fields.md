---
layout: doc
description: Pick categories, articles, tags, and flags in Luna forms with the list and modal content selection fields.
---

# Content Selection Fields

Most content in Luna points to other content. An article belongs to a category, a menu item links to an article, and a record carries tags. Luna provides fields that let editors choose these related records without typing IDs. There are two kinds. A list field renders a select box filled from the database. A modal field opens a picker dialog that searches the records of one table.

## List Fields

List fields render a select box with options loaded from a table. They extend `SqlListField`, so the usual list options such as `option()` and `registerOptions()` also work.

### Category List

`CategoryListField` lists categories in tree order, using the `category` table. Set `categoryType()` to the type of categories to show. Use `maxLevel()` to limit how deep the tree goes, and `showRoot()` to include the root categories.

```php
use Lyrasoft\Luna\Field\CategoryListField;

$form->add('category_id', CategoryListField::class)
    ->label('Category')
    ->categoryType('article')
    ->maxLevel(3)
    ->showRoot(false);
```

::: tip
Set `showRoot(false)` for article forms. A root node is only a container, so editors cannot assign records to it.
:::

### Tag List

`TagListField` lists tags sorted by title, from the `tag` table.

```php
use Lyrasoft\Luna\Field\TagListField;

$form->add('tags', TagListField::class)
    ->label('Tags')
    ->multiple(true);
```

### Flag List

`FlagListField` lists the flag images in the Luna package, and renders each option with its flag icon. It does not query the database. Use it for a language or country field where the value is a locale code.

```php
use Lyrasoft\Luna\Field\FlagListField;

$form->add('flag', FlagListField::class)
    ->label('Flag');
```

Flag images are read from `assets/flags/4x3` in the package, and the file name without its extension is the option value.

## Modal Fields

Modal fields show the selected record's title, and open a modal to search and pick a different one. The modal loads its list from a route, so the target record list must be available at the route named in the field.

### Article Modal

`ArticleModalField` lets the editor pick one article. It uses the `article_list` route and the `Article` entity, and displays the article title.

```php
use Lyrasoft\Luna\Field\ArticleModalField;

$form->add('id', ArticleModalField::class)
    ->label('Article')
    ->required(true);
```

### Category Modal

`CategoryModalField` works like the article modal, for categories. It needs a category type, and throws an exception with `No category type for field` when none is set.

```php
use Lyrasoft\Luna\Field\CategoryModalField;

$form->add('id', CategoryModalField::class)
    ->label('Category')
    ->categoryType('article')
    ->required(true);
```

::: warning
`CategoryModalField` without `categoryType()` fails when the form renders. Always set the type that matches the records you pick.
:::

## Complete Example

This example is a menu item form. The article modal picks the target, and the category list filters the menu tree. Compare it with the form that Luna builds for article menus.

```php
use Lyrasoft\Luna\Field\ArticleModalField;
use Lyrasoft\Luna\Field\CategoryListField;
use Lyrasoft\Luna\Field\TagListField;
use Windwalker\Form\Form;

class ArticleMenuForm
{
    public function define(Form $form): void
    {
        $form->add('id', ArticleModalField::class)
            ->label('Article')
            ->required(true);

        $form->add('category_id', CategoryListField::class)
            ->label('Category')
            ->categoryType('article')
            ->option('- All categories -', '');

        $form->add('tags', TagListField::class)
            ->label('Tags')
            ->multiple(true);
    }
}
```

## Related

- [Captcha Fields](captcha-fields.md)
- [Localization Fields](localization-fields.md)
- [Category](../../content-management/category)
- [Tag](../../content-management/tag)
- [Articles](../../content-management/articles)
