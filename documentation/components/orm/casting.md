---
layout: doc
title: Casting
component: orm
---

# Casting

A database stores scalars, such as strings, integers, and dates in text form.
An entity wants typed PHP values, such as an enum, a boolean, or a
`DateTimeImmutable`. Casting converts a value between these two forms. The
ORM offers two kinds of attribute for it, `Cast` and `CastForSave`. They
differ in direction and in timing, as explained in the next section.

Keeping the conversion in the entity means the code that uses the entity
works with the PHP types, and the storage format stays in one place.

## Cast and CastForSave

`Cast` and `CastForSave` both change a value, but they are not
interchangeable:

| | `Cast` | `CastForSave` |
| --- | --- | --- |
| Direction | Both: hydrate on load, extract on save | One: save only |
| Runs on load | Yes | No |
| Output on save | A pure string, ready for the database | The value that is written |
| Typical use | Type conversion, such as enums, booleans, JSON, and dates | Format checks, defaults, truncation, and timestamps |

### Cast Is Bidirectional

A `Cast` runs in both directions. On load, it converts the database value to
the PHP type of the property. On save, it converts the entity value back.

```php
#[Column('enabled')]
#[Cast('bool', 'int')]
public bool $enabled = false;
```

When the entity is extracted, each field is a pure string, or `null`. The
`bool` becomes `'1'` or `'0'`, which the database accepts directly. The ORM
converts a value that is not `null` and not a string to a string after the
casts run. This is the `extractForceStringify` option, which is enabled by
default. See [Keeping Types on Extract](./hydration#keeping-types-on-extract)
for where it is set.

### CastForSave Is the Last Step Before the Write

A `CastForSave` runs only on save, and only once, at the end. It receives the
values that were extracted, and it returns the value that is written. It never
runs on load, so a value read from the database is never changed by it. Use it
for adjustments that belong to the write itself:

- Format checks and normalization, such as trimming a string.
- Defaults that depend on the row, such as a slug built from the title.
- Truncation of a value that is too long for its column.
- Timestamps, such as the time of the last update.

The order of a save is:

1. The `BeforeSaveEvent` listeners change the data.
2. The entity is built from the data, and each `Cast` runs its extract.
3. Each `CastForSave` runs on the extracted values.
4. The `BeforeStoreEvent` listeners run, and then the row is written.

A `BeforeSaveEvent` listener can set a value that a `CastForSave` then
normalizes. The following attribute trims a string, and the property uses it:

```php
use Attribute;
use Windwalker\ORM\Attributes\CastForSaveInterface;

#[Attribute(Attribute::TARGET_PROPERTY)]
class Trim implements CastForSaveInterface
{
    public function getCaster(): callable
    {
        return static fn (mixed $value): mixed
            => is_string($value) ? trim($value) : $value;
    }
}
```

```php
#[Column('title')]
#[Trim]
public string $title = '';

#[BeforeSaveEvent]
public static function beforeSave(BeforeSaveEvent $event): void
{
    $event->data['title'] = '   changed by listener   ';
}
```

The stored title is `changed by listener`. The listener added the spaces,
and the `CastForSave` removed them before the row was written.

::: warning
The `BeforeStoreEvent` listeners run after the `CastForSave` attributes, so a
listener on that event can still change the data. Use `BeforeSaveEvent` for
changes that must pass through the save-time casts.
:::

Keeping the two apart matters. A conversion that must be reversible, such as
`'1'` to `true`, belongs in a `Cast`, because it must work on load too. A
rule that applies only to the value being written, such as truncation, belongs
in a `CastForSave`, because it must not change the value that is read back.

## Minimal Setup

Add `#[Cast]` to the property with the type that the entity should expose.
Pass the type name for the load direction, and an optional second argument
for the save direction:

```php
use Windwalker\ORM\Attributes\Cast;
use Windwalker\ORM\Attributes\Column;

#[Column('enabled')]
#[Cast('bool', 'int')]
public bool $enabled = false;
```

The database stores `enabled` as `0` or `1`, and the entity exposes a `bool`.

## Showcase

The following entity uses several casts. Each one shows a different part of
the feature:

```php
use DateTimeImmutable;
use Windwalker\ORM\Attributes\AutoIncrement;
use Windwalker\ORM\Attributes\Cast;
use Windwalker\ORM\Attributes\CastNullable;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\CreatedTime;
use Windwalker\ORM\Attributes\CurrentTime;
use Windwalker\ORM\Attributes\JsonArray;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Attributes\Table;
use Windwalker\ORM\EntityInterface;
use Windwalker\ORM\EntityTrait;

#[Table('articles')]
class Article implements EntityInterface
{
    use EntityTrait;

    #[Column('id'), PK, AutoIncrement]
    public ?int $id = null;

    #[Column('title')]
    public string $title = '';

    #[Column('enabled')]
    #[Cast('bool', 'int')]
    public bool $enabled = false;

    #[Column('tags')]
    #[JsonArray]
    public array $tags = [];

    #[Column('published')]
    #[CastNullable(DateTimeImmutable::class)]
    public ?DateTimeImmutable $published = null;

    #[Column('created')]
    #[CastNullable('datetime')]
    #[CreatedTime]
    public ?DateTimeImmutable $created = null;

    #[Column('modified')]
    #[CastNullable('datetime')]
    #[CurrentTime]
    public ?DateTimeImmutable $modified = null;
}
```

Loading a row gives `enabled` as a `bool`, `tags` as an array, and the dates
as `DateTimeImmutable` objects. Saving writes the same columns back in their
database form. `created` is filled once, on insert, and `modified` is refreshed
on every update.

## How the ORM Converts Values

The ORM has a set of built-in rules. Knowing them avoids most surprises.

### No Automatic Conversion by Type

The ORM does not read the type of a property to convert a value. Without a
cast, the value from the database is assigned as it is. A mismatch therefore
fails. The following property receives a string and raises a `TypeError`
when the row is loaded:

```php
#[Column('published')]
public ?DateTimeImmutable $published = null;
```

Add a cast whenever the database type differs from the property type.

### Cast Types

The first argument of `#[Cast]` accepts one of the following forms.

- A scalar type name, such as `int`, `string`, or `bool`. The value is
  converted with the `TypeCast` helper.
- An alias that the ORM registers, listed below.
- A class that implements `CastInterface`. See [Writing a Cast](#writing-a-cast).
- An enum. A backed enum is created with `from()`. An enum that implements the
  extended enum interface is created with `wrap()`.
- A `Record` class. It is created with `wrap()`.
- Any other class. An entity class is hydrated with the entity hydrator. An
  ordinary class is created with its constructor, or hydrated when
  `Cast::USE_HYDRATOR` is passed.

The aliases are:

- `datetime`: a `DATETIME` string, converted to a `DateTimeImmutable`.
- `timestamp`: a `DATETIME` string, converted to a Unix timestamp.
- `json`: a JSON string, decoded to an array or an object.
- `uuid`: a UUID string, converted to a UUID object.
- `uuid_bin`: a 16-byte binary UUID, converted to a UUID object.

```php
use Windwalker\ORM\Attributes\Cast;

enum Status: int
{
    case Draft = 0;
    case Published = 1;
}

#[Column('status')]
#[Cast(Status::class)]
public Status $status = Status::Draft;
```

::: info
A backed enum is created with `from()`, so a value that is not one of its
cases raises an error when the row is loaded.
:::

### Null and Empty Values

Four option flags decide whether a caster runs for a `null` or an empty value.
Pass them as the third argument of `#[Cast]`:

- `Cast::NULLABLE` keeps `null` as `null`, and the caster is skipped for it.
- `Cast::EMPTY_STRING_TO_NULL` converts an empty string to `null` before the
  caster runs.
- `Cast::DEFAULT_IF_NULL` runs the caster only when the value is `null`.
- `Cast::DEFAULT_IF_EMPTY` runs the caster only when the value is empty.

Two more flags choose how a class is built: `Cast::USE_CONSTRUCTOR` and
`Cast::USE_HYDRATOR`. See the class rules above.

```php
#[Column('code')]
#[Cast('string', options: Cast::DEFAULT_IF_EMPTY)]
public string $code = '';
```

`#[CastNullable]` is `#[Cast]` with `Cast::NULLABLE` and
`Cast::EMPTY_STRING_TO_NULL` already set. Use it for a column that can be
`NULL`.

### Order of the Casts

Several casts on one property run in the order they are written when the row
is loaded. When the entity is extracted, they run in the reverse order.

```php
#[Column('name')]
#[Cast('string')]
#[Cast(Upper::class)]
public string $name = '';
```

On load, the value is converted to a `string`, and then `Upper` converts it.
On save, `Upper` is extracted first, and then the `string` cast is applied.

### Default Extraction

When a cast has no extract argument, the ORM chooses one.

- A cast that implements `CastInterface` uses its own `extract()` method.
- A `DateTimeInterface` class without an extract is formatted with the date
  format of the database.
- A class that implements `DumpableInterface` is passed through unchanged.
- Any other value is converted to a string.

::: warning
The default conversion of an object is not a serialization. For an object
that is not a date, a dumpable class, or an enum, pass an explicit extract
argument, or implement `CastInterface`.
:::

With `extractForceStringify` enabled, which is the default, a value that is
not `null` and not a string is converted to a string after the casts run.

### Errors

A cast that throws during hydration or extraction is wrapped in a
`Windwalker\ORM\Exception\CastingException`. The message names the entity,
the property, and the cast that failed. Catch this exception when a bad row
must be reported instead of stopping the request.

## Casting Attributes

The attributes below are the casts that the ORM provides.

### Cast Attributes

| Attribute | Use it to |
| --- | --- |
| `#[Cast]` | convert a value in both directions, with any cast type |
| `#[CastNullable]` | the same, with `NULL` and empty strings kept as `null` |
| `#[JsonArray]` | store an array as a JSON list |
| `#[JsonObject]` | store an array as a JSON object, with empty arrays as objects |
| `#[UUID]` | a text UUID, which also generates a value on save. See [UUID](./uuid). |
| `#[UUIDBin]` | a binary UUID, which also generates a value on save. See [UUID](./uuid). |

`#[UUID]` and `#[UUIDBin]` implement both `CastInterface` and
`CastForSaveInterface`, so they convert the value and generate one on save.

### CastForSave Attributes

| Attribute | Use it to |
| --- | --- |
| `#[CreatedTime]` | write the current time on insert, when the value is `null` |
| `#[CurrentTime]` | write the current time on every update, and keep the value on insert |
| `#[AutoTruncate]` | cut a string to the length of its column |
| `#[OptimisticLock]` | write the next version of a row. See [Optimistic Locking](./optimistic-lock). |
| `#[UUID]`, `#[UUIDBin]` | generate a UUID on save, as above |

`CurrentTime` and `CreatedTime` both accept a time string and an
`onlyUpdate` flag, as in `#[CurrentTime(onlyUpdate: false)]`.

::: info
`#[CurrentTime]` and `#[CreatedTime]` still read their arguments by position.
New code should write its own cast with `CasterInfo`, as described below.
:::

## Writing a Cast

A cast class implements `CastInterface`. The interface declares two methods,
and both take only the value:

```php
interface CastInterface
{
    public function hydrate(mixed $value): mixed;

    public function extract(mixed $value): mixed;
}
```

A method that needs the `CasterInfo` adds it as a second parameter with a
`null` default, as in the example below. The implementation then differs from
the declaration in its text, but PHP accepts it, because an extra optional
parameter keeps the method compatible with the interface. The ORM passes the
`CasterInfo` object to the parameter by its type. A method that does not need
it can keep the signature of the interface.

The following cast stores a list of tags as a comma-separated string:

```php
use Windwalker\ORM\Cast\CasterInfo;
use Windwalker\ORM\Cast\CastInterface;

class CsvList implements CastInterface
{
    public function hydrate(mixed $value, ?CasterInfo $info = null): array
    {
        return $value === '' || $value === null
            ? []
            : explode(',', (string) $value);
    }

    public function extract(mixed $value, ?CasterInfo $info = null): string
    {
        return implode(',', (array) $value);
    }
}
```

Use the class as the cast:

```php
#[Column('tags')]
#[Cast(CsvList::class)]
public array $tags = [];
```

::: tip
A cast that needs a service can take it in its constructor. The ORM creates
the cast through the attributes resolver, so a Windwalker application
injects the service the same way as in any other class.
:::

## Writing a CastForSave

A save-time cast implements `CastForSaveInterface`. Its `getCaster()` method
returns a callable. The callable runs on every save of the property. It runs
after the `BeforeSaveEvent` listeners and the `Cast` extracts, and before the
`BeforeStoreEvent` listeners. It receives the extracted value and the
`CasterInfo`, and it returns the value to store.

The following attribute fills a slug from the title, but only on insert, so an
existing slug is not changed when the title is edited:

```php
use Attribute;
use Windwalker\ORM\Attributes\CastForSaveInterface;
use Windwalker\ORM\Cast\CasterInfo;

#[Attribute(Attribute::TARGET_PROPERTY)]
class Slug implements CastForSaveInterface
{
    public function getCaster(): callable
    {
        return static function (mixed $value, CasterInfo $info): string {
            if (!$info->isNew || $value !== '') {
                return $value;
            }

            return strtolower(
                str_replace(' ', '-', $info->entity->title)
            );
        };
    }
}
```

Use it on a property of the entity:

```php
#[Column('slug')]
#[Slug]
public string $slug = '';
```

::: info
A `CastForSave` runs only when the row is saved. Hydration does not run it, so
a value loaded from the database is always the stored one.
:::

::: warning
A cast-for-save attribute runs for every row that is saved, including each row
of a batch update such as `updateBatch()`. A caster that calls a slow service
therefore runs once per row. Keep it cheap, and move slow work to a queue.
:::

## Accessing the Column with CasterInfo

Every cast-for-save and every `CastInterface` method that declares the parameter
receives a `Windwalker\ORM\Cast\CasterInfo` object when it runs. A scalar type
name, such as `'int'`, receives only the value. The object describes the value
and the context of the conversion:

- `column`: the `Column` of the property. Its `getName()` gives the column
  name.
- `property`: the reflection property of the entity.
- `entity`: the entity that is being hydrated, extracted, or saved.
- `isNew`: `true` when the row is being inserted.
- `value`: the value that the cast received.
- `metadata`: the `EntityMetadata` of the entity.
- `orm`: the ORM instance.

A caster asks for the object by its type. The ORM fills the parameter, so the
caster does not need the other arguments. The `Slug` example above uses
`$info->isNew` and `$info->entity` in this way.

## Related Topics

- [Entities](./entities) explains the entity and its properties.
- [Attributes](./attributes) lists the attributes of the ORM, and shows how to
  add a setup attribute.
- [Hydration](./hydration) describes the pipeline that runs the casts, and how
  to replace the entity hydrator.
- [UUID](./uuid) and [Optimistic Locking](./optimistic-lock) describe two
  attributes that are both casts and save-time casts.
