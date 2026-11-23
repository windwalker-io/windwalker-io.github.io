---
layout: doc
title: Scoped Routing
description: Keep a set of routes inside one unit, such as a classroom or an organization, with a short overview of the common patterns.
---

# Scoped Routing

Some areas of an application belong to one unit, such as a classroom, a team, or an organization. Every page in such an area should stay in that unit, and every link should keep it. A scope groups these routes, identifies the unit for each request, and carries the unit into the links.

This page covers two cases. In an **organization scope**, the unit identifies the whole area. In a **type scope**, one MVC serves several entity types, and the type in the URL separates their list state.

## Choosing Where the Unit Comes From

The unit can come from the user or from the URL.

- **User-based**: each user belongs to one unit. A middleware looks up the user's unit, and the URL has no unit.
- **URL-based**: the unit is part of the path, such as `/org/{org_id}`. The middleware must check that the user may access the unit.

## Grouping the Routes

Wrap the routes of one area in a group, and attach the middleware that identifies the unit:

```php
<?php

// routes/front/org.php

use App\Module\Front\Org\OrganizationMiddleware;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('org')
    ->prefix('/org/{org_id:\d+}')
    ->middleware(OrganizationMiddleware::class)
    ->register(function (RouteCreator $router) {
        $router->load(__DIR__ . '/org/*.php');
    });
```

The routes inside the group inherit the prefix and the middleware. See [Showcase: An Organization Scope](/documentation/framework/core-concepts/http-routing/middleware#showcase-an-organization-scope) for a complete example.

## A Simple Scope Middleware

The [middleware](/documentation/framework/core-concepts/http-routing/middleware) reads the unit from the route, checks that it exists, and stores it in `AppState` for the rest of the request:

```php
<?php

namespace App\Module\Front\Org;

use App\Entity\Organization;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Windwalker\Core\Application\Context\AppRequestInterface;
use Windwalker\Core\State\AppState;
use Windwalker\Http\Exception\HttpRequestException;
use Windwalker\ORM\ORM;

class OrganizationMiddleware implements MiddlewareInterface
{
    public function __construct(
        protected AppRequestInterface $request,
        protected AppState $state,
        protected ORM $orm,
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $orgId = (int) $this->request->getUrlVars()['org_id'];

        if (!$this->orm->mapper(Organization::class)->findOne($orgId)) {
            throw new HttpRequestException('Organization not found', 404);
        }

        // Check here that the user may access $orgId, too.
        $this->state->set('org_id', $orgId);

        return $handler->handle($request);
    }
}
```

The controllers, the repositories, and the views read the unit from `AppState` in the same request. The next section uses it to split the session keys.

## Reading the Unit in a Controller

For a URL-based scope, read the unit ID with `#[UrlVar]`. It reads only the route variables, so a query string such as `?org_id=` cannot replace it:

```php
// src/Module/Front/Org/Member/MemberController.php

use Windwalker\Core\Attributes\Request\UrlVar;

public function show(
    #[UrlVar('org_id')] int $orgId,
): mixed {
    // Work inside the organization $orgId.
}
```

::: warning
When the URL names the unit, check that the logged-in user may access it. A middleware that only checks that the unit exists lets any user open any unit by changing the ID in the URL.
:::

## Keeping the Unit in Links

A scoped page links to other pages in the same scope. `KeepUrlQueryMiddleware` adds the unit to those links, so the links do not need the value:

```php
// routes/front/org.php

$router->group('org')
    ->prefix('/org/{org_id:\d+}')
    ->middleware(OrganizationMiddleware::class)
    ->middleware(
        KeepUrlQueryMiddleware::class,
        key: 'org_id',
        uid: 'org',
    )
    ->register(function (RouteCreator $router) {
        // ...
    });
```

See [Keeping Scope Values in Links](/documentation/framework/core-concepts/http-routing/middleware#keeping-scope-values-in-links) for how the `uid` separates scopes.

## Type Scope

Some entities have a type, such as articles, courses, and tags, and one MVC serves all of them. The URL carries the type, so the routes live under a prefix that contains it:

```php
<?php

// routes/admin/category.php

use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->group('category')
    ->prefix('/category/{type:[a-z]+}')
    ->register(function (RouteCreator $router) {
        $router->load(__DIR__ . '/category/*.php');
    });
```

The repository reads the type from the route variables. It needs `AppRequestInterface` for that, and it adds the type to the state prefix:

```php
// src/Repository/CategoryRepository.php

use Windwalker\Core\Application\Context\AppRequestInterface;
use Windwalker\Core\State\AppState;
use Windwalker\DI\Attributes\Inject;

#[Inject]
protected AppRequestInterface $request;

public function getState(): AppState
{
    $type = $this->request->getUrlVars()['type'] ?? 'article';

    return $this->state->withPrefix('category.' . $type);
}
```

::: warning
Accept only the types that the application supports. Each unknown value otherwise creates its own state keys.
:::

Links in the group keep the type the same way as the organization ID, with `KeepUrlQueryMiddleware` and a `key` of `type`.

## Separating Session Keys for Scopes

A list keeps its filter and search in the [session](/documentation/framework/core-concepts/state-control/session-and-cookies), under keys that start with the state prefix. The generated `prepare()` method reads them from the repository's state, so the same code serves every scope:

```php
// src/Module/Admin/Product/ProductListView.php

#[ViewPrepare]
public function prepare(AppContext $app, View $view): array
{
    $state = $this->repository->getState();

    $filter = (array) $state->rememberMergeRequest('filter');
    $search = (array) $state->rememberMergeRequest('search');

    $items = $this->repository->getListSelector()
        ->setFilters($filter)
        ->searchTextFor($search['*'] ?? '', $this->getSearchFields());

    // ...
}
```

The view and `GridController::filter()` both call the repository's `getState()`. A different prefix therefore gives a different set of keys, and every request in one scope uses the same keys.

::: warning
Read and write the filter through the same `getState()`. If the view builds its own prefix while the filter route does not, the filter is saved under one key and read from another, and the list appears to reset after every change.
:::

### Organization Scope

The repository builds the prefix from the organization that the middleware stored:

```php
// src/Repository/ProductRepository.php

use Windwalker\Core\State\AppState;

public function getState(): AppState
{
    $orgId = (int) $this->state->get('org_id');

    return $this->state->withPrefix('product.org.' . $orgId);
}
```

- A filter set by organization 1 is saved under `product.org.1.filter`, and the next list request of organization 1 reads the same key.
- Organization 2 reads `product.org.2.filter`. That key is empty, so its list is unchanged.

::: warning
If the scope is missing, `get()` returns `null`, and all requests share one key. Reject requests without a scope in the middleware, so that it runs before the repository reads the state.
:::

### Type Scope

The `getState()` from the Type Scope section gives each type its own keys:

- A filter set on the article list is saved under `category.article.filter`.
- The course list reads `category.course.filter`, so the article filter does not affect it.

::: warning
The filter request must carry the same type. The grid form posts to its current URL, so keep the type in the page URL. If the two requests use different types, the filter is saved under one key and read from another.
:::

## Related

- [Routing](/documentation/framework/core-concepts/http-routing/routing)
- [Middleware](/documentation/framework/core-concepts/http-routing/middleware)
- [Navigation](/documentation/framework/core-concepts/http-routing/navigation)
