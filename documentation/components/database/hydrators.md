---
layout: doc
title: Hydrators
component: database
---

# Hydrators

A database returns each row as an array of column values. Application code
usually works with objects, so a hydrator converts the array into an object
when a row is fetched, and converts an object back to an array when it is
needed. Keeping this conversion in one component means the rest of the
application receives typed objects, and the rule for filling them is written
in one place.

Hydrators are also the bridge to the ORM. The ORM builds its entity mapping
on top of the database hydrator, so a change to the hydrator affects entity
loading as well. This page covers the database side. For entities, see the
[ORM](/documentation/components/orm/) component.

## Setup

Every driver has a hydrator. Without configuration, it is a `SimpleHydrator`,
which works with plain classes, `stdClass` objects and objects that implement
the accessor interfaces. The adapter exposes the hydrator through
`getHydrator()`, which delegates to the driver:

```php
$hydrator = $db->getHydrator();

get_class($hydrator); // Windwalker\Database\Hydrator\SimpleHydrator
```

Fetching with a class name uses the driver's hydrator:

```php
$post = $db->prepare('SELECT * FROM posts WHERE id = ?')
    ->execute([1])
    ->get(Post::class);
```

## Interfaces

The package defines three interfaces:

- `HydratorInterface`: the base contract, with `hydrate(array $data,
  object $object): object` and `extract(object $object): array`.
- `FieldHydratorInterface`: extends the base contract with
  `extractField(object $object, string $field): mixed`, which reads one
  property without extracting the whole object.
- `HydratorAwareInterface`: declares `getHydrator()`. The adapter and the
  driver implement it.

`hydrate()` receives the row and the target object, and returns the same
object with its properties set. The object is passed in, so the hydrator can
fill an existing instance as well as a new one.

## Showcase

Using a hydrator directly, without a query, shows the two operations
clearly. The hydrator fills a `Post` from an array, then turns the object back
into an array:

```php
use Windwalker\Database\Hydrator\SimpleHydrator;

class Post
{
    public int $id;

    public string $title;

    public bool $published;
}

$hydrator = new SimpleHydrator();

$post = $hydrator->hydrate(
    ['id' => 1, 'title' => 'Hello', 'published' => 1],
    new Post(),
);

$data = $hydrator->extract($post);
```

The same call is made for each row when a statement fetches with a class
name, so the query code does not change when the hydrator does.

## Built-in Hydrators

The package ships with two hydrators that work, and one placeholder.

### SimpleHydrator

`SimpleHydrator` is the default. It chooses its behavior by the type of the
target object:

- `stdClass`: each key becomes a property.
- `ArrayAccess`: each key is written as an array key.
- `AccessorAccessibleInterface`: the object is hydrated through its accessors.
- Any other class: properties are set through reflection, so `private` and
  `protected` properties also receive values. Virtual properties are skipped.

`extract()` returns the values of all properties, including `private` and
`protected` ones. A `Traversable` object is converted with
`iterator_to_array()`, and a `stdClass` object returns its variables.

::: tip
Declare a property for every column that the query selects. A column without
a declared property becomes a dynamic property, which PHP 8.2 and later report
as a deprecation.
:::

### AccessibleHydrator

`AccessibleHydrator` works with two kinds of object. For an `ArrayObject`, it
fills the array with the row and replaces `null` values. For an
`AccessorAccessibleInterface`, it calls `set()` for each key. Any other object
raises an `InvalidArgumentException`.

`extract()` requires a `DumpableInterface` object, and returns its `dump()`
result. Use this hydrator when your data objects already implement these
interfaces.

### ClassMethodHydrator

`ClassMethodHydrator` is not implemented yet. Both of its methods throw a
`LogicException`, so do not use it.

## Replacing the Driver Hydrator

Set a hydrator on the driver with `setHydrator()`. The change applies to every
later fetch through that driver. Pass `null` to restore the default:

```php
$db->getDriver()->setHydrator(new MyHydrator());

$db->getDriver()->setHydrator(null);
```

::: info
`setHydrator()` belongs to the driver, not the adapter. The adapter has only
`getHydrator()`. The hydrator is looked up at each fetch, so setting a new one
affects later fetches without recreating the adapter.
:::

## Writing Your Own Hydrator

A custom hydrator usually wraps `SimpleHydrator`. The wrapper changes the row
or the object, then delegates the actual assignment to the inner hydrator. This
keeps the reflection and type handling of `SimpleHydrator`.

The example below maps snake_case columns to camelCase properties. It
implements `FieldHydratorInterface`, which the ORM requires:

```php
use Windwalker\Database\Hydrator\FieldHydratorInterface;
use Windwalker\Database\Hydrator\SimpleHydrator;

class CamelCaseHydrator implements FieldHydratorInterface
{
    public function __construct(
        protected FieldHydratorInterface $inner = new SimpleHydrator(),
    ) {
    }

    public function hydrate(array $data, object $object): object
    {
        $mapped = [];

        foreach ($data as $key => $value) {
            $name = str_replace('_', '', ucwords($key, '_'));

            $mapped[lcfirst($name)] = $value;
        }

        return $this->inner->hydrate($mapped, $object);
    }

    public function extract(object $object): array
    {
        return $this->inner->extract($object);
    }

    public function extractField(object $object, string $field): mixed
    {
        return $this->inner->extractField($object, $field);
    }
}
```

Register it on the driver, then fetch as usual:

```php
class PostDto
{
    public int $id;

    public string $createdAt;
}

$db->getDriver()->setHydrator(new CamelCaseHydrator());

$dto = $db->prepare('SELECT id, created_at FROM posts')
    ->execute()
    ->get(PostDto::class);

$dto->createdAt;
```

::: warning
This example maps names in one direction only. `extract()` returns the
properties unchanged, so the keys do not match the table columns again. If
you write objects back through the same hydrator, convert the keys in
`extract()` as well.
:::

::: tip
Keep the work per row small. A hydrator runs for every row of a large result,
so an expensive operation in `hydrate()` slows the whole query.
:::

## Events Around Hydration

Hydration is the last step of a fetch. The statement emits an
`ItemFetchedEvent` for the raw row, then a `HydrateEvent` with the target
class, and then calls the hydrator. A listener of `HydrateEvent` can change the
row before the hydrator receives it. See [Events](/documentation/components/database/events).

## Hydrators and the ORM

The ORM does not replace the database hydrator. It wraps it in an
`EntityHydrator`, which handles the parts that depend on entity metadata:
casting values, mapping columns to properties, and skipping relation fields.
After that, the `EntityHydrator` passes the result to the database hydrator
for the final assignment.

::: warning
`ORM::getEntityHydrator()` reads the database hydrator once and keeps the
result. Set a custom hydrator on the driver before the first ORM call, or set
the entity hydrator directly with `ORM::setEntityHydrator()`.
:::

A custom hydrator must implement `FieldHydratorInterface` to be used by the
ORM. A class that implements only `HydratorInterface` causes a `TypeError`
when the ORM builds its entity hydrator.

## Related Pages

- [Queries](/documentation/components/database/queries): fetching rows as
  arrays or objects.
- [Events](/documentation/components/database/events): events emitted during
  hydration.
- [ORM](/documentation/components/orm/): entity mapping built on the
  database hydrator.
- [ORM Hydration](/documentation/components/orm/hydration): the entity
  hydrator that wraps the driver hydrator.
