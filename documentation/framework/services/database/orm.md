---
layout: doc
title: ORM & Query Builder
---

# ORM & Query Builder

## Purpose

:::info
The standalone package has its own detailed guides: [ORM](../../../components/orm/index.md) and [Query Builder](../../../components/orm/querying.md). This page focuses on using them inside the Windwalker framework.
:::

The database adapter runs SQL through a driver. Writing SQL by hand for
every table gets repetitive, and mapping rows to objects by hand gets
error-prone. The ORM service sits on top of the adapter and adds two things:

- An entity mapper for each entity class, which loads, saves, and deletes
  objects.
- A query builder, `SelectorQuery`, which extends the database `Query` and
  can return entities directly.

The ORM and its query builder share the adapter's connection and
transactions. You can combine raw queries, query builder calls, and entity
writes in one unit of work.

This page covers how to reach the service and how its parts fit together.
Entity mapping, finders, persisting, and events are described in the
[ORM component](/documentation/components/orm/).

## Getting the ORM

The ORM is registered by the database package. Each `DatabaseAdapter` has
one ORM instance, bound to the same connection. In a Windwalker application,
inject it:

```php
use Windwalker\ORM\ORM;

// Constructor injection, the preferred form in services.
class SakuraService
{
    public function __construct(protected ORM $orm)
    {
    }
}

// From the DI container.
$orm = $container->get(ORM::class);

// From the application.
$orm = $app->retrieve(ORM::class);

// For a named connection, pass the tag.
$orm = $container->get(ORM::class, tag: 'analytics');
```

To use the ORM outside a Windwalker application, create it from a
`DatabaseAdapter`. The [ORM overview](/documentation/components/orm/)
shows the standalone setup.

## Complete Example

The following example defines an entity, saves it, queries it, and updates
it in a transaction. It uses the ORM as the single entry point.

```php
use Windwalker\ORM\ORM;

class SakuraService
{
    public function __construct(protected ORM $orm)
    {
    }

    public function publish(string $title): Sakura
    {
        // Create and return the stored entity with its new id.
        $sakura = new Sakura();
        $sakura->title = $title;
        $sakura->state = 1;

        return $this->orm->createOne($sakura);
    }

    public function listPublished(): array
    {
        // Query through the ORM, returning Sakura entities.
        return $this->orm->from(Sakura::class)
            ->where('state', 1)
            ->orderBy('id', 'DESC')
            ->all(Sakura::class)
            ->dump();
    }

    public function unpublishAll(): void
    {
        // Several writes share one transaction.
        $this->orm->transaction(function () {
            $sakuras = $this->orm->from(Sakura::class)
                ->where('state', 1)
                ->all(Sakura::class);

            foreach ($sakuras as $sakura) {
                $sakura->state = 0;

                $this->orm->updateOne($sakura);
            }
        });
    }
}
```

::: tip
Use `->dump()` only when you need an array of entities. Iterate the query
or call `->all(Sakura::class)` when the result can be large.
:::

## Entry Points

The ORM exposes several entry points. Choose by what you need back.

### Mappers

`mapper()` returns the `EntityMapper` for one entity class. The ORM also
forwards calls to the mapper when the first argument is an entity class,
so `$orm->findOne(Sakura::class, 1)` and
`$orm->mapper(Sakura::class)->findOne(1)` are equivalent.

```php
// Get the mapper, then call its methods.
$mapper = $orm->mapper(Sakura::class);

$sakura = $mapper->findOne(1);

// A custom mapper class can be passed as the second argument.
$mapper = $orm->mapper(Sakura::class, SakuraMapper::class);

// The ORM instance is also invokable as a shortcut.
$mapper = $orm(Sakura::class);
```

See [Mappers](/documentation/components/orm/mappers) for custom mappers.

### Query Builder

`from()`, `select()`, and `selectRaw()` start a `SelectorQuery`. When the
first argument is an entity class, the query is bound to that entity's
mapper. Otherwise it accepts table names and expressions.

```php
// Entity-bound query: rows are hydrated into Sakura objects.
$items = $orm->from(Sakura::class)
    ->where('state', 1)
    ->all(Sakura::class);

// Table-based query: rows are returned as plain arrays or objects.
$rows = $orm->select('id', 'title')
    ->from('sakuras')
    ->where('state', 1)
    ->all();

// Raw select expression.
$row = $orm->selectRaw('COUNT(*) AS cnt')
    ->from('sakuras')
    ->get();

// $row->cnt holds the count.
```

::: info
Use `createBaseQuery()` when you need a plain database `Query` that does
not know about entities, for example to build a subquery.
:::

For the full builder API, see
[Querying](/documentation/components/orm/querying) and the
[Query component](/documentation/components/query/).

### Write Builders

`insert()`, `update()`, and `delete()` return plain database `Query` objects
for a table. Pass an entity class to use its table name.

```php
// Bulk update without loading entities.
$orm->update(Sakura::class)
    ->set('state', 0)
    ->where('state', 1)
    ->execute();

// Delete by table name.
$orm->delete('sakuras')
    ->where('state', 0)
    ->execute();
```

::: warning
A `update()` or `delete()` without a `where()` affects every row in the table.
:::

See [Writing](/documentation/components/query/writing) for the
query-based write methods.

## Working With Entities

The ORM converts between rows and entities. Use these helpers when you have
arrays from a raw query or need to prepare data.

```php
// Create an empty entity with defaults applied.
$sakura = $orm->createEntity(Sakura::class);

// Create an entity with constructor arguments.
$sakura = $orm->createEntityArgs(Sakura::class, 'Title');

// Fill an existing entity from an array.
$orm->hydrateEntity(['title' => 'New'], $sakura);

// Convert a raw row into an entity.
$sakura = $orm->toEntity(Sakura::class, $row);

// Same as toEntity(), but a null input returns null.
$sakura = $orm->tryEntity(Sakura::class, $row);

// Convert an entity into an array of column values.
$data = $orm->extractEntity($sakura);

// Read a single column value from an entity.
$title = $orm->extractField($sakura, 'title');
```

::: tip
Use `tryEntity()` when the input may be `null`, such as an optional
lookup result. It returns `null` instead of an entity.
:::

Use `energize()` and `isEnergized()` to attach the ORM's behavior to an
object that was created outside the ORM. See [Energize](/documentation/components/orm/energize).

## Transactions

`transaction()` runs a callback inside a database transaction on the ORM's
connection. Use it when several writes must succeed or fail together.

```php
$sakura = $orm->transaction(function () use ($orm) {
    $sakura = new Sakura();
    $sakura->title = 'Yoshino';

    return $orm->createOne($sakura);
});

// Check whether a transaction is already open.
$inTransaction = $orm->isInTransaction();
```

See [Persisting](/documentation/components/orm/persisting) for how
`ORMOptions` interact with transactions.

## Counting and Iterating

`countWith()` counts the rows of any query built with the ORM, without
loading them.

```php
$query = $orm->from(Sakura::class)
    ->where('state', 1);

$total = $orm->countWith($query);
```

For large tables, iterate the query instead of calling `all()`. See
[Querying](/documentation/components/orm/querying) for iteration.

## Cursor Pagination

Offset pagination slows down on large tables and skips rows when data
changes between pages. Cursor pagination uses the last seen row instead.
`Query::cursorPaginate()` defines the page length and sort order, and
`withCursor()` applies it to any `SelectorQuery`.

```php
use Windwalker\Query\Query;

// Page of 20 rows, sorted by id descending.
$paginate = Query::cursorPaginate(20, ['id' => 'DESC']);

// First page: no item given.
$items = $orm->from(Sakura::class)
    ->where('state', 1)
    ->withCursor($paginate)
    ->all(Sakura::class);

// Next page: pass the last row of the previous page.
$items = $orm->from(Sakura::class)
    ->where('state', 1)
    ->withCursor($paginate, end($items))
    ->all(Sakura::class);
```

::: tip
End the sort order with a unique column, such as `id`, so rows with equal
sort values are not repeated or skipped between pages.
:::

Pass a list of `[column, direction, value]` to `withCursor()` when you need
the cursor values without a row object.

## Upsert

`upsert()` inserts a row or updates it when a unique key already exists.
The ORM exposes it on the mapper.

```php
$tag = $orm->mapper(Tag::class)->upsert($tag);
```

Read [Upsert](/documentation/components/orm/persisting#upsert) for the
update-column options. The query-level API is described in
[Upsert](/documentation/components/query/upsert).

Conflict-key handling depends on the database platform. Check the upsert
page for the platform you target before relying on a specific key.

## Common Table Expressions

Use `with()` and `withRecursive()` on any query to add common table
expressions (CTEs). They work through the query builder, so the ORM does not
need extra setup.

```php
$query = $orm->createQuery()
    ->withRecursive(
        'tree',
        $orm->createQuery()
            ->select('id', 'parent_id')
            ->from('categories')
            ->where('parent_id', null),
    )
    ->select('id')
    ->from('tree');

$ids = $query->all();
```

See [CTE](/documentation/components/query/cte) for the full syntax and
platform support.

## JSON Columns

The query builder can filter and update JSON columns. Use `whereJsonExists()`
to filter by a JSON path, and `setJson()` to change one key in place.

```php
// Filter rows whose JSON column has a matching path.
$items = $orm->from(Sakura::class)
    ->whereJsonExists('meta->color')
    ->all(Sakura::class);
```

See [JSON](/documentation/components/query/json) for paths, casts, and
removal.

## Lateral Joins

`joinLateral()` joins a subquery that can reference columns from the outer
query. Its join condition defaults to `ON TRUE`, so pass `on()` only when
you need a condition.

```php
$items = $orm->from(Article::class, 'article')
    ->joinLateral(
        'LEFT',
        fn(Query $query) => $query
            ->selectRaw('COUNT(*) AS total')
            ->from(Comment::class, 'c')
            ->whereRaw('c.article_id = article.id'),
        'stats',
    )
    ->all(Article::class);
```

Lateral joins depend on platform support, so check the target database.

## Related Topics

- [ORM component](/documentation/components/orm/): standalone setup and
  topic index.
- [Entities](/documentation/components/orm/entities) and
  [Querying](/documentation/components/orm/querying).
- [Persisting](/documentation/components/orm/persisting) and
  [Events](/documentation/components/orm/events).
- [Database component](/documentation/components/database/) for the adapter.
- [Query component](/documentation/components/query/) for the builder.
- [Connection Pool](/documentation/components/pool/) for pooled connections.
