---
layout: doc
description: Import predefined entities and nested trees from a migration or seeder with Luna's DataImporter.
---

# Data Importer

A new site usually needs a few fixed records right after the migration
runs: an About page, a Terms of Service article, a root category tree.
Random seeder data does not fit, because these records have known titles
and aliases. The data importer reads such records from a plain PHP file
and saves them through the ORM, so migrations and seeders stay free of
long insert code.

Luna provides two importers:

- `Lyrasoft\Luna\Importer\DataImporter` for flat records.
- `Lyrasoft\Luna\Importer\NestedDataImporter` for tree records such as
  categories.

## Enabling the Importer

Add `DataImporterTrait` to a migration or seeder, then create an
importer. The importer uses the host's `$this->orm` and prints a progress
counter for each saved item.

```php
use Lyrasoft\Luna\Importer\DataImporterTrait;
use Windwalker\Core\Migration\AbstractMigration;
use Windwalker\Core\Migration\MigrateUp;

return new class extends AbstractMigration {
    use DataImporterTrait;

    #[MigrateUp]
    public function up(): void
    {
        // Create the table first.

        $importer = $this->createDataImporter();
        $importer->import(__DIR__ . '/data/articles.data.php');
    }
};
```

`createDataImporter()` returns a `DataImporter`.
`createNestedDataImporter()` returns a `NestedDataImporter`. Both accept
an optional `ORM` instance to use instead of `$this->orm`.

## Complete Example

The data file returns a list of items. Each item can be an entity, or a
closure that returns one:

```php
<?php

declare(strict_types=1);

use Lyrasoft\Luna\Entity\Article;

return [
    // A closure that builds the entity.
    function () {
        $item = new Article();
        $item->title = 'About Us';
        $item->alias = 'about-us';
        $item->state = 1;
        $item->introtext = '<p>About our team.</p>';

        return $item;
    },
    // A closure using named arguments.
    fn() => Article::create(
        title: 'Contact Us',
        alias: 'contact-us',
        state: 1,
        introtext: '<p>Get in touch.</p>',
    ),
    // An entity created directly with a callback.
    Article::create(
        static function (Article $item) {
            $item->title = 'Services';
            $item->alias = 'services';
            $item->state = 1;

            return $item;
        }
    ),
];
```

After the migration runs, the three articles exist in the table. Each
item is saved with `ORM::saveOne()`.

::: warning
Items without a primary key are saved as new rows. Running the import
again, outside a reset, adds duplicates or hits unique aliases. Keep
imports in a migration, which runs once.
:::

## Sources and Handlers

`import()` accepts three kinds of source:

```php
// A file path. The file is included and must return the items.
$importer->import(__DIR__ . '/data/articles.data.php');

// An array or any iterable of items.
$importer->import([
    Article::create(title: 'Privacy', alias: 'privacy'),
]);

// A closure that returns the items.
$importer->import(fn() => [
    Article::create(title: 'Terms', alias: 'terms'),
]);
```

A data handler changes every item before it is saved. The handler
receives the item and the ORM, and may return the item or nothing:

```php
// Defaults for every import by this importer.
$importer->setDefaultDataHandler(
    function (Article $item) {
        $item->type = $item->type ?: 'page';
        $item->state = 1;
        $item->createdBy = 1;

        return $item;
    }
);

// A handler for one import call. It runs after the default handler.
$importer->import(
    __DIR__ . '/data/articles.data.php',
    function (Article $item) {
        $item->categoryId = 5;
    }
);
```

When a handler returns `null`, the importer keeps the item as modified.

`importItem()` imports a single item with the same handlers and returns
the saved entity. `onItemSaved()` sets a callback that runs after each
save. The trait uses it to print the counter, so replacing it removes the
progress output.

### Splitting Groups

A data file can return several groups, so each group gets its own
handler:

```php
// data/articles.data.php
return [
    'pages' => [
        Article::create(title: 'About', alias: 'about'),
        Article::create(title: 'Privacy', alias: 'privacy'),
    ],
    'news' => [
        Article::create(title: 'Launch', alias: 'launch'),
    ],
];
```

```php
$groups = include __DIR__ . '/data/articles.data.php';

$importer->import(
    $groups['pages'],
    fn(Article $item) => $item->type = 'page'
);

$importer->import(
    $groups['news'],
    fn(Article $item) => $item->type = 'news'
);
```

### Using Services in Data Files

A group can be a closure, so it receives services when you call it. Call
the closure yourself and pass the result to the importer:

```php
use Windwalker\Core\Seed\FakerService;

// data/articles.data.php
return [
    'pages' => function (FakerService $fakerService) {
        $faker = $fakerService->create('en_US');

        return [
            Article::create(
                title: 'About Us',
                alias: 'about-us',
                introtext: $faker->sentence(),
            ),
        ];
    },
];
```

```php
use Windwalker\Core\Seed\FakerService;

#[MigrateUp]
public function up(FakerService $fakerService): void
{
    $importer = $this->createDataImporter();
    $groups = include __DIR__ . '/data/articles.data.php';

    $importer->import($groups['pages']($fakerService));
}
```

A seeder already has `$this->faker`, so it can call
`$groups['pages']($this->faker)`. See [Faker](./faker) for the generator.

## Helpers in Luna

Luna's own migrations and seeders use the importer through two helpers.

```php
// Article migration: sets `type` when an item has none.
$this->importArticles('page', __DIR__ . '/data/pages.data.php');
$this->importArticles('news', $items, function (Article $item) {
    $item->state = 1;
});

// Category seeder: sets `type`, and builds the alias from the title.
$this->importCategories('article', $nodes);
```

## Nested Data

Categories and other tree entities need a parent. Use
`createNestedDataImporter()` and wrap each entity that has children in a
`Lyrasoft\Luna\Tree\Node`:

```php
use Lyrasoft\Luna\Entity\Category;
use Lyrasoft\Luna\Tree\Node;

// data/categories.data.php
return [
    new Node(
        value: Category::create(title: 'Blog', alias: 'blog'),
        children: [
            // A plain entity has no children.
            Category::create(title: 'Tech', alias: 'tech'),
            new Node(
                value: Category::create(title: 'Travel', alias: 'travel'),
                children: [
                    Category::create(title: 'Europe', alias: 'europe'),
                    Category::create(title: 'Asia', alias: 'asia'),
                ],
            ),
        ],
    ),
];
```

```php
$importer = $this->createNestedDataImporter();

$importer->import(
    __DIR__ . '/data/categories.data.php',
    function (Category $category) {
        $category->type = 'article';
    }
);
```

The importer saves a parent first, then each child as its last child. Top
level items go under the tree root. A handler runs for every node, so
`type` applies to the whole tree. To place children differently, replace
the placement logic with `setChildProcessor()`; the closure receives the
child and its parent, and returns the child.

## Seeding Categories by Type

In a host app, the category seeder loads every
`categories/*.categories.php` file from the seeders folder. A type either
describes random categories or provides a closure that returns nodes:

```php
// resources/seeders/categories/shop.categories.php
use Lyrasoft\Luna\Entity\Category;
use Lyrasoft\Luna\Tree\Node;
use Windwalker\Core\Seed\FakerService;

return [
    // Random categories.
    'article' => [
        'number' => 30,
        'max_level' => 3,
    ],
    // Predefined nodes, imported with importCategories().
    'product' => function (FakerService $fakerService) {
        return [
            new Node(
                value: Category::create(title: 'Books', alias: 'books'),
            ),
        ];
    },
];
```

Packages can ship their own `*.categories.php` file, so no package needs
to edit the seeder to add a category type.

## Related

- [Faker](./faker)
- [Seeders](/documentation/framework/services/database/seeders)
- [Migrations](/documentation/framework/services/database/migrations)
