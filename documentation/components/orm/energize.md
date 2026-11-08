---
layout: doc
title: Energize
component: orm
---

# Energize

Entities are plain data objects, so an entity method cannot reach a service
by itself. A method such as "can this user edit this row?" then needs the
caller to pass the service in. Energizing solves this. When the ORM creates
or hydrates an entity, an `EnergizeEvent` lets you attach services and other
values to that entity object. The entity's own methods can then use them,
and the caller only calls the method.

## Minimal Setup

Add a `#[EnergizeEvent]` static method to the entity. Store a value under a
name with `store()`, and read it back with `retrieveMeta()` inside the entity.

```php
use Windwalker\ORM\Event\EnergizeEvent;

#[Table('sakuras')]
class Sakura implements EntityInterface
{
    use EntityTrait;

    // ...

    #[EnergizeEvent]
    public static function energize(EnergizeEvent $event): void
    {
        $event->store('greeting', 'Hello World');
    }

    public function getGreeting(): string
    {
        return $this->retrieveMeta('greeting');
    }
}
```

The stored value is kept in the metadata of the object, not in one of its
properties. It is therefore not dumped or serialized with the entity.

## Showcase

The following example injects an access service into the entity, so that
the entity can answer permission questions about itself:

```php
use Windwalker\ORM\Event\EnergizeEvent;

#[Table('sakuras')]
class Sakura implements EntityInterface
{
    use EntityTrait;

    // ...

    #[EnergizeEvent]
    public static function energize(
        EnergizeEvent $event,
        AccessService $accessService,
    ): void {
        $event->store('access.service', $accessService);
    }

    public function can(string $action): bool
    {
        /** @var AccessService $accessService */
        $accessService = $this->retrieveMeta('access.service');

        return $accessService->can($action, $this);
    }
}
```

A caller then uses the entity without knowing about the service:

```php
$sakura = $orm->mustFindOne(Sakura::class, 1);

if ($sakura->can('edit')) {
    // ...
}
```

The parameters after the event are type-hinted services. The ORM resolves
them through its attributes resolver. In a Windwalker application, the
resolver is the one of the container, so any service in the container can
be requested. In standalone use, provide a resolver that can create the
services with `ORM::setAttributesResolver()`.

::: info
Energize runs for entities that the ORM creates or hydrates. These include
entities from `createEntity()`, `toEntity()`, `hydrateEntity()`, and the find
methods. An entity made with `new` is not energized, so calling `can()` on it
fails. Pass it to `$orm->energize()` first.
:::

## Energizing Manually

Use `ORM::energize()` for an entity that you created yourself. The method
returns the energized entity. Energizing the same entity again has no
effect.

```php
$sakura = new Sakura();

$sakura = $orm->energize($sakura);

$sakura->can('edit');
```

`isEnergized()` tells whether an entity has been energized, and
`unenergize()` removes the energized state.

```php
if (!$orm->isEnergized($sakura)) {
    $sakura = $orm->energize($sakura);
}
```

## Lazy Services

Energize runs every time an entity is created. Injecting several services
there costs time on every entity, even when the methods that need them are
never called. To defer the work, store a callback with `storeCallback()`.
The callback is resolved when it is called, and its parameters are injected
at that point.

```php
#[EnergizeEvent]
public static function energize(EnergizeEvent $event): void
{
    $event->storeCallback(
        'access.service',
        fn (AccessService $accessService) => $accessService,
    );
}
```

The entity then calls the callback to get the service:

```php
public function can(string $action): bool
{
    $accessService = $this->retrieveMeta('access.service')();

    return $accessService->can($action, $this);
}
```

::: tip
Use `storeCallback()` for services that only some methods use. Store the
service directly when every method needs it.
:::

## Accessing the ORM From an Entity

`Windwalker\ORM\Traits\ORMEnergizeTrait` stores the ORM and the entity
mapper during energizing. Add it to an entity to read `$this->orm` and
`$this->entityMapper` inside its methods. The trait's properties are marked
`#[JsonNoSerialize]`, so they are left out of JSON output.

```php
use Windwalker\ORM\Traits\ORMEnergizeTrait;

#[Table('sakuras')]
class Sakura implements EntityInterface
{
    use EntityTrait;
    use ORMEnergizeTrait;

    // ...
}
```

::: warning
`#[EnergizeEvent]` methods must be `static`. The ORM rejects an instance
method with a `LogicException`.
:::
