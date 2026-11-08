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

## Calling Convention

The write methods follow the same pattern as the finders. The mapper holds
the logic, and the ORM proxy forwards the call with the entity class as its
first argument. See [Mapper and the ORM Proxy](./querying#mapper-and-the-orm-proxy).

When the object you pass is an entity, the proxy can read the class from the
object. The class argument can then be omitted for these methods:

- `createOne()`
- `updateOne()`
- `saveOne()`
- `copy()` and `copyOne()`, where the object is used as the conditions

```php
$sakura = new Sakura();
$sakura->title = 'Rose';

$sakura = $orm->createOne($sakura);

// Same as
$sakura = $orm->createOne(Sakura::class, $sakura);

$sakura->title = 'Peony';

$orm->saveOne($sakura);
```

The mapper methods need no class at all, because the mapper already belongs
to one entity class:

```php
$mapper = $orm->mapper(Sakura::class);

$sakura = $mapper->saveOne($sakura);
```

Every other method needs the class as the first argument. The following
methods do not guess the class from an object:

- `createMultiple()`, `createBulk()`
- `updateBatch()`, `updateBulk()`, `updateMultiple()`
- `saveMultiple()`
- `findOneOrCreate()`, `updateOneOrCreate()`, `upsert()`
- `deleteOne()`, `deleteBatch()`, `deleteBulk()`
- `flush()`, `sync()`
- `increment()`, `decrement()`, `incrementOrCreate()`,
  `decrementOrCreate()`

::: info
`saveMultiple()` and `updateMultiple()` declare the first parameter as
`string|object`, but the proxy does not read the class from an object for
them. Pass the class explicitly. The ORM also has no `save()` method. Use
`saveOne()` for a single entity, or `saveMultiple()` with the class for a
list.
:::

### Conditions

The methods that take conditions convert camelCase keys to column names. The
conversion applies to the finders, and to the write methods listed below.
This lets you pass local variables with `compact()`:

```php
$orm->deleteBatch(
    Sakura::class,
    compact('locationId', 'state'),
);
```

The following methods convert the keys of their conditions:

- `updateBatch()`, `updateBulk()`
- `deleteOne()`, `deleteBatch()`, `deleteBulk()`
- `copy()`, `copyOne()`
- `flush()`, `sync()`
- `increment()`, `decrement()`, `incrementOrCreate()`, `decrementOrCreate()`
- The conditions of `findOneOrCreate()`

The key fields of `updateOne()`, `upsert()`, and `updateOneOrCreate()` are not
converted. They are matched against the column names of the data, so pass the
column names there, such as `location_id`.

### Common Methods

The table lists the write methods. Each method has its own section below.

| Method | Use it to | Class from object |
| --- | --- | --- |
| [createOne](#creating-rows) | insert one row | yes |
| [createMultiple](#creating-rows) | insert rows one by one | no |
| [createBulk](#creating-rows) | insert rows in one statement | no |
| [updateOne](#updating-rows) | update one row | yes |
| [updateBatch](#batch-and-bulk-updates) | update the matching rows, one by one | no |
| [updateBulk](#batch-and-bulk-updates) | update the matching rows in one statement | no |
| [saveOne](#saving-rows) | insert or update one row | yes |
| [saveMultiple](#saving-rows) | insert or update a list of rows | no |
| [upsert](#upsert) | insert, or update on a unique key conflict | no |
| [findOneOrCreate](#find-or-create) | load one row, or insert it when missing | no |
| [updateOneOrCreate](#update-or-create) | update one row, or insert it when missing | no |
| [deleteOne](#deleting-rows) | delete one row | no |
| [deleteBatch](#deleting-rows) | delete the matching rows, one by one | no |
| [deleteBulk](#deleting-rows) | delete the matching rows in one statement | no |
| [copyOne](#copying-rows) | copy one row | yes |
| [flush](#replacing-and-syncing-rows) | replace the matching rows | no |
| [sync](#syncing-rows) | bring the matching rows in line with a list | no |
| [increment](#counters) | add to a numeric column | no |
| [decrement](#counters) | subtract from a numeric column | no |
| [transaction](#transactions) | run several writes in one transaction | no |

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

## Upsert

`upsert()` inserts a row when no row matches the conflict keys, and it
updates the existing row when one does. The database decides between the two
in a single statement, so the check and the write cannot interleave with
another request. It is the safe choice for counters, caches, and
"create or update" records. The ORM method builds the row from an entity or
an array, and it returns the entity with its ID.

For why the statement is safer than a separate check and write, and for the
differences between databases, see the [Upsert](/documentation/components/database/writer#upsert)
section of the Database component. The statement itself is described in the
[Upsert](/documentation/components/query/upsert) page of the Query component.

### Minimal Setup

Pass the row, the conflict keys, and the columns to update:

```php
$tag = $orm->mapper(Tag::class)->upsert(
    ['type' => 'color', 'name' => 'red', 'state' => 1],
    ['type', 'name'],
    ['state'],
);
```

The conflict keys must match a unique index of the table. See the warning in
the next section.

### Showcase

A page view counter keeps one row for each page and each day. The first
request of the day inserts the row. Later requests increment the counter in
the same statement, even when several requests arrive at once:

```php
use function Windwalker\raw;

class PageViewService
{
    public function __construct(
        protected ORM $orm
    ) {
    }

    public function count(string $page): PageView
    {
        return $this->orm->mapper(PageView::class)->upsert(
            [
                'page' => $page,
                'day' => date('Y-m-d'),
                'views' => 1,
            ],
            ['page', 'day'],
            ['views' => raw('views + 1')],
        );
    }
}
```

The table needs a unique index on `(page, day)`. The entity class maps the
`page_views` table, with the same column names as the array.

### Conflict Keys

The conflict keys identify the row. They default to the primary key of the
entity, and the second argument replaces them.

::: warning
The keys must match a `PRIMARY` or `UNIQUE` index. On MySQL, the statement
reacts to a conflict on any `PRIMARY` or `UNIQUE` index, not only on the
listed keys. A table with several unique indexes can therefore update a row
that you did not intend to change. See
[Conflict Keys](/documentation/components/query/upsert#conflict-keys).
:::

### Update Columns

The third argument chooses the columns that change on a conflict. It has four
forms:

- `null`, the default. Every inserted column except the keys is updated.
- A list of column names. Only those columns are updated, with the values
  that were inserted.
- A `column => value` map. The columns are set to the given values. A value
  can be a `raw()` expression, such as `raw('views + 1')`.
- A closure with the signature `(array $data, array $keys)`. It returns one
  of the forms above.

```php
$orm->mapper(Setting::class)->upsert(
    [
        'key' => 'site.name',
        'value' => $name,
        'updated' => date('Y-m-d H:i:s'),
    ],
    ['key'],
    fn (array $data, array $keys) => ['value', 'updated'],
);
```

::: info
The default updates every column except the keys. For a table with more
columns, such as `created`, list the columns that should change. Otherwise
the conflict also overwrites the columns that should be kept.
:::

### Null Values

The ORM handles `NULL` the same way as `updateOne()`:

- An entity writes `NULL` values on insert and on conflict.
- An array drops `NULL` values before the statement. The insert then uses
  the column default, and a conflict leaves the stored value unchanged.

Pass `ORMOptions(updateNulls: true)` to write `NULL` from an array.

### Auto-Increment and the Returned Entity

When the entity has an auto-increment primary key that is not part of the
conflict keys, or when its value is empty, the ORM leaves the ID out of the
statement. The database assigns the ID, and the ORM writes it back into the
returned entity.

```php
$tag = $orm->mapper(Tag::class)->upsert(
    ['type' => 'color', 'name' => 'blue', 'state' => 1],
    ['type', 'name'],
);

echo $tag->id;
```

When the ID is one of the conflict keys and it has a value, the row is matched
by that ID instead.

### Events

::: warning
`upsert()` does not dispatch the save events, such as `BeforeSaveEvent` and
`AfterSaveEvent`. Listeners that set timestamps, validate data, or write
related rows do not run. Prepare the data before the call, and run the side
effects yourself, or use `saveOne()` when the events must run.
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

### Batch and Bulk Updates

The ORM offers two ways to update many rows. They differ in how the rows are
written, and that choice decides whether the row events run.

#### Batch: updateBatch

`updateBatch()` finds every row that matches the conditions. It hydrates the
new values into each row and calls `updateOne()` for it. The update of each
row is a normal entity update, so `BeforeSaveEvent` and `AfterSaveEvent` run
for every row, and the listeners that keep related data consistent run as
well. The cost is one query to load the rows, and one update per row.

```php
$orm->updateBatch(
    Sakura::class,
    ['state' => 0],
    ['location_id' => 2500],
);
```

Use it for a small number of rows, where the related data must stay
consistent through the listeners.

::: info
Each row is updated as an entity, so a `NULL` value in `$data` is written to
the row. An array passed to `updateOne()` skips `NULL` values instead.
:::

#### Bulk: updateBulk

`updateBulk()` runs one `UPDATE` statement with the conditions. The database
changes all matching rows at once, and no row is loaded into PHP. The update
does not dispatch the per-row events, such as `BeforeSaveEvent` and
`AfterSaveEvent`. Only `BeforeUpdateWhereEvent` and `AfterUpdateWhereEvent`
are dispatched, and they receive the conditions and the data.

```php
$orm->updateBulk(
    Sakura::class,
    ['state' => 0],
    ['location_id' => 2500],
);
```

Use the bulk form for large updates that no listener must run for, such as
resetting a status column across many rows.

::: warning
A bulk update does not load the rows, so the per-row save events are not
dispatched for them. A value that a `BeforeSaveEvent` listener would compute
or check is not set. Confirm that no other row depends on the columns you
change.
:::

## Saving Rows

`saveOne()` and `saveMultiple()` decide between an insert and an update
for each item. This works when the primary key is a single column or an
auto-increment column. A composite primary key without an auto-increment
column cannot be checked this way. For such tables, call `createOne()` or
`updateOne()` directly.

### Find or Create

`findOneOrCreate()` returns the row that matches the conditions. When no row
matches, it inserts one. The new row takes the values of the conditions,
merged with `$initData`.

```php
use Windwalker\ORM\ORMOptions;

$enrollment = $orm->findOneOrCreate(
    Enrollment::class,
    ['user_id' => $userId, 'lesson_id' => $lessonId],
    function (array $data, array $conditions) use ($userId) {
        $data['progress'] = 0;
        $data['created_by'] = $userId;

        return $data;
    },
    options: new ORMOptions(transaction: true),
);
```

`$initData` accepts an array or a callable. The callable is called only when
a row is created. It receives the row data and the conditions, and it returns
the row data. Returning `null` keeps the data unchanged. The row data holds the
condition values only when `$mergeConditions` is `true`, which is the default.

Pass `ORMOptions(transaction: true)` to run the find and the insert in one
transaction, and to lock the found row. See
[Finder Methods](./querying#findoneorcreate) for the details.

::: warning
Two requests can both find no row and both insert one, unless a `UNIQUE`
index on the conditions rejects the second insert. Add the index when the row
must be unique.
:::

### Update or Create

`updateOneOrCreate()` looks for a row whose condition fields match the item.
When the row exists, the item updates it. When no row matches, the item is
inserted. The condition fields default to the primary key, and they must be
present in `$item`.

```php
$quizMap = $orm->updateOneOrCreate(
    UserQuizMap::class,
    ['user_id' => $userId, 'quiz_id' => $quizId, 'score' => 60],
    function (array $data, array $conditions) {
        $data['started_at'] = date('Y-m-d H:i:s');

        return $data;
    },
    ['user_id', 'quiz_id'],
);
```

The `$initData` callable behaves as in `findOneOrCreate()`, with one
difference: it receives the extracted data of `$item`, and it is called only
when the row is created. As with `findOneOrCreate()`, the transaction starts
only with `ORMOptions(transaction: true)`.

::: warning
A condition field that is missing from `$item` is read as an undefined index,
so the search runs with an unexpected value. Set every condition field on the
item before you call the method.
:::

## Deleting Rows

- `deleteOne()` deletes the first row that matches, through the entity
  path, so the delete events run.
- `deleteBatch()` deletes every matching row, one by one, with the delete
  events. It is the event-safe form of the batch update.
- `deleteBulk()` runs one `DELETE` statement and dispatches no per-row delete
  events. It is the bulk form, and the same trade-off as `updateBulk()`
  applies.

```php
$orm->deleteOne(Sakura::class, ['id' => 1]);

$orm->deleteBatch(Sakura::class, ['state' => 0]);

$orm->deleteBulk(Sakura::class, ['state' => 0]);
```

::: warning
`deleteBulk()` does not dispatch the per-row delete events. A cascade that is
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

### Syncing Rows

`sync()` brings the rows that match the conditions in line with a new list.
It deletes the rows that are no longer in the list, creates the new ones, and
updates the ones that stay. Use it when the rows must keep their IDs,
because `flush()` deletes and inserts every row again, and an
auto-increment ID keeps growing.

The compare keys decide whether two items are the same. When they are
omitted, the keys of the conditions are used.

```php
$orm->sync(
    File::class,
    $images,
    ['type' => 'reward', 'target_id' => $item->id],
    ['id'],
);
```

With a mapping table that has no ID, compare the columns that identify the
link instead:

```php
$maps = [];

foreach ($categoryIds as $categoryId) {
    $map = new CategoryMap();
    $map->type = 'product';
    $map->targetId = $product->id;
    $map->categoryId = $categoryId;

    $maps[] = $map;
}

[$kept, $created, $deleted] = $orm->sync(
    CategoryMap::class,
    $maps,
    ['type' => 'product', 'target_id' => $product->id],
    ['type', 'category_id'],
);
```

`sync()` returns three arrays: the kept items, the created items, and the
deleted items. Deletions run through `deleteBatch()`, so the delete events
run, and creations run through `createMultiple()`.

::: warning
Every row that matches the conditions and has no counterpart in the new list
is deleted. Keep the conditions to the rows that belong to the owner you are
syncing.
:::

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

`incrementOrCreate()` always runs in a transaction. It accepts the same
`$initData` callable as `findOneOrCreate()` for the row it creates.

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
