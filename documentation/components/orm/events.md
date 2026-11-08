---
layout: doc
title: Events
component: orm
---

# Events

Saving and deleting rows often triggers more work: filling in a timestamp,
checking a rule, deleting child rows, or sending a notification. The ORM
dispatches events around each write, so you can keep this logic with the
entity that owns it, instead of repeating it in every controller.

## Minimal Setup

Add an event attribute to a `public static` method of the entity. The
method receives the event as its first argument.

```php
use Windwalker\ORM\Event\AfterSaveEvent;

#[Table('sakuras')]
class Sakura implements EntityInterface
{
    use EntityTrait;

    // ...

    #[AfterSaveEvent]
    public static function afterSave(AfterSaveEvent $event): void
    {
        // Runs after each save
    }
}
```

The method must be static, because the ORM can run an event without
creating an entity object.

## Showcase

The following entity fills in a slug before it is saved, and deletes its
child rows after it is deleted:

```php
use Windwalker\ORM\Event\AfterDeleteEvent;
use Windwalker\ORM\Event\BeforeSaveEvent;

#[Table('sakuras')]
class Sakura implements EntityInterface
{
    use EntityTrait;

    // ...

    #[BeforeSaveEvent]
    public static function beforeSave(BeforeSaveEvent $event): void
    {
        if (empty($event->data['slug'])) {
            $event->data['slug'] = strtolower(
                str_replace(' ', '-', $event->data['title'] ?? '')
            );
        }
    }

    #[AfterDeleteEvent]
    public static function afterDelete(AfterDeleteEvent $event): void
    {
        $event->orm->deleteBatch(
            SakuraImage::class,
            ['sakura_id' => $event->entity->id],
        );
    }
}
```

`$event->data` holds the values that are about to be written. Changing it
changes what is stored, so the listener can normalize a value before the
row is saved.

## Event Types

The following events are dispatched around the write operations:

- `BeforeSaveEvent` runs before a row is created or updated. Use it to
  prepare the data.
- `BeforeStoreEvent` runs just before the statement is sent to the
  database, after the save events.
- `AfterSaveEvent` runs after a row is created or updated. Use it to write
  related rows.
- `BeforeDeleteEvent` runs before a row is deleted. Use it to refuse a
  deletion that would lose important data.
- `AfterDeleteEvent` runs after a row is deleted. Use it to delete related
  rows.
- `BeforeCopyEvent` and `AfterCopyEvent` run around `copy()`. Use them to
  clear identifiers or to copy related rows.
- `BeforeUpdateWhereEvent` and `AfterUpdateWhereEvent` run around bulk
  updates.
- `BeforeCreateBulkEvent` and `AfterCreateBulkEvent` run around bulk
  inserts.
- `EntitySetupEvent` runs while the entity metadata is built. The
  `setup()` method receives it.
- `EnergizeEvent` runs when an entity is energized by the ORM.

::: info
Bulk writes dispatch only the bulk-level events. A bulk update does not
run `BeforeSaveEvent` or `AfterSaveEvent` for each row.
:::

## Setting Up Listeners Through Metadata

Listeners can also be attached in a `#[EntitySetup]` method. The method
receives the `EntityMetadata` of the entity. Use it when the listener needs
to be declared in code, for example to attach one listener to several
events.

```php
use Windwalker\ORM\Attributes\EntitySetup;
use Windwalker\ORM\Event\AfterSaveEvent;
use Windwalker\ORM\Metadata\EntityMetadata;

#[EntitySetup]
public static function setup(EntityMetadata $metadata): void
{
    $metadata->on(
        AfterSaveEvent::class,
        function (AfterSaveEvent $event) {
            // Runs after each save
        }
    );
}
```

::: warning
A listener that saves the same entity again runs the save events again. Add
a condition that stops the recursion, or the process repeats until it fails.
:::

## Watching a Column

`#[Watch]` runs a listener when the value of one column changes. The
listener receives a `WatchEvent`, which gives the new value and the old
value.

```php
use Windwalker\ORM\Attributes\Watch;
use Windwalker\ORM\Event\WatchEvent;

#[Watch('state')]
public static function watchState(WatchEvent $event): void
{
    if ($event->value === 0) {
        // The state changed to 0
    }
}
```

`#[WatchBefore]` attaches the listener to the save process, before the new
value is stored. Use it when the listener must change other columns in the
same row.

```php
use Windwalker\ORM\Attributes\WatchBefore;

#[WatchBefore('state')]
public static function beforeState(WatchEvent $event): void
{
    if ($event->value === 1) {
        $event->data['published_at'] = date('Y-m-d H:i:s');
    }
}
```

The same watch can be declared in `#[EntitySetup]` with
`$metadata->watch('state', $callable)`.

A watch suits one reaction to one change. For a state machine with several
steps, keep the transitions in one place instead of spreading them across
many watchers.
