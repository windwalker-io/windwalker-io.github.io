---
layout: doc
title: Request & Input
---

# Request & Input

## Overview

Every request arrives as a PSR-7 `ServerRequestInterface`. Windwalker
wraps it in an `AppRequest`, which adds the values a web app needs: the
route variables, the query string, the parsed body, and uploaded files.

The input layer has three parts:

- `AppRequest`: the request object behind `AppContext`. It merges the
  input sources and exposes the typed readers.
- `input()` and `file()`: the readers you call on `AppContext`.
- Injection attributes, such as `#[Input]` and `#[QueryParam]`: they
  read a value from the request and pass it to a method parameter.

The [Request Lifecycle](/documentation/framework/core-concepts/request-lifecycle)
shows when the request is created and matched to a route. The
[HTTP Basics](/documentation/framework/http-routing/http-basics) page
introduces the PSR-7 objects. Uploaded files are covered on the
[Uploaded Files](/documentation/framework/http-routing/uploaded-files) page.

### Input Sources

The input has three sources:

- Route variables, such as `{id}` in `/article/{id}`.
- The query string, such as `?page=2`.
- The parsed body of a `POST`, `PUT`, or `PATCH` request.

When the same name appears in more than one source, the body wins over
the other two. A route variable wins over the query string, unless the
route variable is `null` or an empty string. Then the query value is used.
In the first example, the route variable wins over the query string, and
the body wins over both:

```text
Route:       /article/{id}   id = 1
Query:       ?id=2
Body:        id=3

input('id')  →  3
```

The next example has no route value, so the query value is used:

```text
Route:       /article/{id}   id = null
Query:       ?id=2

input('id')  →  2
```

## Showcase: An Article Controller

The following controller reads each source with the matching attribute.
It runs end to end when you register its routes:

```php
<?php

// routes/front/article.php

/** @var RouteCreator $router */

$router->fetch('article_list', '/article')
    ->handler(ArticleController::class, 'list');

$router->patch('article_update', '/article/{id}')
    ->handler(ArticleController::class, 'update');
```

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Article;

use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Attributes\Assert;
use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\BodyValue;
use Windwalker\Core\Attributes\Request\Header;
use Windwalker\Core\Attributes\Request\InputCompact;
use Windwalker\Core\Attributes\Request\QueryParam;
use Windwalker\Core\Attributes\Request\RouteParam;
use Windwalker\Data\Collection;
use Windwalker\Http\Response\JsonResponse;

#[Controller]
class ArticleController
{
    public function list(
        AppContext $app,
        #[QueryParam, Filter('int'), Assert('range(min: 1)')]
        ?int $page = null,
        #[QueryParam]
        ?string $q = null,
    ): JsonResponse {
        return new JsonResponse([
            'page' => $page ?? 1,
            'q' => $q,
        ]);
    }

    public function update(
        AppContext $app,
        #[RouteParam, Filter('int')]
        ?int $id = null,
        #[BodyValue]
        ?string $title = null,
        #[Header('X-Request-Id')]
        ?string $requestId = null,
        #[InputCompact('state', 'content')]
        Collection $data = new Collection(),
    ): JsonResponse {
        return new JsonResponse([
            'id' => $id,
            'title' => $title,
            'requestId' => $requestId,
            'data' => $data->dump(),
        ]);
    }
}
```

Requests against this controller return:

```text
GET   /article?page=2&q=php   200  {"page":2,"q":"php",...}
GET   /article?page=0         400  Bad Request
PATCH /article/42  (body: title=New)  200  {"id":42,"title":"New",...}
```

The `page` value is validated by `Assert`, so `page=0` fails with a
`400` response.

## Reading Input

### Reading with `input()`

`input()` is the most direct reader. It uses the merged input from all
sources. Call it without arguments to get a `Collection` of everything:

```php
<?php

$all = $app->input();

$all->get('q');
```

Pass one field name to get its value, or several names to get a
`Collection` keyed by field name:

```php
<?php

$q = $app->input('q');

$params = $app->input('q', 'page')->dump();
```

Pass named arguments to validate the input. Each name is a field, and
each value is a filter and assert syntax. A failed rule throws
`ValidateFailException`, which carries status code `400`. See
[Validation & Filter](/documentation/framework/http-routing/validation-and-filter#validating-input-by-name):

```php
<?php

$data = $app->input(
    page: 'int|range(min: 1)',
    q: 'string',
)->dump();
```

::: warning
`input()` without arguments returns every field the client sent. Do not
pass it straight to an entity or a `save()` call. Name the fields you
accept, so a client cannot set columns you did not intend to expose.
:::

### Reading by Method

`AppRequest::inputWithMethod()` reads from one source. Pass `GET` for the
query string, `POST` for the body, or `REQUEST` for the merged input.
Given an `AppRequest` object named `$appRequest`:

```php
<?php

// Query string only:
$page = $appRequest->inputWithMethod('GET', 'page');

// Body only:
$title = $appRequest->inputWithMethod('POST', 'title');
```

Use it when you need a source that the merged input would mix with
another one.

## Injecting Input

Injection attributes read a value and pass it to a method parameter. Use
them in controllers, view `prepare()` methods, and other services that
the container creates.

### Input Attribute

`#[Input]` reads from the merged input. Without a name, it uses the
parameter name:

```php
<?php

// Reads the "id" input.
public function show(#[Input] string $id): JsonResponse
{
    //
}
```

Pass a name to read a different input than the parameter name:

```php
<?php

// Reads the "article_id" input.
public function show(#[Input('article_id')] string $id): JsonResponse
{
    //
}
```

### Source-Specific Attributes

Use the source-specific attributes when only one source should be read:

- `#[QueryParam]`: reads the query string. A route variable with the same
  name wins, unless it is `null` or an empty string.
- `#[BodyValue]`: reads the parsed body only.
- `#[RouteParam]` (or its alias `#[UrlVar]`): reads route variables only.
- `#[Header('Name')]`: reads a request header.
- `#[InputCompact('a', 'b')]`: reads several fields into a `Collection`.

```php
<?php

public function update(
    #[RouteParam] string $id,
    #[BodyValue] string $title,
): JsonResponse {
    //
}
```

::: warning
`#[Input]` reads the merged input, so a body value replaces a route variable
or a query value with the same name. When the source matters, use
`#[QueryParam]` or `#[BodyValue]` instead.
:::

### Defaults and Required Parameters

A parameter without a default must receive a value. If the request does
not supply it, Windwalker throws a `RuntimeException` with status code
`400`. Make the parameter nullable or give it a default when the field is
optional:

```php
<?php

// Required: a missing "title" returns 400.
#[BodyValue] string $title,

// Optional: a missing "title" becomes null.
#[BodyValue] ?string $title = null,
```

::: info
`#[Header]` returns an empty string when the header is missing. A
nullable parameter then receives `''`, not `null`.
:::

## Validating and Filtering Input

Filters transform a value, and asserts and required checks reject invalid
values. Attach them to an injected parameter, with the input attribute first:

```php
<?php

use Windwalker\Core\Attributes\Assert;
use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\Input;
use Windwalker\Core\Attributes\Required;

public function search(
    #[Input, Required, Filter('string')]
    string $q,
    #[Input, Filter('int'), Assert('range(min: 1)')]
    ?int $page = null,
): JsonResponse {
    //
}
```

The rules, the failure messages, and the order of the steps are covered on
the [Validation & Filter](/documentation/framework/http-routing/validation-and-filter) page.

## Request Objects

### PSR-7 and AppRequest

Windwalker has two request layers:

- The PSR-7 request, returned by `$app->getServerRequest()`. It holds
  the raw values from the server.
- `AppRequest`, returned by `$app->getAppRequest()`. It adds the route
  variables and the merged input, and it provides the readers in this
  page.

```php
<?php

// Raw query string only, without route variables:
$raw = $app->getServerRequest()->getQueryParams();

// Query string plus route variables:
$values = $app->getQueryValues();
```

::: warning
`getServerRequest()->getQueryParams()` does not include route variables.
A value such as `{id}` appears only in `$app->input('id')` or
`$app->getUrlVars()`.
:::

`AppContext` delegates to `AppRequest` for `input()`, `file()`,
`getQueryValues()`, `getBodyValues()`, `getUrlVars()`, and `getHeader()`.
Use those methods in controllers. Call `getAppRequest()` only for a method
that `AppContext` does not expose, such as `getOverrideMethod()`.

Both layers are immutable. Each `with*()` method returns a new object, so
keep the returned value. `AppRequest::withRequest()` and
`withUrlVars()` also clear the cached input:

```php
<?php

$request = $app->getServerRequest()->withHeader('X-Debug', '1');

$request = $app->getAppRequest()->withUrlVars(['id' => '7']);
```

### The AppRequest Object

`AppRequest` (`Windwalker\Core\Http\AppRequest`) is the object behind
`input()`, `file()`, and the other readers. It wraps the PSR-7 request and
adds the parts that only the framework knows: the `SystemUri`, the matched
route, and the merged input. Its constructor takes the PSR-7 request, the
`SystemUri`, a `ProxyResolver` for the client address, and a
`RequestInspector` for content negotiation.

The web provider creates one `AppRequest` for each request, and
`AppContext::getAppRequest()` returns it. The object is request-scoped, so
its cached input and matched route do not leak into the next request.

The class is immutable from outside. Change it through the `with*()`
methods, which return a clone.

#### Merged Input Is Cached

The first call to `input()` builds the merged input. It merges the route
variables, the query string, and the parsed body, and keeps the result.
Later reads reuse it.

`withRequest()` and `withUrlVars()` clear the cache. `getInput()` returns the
cached array without building it. Before the first read, it returns an empty
array:

```php
<?php

$appRequest = $app->getAppRequest();

$appRequest->getInput(); // [] until the first input read
$appRequest->input('q');
$appRequest->getInput(); // ['q' => ...]
```

#### Listening to Value Reads

Each source is read through an event. `AppRequest` emits
`Windwalker\Core\Http\Event\RequestGetValueEvent` on its own dispatcher
for these types:

- `TYPE_QUERY`: the query string.
- `TYPE_URL_VARS`: the route variables. Emitted only when a route matched.
- `TYPE_BODY`: the parsed body.

The event has public `$values` and `$type` properties. A listener can
change `$values`, and the change applies to every later reader. The
following middleware trims the `q` query parameter for every request:

```php
<?php

// src/Middleware/TrimSearchMiddleware.php
namespace App\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Http\Event\RequestGetValueEvent;

class TrimSearchMiddleware implements MiddlewareInterface
{
    public function __construct(protected AppContext $app) {}

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $this->app->getAppRequest()->getEventDispatcher()
            ->on(
                RequestGetValueEvent::class,
                function (RequestGetValueEvent $event) {
                    if (
                        $event->type === RequestGetValueEvent::TYPE_QUERY
                    ) {
                        $q = (string) ($event->values['q'] ?? '');

                        $event->values['q'] = trim($q);
                    }
                }
            );

        return $handler->handle($request);
    }
}
```

::: warning
Attach the listener before the first input read. After the first read, the
merged input is cached, and the listener cannot change the values that were
already merged.
:::

::: info
The listener changes only the values that `AppRequest` reads. The PSR-7
request from `getServerRequest()` is not changed.
:::

#### Other Members

Besides the readers in this page, `AppRequest` exposes:

- `getUri()` and `getMethod()`: the PSR-7 URI and the method the client
  sent.
- `getSystemUri()`: the request URI split into base and route. See
  [HTTP Basics](/documentation/framework/http-routing/http-basics#systemuri):

  ```php
  <?php

  $uri = $app->getSystemUri();

  echo $uri->root;  // https://example.com/shop/
  echo $uri->route; // front/post/42/
  ```

- `getMatchedRoute()`: the route that matched, or `null` before routing.
- `getClientIP()`: the client address. See
  [Client IP Address](#client-ip-address).
- `isAccept()`, `isAcceptJson()`, and `isApiCall()`: content negotiation,
  delegated to `RequestInspector`.

## Headers and Bodies

### Request Headers

`getHeader()` returns one header as a string. It returns `''` when the
header is missing:

```php
<?php

$requestId = $app->getHeader('X-Request-Id');
```

Header names are case-insensitive, so `x-request-id` reads the same
header.

### JSON and Form Bodies

Windwalker decodes the body from the `Content-Type` header:

- `application/json`: the body is decoded into an array. The decoding
  happens on the first read of the body. Invalid JSON throws a
  `JsonException` at that point.
- `application/x-www-form-urlencoded` and `multipart/form-data`: each
  field is a string.

For `POST`, PHP fills the form body from `$_POST`. For `PUT`, `PATCH`, and
`DELETE`, Windwalker parses the form body itself.

Read both formats the same way. `input()` and `#[Input]` read JSON
fields too, because the merged input includes the body. Use
`#[BodyValue]` for a body-only value, and a dot path for a nested JSON
value:

```php
<?php

// Request body: {"title": "Hello", "author": {"name": "Ann"}}

public function store(
    #[BodyValue] string $title,
    #[BodyValue('author.name')] string $author,
): JsonResponse {
    //
}
```

JSON keeps the type of each value, so `true` and `3` stay as they are.
Form fields are always strings. Add a `Filter` when a value can come from
either format:

```php
<?php

#[BodyValue, Filter('int')]
?int $count = null,
```

::: warning
Windwalker decodes a body only when `Content-Type` is `application/json`.
If a client sends JSON with another content type, the body is not
decoded, and no error is raised. Your input is then empty.
:::

## Client IP and Method Override

### Client IP Address

`getClientIP()` returns the client's IP address. It is defined on
`AppRequest`, so get the object with `getAppRequest()`:

```php
<?php

$ip = $app->getAppRequest()->getClientIP();
```

By default, the result is the `REMOTE_ADDR` of the server connection.
Behind a reverse proxy, the real client is in the `X-Forwarded-For`
header. Windwalker reads that header only when both settings allow it:

- `http.trusted_headers` lists `x-forwarded-for`.
- `http.trusted_proxies` lists the address of your proxy, through
  `PROXY_TRUSTED_IPS`.

```php
<?php

// etc/app/main.config.php
'http' => [
    'trusted_proxies' => env('PROXY_TRUSTED_IPS'),
    'trusted_headers' => [
        'x-forwarded-for',
    ],
],
```

::: warning
When the connecting address is not in `trusted_proxies`, `getClientIP()`
returns `REMOTE_ADDR`, and a client-sent `X-Forwarded-For` header has no
effect. Add a proxy to `trusted_proxies` only when you control it. A broad
range in that list lets a client spoof its IP.
:::

### Request Method and Override

`getMethod()` returns the HTTP method the client sent. HTML forms can
send only `GET` and `POST`, so Windwalker reads an override from the
request. `getOverrideMethod()` checks these sources in order:

- The `X-Http-Method-Override` header.
- A `_method` field in the parsed body.
- A `_method` query parameter.

If none is present, it returns the real method. `getMethod()` always
returns the method the client sent. A form that needs `DELETE` sends a
hidden `_method` field:

```blade
<form method="post" action="/article/42">
    <input type="hidden" name="_method" value="DELETE">
    <button type="submit">Delete</button>
</form>
```

## Attribute Reference

| Attribute | Reads from | Section |
| --- | --- | --- |
| `#[Input]` | Merged input: route variables, query string, body | [Input Attribute](#input-attribute) |
| `#[QueryParam]` | Query string; a non-null route variable of the same name wins | [Source-Specific Attributes](#source-specific-attributes) |
| `#[BodyValue]` | Parsed body only | [Source-Specific Attributes](#source-specific-attributes) |
| `#[RouteParam]` / `#[UrlVar]` | Route variables only | [Source-Specific Attributes](#source-specific-attributes) |
| `#[Header('Name')]` | One request header, `''` when missing | [Source-Specific Attributes](#source-specific-attributes) |
| `#[InputCompact('a', 'b')]` | Several fields, as a `Collection` | [Showcase](#showcase-an-article-controller) |
| `#[File]` | Uploaded file | [Uploaded Files](/documentation/framework/http-routing/uploaded-files) |
| `#[Filter(...)]` | Transforms the value, in order | [Validation & Filter](/documentation/framework/http-routing/validation-and-filter#filters) |
| `#[Assert('rule')]` | Checks the value, skips `null` by default | [Validation & Filter](/documentation/framework/http-routing/validation-and-filter#asserts) |
| `#[Required]` | Checks that the value is present | [Validation & Filter](/documentation/framework/http-routing/validation-and-filter#required) |
| `#[MapTo(Class)]` | Converts the value to an enum, object, or entity | [Validation & Filter](/documentation/framework/http-routing/validation-and-filter#mapping-values-with-mapto) |
