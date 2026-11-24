---
layout: doc
title: Entity Casting
description: Luna's entity attributes that fill author, modifier, and slug columns automatically when an entity is saved.
---

# Entity Casting

Almost every content table in a CMS carries the same bookkeeping
columns: who created the row, who edited it last, and a URL-safe alias.
Filling them in every controller is repetitive, and one forgotten
assignment leaves a row without an author or with an alias like
`My Post!!`. Luna ships four property attributes that do this work in
the ORM instead:

- `#[Author]` fills the creator of a new row.
- `#[Modifier]` records who edited a row.
- `#[Slugify]` turns a value, or the title, into a safe alias.
- `#[PageSlugify]` does the same for aliases with `/` segments.

All four live in `Lyrasoft\Luna\Attributes`. They run while the ORM
saves the entity, so a controller only calls `createOne()` or
`updateOne()`.

## How They Work

Each attribute implements `Windwalker\ORM\Attributes\CastForSaveInterface`.
Its `getCaster()` returns a callable that receives the column value and
returns the value to store. The ORM runs it on every save, and services
the callable type-hints, such as `UserService`, are injected.

Put the attribute on the entity property that maps to the column:

```php
use Lyrasoft\Luna\Attributes\Author;
use Lyrasoft\Luna\Attributes\Modifier;
use Lyrasoft\Luna\Attributes\Slugify;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\Table;

#[Table('articles')]
class Article
{
    #[Column('title')]
    public string $title = '';

    #[Column('alias')]
    #[Slugify(utf8: true)]
    public string $alias = '';

    #[Column('created_by')]
    #[Author]
    public int $createdBy = 0;

    #[Column('modified_by')]
    #[Modifier]
    public int $modifiedBy = 0;
}
```

Luna's own entities, such as `Article`, `Category`, `Tag`, and `Page`,
use this pattern. The entity generator adds the attributes for you.
`Lyrasoft\Luna\Subscriber\EntityBuildingSubscriber` listens to
`BuildEntityPropertyEvent` and attaches them by column name:

```php
// Column name -> attribute added by the generator
// alias       -> #[Slugify]
// created_by  -> #[Author]
// modified_by -> #[Modifier]
// created     -> #[CreatedTime]  (ORM package)
// modified    -> #[CurrentTime]  (ORM package)
```

The subscriber options `slug_column`, `author_column`, `modifier_column`,
`created_column`, and `modified_column` rename a column, or skip it when
set to `false`.

## Complete Example

A controller that saves an article needs no bookkeeping code. User `42`
is logged in and leaves the alias empty:

```php
use Lyrasoft\Luna\Entity\Article;

$article = new Article();
$article->title = 'Hello World';
$article->alias = '';

$orm->createOne(Article::class, $article);

// Stored row:
// alias       = 'hello-world'
// created_by  = 42
// modified_by = 0   (not edited yet)
```

When user `7` edits it later:

```php
$article->title = 'Hello World, again';

$orm->updateOne(Article::class, $article);

// Stored row:
// alias       = 'hello-world'  (kept, the alias was already filled)
// created_by  = 42
// modified_by = 7
```

## Author

`#[Author]` writes the current user's id when the value is empty and
the entity is new. An explicit value always wins, so seeders and imports
can set the author themselves.

```php
// Empty value on a new row: the current user's id is stored.
$article->createdBy = 0;
$orm->createOne(Article::class, $article);

// Explicit value: kept as is.
$article->createdBy = 5;
$orm->createOne(Article::class, $article);

// Existing row: not changed by the attribute.
$orm->updateOne(Article::class, $article);
```

When the mapper cannot tell whether the entity is new, the attribute
fills any empty value on every save.

## Modifier

`#[Modifier]` is the counterpart. It writes the current user's id on
every update and leaves new rows alone, so the column stays empty until
someone edits the record.

```php
// New row: the value is kept as is.
$orm->createOne(Article::class, $article);

// Update: always replaced with the current user's id.
$orm->updateOne(Article::class, $article);
```

Unlike `#[Author]`, it overwrites a value you set by hand.

::: warning
Both attributes depend on `UserService`. When it cannot be resolved,
they return the value unchanged and no error is raised. Code that runs
outside the user system, such as a script, stores whatever the entity
holds, so set `createdBy` and `modifiedBy` explicitly there and check the
stored result.
:::

## Slugify

`#[Slugify]` keeps an alias URL-safe. An empty alias is built from the
title, and a filled alias is cleaned.

```php
use Lyrasoft\Luna\Attributes\Slugify;

// Defaults: ASCII only, source column "title", 8 words.
#[Slugify]
public string $alias = '';

// Keep Unicode letters, so Chinese titles stay readable in URLs.
#[Slugify(utf8: true)]
public string $alias = '';

// Take the fallback from another column.
#[Slugify(titleColumn: 'name')]
public string $alias = '';

// Limit the words taken from the title.
#[Slugify(limit: 4)]
public string $alias = '';

// Disable the title fallback.
#[Slugify(titleColumn: '')]
public string $alias = '';
```

It delegates to `Unicorn\Utilities\SlugHelper::safe()`:

```php
// title: "Hello World", alias: ""      => "hello-world"
// title: "Hello", alias: "My Post!!"   => "my-post"
// title: "你好 World", alias: ""        => "ni-hao-world"
// title: "你好 World", alias: "", utf8  => "你好-world"
// title: "", alias: ""                 => "2026-11-24-20-31-21"
```

The last case is the final fallback: the current time, so the column is
never empty.

In ASCII mode, non-Latin text is transliterated with PHP's `intl`
extension. Install `thl/pinyin` to convert Chinese through Pinyin
instead, which gives more accurate readings.

```bash
composer require thl/pinyin
```

::: tip
Use `utf8: true` when URLs should keep the original language. Use the
default ASCII mode when links are shared with systems that do not handle
encoded URLs well.
:::

Slugify does not check uniqueness. Two rows with the same title get the
same alias, so a unique index on the column fails on the second save.
Check duplicates yourself when the alias identifies a record.

## PageSlugify

A page alias can be a path, such as `docs/getting-started`.
`#[PageSlugify]` extends `Slugify`, accepts the same arguments, and
keeps the slashes:

```php
use Lyrasoft\Luna\Attributes\PageSlugify;

#[PageSlugify]
public string $alias = '';
```

```php
// alias: "Docs/Getting Started"  => "docs/getting-started"
// alias: "/docs//Intro/"         => "docs/intro"
// alias: "", title: "About Us"   => "about-us"
```

Every segment is slugified on its own and empty segments are removed.
When the alias is empty, the whole title becomes a single segment.

::: info
The `limit` argument has no effect on `#[PageSlugify]`. The title
fallback uses the whole title.
:::

## Related Attributes

`#[CreatedTime]` and `#[CurrentTime]` come from the ORM package and fill
the `created` and `modified` timestamps in the same way.

`#[LangAssoc]` shares the namespace but is not a cast. It marks a
controller method that saves language associations. See
[Content Translation](/documentation/luna/systems/multilingual/content-translation).

## Writing Your Own

The same interface supports project-specific attributes. Return a
callable from `getCaster()`. It receives the value, the `ORM`, and the
entity:

```php
use Attribute;
use Windwalker\ORM\Attributes\CastForSaveInterface;
use Windwalker\ORM\ORM;

#[Attribute]
class Trim implements CastForSaveInterface
{
    public function getCaster(): \Closure
    {
        return static fn (
            mixed $value,
            ORM $orm,
            object $entity
        ) => trim((string) $value);
    }
}
```

## Related

- [Content Translation](/documentation/luna/systems/multilingual/content-translation)
