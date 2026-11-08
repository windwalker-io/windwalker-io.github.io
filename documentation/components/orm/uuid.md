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
UUID for public links. The UUID is an object in PHP, so the entity wraps the
value in its setter and returns the object from its getter:

```php
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\AutoIncrement;
use Windwalker\ORM\Attributes\CastNullable;
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
    #[CastNullable('uuid', 'uuid')]
    #[UUID]
    protected ?UuidInterface $uuid = null;

    public function getUuid(): ?UuidInterface
    {
        return $this->uuid;
    }

    public function setUuid(UuidInterface|string|null $uuid): static
    {
        $this->uuid = UUID::tryWrap($uuid);

        return $this;
    }
}
```

After `$orm->createOne($article)`, the public link can use `(string)
$article->getUuid()`, and the route can look the article up with
`$orm->findOne(Article::class, ['uuid' => $uuid])`.

::: info
`#[UUID]` also implements the cast interface, so it converts the value on
hydrate and extract. The generator runs for every empty value, including
`null`. Add `CastNullable('uuid', 'uuid')` to keep a `null` value as `null`.
:::

## Binary Storage

The text form takes 36 characters, and every index on it is large. The binary
form takes 16 bytes. Use `#[UUIDBin]` with a `BINARY(16)` column:

```php
use Ramsey\Uuid\UuidInterface;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\UUIDBin;

#[Column('uuid')]
#[CastNullable('uuid_bin', 'uuid_bin')]
#[UUIDBin]
protected ?UuidInterface $uuid = null;

public function setUuid(UuidInterface|string|null $uuid): static
{
    $this->uuid = UUIDBin::tryWrap($uuid);

    return $this;
}
```

`wrap()` returns a `UuidInterface` and does not accept `null`. Use
`tryWrap()` for a value that can be `null`, as in the setter above.

### Binary Primary Key

A UUID can be the primary key. The binary form keeps the primary key index
small, and an ordered UUID version keeps the inserts close together:

```php
#[Column('id'), PK]
#[CastNullable('uuid_bin', 'uuid_bin')]
#[UUIDBin]
protected ?UuidInterface $id = null;
```

The key is assigned during the save. Use `createOne()` for new rows and
`updateOne()` for existing rows, rather than `saveOne()`, so that the method
is chosen by you and not by the key value.

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

A UUID in the table is stored in its binary form when the column is binary, so
a query must convert the value too. The `uuid2bin()` function does this, and
it accepts a string, a UUID object, or an array of them:

```php
use function Windwalker\Query\uuid2bin;

$article = $orm->findOne(
    Article::class,
    ['uuid' => uuid2bin($uuidString)],
);
```

The same function works in `where()` for the query builder:

```php
$articles = $orm->from(Article::class)
    ->where('uuid', uuid2bin($uuid))
    ->all(Article::class);
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
