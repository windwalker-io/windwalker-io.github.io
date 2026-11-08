---
layout: doc
title: Attributes
component: orm
---

# Attributes

The ORM describes an entity with attributes. The table name, the columns, the
casts, the events, and the other behaviors all come from attributes on the
class, its properties, and its methods. Most attributes are read once, when the
metadata of an entity is built. The cast attributes that run on save are the
exception: the ORM reads them again for each row it saves.

This page lists the attributes that the ORM provides, and shows how to add a
new one. Most attributes are described on the page of their feature, which is
linked in the tables below.

## Common Attributes

The attributes are grouped by the element they are placed on.

### On the Class

- `#[Table]`: the table name, the alias, the mapper class, and the options.
  See [Entities](./entities#table-arguments).
- `#[NestedSet]`: marks the entity as a tree node. See
  [Nested Sets](./nested-set).
- `#[UseRealColumns]`: reads the columns of the table from the database,
  instead of the entity, for automatic selections. See
  [Automatic Selections](./querying#automatic-selections-and-grouped-joins).

### On a Method

- `#[EntitySetup]`: a static method that receives the `EntityMetadata`. See
  [Events](./events#setting-up-listeners-through-metadata).
- `#[BeforeSaveEvent]`, `#[AfterSaveEvent]`, `#[BeforeDeleteEvent]`,
  `#[AfterDeleteEvent]`, `#[BeforeUpdateWhereEvent]`, and
  `#[AfterUpdateWhereEvent]`: event listeners. See [Events](./events).
- `#[EnergizeEvent]`: a static method that attaches values to each entity the
  ORM creates. See [Energize](./energize).
- `#[Watch]` and `#[WatchBefore]`: listeners for the change of one column. See
  [Events](./events#watching-a-column).

### On a Property

- `#[Column]`, `#[PK]`, and `#[AutoIncrement]`: the column, the primary key,
  and the auto-increment column. See [Entities](./entities).
- `#[Cast]` and `#[CastNullable]`: the conversions on load and on save. See
  [Entities](./entities#casting).
- `#[JsonArray]` and `#[JsonObject]`: JSON columns. See
  [Entities](./entities#json-columns).
- `#[CurrentTime]` and `#[CreatedTime]`: the time values written on save. See
  [Entities](./entities#save-time-values).
- `#[AutoTruncate]`: cuts a string to the column length on save. See
  [Entities](./entities#truncating-strings).
- `#[JsonSerializer]` and `#[JsonNoSerialize]`: the JSON output of one
  property. See [Entities](./entities#serialization).
- `#[OptimisticLock]`: the version column. See
  [Optimistic Locking](./optimistic-lock).
- `#[UUID]`, `#[UUIDBin]`, and `#[UUIDBinNullable]`: UUID values. See
  [UUID](./uuid).

::: info
The relation attributes, such as `#[OneToMany]` and `#[ManyToOne]`, are not
described in this documentation.
:::

## Attribute Order

The ORM handles the attributes of a property in declaration order. A property
attribute can depend on one that comes before it. For example,
`#[AutoIncrement]` needs the `#[Column]` on the same property, and it raises an
error when `#[Column]` is written after it:

```php
#[Column('id'), PK, AutoIncrement]
public ?int $id = null;
```

## Extending With a Cast-For-Save Attribute

A property attribute that implements `CastForSaveInterface` needs no
registration. The ORM finds it by reflection when a row is saved, and it
calls the caster that the attribute returns. The `#[CurrentTime]` and
`#[AutoTruncate]` attributes work this way.

The following attribute trims a string before it is saved. For the full
`CasterInfo` interface and the rules of save-time casts, see
[Casting](./casting#writing-a-castforsave).

```php
use Attribute;
use Windwalker\ORM\Attributes\CastForSaveInterface;

#[Attribute(Attribute::TARGET_PROPERTY)]
class Trimmed implements CastForSaveInterface
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
#[Trimmed]
public string $title = '';
```

## Extending With a Setup Attribute

An attribute that must be read by your own code, or that adds its information
to the metadata, is handled once, when the metadata is built. Such an
attribute implements `AttributeInterface`, uses `ORMAttributeTrait`, and
records itself in the metadata with `addAttributeMap()`:

```php
use Attribute;
use Windwalker\Attributes\AttributeHandler;
use Windwalker\Attributes\AttributeInterface;
use Windwalker\ORM\Attributes\ORMAttributeTrait;
use Windwalker\ORM\Metadata\EntityMetadata;

#[Attribute(Attribute::TARGET_PROPERTY)]
class Searchable implements AttributeInterface
{
    use ORMAttributeTrait;

    public function handle(
        EntityMetadata $metadata,
        AttributeHandler $handler,
    ): callable {
        $metadata->addAttributeMap($this, $handler->reflector);

        return $handler->get();
    }
}
```

Register the attribute with the resolver of the ORM, before the entity is
used for the first time:

```php
use Attribute;

$orm->getAttributesResolver()->registerAttribute(
    Searchable::class,
    Attribute::TARGET_PROPERTY,
);
```

Read the properties that carry it through the metadata:

```php
$members = $orm->getEntityMetadata(Article::class)
    ->getPropertyMembersOfAttribute(Searchable::class);

foreach ($members as $member) {
    echo $member->columnName;
}
```

## Using Services in Windwalker

Inside a Windwalker application, the attribute handler exposes the container.
A setup attribute can then get a service when the metadata is built:

```php
public function handle(
    EntityMetadata $metadata,
    AttributeHandler $handler,
): callable {
    $config = $handler->getContainer()->get(SearchConfig::class);

    // Use $config while the metadata is built

    return $handler->get();
}
```

::: info
`getContainer()` exists only in the handler of Windwalker. Outside Windwalker,
the handler has no container, so the attribute cannot get a service this way.
:::

## Injecting Services in Your own Framework

For the full way to write an attribute handler, how the resolver calls
callables, and how to supply services outside Windwalker, see the
[Attributes component](/documentation/components/attributes/). The pages
[Write Your Own Attribute Handlers](/documentation/components/attributes/write-handlers)
and [Injecting Services Into Callables](/documentation/components/attributes/write-handlers#injecting-services-into-callables)
cover these topics in detail.

```php
$orm->setAttributesResolver(
    new MyServiceResolver(new MyDIContainer())
);
```
