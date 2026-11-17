---
layout: doc
---

# Routing and JSON Input

An API controller reads its inputs as method arguments. Windwalker resolves
each argument from the request with attributes, so the method does not
touch the request object directly.

Route definitions are covered in [Routing](../http-routing/routing.md).
This page covers how a matched method receives its input.

## Restricting HTTP methods

Use `#[Method]` to allow only specific HTTP verbs on a controller method:

```php
use Windwalker\Core\Attributes\Method;
use Windwalker\Core\Attributes\JsonApi;

class UserController
{
    #[JsonApi]
    #[Method('GET')]
    public function show(): array
    {
        return ['id' => 1];
    }

    #[JsonApi]
    #[Method('POST', 'PUT')]
    public function save(): array
    {
        return ['saved' => true];
    }
}
```

A method that is not listed is rejected before the controller runs:

```php
// Request: DELETE /users/1
// ERROR: Throws "Method not allowed" with status 405
#[Method('GET')]
public function show(): array
```

## Reading query and route values

Use `#[Input]` to read a value by name. Without a name, Windwalker uses the
parameter name:

```php
use Windwalker\Core\Attributes\Request\Input;

#[JsonApi]
public function list(
    #[Input] int $page = 1,
    #[Input('per_page')] int $perPage = 20,
): array {
    return ['page' => $page, 'per_page' => $perPage];
}
```

Use the attribute that matches the source:

```php
use Windwalker\Core\Attributes\Request\File;
use Windwalker\Core\Attributes\Request\Header;
use Windwalker\Core\Attributes\Request\QueryParam;
use Windwalker\Core\Attributes\Request\UrlVar;

#[JsonApi]
public function upload(
    // Query string: ?lang=en
    #[QueryParam('lang')] string $lang,
    // Route variable: /users/{id}
    #[UrlVar] int $id,
    // Request header: X-Client: web
    #[Header('X-Client')] string $client,
    // Uploaded file with the field name "avatar"
    #[File('avatar')] mixed $avatar = null,
): array {
```

## Reading JSON bodies

`#[BodyValue]` reads from the parsed request body, which is where a JSON
payload is placed. Use it for `POST`, `PUT`, and `PATCH` endpoints:

```php
use Windwalker\Core\Attributes\Request\BodyValue;

#[JsonApi]
#[Method('POST')]
public function create(
    #[BodyValue('name')] string $name,
    #[BodyValue('address.city', default: 'Unknown')] string $city,
): array {
    return ['name' => $name, 'city' => $city];
}
```

Nested values use `.` as the delimiter. Set `delimiter` for a key that
contains a dot:

```php
// Body: {"user.name": "Simon"}
#[BodyValue('user.name', delimiter: '/')] string $name,
```

Given this request body:

```json
{
    "name": "Simon",
    "address": {
        "city": "Taipei"
    }
}
```

the method receives `name = "Simon"` and `city = "Taipei"`.

## Missing values

A parameter without a default fails with status 400 when the request does
not contain it. A default or a nullable type makes the value optional:

```php
#[JsonApi]
#[Method('POST')]
public function create(
    // ERROR: Throws Field "name" is missing in request.
    #[BodyValue('name')] string $name,

    // OK: A nullable type with a default is optional.
    #[BodyValue('nickname')] ?string $nickname = null,
): array {
```

::: info
`#[BodyValue]` reads from `AppRequest`, the request class Windwalker creates
for application requests. It has no effect on a plain PSR-7 request.
:::

## Reading the request directly

When no attribute fits, read the request object or use the `input()` helper.
Attributes are preferred for endpoints because the method signature lists
every input.
