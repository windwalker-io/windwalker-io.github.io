---
layout: doc
title: Hydration
component: orm
---

# Hydration

Hydration turns a database row into an entity, and extraction turns an entity
back into the values that the database receives. Both steps run through one
object, the entity hydrator, which the ORM holds. The casts are applied there,
so every read and every write follows the same rules.

Most applications never replace the entity hydrator. Knowing the pipeline
helps when a rule must apply to every entity, or when a value must leave the
ORM in a different form.

## The Pipeline

When a row is hydrated into an entity, the work happens in two layers:

1. The entity hydrator checks each column of the entity. For every column it
   runs the casts of the property, such as `#[Cast]` and `#[CastNullable]`.
2. The driver's hydrator writes the converted values into the object. The
   default driver hydrator is `SimpleHydrator`.

Extraction runs the same layers in the other direction:

1. The entity hydrator runs the casts of each column in the extract direction.
2. A value that is not `null` and not a string is converted to a string, when
   the `extractForceStringify` option is enabled. It is enabled by default.

When the ORM hydrates a row, it first emits a `HydrateEvent` with the row
data. A listener on the ORM can change the data before the entity hydrator
receives it:

```php
use Windwalker\Database\Event\HydrateEvent;

$orm->on(
    HydrateEvent::class,
    function (HydrateEvent $event) {
        // Change $event->item before the entity is filled
    }
);
```

## Reading the Entity Hydrator

`getEntityHydrator()` returns the hydrator in use. The first call creates the
default entity hydrator, which wraps the driver hydrator:

```php
$hydrator = $orm->getEntityHydrator();
```

## Replacing the Entity Hydrator

`setEntityHydrator()` replaces the hydrator for the whole ORM instance. Pass
`null` to restore the default, which is created again on the next call.

A replacement must implement `FieldHydratorInterface`. The usual way is to
decorate the default entity hydrator, so that the casts stay in place:

```php
use Windwalker\Database\Hydrator\FieldHydratorInterface;
use Windwalker\ORM\Hydrator\EntityHydrator;

class TrimmingHydrator implements FieldHydratorInterface
{
    public function __construct(
        protected FieldHydratorInterface $inner,
    ) {
    }

    public function hydrate(array $data, object $object): object
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = trim($value);
            }
        }

        return $this->inner->hydrate($data, $object);
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

$orm->setEntityHydrator(
    new TrimmingHydrator(
        new EntityHydrator($db->getHydrator(), $orm),
    ),
);
```

::: warning
A replacement that does not pass the data to an `EntityHydrator` skips the
casts of every entity. The entities then receive raw values with no error.
Always keep an `EntityHydrator` inside the chain.
:::

## Keeping Types on Extract

The setting is the public property `extractForceStringify` of the
`Windwalker\ORM\Hydrator\EntityHydrator` class. Its default is `true`, and
nothing in the framework or in the application configuration changes it. The
ORM has no configuration key for it, so it is changed in code.

By default, `extract()` converts the values to strings, so that the statement
receives text. Turn the option off to keep the PHP types. The ORM creates its
entity hydrator on the first call to `getEntityHydrator()`, so the usual way
is to replace the hydrator before the entities are used:

```php
use Windwalker\ORM\Hydrator\EntityHydrator;

$hydrator = new EntityHydrator($db->getHydrator(), $orm);

$hydrator->extractForceStringify = false;

$orm->setEntityHydrator($hydrator);
```

The default instance can also be changed in place. Call
`getEntityHydrator()` first, and set the property on the object it returns.
The method is typed as `FieldHydratorInterface`, which has no such property,
so this works only while the hydrator is the default `EntityHydrator`:

```php
$orm->getEntityHydrator()->extractForceStringify = false;
```

::: info
The database driver must accept the PHP types in its statements. Keep the
default unless a driver or a column type needs the typed values.
:::

## Related Topics

- [Database Hydrators](/documentation/components/database/hydrators): the
  driver hydrator that the entity hydrator wraps, and how to write one.
- [Casting](./casting): the casts that run in this pipeline.
