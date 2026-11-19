---
layout: doc
title: Entities
---

# Entities

An entity is a PHP class that maps one table to one object, and each
property maps to one column. Entities give your code typed properties,
automatic conversion between PHP and database values, and a single place
that records the primary key and column names of a table.

Windwalker can generate most of an entity from the database, so you do
not have to write every property by hand. The generated code is kept
in sync with the table, and you can still edit it afterwards.

:::info
The standalone package has its own detailed guide: [Entities](../../../components/orm/entities.md). This page focuses on using it inside the Windwalker framework.
:::

## Generating Entities

Generate an entity from a table that already exists. The `g entity`
command creates an empty class, and `build:entity` fills it in from the
database.

```bash
php windwalker g entity Sakura
```

```php
namespace App\Entity;

use Windwalker\ORM\Attributes\Table;
use Windwalker\ORM\EntityInterface;
use Windwalker\ORM\EntityTrait;

#[Table('sakuras')]
class Sakura implements EntityInterface
{
    use EntityTrait;
}
```

The new class has no properties yet. Windwalker treats the final result
of your migrations as the source of truth for the schema. Create the
table with a migration first (see [Migrations](/documentation/framework/services/database/migrations)),
then sync its columns to the entity.

```bash
php windwalker build:entity Sakura
```

`build:entity` reads the table and adds a property for each column to
the entity file. It keeps the existing code, and it adds only the
columns that are missing. Run it again after a migration adds a column.

```php
namespace App\Entity;

use Windwalker\Core\DateTime\Chronos;
use Windwalker\ORM\Attributes\AutoIncrement;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Attributes\Table;
use Windwalker\ORM\EntityInterface;
use Windwalker\ORM\EntityTrait;

#[Table('sakuras')]
class Sakura implements EntityInterface
{
    use EntityTrait;

    #[Column('id'), PK, AutoIncrement]
    public ?int $id = null;

    #[Column('title')]
    public string $title = '';

    #[Column('state')]
    public int $state = 0;

    #[Column('created')]
    public ?Chronos $created = null;
}
```

After the properties exist, you can adjust them by hand. Change a type,
add a `#[Cast]`, or swap a plain `int` for a richer class. Running
`build:entity` again does not overwrite these changes. Then run
`build:entity -k` to generate the hook methods. The hooks are the
getter and setter pairs that convert values; see [Hooks](#hooks) below.

```bash
php windwalker build:entity Sakura -k
```

::: tip
Use `-d` (`--dry-run`) to preview the changes before a file is written.
Use `-p` (`--props`) to generate properties only.
:::

### Standard Workflow

Follow these three steps whenever you create or update an entity:

1. Generate the properties from the table:

    ```bash
    php windwalker build:entity Sakura
    ```

2. Review the generated fields. Change any type that does not fit your
   data, such as a `BigInteger` or `BigDecimal` column, an enum, or a
   JSON array. Add `#[Cast]` attributes where needed.

3. Generate the property hooks for the adjusted fields:

    ```bash
    php windwalker build:entity Sakura -k
    ```

Run step 1 before step 2, because the generator creates the property
definitions you review. Run step 3 last, so the hooks match the final
types.

::: warning
Run `build:entity -k` only after you finish step 2. If you change a
property type later, run `-k` again so the hooks match the new type.
:::

### Composite Primary Keys

When a table has more than one primary key column, mark each of them
with `#[PK]`. The ORM uses all of them to identify a row.

```php
#[Table('sakura_tags')]
class SakuraTag implements EntityInterface
{
    use EntityTrait;

    #[Column('sakura_id'), PK]
    public int $sakuraId = 0;

    #[Column('tag_id'), PK]
    public int $tagId = 0;

    #[Column('position')]
    public int $position = 0;
}
```

::: info
A composite key is not auto-increment. Do not add `#[AutoIncrement]` to
any of its columns.
:::

## Using Entities

An entity is a plain object that holds one row. The ORM reads and writes
it through `EntityMapper`, which you can get from the ORM service or
from an `ORM` instance. The basics are covered in
[Entities](/documentation/components/orm/entities), and the database
access methods are described in
[ORM](/documentation/framework/services/database/orm).

```php
use App\Entity\Sakura;

// Create a new row
$sakura = new Sakura();
$sakura->title = 'Yoshino';
$sakura->state = 1;

$sakura = $orm->createOne(Sakura::class, $sakura);

// Load by primary key
$sakura = $orm->findOne(Sakura::class, 1);

// Update, then save again
$sakura->title = 'Somei Yoshino';
$orm->updateOne(Sakura::class, $sakura);

// Delete
$orm->deleteOne(Sakura::class, 1);
```

## Hooks

`build:entity -k` generates a getter and setter pair for each property.
The setter converts the incoming value to the type declared on the
property, and the getter returns the converted value. The hook code is
plain PHP, so you can read and change it.

```php
#[Column('id'), PK, AutoIncrement]
public ?int $id = null;

// Generated hooks
protected function getId(?int $value): ?int
{
    return $value;
}
```

Hooks run for every property access. Keep them simple, and avoid
database calls inside them.

## Casting

Casting converts a value between its database form and its PHP type. The
`#[Cast]` family of attributes handles this for each property. The ORM
casts, such as `#[CurrentTime]`, `#[CreatedTime]`, and `#[AutoTruncate]`,
come with the ORM package. The date casts below, such as
`ServerTimeCast`, `PlainDateCast`, and `PlainTimeCast`, come from the
application layer and need Windwalker Core. See
[Casting](/documentation/components/orm/casting) for the full rules.

### Automatic Timestamps

Use `#[CurrentTime]` to write the current time on every update, and
`#[CreatedTime]` to write it when a new row is inserted.

```php
use Windwalker\ORM\Attributes\CreatedTime;
use Windwalker\ORM\Attributes\CurrentTime;

#[Column('created')]
#[CreatedTime]
public ?Chronos $created = null;

#[Column('modified')]
#[CurrentTime]
public ?Chronos $modified = null;

// Keep the value on insert, update it on save
#[Column('published')]
#[CurrentTime('now', onlyUpdate: false)]
public ?Chronos $published = null;
```

These attributes run only when the entity is saved through the ORM. The
user columns such as `created_by` and `modified_by` are not filled in
automatically, because the framework does not know the current user.
Set them in your application code before saving.

::: info
`#[CurrentTime]` writes on update only by default. On insert it keeps a
value that you already set, so set `onlyUpdate: false` if you want the
column to always receive the current time when a row is saved.
:::

### Computed Properties

Use a PHP 8.4 property hook on a virtual property to calculate a value
from other columns. Virtual properties are not stored, and they are
excluded from serialization unless you add `#[Expose]`.

```php
use Windwalker\Utilities\Attributes\Expose;

#[Expose]
public string $label {
    get => sprintf('%s (%s)', $this->title, $this->state);
}
```

::: warning
Do not add `#[Expose]` to a computed property of a Record that is stored in
a JSON column. The value is then saved with the record, and it can break
`wrap()` when the record is read back.
:::

### Automatic String Truncation

Use `#[AutoTruncate]` on a string property to shorten its value to the
length of its column before saving. It runs silently, so a long value
will lose its tail without an error.

```php
use Windwalker\ORM\Attributes\AutoTruncate;

#[Column('title')]
#[AutoTruncate]
public string $title = '';

// Or set a limit that is shorter than the column
#[Column('summary')]
#[AutoTruncate(maxLength: 120)]
public string $summary = '';
```

::: warning
`#[AutoTruncate]` discards data without an error. Use it only where a
short value is acceptable.
:::

## Column Types

Special column types, such as `bigint`, `decimal`, `enum`, `json`, and
date and time types, are described on the
[Column Types](/documentation/framework/services/database/column-types)
page.

## Serialization

Entities can be converted to arrays and JSON. `dump()` returns the public
properties, and `json_encode()` uses the same data. Protected and virtual
properties are excluded unless you mark them with `#[Expose]`.

See [Object Serialization](/documentation/framework/core-concepts/api-systems/object-serialization)
for the full rules.

## Extra Features

- `build:entity -e` generates enums for columns that declare an enum
  comment, when the enum class does not exist yet.
- `build:entity -d` previews the result without changing your file.
- `#[Invisible]` hides a property from both `dump()` and JSON output.
- `#[JsonNoSerialize]` hides a property from JSON output only.
