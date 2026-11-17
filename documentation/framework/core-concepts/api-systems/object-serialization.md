---
layout: doc
---

# Object Serialization

An entity or record returned from a controller is serialized to JSON without
a transformer class. The behavior applies to both the `EntityTrait` and the
`RecordTrait` families. Each property becomes a key in the response, so the
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
private properties are hidden.

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

## Records

A `Record` without a class serializes all of its data. Its keys come
from the values you wrap, so nothing is hidden:

```php
use Windwalker\Data\Record;

class UserEnvelope
{
    public function __construct(
        public int $id = 0,
        public string $name = '',
        // This attribute won't work because Record does not use RecordTrait.
        #[Invisible]
        public \DateTimeImmutable $created = '',
    ) {
    }
}

$record = new UserEnvelope(
    id: 1,
    name: 'Simon',
    created: new \DateTimeImmutable(
        '2025-01-01 10:00:00',
        new \DateTimeZone('UTC'),
    ),
]);

echo json_encode($record);
// {"id":1,"name":"Simon",
//  "created":{"date":"2025-01-01 10:00:00.000000",...}}
```

A record class that uses `RecordTrait` is usually a value object, such as
an address stored under an entity property. Declare its properties with
constructor promotion. Only the public properties are included, and the
attributes in this page control the rest:

```php
use Windwalker\Data\RecordInterface;
use Windwalker\Data\RecordTrait;
use Windwalker\Utilities\Attributes\Expose;
use Windwalker\Utilities\Attributes\Invisible;

class UserAddress implements RecordInterface
{
    use RecordTrait;

    public function __construct(
        public string $city = '',
        public string $zip = '',
        #[Invisible]
        public string $note = '',
        #[Expose]
        protected string $country = 'TW',
    ) {
    }
}

echo json_encode(new UserAddress('Taipei', '100', 'vip'));
// {"city":"Taipei","zip":"100","country":"TW"}
```

Put the record in an entity property. The entity serializes it as a
nested object:

```php
use Windwalker\ORM\EntityTrait;
use Windwalker\ORM\Attributes\Column;

class User
{
    use EntityTrait;

    #[Column('id')]
    public int $id = 1;

    #[Column('username')]
    public string $username = 'simon';

    #[Column('address')]
    #[JsonObject]
    public UserAddress $address;

    public function __construct()
    {
        $this->address = new UserAddress('Taipei', '100');
    }
}

echo json_encode(new User());
// {"id":1,"username":"simon",
//  "address":{"city":"Taipei","zip":"100","country":"TW"}}
```

Returned from a `#[JsonApi]` method, the entity is wrapped in the
envelope, and the nested record follows the same rules:

```php
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
    "address": {
      "city": "Taipei",
      "zip": "100",
      "country": "TW"
    }
  },
  "success": true,
  "code": 200
}
```

The two kinds of record differ in one important way. A clean `Record`
exposes every key it holds, while a `RecordTrait` class exposes only the
properties you declare and expose.

## DateTime Values

Values of the framework `Chronos` class serialize to ISO 8601 strings:

```php
use Windwalker\Core\DateTime\Chronos;
use Windwalker\ORM\Attributes\Column;

class Post
{
    #[Column('id')]
    public int $id = 1;

    #[Column('created_at')]
    public Chronos $createdAt;

    public function __construct()
    {
        $this->createdAt = new Chronos('2025-01-01 10:00:00', 'UTC');
    }
}

echo json_encode(new Post());
// {"id":1,"createdAt":"2025-01-01T10:00:00.000+00:00"}
```

::: info
A plain PHP `\DateTimeImmutable` or `\DateTime` is not converted to ISO. It
serializes to PHP's default object shape instead:

```php
// {"date":"2025-01-01 10:00:00.000000",
//  "timezone_type":3,"timezone":"UTC"}
```
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
