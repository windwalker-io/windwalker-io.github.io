---
layout: doc
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

## Where Input Comes From

The input has three sources:

- Route variables, such as `{id}` in `/article/{id}`.
- The query string, such as `?page=2`.
- The parsed body of a `POST`, `PUT`, or `PATCH` request.

When the same name appears in more than one source, the later source
wins. The order is route variables, then query string, then body:

```text
Route:       /article/{id}   id = 1
Query:       ?id=2
Body:        id=3

input('id')  →  3
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
use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\BodyValue;
use Windwalker\Core\Attributes\Request\Header;
use Windwalker\Core\Attributes\Request\InputCompact;
use Windwalker\Core\Attributes\Request\QueryParam;
use Windwalker\Core\Attributes\Request\RouteParam;
use Windwalker\Core\Controller\Controller;
use Windwalker\Data\Collection;
use Windwalker\Http\Response\JsonResponse;

class ArticleController extends Controller
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

## Reading Input with `input()`

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
`ValidateFailException`, which carries status code `400`:

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

## Injecting Input into Parameters

Injection attributes read a value and pass it to a method parameter. Use
them in controllers, view `prepare()` methods, and other services that
the container creates.

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

Use the source-specific attributes when only one source should be read:

- `#[QueryParam]`: reads the query string and route variables only.
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
`#[Input]` reads the merged input, so a body value can replace a query
value with the same name. When the source matters, use `#[QueryParam]`
or `#[BodyValue]` instead.
:::

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

`Filter` transforms a value. `Assert` checks it. `Required` checks that a
value is present. Attach them to an injected parameter, with the input
attribute first:

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

Filters run in the order you list them. A string such as `'int'` calls
the filter service. Pass the filter syntax as a string, and keep the
filter and the assert on the same parameter.

If you are on PHP 8.5 or later, you can also pass first-class callables
such as `trim(...)`. Chain several callbacks in one `Filter`. They run
from left to right:

```php
<?php

use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\Input;

public function tag(
    #[Input, Filter(trim(...), strtolower(...), strip_tags(...))]
    ?string $tag = null,
): JsonResponse {
    //
}
```

With the input `" <b>PHP</b> "`, the value becomes `"php"`. Each
callback receives the output of the previous one.

If you are on PHP 8.6 or later, you can use partial function application.
A `?` marks the argument that receives the value:

```php
<?php

use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\Input;

public function slug(
    #[Input, Filter(trim(?), str_replace(' ', '-', ?), strtolower(?))]
    ?string $slug = null,
): JsonResponse {
    //
}
```

With the input `"  Hello World PHP "`, the value becomes
`"hello-world-php"`.

See the [Filter](/documentation/components/filter/) component for every
filter and assert rule.

A failed `Assert` throws a `ValidateException`. The message is
`Invalid type of field "page"`, and it adds the rule detail in debug mode.
A missing `Required` value throws `Field "q" is required.`.

::: warning
`Assert` skips `null` by default, because its `$nullable` argument
defaults to `true`. A `null` value passes without a check. Add `Required`
when the field must be present.
:::

## Request Objects

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

## Request Headers

`getHeader()` returns one header as a string. It returns `''` when the
header is missing:

```php
<?php

$requestId = $app->getHeader('X-Request-Id');
```

Header names are case-insensitive, so `x-request-id` reads the same
header.

## JSON and Form Bodies

Windwalker decodes the body from the `Content-Type` header:

- `application/json`: the body is decoded into an array. The decoding
  happens on the first read of the body. Invalid JSON throws a
  `JsonException` at that point.
- `application/x-www-form-urlencoded` and `multipart/form-data`: each
  field is a string.

For `POST`, PHP fills the form body from `$_POST`. For `PUT`, `PATCH`, and
`DELETE`, Windwalker parses the form body itself.

Read both formats the same way. Use `#[BodyValue]` for a body-only value,
and a dot path for a nested JSON value:

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

## Request Method and Override

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

## Reading by Method

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

## Attribute Reference

| Attribute | Reads from | Section |
| --- | --- | --- |
| `#[Input]` | Merged input: route variables, query string, body | [Injecting Input](#injecting-input-into-parameters) |
| `#[QueryParam]` | Query string and route variables | [Injecting Input](#injecting-input-into-parameters) |
| `#[BodyValue]` | Parsed body only | [JSON and Form Bodies](#json-and-form-bodies) |
| `#[RouteParam]` / `#[UrlVar]` | Route variables only | [Injecting Input](#injecting-input-into-parameters) |
| `#[Header('Name')]` | One request header, `''` when missing | [Injecting Input](#injecting-input-into-parameters) |
| `#[InputCompact('a', 'b')]` | Several fields, as a `Collection` | [Showcase](#showcase-an-article-controller) |
| `#[File]` | Uploaded file | [Uploaded Files](/documentation/framework/http-routing/uploaded-files) |
| `#[Filter(...)]` | Transforms the value, in order | [Validating and Filtering Input](#validating-and-filtering-input) |
| `#[Assert('rule')]` | Checks the value, skips `null` by default | [Validating and Filtering Input](#validating-and-filtering-input) |
| `#[Required]` | Checks that the value is present | [Validating and Filtering Input](#validating-and-filtering-input) |
