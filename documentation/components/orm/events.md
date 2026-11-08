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
- `EnergizeEvent` runs when an entity is energized by the ORM. See
  [Energize](./energize).

::: info
Bulk writes dispatch only the bulk-level events. A bulk update does not
run `BeforeSaveEvent` or `AfterSaveEvent` for each row.
:::

## Event Properties

Every entity event inherits the `data` array, and it exposes the ORM through
`$event->orm`, the mapper through `$event->entityMapper`, and the database
adapter through `$event->db`. The other properties depend on the event. The
list below is a summary. The complete signatures are in the `Windwalker\ORM\Event`
namespace.

### Save and Copy Events

These properties are shared by `BeforeSaveEvent`, `BeforeStoreEvent`,
`AfterSaveEvent`, `BeforeCopyEvent`, and `AfterCopyEvent`:

- `data`: the values to write, keyed by column name.
- `source`: the input that the caller passed, as an array or an object.
- `type`: `create`, `update`, or `copy`. `isCreate` and `isUpdate` are
  shortcuts for it.
- `options`: the `ORMOptions` of the call.
- `extra`: an array that carries values from one save event to the next. It
  is passed on from the before events to the after event.
- `oldData`: the stored row before an update. It is `null` on create, and when
  `ignoreOldData` is set.
- `oldEntity`: an entity built from `oldData`. It is `null` on create.
- `tempEntity`: an entity built from `data`. See the note below.

The events differ in the following:

- `BeforeSaveEvent` and `BeforeStoreEvent` have no `entity`, because the row
  is not written yet.
- `AfterSaveEvent` adds `entity`, the entity after the write, with its new
  primary key. It also has `fullData`, the values of the row after the write.
- `AfterCopyEvent` adds `entity` and `fullData`, like `AfterSaveEvent`.

::: warning
Changing `tempEntity` has no effect on the saved row. It is a new object built
from `data` each time you read it, and the ORM does not read it back. Change
`$event->data`, because the ORM writes the values in `data`.
:::

```php
#[BeforeSaveEvent]
public static function beforeSave(BeforeSaveEvent $event): void
{
    // Has no effect on the saved row
    // $event->tempEntity->title = 'Changed';

    // Changes the saved row
    $event->data['title'] = strtoupper($event->data['title'] ?? '');
}
```

::: tip
Read `tempEntity` to check values through the casts of the entity, for
example to compare a typed date. Write `data` to change them.
:::

### Delete Events

`BeforeDeleteEvent` and `AfterDeleteEvent` share these properties:

- `conditions`: the condition of the `DELETE` statement. Changing it in the
  before event changes which rows are deleted.
- `entity`: the row that is deleted. It is set when the delete runs on a row
  with a primary key, and it is `null` for a delete by conditions only.
- `data`: the values of the row, extracted from `entity`.
- `options`: the `ORMOptions` of the call.

`AfterDeleteEvent` adds `statement`, the `StatementInterface` of the delete.

### Bulk Update Events

`BeforeUpdateWhereEvent` and `AfterUpdateWhereEvent` share these properties:

- `conditions`: the condition of the `UPDATE`. A change in the before event
  changes which rows are updated.
- `data`: the values to set. A change in the before event changes the values.
- `source`: the input that the caller passed.
- `options`: the `ORMOptions` of the call.

`AfterUpdateWhereEvent` adds `statement`.

### Bulk Create Events

`BeforeCreateBulkEvent` and `AfterCreateBulkEvent` share these properties:

- `items`: the rows to insert. A change in the before event changes the rows
  that are inserted.
- `entities`: the entities of the call, when they were given.
- `options`: the `ORMOptions` of the call.

### Other Events

- `EntitySetupEvent` has `metadata`, the `EntityMetadata` of the entity that
  is being set up.
- `EnergizeEvent` has `entity`, and the methods `store()`, `storeCallback()`,
  `retrieve()`, `forget()`, and `all()`. See [Energize](./energize).
- `WatchEvent` has `originEvent`, the save event that triggered the watch,
  `value` for the new value, and `oldValue` for the previous one. It also has
  `afterCallback`, and `isUpdateWhere()` tells whether the change came from a
  bulk update.

::: info
The `entity` property is not limited to the after events. It is on the
after save and copy events, and on the delete events, before and after. A
before save event has no `entity`, because the row is not written yet.
:::

## Injecting Services

A static event method can take services after the event argument. In a
Windwalker application, the ORM uses the attributes resolver of the container,
so each parameter after the event is resolved by its type, as the container
would resolve a constructor argument. The event is matched by its class, and
the other parameters are filled from the container.

```php
use Windwalker\ORM\Event\AfterSaveEvent;

#[AfterSaveEvent]
public static function afterSave(
    AfterSaveEvent $event,
    SearchIndexer $searchIndexer,
    CachePool $cache,
): void {
    $id = (int) $event->data['id'];

    $searchIndexer->update('sakuras', $id, $event->data['title'] ?? '');

    $cache->delete('sakura.' . $id);
}
```

The listener above keeps two other parts of the application in step with the
saved row. The search index is updated, and the cached copy of the row is
removed. Neither service is passed by the caller, and the entity does not
store a reference to them.

::: info
Service injection works only inside a Windwalker application, where the ORM
uses the attributes resolver of the container. Outside Windwalker, the ORM
passes only the event. A parameter after the event must then have a default
value, or the call fails. A standalone project can extend the resolver, see
[Injecting Services Into Callables](/documentation/components/attributes/write-handlers#injecting-services-into-callables).
:::

::: tip
Keep the listener short. A slow service call runs inside the save, so the
request waits for it. Send heavy work to a queue, and let the listener only
record the job.
:::

::: warning
The ORM does not catch an exception thrown by a listener. The exception stops
the rest of the call, and the caller receives it. An `AfterSaveEvent` listener
runs after the row is written, so the row stays saved. Make the side effects
safe to repeat, because a retry of the request can run the listener again.
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
`$metadata->watch('state', $callable)`. The setup method receives the
`EntityMetadata`, and the callable receives the `WatchEvent`:

```php
use Windwalker\ORM\Attributes\EntitySetup;
use Windwalker\ORM\Event\WatchEvent;
use Windwalker\ORM\Metadata\EntityMetadata;

#[EntitySetup]
public static function setup(EntityMetadata $metadata): void
{
    $metadata->watch(
        'state',
        function (WatchEvent $event) {
            if ($event->value === 0) {
                // The state changed to 0
            }
        }
    );
}
```

To run the callable before the new value is stored, use `watchBefore()`
in the same way. It corresponds to `#[WatchBefore]`:

```php
$metadata->watchBefore(
    'state',
    function (WatchEvent $event) {
        if ($event->value === 1) {
            $event->data['published_at'] = date('Y-m-d H:i:s');
        }
    }
);
```

A watch suits one reaction to one change. For a state machine with several
steps, keep the transitions in one place instead of spreading them across
many watchers.

## Related Topics

- [Database Events](/documentation/components/database/events): the query
  and fetch events of the adapter, which run below the entity events.
- [Persisting Data](./persisting): the operations that fire these events.
