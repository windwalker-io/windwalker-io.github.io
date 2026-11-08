---
layout: doc
title: Introduction
component: orm
---

# Introduction

Windwalker ORM maps database tables to PHP objects. It follows the
DataMapper pattern. An entity is a plain data object with no database
methods, and every read and write goes through the `ORM` service or an
`EntityMapper`. The package builds on the Database and Query components,
so the ORM and the query builder share the same connection.

## Installation

```bash
composer require windwalker/orm ^4.0
```

Windwalker ORM 4.x requires PHP 8.4.6 or later.

## Core Concepts

- **Entity**: a class that represents one table row. It uses
  `EntityTrait`, and its properties are mapped with attributes such as
  `#[Table]` and `#[Column]`.
- **EntityMapper**: performs the operations of one entity class. Get it
  with `$orm->mapper(Sakura::class)`.
- **ORM**: the service that holds the database adapter and creates
  mappers. Most methods accept the entity class name as the first
  argument and forward the call to the matching mapper.

Windwalker does not add save or find methods to entities. Domain objects
stay independent of storage, and the ORM is the single place where the
persistence rules are applied.

## Use as Standalone Component

The ORM needs a `DatabaseAdapter`. Create one with `DatabaseFactory`,
then pass it to `ORM`.

```php
use Windwalker\Database\DatabaseFactory;
use Windwalker\Database\Driver\DriverOptions;
use Windwalker\ORM\ORM;

$db = new DatabaseFactory()->create(
    'mysqli',
    new DriverOptions(
        host: '127.0.0.1',
        dbname: 'app',
        user: 'root',
        password: 'secret',
    ),
);

$orm = new ORM($db);

$sakura = $orm->findOne(Sakura::class, 1);
```

The `Sakura` class in these examples is defined in
[Entities](./entities).

## Use in Windwalker Application

The `DatabasePackage` builds the connections from the `database`
configuration and provides the `ORM` service. Use the existing container
or application to get it. Do not create a new `ORM` yourself.

Inject it as a constructor dependency:

```php
use Windwalker\ORM\ORM;

class SakuraService
{
    public function __construct(
        protected ORM $orm
    ) {
    }

    public function find(int $id): ?Sakura
    {
        return $this->orm->findOne(Sakura::class, $id);
    }
}
```

Retrieve it from the container:

```php
$orm = $container->get(ORM::class);
```

Retrieve it from the application:

```php
$orm = $app->retrieve(ORM::class);
```

### Configuration

Database connections are defined in `etc/packages/database.config.php`.
Event subscribers for the ORM are listed under `ORM::class` in the
`listeners` section.

```php
// etc/packages/database.config.php

'listeners' => [
    ORM::class => [
        // Subscriber class names go here.
    ],
],
```

## Topic Pages

- [Entities](./entities): defining entity classes, hydrating and
  extracting data, casting, and serialization.
- [Querying](./querying): finding entities, the query builder through
  the ORM, joins, and iteration over large result sets.
- [Persisting Data](./persisting): creating, updating, saving, deleting,
  batch operations, and transactions.
- [Events](./events): lifecycle events, `#[Watch]`, and listeners that
  are attached through the entity metadata.
- [Optimistic Locking](./optimistic-lock): detecting concurrent updates
  with a version column.
- [Nested Sets](./nested-set): storing and moving trees with `#[NestedSet]`.
- [Energize](./energize): attaching services to entities that the ORM
  creates.

## Related components

- [Database](/documentation/components/database/): the connections and
  the adapter that the ORM uses.
- [Query](/documentation/components/query/): the query builder that ORM
  queries are built on.
