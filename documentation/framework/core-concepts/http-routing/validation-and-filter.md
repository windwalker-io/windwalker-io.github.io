---
layout: doc
title: Validation & Filter
---

# Validation & Filter

## Overview

Validation checks request values before your code uses them. A value passes
through three steps: a filter transforms it, an assert checks it, and a
required check makes sure it is present. You can attach these steps to a
controller parameter, or check several fields by name with `input()`.

The validation layer has four parts:

- `#[Filter]`: transforms a value. It runs before the check.
- `#[Assert]`: checks a value and throws `ValidateException`.
- `#[Required]`: an assert that also rejects `null`.
- Named `input()` rules: filter and assert several fields in one call. A
  failed rule throws `ValidateFailException`.

The rule syntax comes from the
[Filter](/documentation/components/filter/) component. [Request & Input](/documentation/framework/core-concepts/http-routing/request-and-input)
explains how the values are read:

```php
<?php

use Windwalker\Core\Attributes\Request\Input;

public function search(
    #[Input, Filter('int'), Assert('range(min: 1)')]
    ?int $page = null,
): JsonResponse {
    //
}
```

The [Exceptions](/documentation/framework/core-concepts/http-routing/exceptions) page
explains how exceptions become responses.

For conditions that are not field rules, such as a missing record or a
permission check, use `RequestAssert`. See
[Asserting Request Conditions](#asserting-request-conditions).

## Showcase: A Search Method

The method below validates two query parameters. It runs end to end when a
route points to it:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Assert;
use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\QueryParam;
use Windwalker\Core\Attributes\Required;
use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

#[Controller]
class PostController
{
    public function search(
        #[QueryParam, Required, Filter('string')]
        ?string $q = null,
        #[QueryParam, Filter('int'), Assert('range(min: 1)')]
        ?int $page = null,
    ): JsonResponse {
        return response()->json(['q' => $q, 'page' => $page ?? 1]);
    }
}
```

Requests against this method return:

```text
GET /post/search?q=php&page=2   200
GET /post/search?q=php&page=0   400
GET /post/search?page=2         400
```

The `page` value fails the `range` rule, and the missing `q` fails
`Required`. Both checks throw exceptions with status `400`. On a `GET`
request, the error page renders. On a form request, the user is redirected
back with a warning. See [Failures](#failures) below.

## Filters

Filters run in the order you list them. A string such as `'int'` calls the
filter service. Keep the filter and the assert on the same parameter:

```php
<?php

use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\Input;

public function tag(
    #[Input, Filter('alnum')]
    ?string $tag = null,
): JsonResponse {
    //
}
```

Use a `|` between rules in one string. The filter component documents every
rule.

If you are on PHP 8.5 or later, you can also pass first-class callables
such as `trim(...)`. Chain several callbacks in one `Filter`. They run from
left to right:

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

With the input `" <b>PHP</b> "`, the value becomes `"php"`. Each callback
receives the output of the previous one.

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

With the input `"  Hello World PHP "`, the value becomes `"hello-world-php"`.

## Asserts

`#[Assert]` takes a rule string and checks the value. The rules are the
same as the filter rules, such as `range`, `length`, `email`, and `regex`:

```php
<?php

use Windwalker\Core\Attributes\Assert;
use Windwalker\Core\Attributes\Request\BodyValue;

public function store(
    #[BodyValue, Assert('email')]
    ?string $email = null,
    #[BodyValue, Assert('length(max: 100)')]
    ?string $title = null,
): JsonResponse {
    //
}
```

A failed assert throws a `ValidateException` with status `400`. The message
is `Invalid type of field "title"`. Debug mode adds the rule detail to it.

::: warning
`Assert` skips `null` by default, because its `$nullable` argument defaults
to `true`. A `null` value passes without a check. Add `Required` when the
field must be present.
:::

`Assert` is repeatable, so one parameter can have several asserts. Each one
is checked in order.

### Required

`#[Required]` is an assert that rejects `null`. A missing value throws
`ValidateException` with the message `Field "q" is required.`:

```php
<?php

use Windwalker\Core\Attributes\Filter;
use Windwalker\Core\Attributes\Request\QueryParam;
use Windwalker\Core\Attributes\Required;

public function search(
    #[QueryParam, Required, Filter('string')]
    ?string $q = null,
): JsonResponse {
    //
}
```

::: info
A parameter without a default value and without `?` fails before `Required`
runs. The framework throws `Field "q" is missing in request.` with status
`400`. Declare the parameter as nullable with a default, as the example
above does, so that `Required` produces its own message.
:::

## Mapping Values with MapTo

`#[MapTo]` converts a value to a class before your method receives it. Use
it when a field should become an enum, a plain object, or an entity instead
of a string or array.

Attributes run in the order you list them. Put `#[MapTo]` after the source
attribute and any filter, so it converts the cleaned value.

### Enums

Pass a backed enum class. A value that is not a valid backing value throws
a `ValueError`:

```php
<?php

use Windwalker\Core\Attributes\MapTo;
use Windwalker\Core\Attributes\Request\BodyValue;

public function save(
    #[BodyValue, MapTo(PostStatus::class)]
    PostStatus $status,
): JsonResponse {
    //
}
```

### Objects

An array becomes an object of the given class. Keys are matched to the
properties, and the values are cast to the property types. A body with
`{"address": {"city": "Taipei", "zip": "100"}}` gives `$address->zip` the
integer `100`:

```php
<?php

use Windwalker\Core\Attributes\MapTo;
use Windwalker\Core\Attributes\Request\BodyValue;

public function save(
    #[BodyValue, MapTo(Address::class)]
    ?Address $address = null,
): JsonResponse {
    //
}
```

### Entities

For an entity class, the ORM creates the entity and hydrates it from the
array:

```php
<?php

use Windwalker\Core\Attributes\MapTo;
use Windwalker\Core\Attributes\Request\BodyValue;

public function save(
    #[BodyValue, MapTo(Article::class)]
    ?Article $article = null,
): JsonResponse {
    //
}
```

### Try Mode

`try: true` returns `null` instead of throwing when a value cannot be
mapped. Use it for optional fields:

```php
<?php

use Windwalker\Core\Attributes\MapTo;
use Windwalker\Core\Attributes\Request\BodyValue;
use Windwalker\Core\Attributes\Required;

public function save(
    #[BodyValue, MapTo(PostStatus::class, try: true), Required]
    ?PostStatus $status = null,
): JsonResponse {
    //
}
```

::: warning
With `try: true`, an invalid value becomes `null` without an error. List
`Required` after `MapTo`, as above, so a value that cannot be mapped is
rejected. Without it, the method receives `null` silently.
:::

`nullable` defaults to `true`, so a `null` value skips the conversion.

### Custom Mappings

Add a handler to `MapTo::$mapHandlers` for a class that the built-in rules
do not cover. A handler returns `null` when it does not apply. Register
handlers once during application bootstrap:

```php
<?php

use Windwalker\Core\Attributes\MapTo;
use Windwalker\DI\Attributes\AttributeHandler;

MapTo::$mapHandlers[] = function (
    mixed $value,
    MapTo $attribute,
    AttributeHandler $handler,
): mixed {
    if ($attribute->className !== Money::class) {
        return null;
    }

    return Money::fromString((string) $value);
};
```

::: info
Enums and entities are handled before custom handlers, so a handler is
never called for them. Custom handlers run before the default object
conversion.
:::

## Validating Input by Name

`input()` accepts named arguments. Each name is a field, and each value is a
rule string. Rules in one string are joined with `|`:

```php
<?php

use Windwalker\Core\Application\AppContext;

public function save(AppContext $app): mixed
{
    $data = $app->input(
        page: 'int|range(min: 1)',
        q: 'required|string',
    )->dump();

    return $data;
}
```

A failed rule throws `ValidateFailException` with status `400`. Unlike
`#[Assert]`, its message is the validator message in every mode. The next
section explains how the framework handles it.

## Failures

A failed rule throws an exception. A `ValidateFailException` from `input()`,
or a `ValidateException` from `#[Assert]` and `#[Required]`, is then handled
as described on the [Exceptions](/documentation/framework/core-concepts/http-routing/exceptions)
page. A form request redirects back with a warning, and a `GET` request
renders the error page.

You can throw the same exception from your own check, such as a lookup that
a field rule cannot do:

```php
<?php

use Windwalker\Core\Form\Exception\ValidateFailException;

if (!$posts->existsBySlug($slug)) {
    throw new ValidateFailException('Unknown post slug.', 400);
}
```

The [Exceptions](/documentation/framework/core-concepts/http-routing/exceptions#throwing-validation-errors)
page shows how to pass several messages and when to catch the exception.

## Asserting Request Conditions

Field rules check values. `RequestAssert` checks other conditions in your
code, such as whether a record exists or the user may change it. When the
condition is false, it throws an exception whose code is the HTTP status.

`RequestAssert` has four methods. Each one takes the same arguments:
`$assertion`, `$message`, `$value`, and `$exception`.

- `assertBadRequest()`: status `400`, default message `Bad Request`.
  Throws `HttpRequestException`.
- `assertUnauthorized()`: status `401`, default message `Unauthorized`.
  Throws `UnauthorizedException`.
- `assertForbidden()`: status `403`, default message `Forbidden`. Throws
  `UnauthorizedException`.
- `assertNotFound()`: status `404`, default message `Not found`. Throws
  `RouteNotFoundException`.

### Checking a Record

When the assertion passes, the method returns `$assertion` unchanged. Assign
the result to use the value directly:

```php
<?php

use Windwalker\Core\Http\RequestAssert;
use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

public function show(string $id, PostRepository $posts): JsonResponse
{
    $post = RequestAssert::assertNotFound(
        $posts->find((int) $id),
        'Post not found.',
    );

    return response()->json($post);
}
```

### Checking Access

Check the sign-in state and ownership before you change a record. The
`$currentUserId` value comes from your auth layer:

```php
<?php

use Windwalker\Core\Http\RequestAssert;
use Windwalker\Http\Response\JsonResponse;
use function Windwalker\response;

public function update(
    string $id,
    PostRepository $posts,
    ?int $currentUserId = null,
): JsonResponse {
    RequestAssert::assertUnauthorized(
        $currentUserId !== null,
        'Please sign in to edit a post.',
    );

    $post = RequestAssert::assertNotFound(
        $posts->find((int) $id),
        'Post not found.',
    );

    RequestAssert::assertForbidden(
        $post->authorId === $currentUserId,
        'You can only edit your own posts.',
    );

    // Update the post here.

    return response()->json($post);
}
```

### Checking a Value

Use `{value}` and `{type}` in a string message. They are replaced with the
`$value` argument and its type description:

```php
<?php

use Windwalker\Core\Http\RequestAssert;

RequestAssert::assertBadRequest(
    $page > 0,
    'Page must be positive, got {value}.',
    $page,
);
```

A `Closure` message builds the text when the check fails. Its `$value` and
`$type` arguments hold the value and its type description:

```php
<?php

use Windwalker\Core\Http\RequestAssert;

RequestAssert::assertBadRequest(
    $page > 0,
    fn(string $_, mixed $value, string $type) => 'Bad ' . $type,
    $page,
);
```

### Custom Exceptions

Pass a callable as `$exception` to throw your own exception. It receives the
message and must return a `Throwable`. This example throws a
`ValidateFailException`, which keeps its message in every verbosity mode:

```php
<?php

use Windwalker\Core\Form\Exception\ValidateFailException;
use Windwalker\Core\Http\RequestAssert;

RequestAssert::assertBadRequest(
    $slug !== '',
    'Slug is required.',
    exception: fn(string $msg) => new ValidateFailException($msg, 400),
);
```

::: info
The four exceptions do not implement `SafeMessageExceptionInterface`. When
`app.verbosity` is `HIDDEN`, a failure that is flashed back to a form shows
`Something went wrong` instead of your message. Use a custom exception when
the user must read the message.
:::

Pass a boolean or a plain value as `$assertion`. A callable is called to
test it, but the method still returns the callable, not its result.
