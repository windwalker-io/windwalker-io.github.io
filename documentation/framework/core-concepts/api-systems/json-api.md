---
layout: doc
---

# JSON API Response

An API endpoint needs a consistent response shape. Windwalker wraps every
result in a `JsonBuffer` envelope, so clients read `success`, `code`, and
`data` the same way on every endpoint.

## Enabling the JSON API

Mark a controller method with `#[JsonApi]`:

```php
use Windwalker\Core\Attributes\JsonApi;

class UserController
{
    #[JsonApi]
    public function show(): array
    {
        return [
            'id' => 1,
            'name' => 'Simon',
        ];
    }
}
```

The method returns a plain array. The middleware encodes the response with
HTTP 200 and an envelope similar to this:

```json
{
    "status": 200,
    "message": "",
    "data": {
        "id": 1,
        "name": "Simon"
    },
    "success": true,
    "code": 200
}
```

## How the envelope is built

`JsonApiMiddleware` decides what to wrap:

```php
use Windwalker\Core\Attributes\JsonApi;
use Windwalker\Http\Response\JsonResponse;
use Windwalker\Http\Response\RedirectResponse;

class UserController
{
    // Plain value: placed in "data" with HTTP 200
    #[JsonApi]
    public function plain(): array
    {
        return ['id' => 1];
    }

    // JsonResponse: keeps its status code; its body becomes "data"
    #[JsonApi]
    public function created(): JsonResponse
    {
        return new JsonResponse(['id' => 10], 201);
    }

    // Redirect: returned unchanged, not wrapped
    #[JsonApi]
    public function redirect(): RedirectResponse
    {
        return new RedirectResponse('/users');
    }
}
```

A response with a non-JSON `Content-Type` is also returned unchanged.
Attachment responses use `application/octet-stream` by default, so they
pass through the same way:

```php
use Windwalker\Core\Attributes\JsonApi;
use Windwalker\Http\Response\AttachmentResponse;

#[JsonApi]
public function export(): AttachmentResponse
{
    $file = \Windwalker\fs('users.csv')->getStream();

    return (new AttachmentResponse($file))
        ->withFilename('users.csv')
        ->withContentType('text/csv');
}
```

Because redirects and attachments skip both the envelope and the JSON
headers, when you have multiple routes wrapped in `JsonApiMiddleware` scope, 
you can still return these responses without breaking the API.

Return a `JsonResponse` when you need a specific status code:

```php
use Windwalker\Http\Response\JsonResponse;

#[JsonApi]
public function create(): JsonResponse
{
    return new JsonResponse(['id' => 10], 201);
}
```

## Messages

Flash messages stored in the session are added to `message`, joined with
new lines. A redirect or an earlier request can set a notice that the API
then returns to the client.

## JSON without the envelope

Use `#[Json]` when an endpoint must return plain JSON without the
`JsonBuffer` envelope:

```php
use Windwalker\Core\Attributes\Json;

#[Json]
public function list(): array
{
    return ['apples', 'oranges'];
}
```

`#[Json]` applies `JsonResponseMiddleware`. Errors still use the error
format described in [Error Handling and Error Codes](./error-codes.md).
