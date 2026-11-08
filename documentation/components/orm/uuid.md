---
layout: doc
title: UUID
component: orm
---

# UUID

Auto-increment IDs are simple, but they come from one database sequence. Two
systems that create rows independently, or a public URL that shows the ID,
expose the order and the volume of the data. A UUID is generated in the
application, so a row can get its identifier before it reaches the database,
and the identifier reveals nothing about the sequence.

The ORM provides UUID support through attributes on the entity. The
attribute converts the stored value to a `UuidInterface` object, and it
generates a new UUID when the property is empty at save time. The
generation uses [ramsey/uuid](https://github.com/ramsey/uuid), so the library
must be installed:

```bash
composer require ramsey/uuid
```

## Minimal Setup

Add the `#[UUID]` attribute to a string property that maps to a column. The
column stores the text form of the UUID, which takes 36 characters.

```php
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\UUID;

#[Column('uuid')]
#[UUID]
public string $uuid = '';
```

When the row is saved and `$uuid` is empty, the ORM assigns a new UUID.

## Showcase

The following article keeps an auto-increment primary key for joins, and a
UUID for public links. The `set` hook wraps the value into a UUID object:

```php
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\AutoIncrement;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Attributes\Table;
use Windwalker\ORM\Attributes\UUID;
use Windwalker\ORM\EntityInterface;
use Windwalker\ORM\EntityTrait;

#[Table('articles')]
class Article implements EntityInterface
{
    use EntityTrait;

    #[Column('id'), PK, AutoIncrement]
    public ?int $id = null;

    #[Column('uuid')]
    #[UUID]
    public ?UuidInterface $uuid {
        set (UuidInterface|string|null $value) {
            $this->uuid = UUID::tryWrap($value);
        }
    }
}
```

After `$orm->createOne($article)`, the public link can use `(string)
$article->uuid`, and the route can look the article up with
`$orm->findOne(Article::class, ['uuid' => $uuid])`.

The `set` hook accepts a string, a UUID object, or `null`. It stores the
object, so `$article->uuid = $request->get('uuid');` is enough to assign it.

::: info
`#[UUID]` also implements the cast interface, so it converts the value on
hydrate and extract. The generator runs for every empty value on save. See
[NULL Values](#null-values) for a column that may be `NULL`.
:::

## Binary Storage

The text form takes 36 characters, and every index on it is large. The binary
form takes 16 bytes. Use `#[UUIDBin]` with a `BINARY(16)` column:

```php
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\UUIDBin;

#[Column('uuid')]
#[UUIDBin]
public ?UuidInterface $uuid {
    set (UuidInterface|string|null $value) {
        $this->uuid = UUIDBin::tryWrap($value);
    }
}
```

`wrap()` returns a `UuidInterface` and does not accept `null`. Use
`tryWrap()` for a value that can be `null`, as in the `set` hook above.

### Binary Primary Key

A UUID can be the primary key. The binary form keeps the primary key index
small, and an ordered UUID version keeps the inserts close together:

```php
#[Column('id'), PK]
#[UUIDBin]
public ?UuidInterface $id = null;
```

The key is assigned during the save. Use `createOne()` for new rows and
`updateOne()` for existing rows, rather than `saveOne()`, so that the method
is chosen by you and not by the key value.

## NULL Values

On save, the generator runs for every property that is empty, and `null` is
empty. An attribute on a property therefore assigns a UUID where you might
expect `NULL`. Choose the form by the column:

- A binary column that may be `NULL`: pass `UUIDBin::NULLABLE` as the option.
  A `null` value is then kept as `NULL` on save, and a `NULL` from the database
  is hydrated as `null`.
- A text column that may be `NULL`: `#[UUID]` always assigns a value on save.
  Leave the attribute off, keep the column nullable with `#[CastNullable]`,
  and assign the value in a listener when it is needed.

```php
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\UUIDBin;

#[Column('uuid')]
#[UUIDBin(options: UUIDBin::NULLABLE)]
public ?UuidInterface $uuid {
    set (UuidInterface|string|null $value) {
        $this->uuid = UUIDBin::tryWrap($value);
    }
}
```

```php
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\CastNullable;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Event\BeforeSaveEvent;

#[Column('uuid')]
#[CastNullable('uuid', 'uuid')]
public ?UuidInterface $uuid = null;

#[BeforeSaveEvent]
public static function beforeSave(BeforeSaveEvent $event): void
{
    if ($event->isCreate && empty($event->data['uuid'])) {
        $event->data['uuid'] = Uuid::uuid7()->toString();
    }
}
```

## NOT NULL Columns and NIL

A `NOT NULL` column cannot keep `NULL`, so an empty value on save must become
something else. By default the generator creates a new UUID for it. Setting
the version to `NIL` changes that: the empty value becomes the all-zero UUID,
`00000000-0000-0000-0000-000000000000`, and the row is saved with it.

This is a workaround, not a recommended design. Every row that gets the NIL
value has the same identifier, so a `UNIQUE` index on the column rejects the
second such row. Use it only to fill a small number of legacy rows that were
saved without a UUID, and assign a real UUID to new rows yourself:

```php
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\UUID;

#[Column('uuid')]
#[UUID(version: UUID::NIL)]
public string $uuid = '';
```

For a binary column, use the same version on `UUIDBin`:

```php
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\UUIDBin;

#[Column('uuid')]
#[UUIDBin(version: UUIDBin::NIL)]
public ?UuidInterface $uuid = null;
```

The NIL value is written only when the property is empty. A UUID that is
already set is saved unchanged.

::: warning
A NIL value on a column with a `UNIQUE` or primary key index causes a
duplicate-key error for the second row that gets it. Do not use this version
on such a column unless the table holds at most one row with the empty value.
Assign a real UUID before the save instead, for example in a `BeforeSaveEvent`
listener, as shown in [NULL Values](#null-values).
:::

::: info
The NIL value is also a valid UUID, so reading it back works like any other
value. The database index on the column is not optimized for it, because all
such rows share one value.
:::

## Choosing the Version

The default version is `uuid7`. The version is set with the `version`
argument:

```php
#[UUID(version: 'uuid4')]
public string $uuid = '';
```

The supported values are the ones that ramsey/uuid generates without
arguments:

- `uuid1` and `uuid6`: time-based. `uuid6` is the same time order as `uuid1`,
  with the fields rearranged so that the values sort by time.
- `uuid7`: time-based, with a Unix timestamp prefix. It is the default, and it
  is the usual choice for a primary key.
- `uuid4`: random. Use it for a secondary key, where ordering does not matter.

::: warning
`uuid3` and `uuid5` need a namespace and a name, and the generator cannot
supply them. Do not use these versions in the attribute. Arguments of the
attribute must also be constant expressions, so a closure cannot be passed
as the version.
:::

::: info
Time-based versions reveal the creation time of a row. When that matters,
use `uuid4`.
:::

## Querying by UUID

A binary column holds the 16-byte form, so a condition must use that form too.
When the column is declared with `#[UUIDBin]`, the ORM converts the value for
you. This applies to the conditions of the ORM query, the finder methods, and
the write methods that take conditions:

```php
$article = $orm->findOne(Article::class, ['uuid' => $uuidString]);

$articles = $orm->from(Article::class)
    ->where('uuid', $uuid)
    ->all(Article::class);
```

The conversion accepts a string, a UUID object, or an array of them, and it
also applies to `where()` with an operator, such as `IN`.

The ORM can convert the value only when it knows the column. It finds the
column through the table of the query, or through the joined table with its
alias. The conversion does not apply to:

- A column in `whereRaw()` or in other raw SQL.
- A query that the database adapter builds without an entity.
- A text column declared with `#[UUID]`, which is compared as a string.

In these cases, convert the value yourself with the `uuid2bin()` function
from the Query component. For example, a query on the table without an entity:

```php
use function Windwalker\Query\uuid2bin;

$row = $db->createQuery()
    ->from('articles')
    ->where('uuid', uuid2bin($uuid))
    ->get();
```

::: tip
Convert the value once, in the code that receives it from the request. Passing
the text form to a binary column usually matches no row, and the query returns
an empty result without an error.
:::

## Reading the Binary Column in a Database Tool

A binary UUID is not readable in most database tools. MySQL 8 provides
`BIN_TO_UUID()` and `UUID_TO_BIN()` for the conversion. MariaDB does not, so
the hexadecimal digits must be converted by hand. Compare the stored value
with the converted UUID when you check a row manually.
