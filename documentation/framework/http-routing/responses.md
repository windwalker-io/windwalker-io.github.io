---
layout: doc
title: Responses
---

# Responses

## Overview

A controller returns a value, and the framework turns it into the HTTP
response that the client receives. The value can be a plain string or
array, or a response object that you build yourself. Both paths produce
a PSR-7 `ResponseInterface`, so the framework handles them the same way.

The response layer has four parts:

- `AppContext::anyToResponse()`: converts a returned value into a
  response.
- `response()`: a global helper that returns a builder with one method
  per response type.
- The response classes in `Windwalker\Http\Response`, such as
  `JsonResponse`, `AttachmentResponse`, and `RedirectResponse`.
- `#[Json]` and `#[JsonApi]`: attributes that wrap a method's return
  value in JSON. `JsonApiMiddleware` applies the same format to a whole
  route group.

Redirect methods on `Navigator` are described in
[Navigation](/documentation/framework/http-routing/navigation#redirect-methods).
A controller can return one directly:

```php
<?php

/** @var Navigator $nav */

return $nav->redirectTo('front::post_show', ['id' => 42]);
```

Controller methods are described in
[Controllers](/documentation/framework/http-routing/controllers). A method
that returns a value is shown there with a route:

```php
<?php

public function ping(): string
{
    return 'pong';
}
```

## Returning a Value

A controller method can return a plain value. The framework converts it
with `AppContext::anyToResponse()`:

- `ResponseInterface`: sent as it is. Use it to set the status or the
  headers.
- `RouteUri`: a redirect response with status `303`. Call `withStatus()`
  on the `RouteUri` to change it.
- `UriInterface`: a redirect response to that URL, with status `303`.
- String: sent as the body, with status `200`.
- Array or object: encoded as JSON.
- Other scalar values: cast to a string. `null` gives an empty body.

```php
<?php

public function ping(): string
{
    return 'pong';
}

public function stats(): array
{
    return ['posts' => 12];
}
```

::: info
A string or an array is sent without a `Content-Type` header. Return a
builder response when the client depends on the header.
:::

## Showcase: A Post Controller

The following example uses several response types in one controller. It
runs end to end when you load the route file from `routes/front/`.

The route file binds each route to a method:

```php
<?php

declare(strict_types=1);

namespace App\Routes;

use App\Module\Front\Post\PostController;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('post')
    ->prefix('/post')
    ->namespace('post')
    ->register(function (RouteCreator $router) {
        $router->get('post_index', '/')
            ->handler(PostController::class, 'index');

        $router->get('post_export', '/export')
            ->handler(PostController::class, 'export');

        $router->get('post_show', '/{id:\d+}')
            ->handler(PostController::class, 'show');

        $router->save('post_store', '/')
            ->handler(PostController::class, 'store');
    });
```

The controller returns a different response object for each method:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Psr\Http\Message\ResponseInterface;
use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\JsonApi;
use Windwalker\Core\Router\Navigator;
use Windwalker\Core\Router\RouteUri;
use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

#[Controller]
class PostController
{
    // The array is wrapped in the JSON API envelope.
    #[JsonApi]
    public function index(PostRepository $posts): array
    {
        return ['posts' => $posts->all()];
    }

    // A file download, built with the response builder.
    public function export(PostRepository $posts): ResponseInterface
    {
        $csv = "id,title\n";

        foreach ($posts->all() as $post) {
            $csv .= $post->id . ',' . $post->title . "\n";
        }

        return response()->attachment()
            ->withFileData($csv, 'text/csv')
            ->withFilename('posts.csv');
    }

    // A JSON response with an explicit 404 status.
    public function show(string $id, PostRepository $posts): JsonResponse
    {
        $post = $posts->find((int) $id);

        if (!$post) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json($post);
    }

    // A RouteUri becomes a 303 redirect to the new post.
    public function store(Navigator $nav): RouteUri
    {
        // Save the post here, then redirect to its page.
        $id = 4;

        return $nav->to('post::post_show')->id($id);
    }
}
```

Requests against these routes return:

```text
GET  /post/          200  {"message":"","data":{"posts":[...]},...}
GET  /post/export    200  text/csv, Content-Disposition: attachment
GET  /post/42        200  {"id":42,...}
GET  /post/7         404  {"error":"Not found"}
POST /post/          303  Location: /post/4
```

`PostRepository` is your own class. The response classes do not depend
on it.

## Response Builder

`response()` is a global helper in the `Windwalker` namespace. It returns
a builder that creates the response object. The builder sends nothing by
itself. Return the object from the method, and the framework sends it.

The builder methods are:

- `json()`: `JsonResponse`, which encodes arrays and objects.
- `html()`: `HtmlResponse`.
- `text()`: `TextResponse`.
- `xml()`: `XmlResponse`.
- `empty()`: `EmptyResponse`, with status `204` by default.
- `redirect()`: `RedirectResponse`, with status `303` by default.
- `redirectOutside()`: `OutsideRedirectResponse`, which skips the
  location check. See [Redirect Responses](#redirect-responses).
- `attachment()`: `AttachmentResponse`. See
  [File Downloads](#file-downloads).
- `response()`: a plain `Response`.

Every method accepts the body, the status, and the headers as arguments.
Pass `null` for the status to use the default:

```php
<?php

use function Windwalker\response;

return response()->json(
    ['id' => 42],
    201,
    ['X-Request-Id' => 'abc'],
);
```

You can also set the status and the headers on the returned object. The
object is a PSR-7 response, so `withStatus()` and `withHeader()` chain:

```php
<?php

return response()->text('Created')
    ->withStatus(201)
    ->withHeader('X-Request-Id', 'abc');
```

## Response Classes

Each builder method returns a class you can also create directly. Use
the builder in a controller, and the class when you need its methods.

### Text, HTML, and XML

`TextResponse`, `HtmlResponse`, and `XmlResponse` take a string body.
Each sends its own `Content-Type` with `charset=utf-8`:

- `text/plain`: `response()->text()`.
- `text/html`: `response()->html()`.
- `application/xml`: `response()->xml()`.

```php
<?php

use function Windwalker\response;

return response()->html('<h1>Hello</h1>');

return response()->xml('<feed></feed>');
```

Pass a string, not an array. Use `json()` for data structures.

To send another type, call `withContentType()`. The class also has
`withContent()` to replace the body:

```php
<?php

use function Windwalker\response;

return response()->text("id,title\n4,Hello\n")
    ->withContentType('text/csv');
```

### Custom Content Types

Extend `TextResponse` to send a text-based type that the builder does not
cover. Set the `$type` property, as `JsonResponse` and `XmlResponse` do:

```php
<?php

namespace App\Http;

use Windwalker\Http\Response\TextResponse;

class CsvResponse extends TextResponse
{
    protected string $type = 'text/csv';
}
```

```php
<?php

return new CsvResponse("id,title\n4,Hello\n");
```

The `Content-Type` header is `text/csv; charset=utf-8`. Extend
`AbstractContentTypeResponse` instead when the body is not plain text,
and implement its `handleBody()` method to convert the string to a stream.

### JSON

`JsonResponse` encodes its body with `json_encode()`. It accepts JSON
flags as the fourth argument:

```php
<?php

use function Windwalker\response;

return response()->json(
    ['id' => 42, 'title' => 'Héllo'],
    200,
    [],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE,
);
```

A string that starts with `[`, `{`, or `"` is treated as JSON already,
and it is sent without encoding. Other strings are encoded:

```php
<?php

response()->json('{"ok":true}');  // Sent as it is.
response()->json('Hello');        // Sent as "Hello".
```

Invalid UTF-8 in the data throws a `JsonException`.

### Empty Responses

`EmptyResponse` sends no body. The status is `204` by default, and the
headers are still sent:

```php
<?php

use Windwalker\Http\Response\EmptyResponse;
use function Windwalker\response;

public function delete(string $id): EmptyResponse
{
    // Delete the post here.

    return response()->empty();
}
```

Use `response()->empty(202)` for another status.

### Redirect Responses

`RedirectResponse` sends a `Location` header and no body. The builder
uses `303` by default, and a status code is the second argument:

```php
<?php

use function Windwalker\response;

return response()->redirect('/post/42');

return response()->redirect('/post/42', 302);
```

A redirect returned from a controller is checked against the rule in
[Local Redirects](/documentation/framework/http-routing/navigation#local-redirects).
A `Location` that is not local is replaced with the app root:

```php
<?php

use function Windwalker\response;

// Returned as-is: a local path.
return response()->redirect('/post/42');

// Replaced with the app root, because `//` is not local.
return response()->redirect('//evil.example/');
```

::: warning
The check applies only to a redirect that a controller returns. Use
`redirectOutside()` or `OutsideRedirectResponse` for an external URL,
such as a payment gateway, and only for URLs you trust:

```php
<?php

return response()->redirectOutside(
    'https://pay.example.com/checkout'
);
```
:::

A `RouteUri` from `Navigator` becomes a `RedirectResponse` too. Use
`withStatus()` to change its status:

```php
<?php

/** @var Navigator $nav */

return $nav->to('post::post_show')->id(42)->withStatus(302);
```

::: info
`Navigator::redirectInstant()` sends the redirect at once and ends the
request. The rest of the method does not run. Use it only when you
cannot return the response:

```php
<?php

/** @var Navigator $nav */

$nav->redirectInstant('/post/42');

// Not reached.
```

See [Navigation](/documentation/framework/http-routing/navigation#redirect-methods)
for all `Navigator` redirect methods.
:::

### File Downloads

`AttachmentResponse` sends a file as a download. The builder sets these
headers by default:

- `Content-Type: application/octet-stream`
- `Cache-Control: no-store, no-cache, must-revalidate`
- `Content-Transfer-Encoding: binary`
- `Content-Encoding: none`

`withFile()` streams a file from disk. It also sets the `Content-Length`
header. It throws an `InvalidArgumentException` when the path is not a
file:

```php
<?php

use Psr\Http\Message\ResponseInterface;
use function Windwalker\response;

public function receipt(
    int $id,
    ReportRepository $reports,
): ResponseInterface {
    $file = $reports->pathOf($id);

    return response()->attachment()
        ->withFile($file, 'application/pdf')
        ->withFilename('receipt-' . $id . '.pdf');
}
```

Use `withFileData()` for content that is already in memory, such as a
CSV string. It also accepts a `StreamInterface`:

```php
<?php

return response()->attachment()
    ->withFileData($csv, 'text/csv')
    ->withFilename('posts.csv');
```

`withFilename()` sets `Content-Disposition: attachment`, so the browser
downloads the file. Use `withInlineFilename()` to display the file in
the browser instead. Pass the MIME type to show a PDF:

```php
<?php

return response()->attachment()
    ->withFile($file, 'application/pdf')
    ->withInlineFilename('receipt.pdf');
```

`withPreviewable()` is a shortcut for inline display. It generates a
name when you pass none.

::: warning
Build the file path from a repository lookup, not from raw request
input. A path from the request can read any file the PHP process can
access.
:::

### Streaming with CallbackResponse

`CallbackResponse` lets your code write the body in chunks. The
constructor takes a callable, the status, and the headers. The callable
receives an `OutputInterface`, and its `write()` method sends a string
to the client:

```php
<?php

use Windwalker\Http\Output\OutputInterface;
use Windwalker\Http\Response\CallbackResponse;

public function export(ReportRepository $reports): CallbackResponse
{
    return new CallbackResponse(
        function (OutputInterface $output) use ($reports) {
            foreach ($reports->rows() as $row) {
                $output->write(implode(',', $row) . "\n");
            }
        },
        200,
        ['Content-Type' => 'text/csv'],
    );
}
```

The status and the headers are sent before the callable runs. After the
first write, you cannot change them.

### The Base Response Class

`Windwalker\Http\Response\Response` implements `ResponseInterface`. Use
it for a response that no other class covers:

```php
<?php

use Windwalker\Http\Response\Response;

return Response::fromString('OK', 202);
```

The static constructors are:

- `fromString()`: creates a response with a string body.
- `readFrom()`: creates a response that reads from a resource or stream.
- `from()`: copies another PSR-7 response into this class.

`withStatus()` accepts codes from `100` to `599` only. Any other code
throws an `InvalidArgumentException`.

### Status Code Helpers

`Windwalker\Http\Helper\ResponseHelper` provides static helpers for
status codes. Use them to read a response that you received, for
example from an HTTP client:

```php
<?php

use Windwalker\Http\Helper\ResponseHelper;

ResponseHelper::getPhrase(404);      // "Not Found"
ResponseHelper::isSuccess(204);      // true (200-299)
ResponseHelper::isRedirect(303);     // true (300-399)
ResponseHelper::isClientError(404);  // true (400-499)
ResponseHelper::isServerError(503);  // true (500-599)
```

`ResponseHelper::sendAttachment()` sends a file from outside a
controller. Inside a controller, return an `AttachmentResponse` instead.

### Helper Methods on Every Response

The base `Response` class uses `ResponseTrait`, so every response object
has these methods. They read the status code and the body:

- `isSuccess()`: the status is `200` to `299`.
- `isRedirect()`: the status is `300` to `399`.
- `isAuthError()`: the status is `400` to `499`. The name is historical;
  the check covers all client errors.
- `isServerError()`: the status is `500` to `599`.
- `isError()`: a server error or a client error.
- `getContent()`: the body as a string.
- `jsonDecode()`: the body decoded with `JSON_THROW_ON_ERROR`.
- `toArray()` and `decode()`: the body decoded with a format, such as
  `json`. `decode()` returns a `Collection`.
- `toException()`: builds an exception from the status code and the
  reason phrase. The default class is `HttpRequestException`.
- `throw()`: throws the exception and never returns.
- `throwIfError()`: throws the exception only for an error status.

```php
<?php

use Windwalker\Http\Response\Response;

$res = Response::fromString('{"id":42}', 200);

$data = $res->toArray();    // ['id' => 42]
$res->throwIfError();       // Does nothing: status is 200.
```

::: tip
Use `throwIfError()` after a remote call. It keeps the success path
short, and the exception carries the response for logging.
:::

### HTTP Client Responses

`HttpClientResponse` is the response object that the HTTP client returns.
`HttpClient::get()`, `post()`, and `request()` all return one. It extends
the base `Response`, so the methods above also apply:

```php
<?php

use Windwalker\Http\HttpClient;

$client = new HttpClient();

$res = $client->get('https://api.example.com/posts/42');
$res->throwIfError();

$post = $res->toArray();
```

The class adds these methods:

- `getInfo()`: transport information about the request. The keys depend
  on the transport. The cURL transport returns `curl_getinfo()` data.
- `getBodyString()`: rewinds the body, then returns it as a string. Use
  it when the body was already read, because `getContent()` does not
  rewind.
- `toCurlCmd()`: the equivalent `curl` command, for debugging. The client
  attaches it to the response it creates.

```php
<?php

$res = $client->get('https://api.example.com/posts/42');

$time = $res->getInfo()['total_time'] ?? null;
$curl = $res->toCurlCmd();
```

See [HTTP Client](/documentation/components/http/client#responses) for
the full client API, including async requests and the exception helpers.

## JSON Wrappers

The `#[Json]` and `#[JsonApi]` attributes change the format of a method's
return value. Both come from `Windwalker\Core\Attributes`.

### Plain JSON with #[Json]

`#[Json]` encodes the return value as plain JSON, without an envelope:

```php
<?php

use Windwalker\Core\Attributes\Json;

#[Json]
public function stats(): array
{
    return ['posts' => 12];
}
```

The body is `{"posts":12}`. A value that is not a response is sent as
a `JsonResponse` with status `200`. A response with a non-JSON
`Content-Type` is returned unchanged. Other responses are converted to
JSON.

### JSON API Format with #[JsonApi]

Prefer `#[JsonApi]` for a JSON endpoint. The method returns a plain
array or object, and the framework wraps it in the JSON API format:

```php
<?php

use Windwalker\Core\Attributes\JsonApi;

#[JsonApi]
public function show(string $id): array
{
    return ['id' => (int) $id, 'title' => 'Hello'];
}
```

```json
{
  "message": "",
  "data": { "id": 42, "title": "Hello" },
  "success": true,
  "code": 200,
  "status": 200
}
```

On an exception, the envelope carries `success: false`, and the HTTP
status is set from the exception's status code:

```php
<?php

use Windwalker\Core\Attributes\JsonApi;

#[JsonApi]
public function show(string $id): array
{
    throw new \RuntimeException('Post not found.', 404);
}
```

The [Exceptions](/documentation/framework/http-routing/exceptions#json-api-errors)
page describes how the message is chosen.

To apply the format to every method of a route group, add
`JsonApiMiddleware` to the group:

```php
<?php

use Windwalker\Core\Middleware\JsonApiMiddleware;
use Windwalker\Core\Router\RouteCreator;

$router->group('api')
    ->prefix('/api')
    ->middleware(JsonApiMiddleware::class)
    ->register(function (RouteCreator $router) {
        // Every route in this group returns the JSON API format.
    });
```

::: tip
Use `#[JsonApi]` for a single endpoint, and the group middleware for an
API area. Both render exceptions as JSON errors.
:::
