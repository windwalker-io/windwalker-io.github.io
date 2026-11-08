---
layout: doc
title: Entities
component: orm
---

# Entities

An entity is the PHP object that represents one row of a table. In
Domain-Driven Design, an entity models a thing in your domain. In
Windwalker, an entity maps one table to one class, and each mapped
property maps to one column.

Entities hold data and can have methods of their own, but they do not
read or write the database. Domain code stays easy to test, and the ORM
remains the only place where storage rules are applied.

## Minimal Setup

Add `#[Table]` to the class, implement `EntityInterface`, and use
`EntityTrait`. Map each stored property with `#[Column]`, and mark the
primary key with `#[PK]` and `#[AutoIncrement]`.

```php
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
}
```

The ORM creates entity objects before it fills them with data. Keep the
constructor free of required parameters.

## Showcase

The sections below extend the `Sakura` entity from the minimal setup. The
example shows how an entity is created, filled, cast, and serialized.

```php
use DateTimeImmutable;
use Windwalker\ORM\Attributes\Cast;
use Windwalker\ORM\Attributes\CastNullable;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\CurrentTime;
use Windwalker\ORM\Attributes\JsonArray;
use Windwalker\ORM\Attributes\JsonNoSerialize;

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

    #[Column('enabled')]
    #[Cast('bool', 'int')]
    public bool $enabled = false;

    #[Column('params')]
    #[JsonArray]
    public array $params = [];

    #[Column('modified')]
    #[CastNullable(DateTimeImmutable::class)]
    #[CurrentTime]
    public ?DateTimeImmutable $modified = null;

    #[Column('internal_note')]
    #[JsonNoSerialize]
    public string $internalNote = '';
}

$sakura = new Sakura();
$sakura->title = 'Rose';
$sakura->params = ['color' => 'red'];

$sakura = Sakura::create(function (Sakura $item) {
    $item->title = 'Rose';
    $item->state = 1;
});
```

## Creating Entities

An entity can be created with `new`, through `Sakura::create()`, or
through an `EntityMapper`. The entity is not required to be complete when
it is created. You can fill its fields one by one before saving it.

```php
// Fill it step by step
$sakura = new Sakura();
$sakura->title = 'Rose';

// Fill it inside a closure
$sakura = Sakura::create(function (Sakura $item) {
    $item->title = 'Rose';
});

// Ask the mapper to create it
$sakura = $orm->mapper(Sakura::class)->createEntity();
```

Unlike a value object, an entity is allowed to be partially filled. This
is the normal state of an entity between creation and saving.

## Hydrate and Extract

Two terms describe moving data between arrays and entities:

- **Hydrate** converts an array, such as a database row, into an entity.
  Values are converted to the PHP types of the properties.
- **Extract** converts an entity into an array of values that are ready
  for the database.

```php
$sakura = $orm->hydrateEntity($row, new Sakura());

$data = $orm->extractEntity($sakura);
```

Hydrating into an existing entity merges the array into it. Call it again
with another array to overwrite the fields that it contains.

For a single conversion, use `toEntity()` or `tryEntity()`:

```php
// Requires an array or an object
$sakura = $orm->toEntity(Sakura::class, $row);

// Accepts null and returns null for it
$sakura = $orm->tryEntity(Sakura::class, $row);
```

::: warning
Do not hydrate request input directly, such as
`$orm->hydrateEntity($request->all(), $sakura)`. Any column can be
set this way, including `state`, `created_by`, or `id`. Read only the
fields that the user is allowed to change.
:::

## Casting

Casts convert a value when it is loaded into an entity and when it is
saved. The first argument of `#[Cast]` is the conversion used on load, and
the second argument is the conversion used on save. If you omit the second
argument, the ORM decides how to convert the value back.

```php
#[Column('enabled')]
#[Cast('bool', 'int')]
public bool $enabled = false;
```

The database stores `enabled` as `0` or `1`, and the entity exposes a
`bool`. The first argument can be:

- A type name, such as `int`, `string`, or `bool`.
- A cast object, such as `new JsonCast()`.
- A class name. By default, the value is passed to the class constructor.
  Pass `Cast::USE_HYDRATOR` as the option to build the object with a
  hydrator instead.

```php
#[Column('address')]
#[Cast(Address::class, options: Cast::USE_HYDRATOR)]
public ?Address $address = null;
```

When a value needs more than one conversion, stack several casts. They run
in the order in which they are declared.

### JSON Columns

`#[JsonArray]` stores an array as a JSON list. `#[JsonObject]` keeps empty
arrays as JSON objects.

```php
#[Column('params')]
#[JsonArray]
public array $params = [];
```

### Nullable Columns

`#[CastNullable]` allows the value to be `null`. It also converts an empty
string to `null`.

```php
#[Column('modified')]
#[CastNullable(DateTimeImmutable::class)]
public ?DateTimeImmutable $modified = null;
```

Casts run every time an entity is hydrated or extracted. Keep them cheap.
Work that should run once, just before a row is saved, belongs in the
save-time casts described in the next section.

## Save-Time Values

`#[CurrentTime]` and `#[CreatedTime]` implement `CastForSave`. They run
once, just before a row is written, and they fill in values such as
timestamps.

```php
#[Column('created')]
#[CastNullable(DateTimeImmutable::class)]
#[CreatedTime]
public ?DateTimeImmutable $created = null;

#[Column('modified')]
#[CastNullable(DateTimeImmutable::class)]
#[CurrentTime]
public ?DateTimeImmutable $modified = null;
```

- `#[CreatedTime]` writes the current time when a new row is inserted and
  the value is `null`.
- `#[CurrentTime]` writes the current time whenever an existing row is
  updated. On an insert, it keeps the value you set. Pass
  `onlyUpdate: false` to write the time on inserts as well.

```php
#[CurrentTime(onlyUpdate: false)]
public ?DateTimeImmutable $touched = null;
```

## Virtual Properties

PHP 8.4 property hooks can define a property whose value is computed.
Virtual properties are not stored in the row. They are also excluded from
`dump()` and JSON output by default.

```php
public string $upper {
    get => strtoupper($this->title);
}
```

Add `#[Expose]` from `Windwalker\Utilities\Attributes` to include the
property in dumps and JSON output:

```php
use Windwalker\Utilities\Attributes\Expose;

#[Expose]
public string $label {
    get => "#{$this->id} {$this->title}";
}
```

::: tip
When a derived value is needed only in code, a method such as
`getLabel()` is often clearer than a virtual property. A reader can see
that the value is computed.
:::

## Serialization

`dump()` returns the entity as an array. `json_encode()` uses
`jsonSerialize()`, which returns the same values with the JSON serializers
applied.

```php
$data = $sakura->dump();

$json = json_encode($sakura);
```

::: info
`dump()` and JSON output include public properties only. Protected and
private properties, and virtual properties, are skipped unless they carry
`#[Expose]`. A protected column property is therefore not included in
the output by default.
:::

Use the JSON attributes to change the output for one property:

- `#[JsonSerializer]` transforms the value. It accepts a callable, such as
  `strval`, or a cast class name.
- `#[JsonNoSerialize]` removes the property from JSON output. It does not
  change `dump()`.

```php
#[JsonSerializer('strval')]
public float $price = 0.0;

#[JsonNoSerialize]
public string $internalNote = '';
```
