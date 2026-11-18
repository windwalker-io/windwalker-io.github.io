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

### BigInt Columns

> !review
> 先說明

### Enum Columns

Store an enum in a `tinyint` or `varchar` column, and map it to a PHP
enum. The `g enum` command generates the enum class, as described in
[Enum](/documentation/framework/core-concepts/enum).

```php
namespace App\Enum;

enum ItemState: int
{
    case DISABLED = 0;
    case ENABLED = 1;
}
```

The entity then uses the enum as the property type.

```php
#[Column('state')]
public ItemState $state = ItemState::DISABLED;

// Load and compare
if ($sakura->state === ItemState::ENABLED) {
    // ...
}
```

With the `-k` option, `build:entity` adds a property hook to the enum
property. The hook accepts the enum case or the raw backed value, such as
`1`, and converts it to the enum.

```php
#[Column('state')]
public ItemState $state {
    set(ItemState|int|string $value) {
        $this->state = ItemState::wrap($value);
    }
}
```

See [Modeling](/documentation/guides/mvc/modeling) for the full
`build:entity -k` output and how to add `get` hooks.

To add labels, colors, or other display data to an enum, see
[Enum](/documentation/framework/core-concepts/enum).

::: tip
Use a backed enum for stored values. The stored value is a stable
integer or string, and the case name can change without a migration.
:::

### JSON and Record Columns

Columns of type `json` become `array` properties with `#[JsonObject]`.
Windwalker generates this attribute automatically, and you can change it
to `#[JsonArray]` if the value is a list.

```php
use Windwalker\ORM\Attributes\JsonArray;
use Windwalker\ORM\Attributes\JsonObject;

#[Column('options')]
#[JsonObject]
public array $options = [];

#[Column('tags')]
#[JsonArray]
public array $tags = [];
```

To read a JSON value as an object, wrap the array with `Record::wrap()`.
A `Record` class uses `RecordTrait` and implements `RecordInterface`. See
[Object Serialization](/documentation/framework/core-concepts/api-systems/object-serialization)
for how these objects are serialized.

```php
use Windwalker\Data\Record;

$record = Record::wrap($sakura->options);
echo $record->theme;
```


### DateTime Columns

`datetime` columns become `?Chronos` properties with
`#[CastNullable(ServerTimeCast::class)]`. The cast reads and writes the
value in the server time zone and stores it as UTC.

```php
use Windwalker\Core\DateTime\Chronos;
use Windwalker\Core\DateTime\ServerTimeCast;
use Windwalker\ORM\Attributes\CastNullable;

#[Column('publish_at')]
#[CastNullable(ServerTimeCast::class)]
public ?Chronos $publishAt = null;

// Stored as "2025-01-01 00:00:00" in UTC
$sakura->publishAt = Chronos::wrap('2025-01-01 09:00:00', 'Asia/Tokyo');
```

Use a real `NULL` for an empty date. Avoid zero dates such as
`0000-00-00 00:00:00`, because they are not valid values for `Chronos`.

::: info
When a serialized date is passed back in with its time zone, such as
`2025-01-01T09:00:00+09:00`, `ServerTimeCast` converts it to the server
time zone before saving.
:::

### Date Columns

`date` columns can use `PlainDate`, a date without time. Windwalker
generates it automatically with `#[CastNullable(PlainDateCast::class)]`.

```php
use Windwalker\Core\DateTime\PlainDate;
use Windwalker\Core\DateTime\PlainDateCast;

#[Column('birthday')]
#[CastNullable(PlainDateCast::class)]
public ?PlainDate $birthday = null;

$sakura->birthday = PlainDate::parse('2024-03-25');
```

### Time Columns

`time` columns can use `PlainTime`, a time of day without a date. It is
generated with `#[CastNullable(PlainTimeCast::class)]`.

```php
use Windwalker\Core\DateTime\PlainTime;
use Windwalker\Core\DateTime\PlainTimeCast;

#[Column('opens_at')]
#[CastNullable(PlainTimeCast::class)]
public ?PlainTime $opensAt = null;

$sakura->opensAt = PlainTime::parse('09:30:00');
```

::: info
`PlainTimeCast` accepts only values from `00:00:00` to `23:59:59`.
:::

### Month and Day Values

A value that stores only a month and day, such as a yearly anniversary,
can be a `string` in `MM-DD` format. This type is not generated, so you
write it by hand.

```php
#[Column('anniversary')]
public ?string $anniversary = null;
```

To work with it as an object, use `PlainMonthDay` and add the cast
yourself. Its `toIso()` method returns the `MM-DD` string.

```php
use Windwalker\Core\DateTime\PlainMonthDay;

$sakura->anniversary = PlainMonthDay::parse('03-25');
echo $sakura->anniversary->toIso(); // 03-25
```

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
- `#[JsonNoSerialize]` hides a property from JSON output only.
