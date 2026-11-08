---
layout: doc
title: Persisting Data
component: orm
---

# Persisting Data

Writing data is the other half of the ORM. You can create, update, save,
and delete rows with the methods of an `ORM` instance or an
`EntityMapper`. Most of these methods accept an entity or an array. An
entity is the preferred input, because the ORM knows the entity's
metadata, and save events can compare the new object with the stored row.

## Minimal Setup

Create an entity, fill it, and pass it to `createOne()`. The method
returns the saved entity with its generated primary key.

```php
$sakura = new Sakura();
$sakura->title = 'Rose';

$sakura = $orm->createOne($sakura);

echo $sakura->id;
```

## Showcase

A typical save method in a service receives the form data, loads the row
when an ID is given, and saves it. Only the fields that the form may change
are copied.

```php
class SakuraService
{
    public function __construct(
        protected ORM $orm
    ) {
    }

    public function save(int $id, array $input): Sakura
    {
        $sakura = $id > 0
            ? $this->orm->mustFindOne(Sakura::class, $id)
            : new Sakura();

        $sakura->title = $input['title'];
        $sakura->state = (int) $input['state'];

        return $this->orm->saveOne($sakura);
    }
}
```

`saveOne()` creates the row when the primary key is empty, and updates it
otherwise. The same method is used by the form for both cases.

## Creating Rows

- `createOne()` inserts one row. It accepts an entity or an array and
  returns the entity with its new primary key.
- `createMultiple()` inserts each item through the same path as
  `createOne()`.
- `createBulk()` inserts all items in a single `INSERT` statement.

```php
$orm->createMultiple(Sakura::class, $items);

$orm->createBulk(Sakura::class, $items);
```

::: warning
`createBulk()` dispatches only `BeforeCreateBulkEvent` and
`AfterCreateBulkEvent`. The per-row save events, such as `BeforeSaveEvent`,
are not dispatched. Validation or cascade logic that lives in those events
does not run for bulk inserts.
:::

## Updating Rows

`updateOne()` updates one row. It identifies the row by the primary key of
the entity by default. Pass the condition fields as the second argument to
use other columns.

```php
$orm->updateOne($sakura);

// Identify the row by the "no" column
$orm->updateOne($sakura, 'no');
```

::: warning
An array update needs a key in the data or in the condition fields.
Without one, `updateOne()` throws an `InvalidArgumentException`.
:::

### NULL Values

`NULL` is handled differently for entities and arrays:

- An entity writes `NULL` values to the database.
- An array skips `NULL` values unless the `updateNulls` option is set.

```php
$sakura->note = null;
$orm->updateOne($sakura); // Writes NULL

$orm->updateOne(Sakura::class, ['id' => 1, 'note' => null]);

$orm->updateOne(
    Sakura::class,
    ['id' => 1, 'note' => null],
    options: new ORMOptions(updateNulls: true),
);
```

::: warning
When the data is an array, a `null` value is skipped without an error.
The row keeps its old value, and the update appears to succeed. Use
`updateNulls` only when you need to clear a column.
:::

### Batch Updates

`updateBatch()` loads every row that matches the conditions and updates
each one as an entity. Save events run for each row.

```php
$orm->updateBatch(
    Sakura::class,
    ['state' => 0],
    ['location_id' => 2500],
);
```

`updateBulk()` and `updateWhere()` run one `UPDATE` statement. They are
faster, but they dispatch only the bulk-level events, and no row is loaded
into PHP.

```php
$orm->updateBulk(
    Sakura::class,
    ['state' => 0],
    ['location_id' => 2500],
);
```

## Saving Rows

`saveOne()` and `saveMultiple()` decide between an insert and an update
for each item. This works when the primary key is a single column or an
auto-increment column. A composite primary key without an auto-increment
column cannot be checked this way. For such tables, call `createOne()` or
`updateOne()` directly.

To create a row only when no matching row exists, use `findOneOrCreate()`.
It runs inside a transaction.

```php
$enrollment = $orm->findOneOrCreate(
    Enrollment::class,
    ['user_id' => $userId, 'lesson_id' => $lessonId],
    ['progress' => 0],
);
```

## Deleting Rows

- `deleteOne()` deletes the first row that matches, through the entity
  path, so the delete events run.
- `deleteBatch()` deletes every matching row, one by one, with the delete
  events.
- `deleteBulk()` runs one `DELETE` statement and dispatches no events.

```php
$orm->deleteOne(Sakura::class, ['id' => 1]);

$orm->deleteBatch(Sakura::class, ['state' => 0]);

$orm->deleteBulk(Sakura::class, ['state' => 0]);
```

`deleteWhere()` is deprecated. Use `deleteBatch()` instead.

::: warning
`deleteBulk()` does not run the delete events. A cascade that is
implemented in an `AfterDeleteEvent` listener is skipped, so related rows
remain.
:::

## Copying Rows

`copyOne()` copies one row and inserts the copy as a new row. Pass
`newValue` to change columns in the copy.

```php
$copy = $orm->copyOne(
    Sakura::class,
    ['id' => 123],
    ['no' => 'S00002'],
);
```

`copy()` copies every matching row and returns an array of the copies.

## Replacing and Syncing Rows

`flush()` deletes the rows that match the conditions and inserts the given
items in their place. It suits mapping tables that have no meaningful
primary key.

```php
$maps = [];

foreach ($tagIds as $tagId) {
    $map = new ArticleTagMap();
    $map->tagId = $tagId;
    $map->articleId = $article->id;

    $maps[] = $map;
}

$orm->flush(
    ArticleTagMap::class,
    $maps,
    ['article_id' => $article->id],
);
```

::: warning
`flush()` deletes every row that matches the conditions before it inserts
the new items. If the conditions are too broad, rows that you did not mean
to change are deleted. Check the conditions before you call it.
:::

`sync()` compares the given items with the matching rows and returns three
groups of results. Use it when the rows have IDs that should stay stable.

## Counters

`increment()` and `decrement()` change a numeric column in one statement.
`incrementOrCreate()` and `decrementOrCreate()` create the row when it
does not exist.

```php
$orm->increment(Article::class, 'reads', ['id' => $id]);

$orm->increment(Article::class, 'reads', ['id' => $id], num: 5);

$orm->decrement(Article::class, 'reads', ['id' => $id]);
```

The `num` argument must be positive. Use `decrement()` to subtract.

## Transactions

`transaction()` runs a callback inside a database transaction and returns
the callback's result. Use it when several writes must succeed or fail
together, or when a row must be locked while it is changed.

```php
use Windwalker\ORM\ORMOptions;

$orm->transaction(function () use ($orm, $id) {
    $sakura = $orm->mustFindOne(
        Sakura::class,
        $id,
        options: new ORMOptions(forUpdate: true),
    );

    $sakura->state = 2;

    $orm->updateOne($sakura);
});
```

Lock options such as `forUpdate` have an effect only inside a transaction.
For the lock options of the find methods, see
[Querying](./querying#locking-reads).

## Optimistic Locking

To detect a conflicting update from another request, add a version column
with `#[OptimisticLock]`. See [Optimistic Locking](./optimistic-lock).
