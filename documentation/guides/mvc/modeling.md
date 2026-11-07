---
layout: doc
---

# Entity, Migrations and Seeders

In this tutorial we build a simple blog. First we create the database structure and some test data.

## Create an Entity

We start with a basic `Article` table, beginning with the Entity. Every table must have a corresponding entity.

Run:

```bash
php windwalker g entity Article
```

This creates `src/Entity/Article.php`, which looks like this:

```php
<?php

// ...

#[Table('articles', 'article')]
class Article implements EntityInterface
{
    use EntityTrait;

    #[EntitySetup]
    public static function setup(EntityMetadata $metadata): void
    {
        //
    }
}
```

`#[Table]` on the class declares the table name. We will edit it later. Next, create the migration.

## Create a Migration

Run:

```bash
php windwalker mig:create ArticleInit
```

The system asks a few questions. Choose the Article entity and `create` (select by number):

```
 Entity name? [** IGNORE **]:
  [0] ** IGNORE **
  [1] App\Entity\Acme
  [2] App\Entity\Article
 > 2

 Is an update or create new entity? [create]:
  [0] create
  [1] update
 > 0

[CREATE] resources/migrations/2025101608170001_ArticleInit.php
```

A file named `xxxxxxxxxxxxxx_ArticleInit.php` is created under `resources/migrations`.

Open it and define the article table columns:

```php
<?php

// ...

use App\Entity\Article;
use Windwalker\Core\Console\ConsoleApplication;
use Windwalker\Core\Migration\Migration;
use Windwalker\Database\Schema\Schema;

// ...

return new /** 2025101608170001_ArticleInit */ class extends AbstractMigration {
    #[MigrateUp]
    public function up(): void
    {
        $this->createTable(
            Article::class,
            function (Schema $schema) {
                $schema->primary('id');
                $schema->integer('category_id');
                $schema->varchar('title');
                $schema->varchar('image');
                $schema->tinyint('state');
                $schema->longtext('content');
                $schema->datetime('created');
                $schema->integer('created_by');
                $schema->json('params');

                $schema->addIndex('category_id');
                $schema->addIndex('created_by');
            }
        );
    }

    #[MigrateDown]
    public function down(): void
    {
        $this->dropTables(Article::class);
    }
};
```

We use the `App\Entity\Article::class` we just created as the table name and define some common columns. `down()` removes the table when the migration is rolled back.

Run the following command to migrate up and create the table:

```bash
php windwalker mig:go -f
```

On success it prints:

```
Migration start...
==================

20210620165937 ArticleInit UP... Success

Completed.
```

You can check the migration status with:

```
> php windwalker mig:status

+--------+--- Migration Status ------------+
| Status | Version        | Migration Name |
+--------+----------------+----------------+
| up     | 20210619155333 | AcmeInit       |
| up     | 20210620165937 | ArticleInit    |
+--------+----------------+----------------+
```

## Create Entity Properties

Since all database mapping is handled by entities, we need to set up the Entity first.

The table already exists, so we can build the entity properties from it:

```bash
php windwalker build:entity Article
```

Result:

```
Handling: App\Entity\Article

  Added columns:
    - categoryId (category_id)
    - title (title)
    - image (image)
    - content (content)
    - created (created)
    - createdBy (created_by)
    - params (params)
```

The system creates the matching properties from the table. Open the file:

```php
<?php // src/Entity/Article.php

#[Table('articles', 'article')]
class Article implements EntityInterface
{
    use EntityTrait;

    #[Column('id'), PK, AutoIncrement]
    public ?int $id = null;

    #[Column('category_id')]
    public int $categoryId = 0;

    #[Column('title')]
    public string $title = '';

    #[Column('image')]
    public string $image = '';

    #[Column('state')]
    public int $state = 0;

    #[Column('content')]
    public string $content = '';

    #[Column('created')]
    #[CastNullable(ServerTimeCast::class)]
    public ?Chronos $created = null;

    #[Column('created_by')]
    public int $createdBy = 0;

    #[Column('params')]
    #[JsonObject]
    public array $params = [];
}
```

Every column has a matching property and default value, and some columns have a Cast to help convert types.

This is where you set up all possible type adjustments. For example, the `params` column stores JSON. With `#[JsonObject]` it is converted to an array when fetched and back to JSON when saved.

### Custom Types

Most columns are handled automatically. If your entity uses special types or objects as values, adjust them by hand.

For the following examples we need a custom type. Run:

```bash
php windwalker g enum ItemState --case enabled --case disabled
```

This quickly creates an `ItemState` enum. Change `enabled` and `disabled` from strings to `1` and `0`:

```diff
- enum ItemState: string implements EnumRichInterface
+ enum ItemState: int implements EnumRichInterface
{
    use EnumRichTrait;

-    case ENABLED = 'enabled';
+    case ENABLED = 1;
-    case DISABLED = 'disabled';
+    case DISABLED = 0;

    // ...
```

Use it for the `state` property in Article instead of `int`:

```diff
// ...

    #[Column('state')]
-    public int $state = 0;
+    public ItemState $state;

// ...
```

Now Article accepts the enum as a value.

### Casting

Casts convert types when data is fetched from the database into the object, and when it is taken from the object and stored in the database.

For more details, see the [ORM](/documentation/components/orm/) documentation.

### Property Hooks

Once all casts are set up, you can add property hooks to the entity. Run the same command as before, but with `-k`:

```bash
php windwalker build:entity Article -k
```

Result:

```
Handling: App\Entity\Article

  Added property hooks:
    - state (set)
    - created (set)
```

Currently only `state` and `created` need property hooks. Both hold special objects, so scalar values must be converted when assigned.

```php
    #[Column('state')]
    public ItemState $state {
        set(ItemState|int $value) => $this->state = ItemState::wrap($value);
    }

    // ...

    #[Column('created')]
    #[CastNullable(ServerTimeCast::class)]
    public ?Chronos $created = null {
        set(\DateTimeInterface|string|null $value) => $this->created = Chronos::tryWrap($value);
    }
```

If you have different needs, you can write `get` / `set` hooks manually. For example, to give `state` a default value:

```diff
    #[Column('state')]
    public ItemState $state {
        set(ItemState|int $value) => $this->state = ItemState::wrap($value);
+       get => $this->state ??= ItemState::DISABLED;
    }
```

## Create a Seeder

With the entity and its hooks ready, we can create seeders to fill in test data.

Run:

```bash
php windwalker seed:create article
```

This creates:

```
[CREATE] resources/seeders/article.seeder.php
```

Seeders depend on execution order, so register it manually in `resources/seeders/main.seeder.php`:

```diff
<?php

return [
    __DIR__ . '/acme.seeder.php',
+   __DIR__ . '/article.seeder.php',
];
```

When there are more and more seeders, this list controls the execution order.

Now open `article.seeder.php` and fill in fake articles:

```php
<?php

// ...

use App\Entity\Article;
use Windwalker\Core\Seed\AbstractSeeder;
use Windwalker\Core\Seed\SeedClear;
use Windwalker\Core\Seed\SeedImport;
use Windwalker\ORM\EntityMapper;

return new /** Article Seeder */ class extends AbstractSeeder {
    #[SeedImport]
    public function import(): void
    {
        $faker = $this->faker('en_US');

        /** @var EntityMapper<Article> $mapper */
        $mapper = $this->orm->mapper(Article::class);

        foreach (range(1, 50) as $i) {
            $item = $mapper->createEntity();
            $item->title = $faker->sentence(2);
            $item->image = 'https://placeholdit.com/600x400/dddddd/999999';
            $item->content = $faker->paragraph(40);
            $item->state = $faker->randomElement(ItemState::cases());
            $item->createdBy = 1; // There is no User yet, use 1
            $item->categoryId = 1; // There is no category yet, use 1
            $item->created = $faker->dateTimeThisYear();
            $item->params = [
                'show_date' => true,
                'show_author' => false,
            ];

            $article = $mapper->createOne($item);

            $this->printCounting();
        }
    }

    #[SeedClear]
    public function clear(): void
    {
        // Also add this
        $this->truncate(Article::class);
    }
};
```

Because entity properties are public, IDEs can show what needs to be filled in and check the types.

`->created = ...` accepts several types because of the `set` hook generated earlier:

```php
    #[Column('created')]
    #[CastNullable(ServerTimeCast::class)]
    public ?Chronos $created = null {
        set(\DateTimeInterface|string|null $value) => $this->created = Chronos::tryWrap($value);
    }
```

It converts whatever you pass into a `Chronos` object. You can modify any property or hook to add type checks or conversions. The goal is to make database access more convenient and type-safe.

Now run again:

```bash
php windwalker mig:reset -fs
```

This refreshes all migrations and seeders.
