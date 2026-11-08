---
layout: doc
title: Writing Data
component: query
---

# Writing Data

The builder also creates `INSERT`, `UPDATE` and `DELETE` statements. It uses
the same conditions and values as a select, so the same code can write rows
on every supported database. For a row that is inserted or updated as one
unit, the [ORM](/documentation/components/orm/) keeps the entity state for
you. The builder is the right tool for set-based writes, such as updating a
whole group of rows.

## Insert

Call `insert()` with the table name, then pass the column names and the
values. Both can take several rows at once:

```php
$db->createQuery()
    ->insert('posts')
    ->columns('title', 'state')
    ->values(
        ['First', 1],
        ['Second', 0],
    )
    ->execute();
```

`columns()` and `values()` are the portable form. They produce the same
statement on every dialect.

::: info
`set()` builds an `INSERT ... SET` statement, which is valid on MySQL only.
Use `set()` for updates on every dialect, and `columns()` with `values()`
for inserts.
:::

## Showcase

The next function creates a post and its first revision in one
transaction. It reads the new ID from the statement and uses it in the
second insert:

```php
use Windwalker\Database\DatabaseAdapter;

function createPost(DatabaseAdapter $db, string $title): int
{
    return $db->transaction(function (DatabaseAdapter $db) use ($title) {
        $statement = $db->createQuery()
            ->insert('posts')
            ->columns('title', 'state')
            ->values([$title, 0])
            ->execute();

        $id = (int) $statement->lastInsertId();

        $db->createQuery()
            ->insert('post_revisions')
            ->columns('post_id', 'content')
            ->values([$id, '...'])
            ->execute();

        return $id;
    });
}
```

After an insert, `lastInsertId()` on the returned statement reports the
new auto-increment ID.

Pass `incrementField: true` to `insert()` only when the statement writes an
explicit value into an identity column on SQL Server. The builder then wraps
the statement in `SET IDENTITY_INSERT` on and off. The other dialects ignore
this flag.

## Update

`update()` takes the table name. The conditions and the new values work the
same way as in a select:

```php
$db->createQuery()
    ->update('posts')
    ->set('state', 0)
    ->set(['title' => 'Draft'])
    ->where('id', 10)
    ->execute();
```

To change a column from its own value, use `setRaw()`. The text is
written as given, so it can refer to other columns:

```php
$db->createQuery()
    ->update('posts')
    ->setRaw('hits = hits + 1')
    ->where('id', 10)
    ->execute();
```

::: warning
An `UPDATE` without `where()` changes every row in the table. The builder
does not ask for confirmation. Check that the condition is present before
you execute the statement.
:::

Update statements can also change a JSON value in place, through
`setJson()`. See [JSON](/documentation/components/query/json).

## Delete

`delete()` removes the rows that match the conditions:

```php
$db->createQuery()
    ->delete('post_revisions')
    ->where('post_id', 10)
    ->execute();
```

::: warning
A `DELETE` without `where()` removes every row in the table. Add the
condition before the statement is executed, and run deletes inside a
transaction when more than one table is affected.
:::

## Affected Rows

`execute()` returns the statement. Call `countAffected()` on it to get the
number of rows that the write changed.

::: info
The builder does not fire model events. Entity events, such as a
before-save hook, belong to the ORM. The database layer still raises its
own query events. See [Events](/documentation/components/database/events)
in the database package.
:::

## Writing Through the Writer

The database package offers a writer for common insert, update, upsert and
delete operations, which works on plain arrays. Use the query builder when
you need the conditions and expressions shown here, and the writer when a
single row is written from an array. See
[Writer](/documentation/components/database/writer) for details.
