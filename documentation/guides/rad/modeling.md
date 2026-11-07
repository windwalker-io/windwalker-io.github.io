---
layout: doc
---

# Entities, Migrations and Seeders

This chapter adds a `Product` entity and table, then registers sample products for local development.

## Create the Entity and Migration

Generate the entity and a migration:

```bash
php windwalker g entity Product
php windwalker mig:create ProductInit
```

When prompted, select `App\Entity\Product` and choose to create a new table. Define the table in the generated migration:

```php
<?php

declare(strict_types=1);

use App\Entity\Product;
use Windwalker\Core\Migration\AbstractMigration;
use Windwalker\Core\Migration\MigrateDown;
use Windwalker\Core\Migration\MigrateUp;
use Windwalker\Database\Schema\Schema;

return new /** ProductInit */ class extends AbstractMigration {
    #[MigrateUp]
    public function up(): void
    {
        $this->createTable(
            Product::class,
            function (Schema $schema) {
                $schema->primary('id');
                $schema->varchar('title');
                $schema->varchar('alias');
                $schema->longtext('intro');
                $schema->longtext('description');
                $schema->decimal('price')->length('20,6');
                $schema->integer('inventory');
                $schema->tinyint('state')->length(1);
                $schema->tinyint('featured')->length(1);
                $schema->integer('ordering');
                $schema->datetime('created');
                $schema->datetime('modified');
                $schema->json('params');

                $schema->addIndex('alias');
            }
        );
    }

    #[MigrateDown]
    public function down(): void
    {
        $this->dropTables(Product::class);
    }
};
```

Apply the migration to the configured development database:

```bash
php windwalker mig:go -f
```

The entity generator can now synchronize properties with the table:

```bash
php windwalker build:entity Product
php windwalker build:entity Product -k
```

The first command generates properties; `-k` generates property hooks where needed. Windwalker components and installed extensions can contribute attributes for mapping and behavior. For example, the ORM's `#[Column]` and `#[JsonObject]` attributes control column mapping and JSON conversion; only use package-specific attributes when that package is installed.

Use `JsonObject` for properties stored as JSON so the ORM maps them to PHP arrays:

```php
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\JsonObject;

#[Column('params')]
#[JsonObject]
public array $params = [];
```

See the [ORM documentation](/documentation/components/orm/) for entity mapping and casts.

## Create a Product Seeder

Generate a seeder:

```bash
php windwalker seed:create product
```

Register it in the returned array in `resources/seeders/main.seeder.php`:

```php
<?php

declare(strict_types=1);

return [
    __DIR__ . '/acme.seeder.php',
    __DIR__ . '/product.seeder.php',
];
```

The product seeder creates standalone product records:

```php
<?php

declare(strict_types=1);

use App\Entity\Product;
use Windwalker\Core\Seed\AbstractSeeder;
use Windwalker\Core\Seed\SeedClear;
use Windwalker\Core\Seed\SeedImport;
use Windwalker\ORM\EntityMapper;

return new /** Product Seeder */ class extends AbstractSeeder {
    #[SeedImport]
    public function import(): void
    {
        /** @var EntityMapper<Product> $mapper */
        $mapper = $this->orm->mapper(Product::class);

        foreach (range(1, 50) as $i) {
            $item = $mapper->createEntity();
            $item->title = 'Product ' . $i;
            $item->alias = 'product-' . $i;
            $item->intro = 'Introduction for product ' . $i . '.';
            $item->description = 'Description for product ' . $i . '.';
            $item->price = random_int(500, 9999);
            $item->inventory = random_int(0, 1000);
            $item->state = $i % 5 === 0 ? 0 : 1;
            $item->featured = 0;
            $item->ordering = $i;
            $created = new \DateTimeImmutable('-' . $i . ' days');
            $item->created = $created;
            $item->modified = $created->modify('+1 day');
            $item->params = [];

            $mapper->createOne($item);
            $this->printCounting();
        }
    }

    #[SeedClear]
    public function clear(): void
    {
        $this->truncate(Product::class);
    }
};
```

For a fresh local database, run the migration and seeders after registering the product seeder:

```bash
php windwalker mig:go -fs
```

The `-s` option imports seeders. Do not use reset or seed commands against data that must be preserved.
