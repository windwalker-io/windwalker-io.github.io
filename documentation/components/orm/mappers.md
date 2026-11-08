---
layout: doc
title: Custom Mappers
component: orm
---

# Custom Mappers

Most logic belongs to an entity, and the events in [Events](./events) cover
the lifecycle of one row. Some logic belongs to every operation on a table,
or to a query that the entity class should own. Examples are a query for the
active rows of a table, a check that a related table must pass before any
save, or a tree structure that changes the write path, such as the
[nested set](./nested-set). Those belong in a mapper.

Every operation of the ORM runs on the `EntityMapper` of the entity. A custom
mapper is a subclass of `EntityMapper`, and it replaces the default mapper of
the entity. The `NestedSetMapper` is an example of a built-in subclass.

## Minimal Setup

Create the subclass, and name it in the `mapperClass` argument of `#[Table]`:

```php
use Windwalker\ORM\EntityMapper;

class SakuraMapper extends EntityMapper
{
    //
}
```

```php
use Windwalker\ORM\Attributes\Table;

#[Table('sakuras', mapperClass: SakuraMapper::class)]
class Sakura implements EntityInterface
{
    use EntityTrait;

    // ...
}
```

Get the mapper as usual. `$orm->mapper(Sakura::class)` returns the
`SakuraMapper`, and the ORM proxy methods such as `$orm->findOne()` use it too.

::: info
The mapper is created by the attributes resolver of the ORM, so its
constructor takes the same arguments as `EntityMapper`. Do not add required
constructor parameters that the container cannot supply.
:::

## Showcase

The following mapper adds a finder for the published rows, and it refuses to
save a row that has no title:

```php
use InvalidArgumentException;
use Windwalker\ORM\Event\BeforeSaveEvent;
use Windwalker\ORM\EntityMapper;
use Windwalker\ORM\Iterator\ResultIterator;

class SakuraMapper extends EntityMapper
{
    public function findPublished(): ResultIterator
    {
        return $this->findList(['state' => 1]);
    }

    protected function beforeSave(BeforeSaveEvent $event): void
    {
        if (empty($event->data['title'])) {
            throw new InvalidArgumentException('Title is required.');
        }

        parent::beforeSave($event);
    }
}
```

Call the finder on the mapper, since the ORM proxy does not know about it:

```php
$items = $orm->mapper(Sakura::class)->findPublished()->all();
```

## Hooks

`EntityMapper` declares a few protected hooks. A subclass can override them to
add behavior that applies to every operation:

- `init()` runs at the end of the constructor. Use it to prepare state that
  the mapper needs.
- `beforeSave(BeforeSaveEvent $event)` runs before every save.
- `afterDelete(AfterDeleteEvent $event)` runs after every delete.
- `afterHydrate(object $entity)` is public. It runs after a row is hydrated
  into an entity.

The hooks `beforeSave()` and `afterDelete()` run even when the events are
ignored with `ORMOptions(ignoreEvents: true)`. They are part of the mapper,
not of the events. Call `parent::` in an override, so that the built-in
behavior of the base class keeps working.

::: warning
Do not skip `parent::beforeSave()` or `parent::afterDelete()` in a subclass
of a built-in mapper. A `NestedSetMapper` relies on them to keep the tree
values consistent, and skipping them leaves those values wrong.
:::

## Choosing Between a Mapper and an Event

Put the logic on the entity, in an event attribute, when it reacts to one row
and the listener should travel with the entity. Put it in the mapper when it is
a finder, or when it must run for every write even if a caller ignores the
events.

A mapper method is reached through `$orm->mapper()`, not through the ORM
proxy. Keep the methods on the mapper small, and move complex queries to the
entity or to a service that uses the mapper.
