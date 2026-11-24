---
layout: doc
title: MetaData
description: Store SEO and Open Graph data in a JSON column with the Luna MetaData object, apply it to HtmlFrame, and bind it to an entity.
---

# MetaData

A page needs more than its content. Search engines read its title,
description, and keywords, and social networks read its Open Graph title,
description, and image. Editors must be able to change these values for
every page without touching a template.

`Lyrasoft\Luna\Data\MetaData` is a small value object that holds these
values. It is stored in one JSON column of an entity, edited through a
form group, and applied to `HtmlFrame` when the page is rendered. Luna
uses it on the `Page` and `Language` entities, and you can bind it to
your own entities in the same way.

## Fields

`MetaData` is a `ValueObject` with eight string properties. Every
property has a getter and a chainable setter:

```php
use Lyrasoft\Luna\Data\MetaData;

$meta = new MetaData();

$meta->setTitle('Spring Sale')           // <title>
    ->setDescription('Up to 50% off.')   // meta description
    ->setKeywords('sale, spring')        // meta keywords
    ->setCover('images/sale.jpg')        // cover image
    ->setOgTitle('Join the Spring Sale') // og:title
    ->setOgDescription('Up to 50% off.') // og:description
    ->setOgImage('images/sale-og.jpg')   // og:image
    ->setCustomCode('<script>...</script>');

$meta->getTitle(); // 'Spring Sale'
```

`MetaData` is not tied to a database. It can also be created from an
array or a JSON string, and both `snake_case` and `camelCase` keys are
accepted:

```php
$meta = MetaData::wrap([
    'title' => 'Spring Sale',
    'og_title' => 'Join the Spring Sale', // Same as ogTitle
]);

$meta->ogTitle; // 'Join the Spring Sale'

$meta->dump(); // ['title' => ..., 'ogTitle' => ..., ...]
```

## Applying MetaData to HtmlFrame

`HtmlFrame` renders the `<title>`, the meta tags, and the Open Graph
tags in the page head. `MetaData::processHtmlFrame()` copies the
non-empty values into it:

```php
use Lyrasoft\Luna\Data\MetaData;
use Windwalker\Core\Html\HtmlFrame;

$meta = MetaData::wrap([
    'title' => 'Spring Sale',
    'description' => 'Up to 50% off all shoes.',
    'og_title' => 'Join the Spring Sale',
    'cover' => 'images/sale.jpg',
]);

$meta->processHtmlFrame(
    $htmlFrame,
    defaultTitle: 'My Shop',
    descriptionTruncate: 150,
);
```

The method applies each value as follows:

- `title` sets the page title.
- `ogTitle` adds `og:title`.
- `description` sets the meta description and `og:description`. HTML
  tags are removed and the text is truncated to `descriptionTruncate`
  characters.
- `ogDescription` replaces `og:description` after the description is set.
- `cover` sets the cover images. When `cover` is empty, `ogImage` is used.

Empty values are skipped, so the defaults that the layout already
assigned to `HtmlFrame` stay in place.

::: info
`processHtmlFrame()` does not apply `keywords` or `customCode`. Add the
keywords with `$htmlFrame->addMetadata('keywords', $meta->getKeywords(), true)`
and print `customCode` in your layout.
:::

The `defaultTitle` argument is only used when the title is not empty, so
it never replaces an empty title. To fall back to the entity title, set it
yourself, as `PageView` does:

```php
$meta = $page->meta;

$htmlFrame->setTitle($meta->getTitle() ?: $page->title);
$meta->processHtmlFrame($htmlFrame);
```

## Binding to an Entity

Store the object in a `json` column, and cast it with `#[Cast]`. The
`Page` entity uses this definition:

```php
use Lyrasoft\Luna\Data\MetaData;
use Windwalker\ORM\Attributes\Cast;
use Windwalker\ORM\Attributes\Column;

class Article implements EntityInterface
{
    use EntityTrait;

    #[Column('meta')]
    #[Cast(MetaData::class)]
    public MetaData $meta {
        get => $this->meta ??= new MetaData();
        set(MetaData|array $value) => $this->meta = MetaData::wrap($value);
    }
}
```

The migration declares a JSON column:

```php
$schema->json('meta')->comment('Metadata');
```

The two property hooks do the work:

- The getter creates an empty `MetaData` for a new entity, so
  `$article->meta->getTitle()` never fails on `null`.
- The setter accepts a `MetaData` object or an array, so a form can
  assign the submitted values directly.

When the entity is saved, the object is encoded as JSON. When it is
loaded, `#[Cast(MetaData::class)]` creates the object from the JSON
string. See [Entity Casting](./entity-casting.md) for the casting rules.

```php
$article = new Article();
$article->meta = ['title' => 'Spring Sale', 'og_title' => 'Sale'];

$orm->mapper(Article::class)->createOne($article);

$article = $orm->mapper(Article::class)->findOne($id);
$article->meta->getOgTitle(); // 'Sale'
```

## Complete Example

The example below edits the meta values in a form and renders them in
the front view. It follows the same flow as the Luna `Page` module.

First, put the fields in a `meta` group in the edit form. The field
names are the `snake_case` names of the properties:

```php
use Windwalker\Form\Field\TextareaField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form->group('meta', function (Form $form) {
    $form->add('title', TextField::class)
        ->label('Meta Title');

    $form->add('description', TextareaField::class)
        ->label('Meta Description')
        ->rows(3);

    $form->add('keywords', TextField::class)
        ->label('Keywords');

    $form->add('og_title', TextField::class)
        ->label('OG Title');

    $form->add('og_description', TextareaField::class)
        ->label('OG Description')
        ->rows(3);
});
```

When the edit view fills the form, convert the object to an array.
`dump()` returns `camelCase` keys, so the `Page` edit view converts them
with `asSnakes()`:

```php
$form->fill([
    'meta' => static::asSnakes($item?->meta->dump() ?? []),
]);
```

The submitted `meta` array is assigned to the entity. The property
setter wraps it into a `MetaData` object, and the column is saved as JSON.

Finally, apply the values in the view model of the front page:

```php
use Windwalker\Core\Html\HtmlFrame;

class ArticleView implements ViewModelInterface
{
    public function __construct(
        protected ORM $orm,
        protected HtmlFrame $htmlFrame,
    ) {
        //
    }

    public function prepare(AppContext $app, View $view): array
    {
        $article = $this->orm
            ->mapper(Article::class)
            ->mustFindOne($app->input('id'));

        $this->htmlFrame->setTitle($article->title);
        $article->meta->processHtmlFrame($this->htmlFrame);

        return compact('article');
    }
}
```

The view sets the entity title first. A non-empty meta title then
replaces it, and the empty fields keep the earlier values.

## Reminders

`MetaData` extends `ValueObject`, which Windwalker marks as deprecated in
favor of `Record`. It still works, and `Page` and `Language` depend on it.

The cover and Open Graph image paths are passed through
`HtmlFrame::setCoverImages()`, which prefixes relative paths with the
site root.

::: warning
`customCode` is stored and returned as-is. If you print it in a layout,
only editors you trust should be able to change it, because it can
contain scripts.
:::

## Related

- [Entity Casting](./entity-casting.md)
- [Page](../content-management/page.md)
