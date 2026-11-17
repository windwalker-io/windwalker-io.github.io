---
layout: doc
---

# Entity Serialization

An entity returned from a controller is serialized to JSON without a
transformer class. Each property becomes a key in the response, so the
properties you expose are the properties the client receives. This page
explains which properties are included, how to hide or force them, and how
to change the value of a single property.

## Returning an Entity

Return the entity from a method with `#[JsonApi]`. The envelope wraps it as
`data`:

```php
use Windwalker\Core\Attributes\JsonApi;
use Windwalker\Core\Attributes\Method;
use App\Entity\User;

#[JsonApi]
#[Method('GET')]
public function show(#[UrlVar] int $id): User
{
    return $this->userRepository->findOne($id);
}
```

```json
{
  "status": 200,
  "message": "",
  "data": {
    "id": 1,
    "username": "simon",
    "email": "simon@example.com",
    "created": "2025-01-01 10:00:00"
  },
  "success": true,
  "code": 200
}
```

The entity implements `jsonSerialize()` through `EntityTrait`, so
`json_encode()` and the API envelope use the same rules.

::: tip
Entities are a plain class, so you can return them from `#[Json]` methods
too. The response is the entity's JSON without the envelope.
:::

## Which Properties Are Included

By default, the public properties of the entity are included. Protected and
private properties are hidden, and so are virtual properties that are not
backed by a field.

Use `#[Expose]` to include a protected or private property:

```php
use Windwalker\Utilities\Attributes\Expose;

class User
{
    public int $id = 0;

    public string $username = '';

    #[Expose]
    protected ?string $displayName = null;
}
```

Use `#[Invisible]` to hide any property, including a public one:

```php
use Windwalker\Utilities\Attributes\Invisible;

class User
{
    public int $id = 0;

    #[Invisible]
    public string $password = '';
}
```

::: warning
Hidden properties only affect the JSON output. Code that reads the entity
still gets the value, so do not treat `#[Invisible]` as a security boundary.
Keep secrets such as password hashes out of the entities you return from
API methods.
:::

## Removing or Replacing a Key

`#[JsonNoSerialize]` removes a key from the output, even when the property
is exposed:

```php
use Windwalker\ORM\Attributes\JsonNoSerialize;

#[Expose]
#[JsonNoSerialize]
public ?string $internalNote = null;
```

`#[JsonSerializer]` runs a handler to produce the value for one property.
Use it to format a date or hide part of a value:

```php
use Windwalker\ORM\Attributes\JsonSerializer;

#[JsonSerializer(
    fn(mixed $value) => substr((string) $value, 0, 4) . '****'
)]
public string $phone = '';
```

## Forcing an Object

PHP encodes an empty array as `[]`. Use `#[ForceObjectJsonSerializer]` when
a property must always be a JSON object, for example a map that may be
empty:

```php
use Windwalker\ORM\Attributes\ForceObjectJsonSerializer;

#[ForceObjectJsonSerializer]
public array $settings = [];
```

Use the ORM cast attributes to store a JSON column as an array or an object:

```php
use Windwalker\ORM\Attributes\JsonArray;
use Windwalker\ORM\Attributes\JsonObject;

// Stored as JSON text, read back as an array
#[JsonArray]
public array $tags = [];

// Stored as JSON text, read back as an object
#[JsonObject]
public ?object $meta = null;
```

::: info
Entity serialization is the same whether the entity is returned from a
`#[JsonApi]` method or passed to `json_encode()`. Attributes change both.
:::
