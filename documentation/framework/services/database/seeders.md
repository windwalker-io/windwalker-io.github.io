---
layout: doc
title: Seeders
description: Write seeder files that fill a database with test or demo data through the ORM, then run them with seed:import and reverse them with seed:clear.
---

# Seeders

Seeders fill a database with test or demo data. A seeder is a PHP file
that inserts records through the ORM, and it can clear them again. The
`seed:import` command runs them, and `seed:clear` reverses the work.
This page covers how to create, write, and run seeders.

## Creating a Seeder

Generate a seeder file with the `seed:create` command:

```shell
php windwalker seed:create article
```

```text
[CREATE] resources/seeders/article.seeder.php
```

The file is created in the `@seeders` directory unless you pass
`--dir`. Seeders are not discovered automatically. Add the file path to
`resources/seeders/main.seeder.php` yourself:

```php
<?php

declare(strict_types=1);

return [
    __DIR__ . '/user.seeder.php',
    __DIR__ . '/category.seeder.php',
    __DIR__ . '/article.seeder.php',
];
```

Seeders run in the order listed in `main.seeder.php`. Put a seeder
after the seeders that create the rows it references, such as users
or categories. Clearing runs in reverse, so the dependent data is
removed first. A seeder that is not listed is never executed.

## Writing a Seeder

A seeder returns an anonymous class that extends `AbstractSeeder`. The
`#[SeedImport]` method creates the data, and the `#[SeedClear]` method
removes it:

```php
<?php

declare(strict_types=1);

namespace App\Seeder;

use App\Entity\Article;
use App\Entity\User;
use Windwalker\Core\Seed\AbstractSeeder;
use Windwalker\Core\Seed\SeedClear;
use Windwalker\Core\Seed\SeedImport;

return new /** Article Seeder */ class extends AbstractSeeder {
    #[SeedImport]
    public function import(): void
    {
        $faker = $this->faker('en_US');

        $userIds = $this->orm->findColumn(User::class, 'id')->dump();

        $mapper = $this->orm->mapper(Article::class);

        foreach (range(1, 50) as $i) {
            $item = $mapper->createEntity();

            $item->title = $faker->sentence(4);
            $item->content = $faker->paragraphs(3, true);
            $item->state = $faker->randomElement([1, 1, 1, 0]);
            $item->created = $faker->dateTimeThisYear();
            $item->createdBy = (int) $faker->randomElement($userIds);

            $mapper->createOne($item);

            $this->printCounting();
        }
    }

    #[SeedClear]
    public function clear(): void
    {
        $this->truncate(Article::class);
    }
};
```

### Injecting Services

The import and clear methods are called through the application
container. Type-hint any service you need as a parameter, and the
container injects it:

```php
use Lyrasoft\Luna\Access\AccessService;
use Windwalker\Crypt\Hasher\PasswordHasherInterface;

#[SeedImport]
public function import(
    PasswordHasherInterface $password,
    AccessService $accessService,
): void {
    $hash = $password->hash('1234');
    // ...
}
```

Inside a seeder, these properties are available without injection:

- `$this->db`: the `DatabaseAdapter` for the active connection.
- `$this->orm`: the ORM, equal to `$this->db->orm()`.

Use `$this->orm` for entities with mappers, such as
`$this->orm->mapper(Article::class)`. Use `$this->db->getWriter()`
for plain tables without an entity class.

### Generating Fake Data

Call `faker()` with a locale to get a Faker generator:

```php
$faker = $this->faker('en_US');

$name = $faker->name();
$email = $faker->safeEmail();
$date = $faker->dateTimeThisYear();
$tags = $faker->words(3);
```

The locale is passed to `FakerService`, which caches one generator per
locale. Use a different locale for each record to produce localized
text:

```php
$faker = $this->faker('en_US');
$lang = $faker->randomElement(['en-US', 'zh-TW']);

$localized = $this->faker(str_replace('-', '_', $lang));
$title = $localized->sentence(2);
```

::: tip
Register the extra Lorem providers, such as the Chinese ones, in
`main.seeder.php` before the seeders run. The host app does this with
`FakerHelper::registerMoreLoremClasses()`.
:::

### Printing Progress

Call `printCounting()` after each record to show progress in the
terminal:

```php
foreach (range(1, 100) as $i) {
    $mapper->createOne($item);

    // Print one step per record.
    $this->printCounting();
}

// Print several steps at once, with a message.
$this->printCounting(10, 'Creating comments');

// Reset the counter before a new phase.
$this->resetCount();
```

### Clearing Data

The `#[SeedClear]` method removes what the import created. Use
`truncate()` with entity classes or table names:

```php
#[SeedClear]
public function clear(): void
{
    $this->truncate(Article::class, 'article_tags');
}
```

::: warning
`truncate()` deletes all rows in each table. Run `seed:clear` only
against a database that holds disposable data.
:::

## Running Seeders

Run every seeder listed in `main.seeder.php`:

```shell
php windwalker seed:import
```

Add `-s` to `migrate` to run the seeders after the migrations. See
[Migrations](/documentation/framework/services/database/migrations) for
details.

Use the following options to choose what runs:

```shell
# Run a single seeder file.
php windwalker seed:import --file=resources/seeders/article.seeder.php

# Run the main.seeder.php of another directory.
php windwalker seed:import --dir=resources/seeders/demo

# Run on a specific database connection.
php windwalker seed:import --connection=secondary

# Skip the confirmation prompt, for scripts.
php windwalker seed:import --force
```

`seed:clear` accepts the same `--file`, `--dir`, `--connection`, and
`--force` options:

```shell
php windwalker seed:clear --force
```

::: warning
Both commands ask for confirmation before they run. Use `--force` only
in scripts where the target database is known.
:::

### Automatic Backup

Before importing or clearing, the commands write an SQL backup of the
database. Use `--no-backup` to skip it, or set the `DB_BACKUP_DISABLED`
environment variable. See
[Backup and Export](/documentation/framework/services/database/backup-and-export)
for details.

::: info
Skipping the backup removes the safety net for data loss. Keep it
enabled unless the database is disposable.
:::

## Related

- [Migrations](/documentation/framework/services/database/migrations)
- [ORM](/documentation/framework/services/database/orm)
- [Entities](/documentation/framework/services/database/entities)
- [Backup and Export](/documentation/framework/services/database/backup-and-export)
- [Database component](/documentation/components/database/index)
- [ORM component](/documentation/components/orm/index)
