---
layout: doc
title: Navigation
description: How Navigator builds URLs and redirects from route names, so links keep working when route paths change.
---

# Navigation

## Overview

Navigation builds URLs from route names. A link in a view refers to
`front::post_show`, not to `/post/42`. When a route path changes, every
link follows, because only the route definition knows the pattern. The
same system also builds redirects and answers questions about the active
route.

The navigation system has four parts:

- `Navigator`: the service that builds URLs and redirects, and reads the
  matched route.
- `RouteUri`: the object `to()` returns. It is a URI you can still change.
  It becomes a string only when you print it.
- `NavOptions`: the settings for one call, such as the URL mode or whether
  a missing route is muted.
- Navigation events: hooks that run while a URL is built.

Route names and patterns are defined in the
[Routing](/documentation/framework/core-concepts/http-routing/routing) page.

## Getting the Navigator

Get the `Navigator` from the application container, or inject it as a
controller method argument, as the showcase below does. Views receive it as
the `$nav` variable.

`NavigableTrait` is a convenience. Add it to a controller, and it injects
the Navigator as `$this->nav` without a constructor.

```php
<?php

use Windwalker\Core\Router\Navigator;

$nav = $app->retrieve(Navigator::class);
```

## Showcase: Post Links and Redirects

This example extends the post routes from the Routing page. It adds a list
route and a store route, and both use names instead of paths.

### Routes

Add these routes to `routes/front/post.php`:

```php
<?php

declare(strict_types=1);

namespace App\Routes;

use App\Module\Front\Post\PostController;
use Windwalker\Core\Router\RouteCreator;

/** @var RouteCreator $router */

$router->get('post_index', '/posts')
    ->handler(PostController::class, 'index');

$router->get('post_show', '/post/{id:\d+}')
    ->handler(PostController::class, 'show');

$router->save('post_store', '/post')
    ->handler(PostController::class, 'store');
```

### Controller

Add these methods to `PostController`. The `Navigator` is injected as a
method argument, the same way as other dependencies:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Post;

use Windwalker\Core\Attributes\Controller;
use Windwalker\Core\Router\Navigator;
use Windwalker\Core\Router\RouteUri;
use Windwalker\Http\Response\JsonResponse;

#[Controller]
class PostController
{
    public function index(Navigator $nav): JsonResponse
    {
        // Load the IDs from the database in a real app.
        $ids = [1, 2, 3];
        $links = [];

        foreach ($ids as $id) {
            $links[] = (string) $nav
                ->to('front::post_show')
                ->id($id);
        }

        return new JsonResponse(['links' => $links]);
    }

    public function store(Navigator $nav): RouteUri
    {
        // Save the post here, then redirect to its page.
        $id = 4;

        return $nav->to('front::post_show')->id($id);
    }
}
```

### Result

The `store()` method returns a `RouteUri`. Windwalker turns it into a
`303` redirect, so the browser lands on the new post page. The list page
prints the URLs as strings.

```text
GET /posts  200  links: /post/1, /post/2, /post/3
POST /post  303  Location: /post/4
```

### In a View

The same call builds a link in a view:

```blade
<a href="{{ $nav->to('front::post_show')->id($post->id) }}">
    {{ $post->title }}
</a>
```

## Building URLs with to()

### Basic Usage

`to()` takes a route name, the route variables and query values, and
an optional `NavOptions`. Values that match a placeholder fill the path.
The remaining values become the query string:

```php
<?php

/** @var Navigator $nav */

$nav->to('front::post_show', ['id' => 42]);
// /post/42

$nav->to('front::post_show', ['id' => 42, 'tab' => 'comments']);
// /post/42?tab=comments
```

The path is relative to the site root. See [URL Mode](#url-mode) for
installations in a subdirectory.

### Route Names

Route names have the form `namespace::name`. Inside a group, you can use
the short name. `Navigator` looks in the matched route's namespace first:

```php
<?php

/** @var Navigator $nav */

// Matched route: front::post_index
$nav->to('post_show', ['id' => 42]);
// Resolves to front::post_show
```

Use `has()` to check a name before you build a URL:

```php
<?php

/** @var Navigator $nav */

if ($nav->has('front::post_show')) {
    // The route exists.
}
```

Outside a view, `to()` throws `RouteNotFoundException` when the name is
unknown. Views mute this error by default. See
[Muted Links and Debug Mode](#muted-links-and-debug-mode).

### Chaining Variables

`RouteUri` has methods that set one variable each. Each method returns a
new object, so the chain can be reused safely:

```php
<?php

/** @var Navigator $nav */

$uri = $nav->to('front::post_show')
    ->id(42)
    ->page(2)
    ->var('lang', 'en');

// /post/42?page=2&lang=en
```

The methods fall into three groups:

Variables:

- `var()`: sets any variable. Enum values and UUIDs are converted to
  scalars.
- `id()`, `page()`, `layout()`, `task()`, `alias()`: shortcuts for `var()`
  with a fixed name.
- `withReturn()`: adds the current URL, encoded, to a `return` variable.
  Use it for login links.

URL and response:

- `full()`, `path()`, `raw()`: change the URL mode for this link. See
  [Navigation Options](#navigation-options).
- `withStatus()`: sets the status code used when the URI becomes a redirect.
- `withMessage()`: adds a flash message. It needs `windwalker/session`.

Behavior:

- `mute()`: mutes a missing route for this link only.
- `allowQuery()`: filters the query values. See
  [Current Page and Active State](#current-page-and-active-state).

A login link can return to the current page after sign-in:

```blade
<a href="{{ $nav->to('login')->withReturn() }}">Log in</a>
```

::: info
`RouteUri::alias()` sets the `alias` query variable. It does not create a
route alias. Route aliases are set with `alias()` on the `Route` in the
Routing page.
:::

### Using a RouteUri

A `RouteUri` can be used in four ways:

- Printed as a string, for links and templates.
- Returned from a controller, which sends a redirect.
- Converted to a response with `toResponse()`.
- Passed to `redirect()`, which is described below.

```php
<?php

use Windwalker\Core\Router\RouteUri;

/** @var RouteUri $uri */

$response = $uri->toResponse(302);
```

## Custom URLs with createRouteUri()

Use `createRouteUri()` when the target is not a named route, such as a
file or an external API.

### Plain URLs

`createRouteUri()` takes a URL and a query array:

```php
<?php

/** @var Navigator $nav */

$url = $nav->createRouteUri('/api/search', ['q' => 'php 8']);

echo $url;
// /api/search?q=php+8
```

### Closure URLs

Pass a closure to compute the URL when it is printed. The closure returns
`[$url, $query]`, the same shape as the internal route handler:

```php
<?php

/** @var Navigator $nav */

$uri = $nav->createRouteUri(
    fn (array $vars) => ['/post/' . $vars['slug'], []],
    ['slug' => 'hello-world'],
);

echo $uri;
// /post/hello-world
```

Use named routes for pages in your app. A named route updates when its
pattern changes, and a hard-coded path does not.

### Redirect Methods

`Navigator` has several redirect methods. Each returns a
`ResponseInterface`, so a controller can return it:

- `redirect($uri, $code = 303)`: redirects to a local URL.
- `redirectOutside($uri, $code = 303)`: redirects to any URL.
- `redirectTo($route, $query, $code = 303)`: redirects to a named route.
- `redirectSelf($code = 303)`: redirects to the current route.
- `redirectInstant($uri, $code = 303)`: sends the response and ends the
  request at once.
- `back()`: returns a `RouteUri` to the referrer.

```php
<?php

use Windwalker\Core\Router\Navigator;

/** @var Navigator $nav */

return $nav->redirectTo('front::post_show', ['id' => 42]);
```

`redirectInstant()` sends the response at once and ends the request, so
code after it does not run. Use it only when you cannot return the response:

```php
<?php

/** @var Navigator $nav */

$nav->redirectInstant('/post/42');

// Not reached.
```

### Local Redirects

`redirect()` accepts only local URLs. A URL is local when it starts with a
single `/` or with the app root. `//` and `/\` are not local, because
browsers treat them as another host:

```php
<?php

/** @var Navigator $nav */

$nav->redirect('/post/42');
// Location: /post/42

$nav->redirect('//evil.example/');
// Location: https://example.com/ (the app root)

$nav->redirect('https://other.example/');
// Location: https://example.com/ (the app root)
```

::: warning
`redirect()` replaces a non-local URL with the app root, and it does not
report an error. A link to another site silently sends the user to your
home page. Use `redirectOutside()` for an outside URL.
:::

### Outside Redirects

`redirectOutside()` turns off the check for one redirect:

```php
<?php

/** @var Navigator $nav */

return $nav->redirectOutside('https://payment.example/checkout');
```

::: warning
Only pass trusted URLs to `redirectOutside()`. Never pass a value from the
request, such as a `return` parameter, because it lets an attacker send
users to any site.
:::

### Back Navigation

`back()` uses the `Referer` header only when it is a local URL. Otherwise
it returns the app root. The header comes from the client, so do not use
it for security decisions.

## Absolute Links for Emails

Emails and background jobs have no request to take the host from.
`toNotifyLink()` builds an absolute URL for a named route:

```php
<?php

/** @var Navigator $nav */

$uri = $nav->toNotifyLink('front::post_show', ['id' => 42]);

echo $uri;
// https://example.com/post/42
```

The base comes from the `APP_URL` environment variable, which must be the
origin only, such as `https://example.com`. A forged `Host` header then
cannot send mail links to another domain.

::: warning
When `APP_URL` is not set, `toNotifyLink()` uses the request `Host`
header and logs a warning. Set `APP_URL` in every environment that sends
mail.
:::

## Current Page and Active State

### Current Route

`self()` builds a URL for the matched route. It keeps the route variables
and drops the query string, unless you allow some query values:

```php
<?php

use Windwalker\Core\Router\NavOptions;

/** @var Navigator $nav */

// Current route with the same ID.
$nav->self();

// Current route, page 2.
$nav->self()->page(2);

// Current route, keep only the page query value.
$nav->self(new NavOptions(allowQuery: ['page']));
```

`selfNoQuery()` is the same as `self()` with `withoutQuery` set. Use
`redirectSelf()` to send the user back to the current route.

### Active Menu Items

Check the active route in a menu:

```blade
<a class="nav-link {{ $nav->isActive('front::home') ? 'active' : '' }}"
   href="{{ $nav->to('front::home') }}">Home</a>
```

`isActive()` accepts several forms:

- `'front::home'`: an exact route name.
- `'post_show'`: a short name, without the namespace.
- `'post_*'`: a wildcard, matched against the name or the route path.
- `['home', 'post_show']`: any of the values in the list.

`inGroup('admin')` checks the group of the matched route. Set a menu key on
a route with `extra('menu', ...)`, and `isActive()` matches it too.

## Navigation Options

### URL Mode

`NavOptions` changes one link or redirect. The `mode` decides the shape of
the URL.

`NavMode::PATH` (default) returns a path that starts at the site root. The
site root is detected automatically, so the same route works in any
installation. If the site lives in a subdirectory, such as `/website/www`,
the subdirectory is part of the path:

```php
<?php

/** @var Navigator $nav */

// Site at https://example.com/website/www/
$nav->to('front::post_show')->id(42);
// /website/www/post/42

// Site at https://example.com/
$nav->to('front::post_show')->id(42);
// /post/42
```

- `NavMode::FULL`: includes the scheme and host, such as
  `https://example.com/website/www/post/42`.
- `NavMode::RAW`: returns the path without resolving the app root.

```php
<?php

use Windwalker\Core\Router\NavMode;
use Windwalker\Core\Router\NavOptions;

/** @var Navigator $nav */

$nav->to('front::post_show', ['id' => 42], new NavOptions(
    mode: NavMode::FULL,
));
// https://example.com/post/42
```

::: info
`RAW` output has no leading slash, such as `post/42`. Use it only when
you build the URL in your own code.
:::

### Other Options

The other options are:

- `mute`: a missing route returns `#` instead of throwing.
- `debugAlert`: with `mute`, a missing route returns a JavaScript alert.
- `allowOutside`: allows an outside URL in a redirect.
- `instant`: sends the redirect response and ends the request at once.
- `withoutVars`: `self()` omits the route variables.
- `withoutQuery`: `self()` omits the query values.
- `ignoreEvents`: skips the navigation events.
- `allowQuery`: keeps all query values (`true`), drops all (`false`), or
  keeps the listed names (array).
- `base`: a prefix added by `absolute()`.
- `extra`: free-form data for event listeners. See
  [Events](#navigation-events).

### Defaults with withOptions()

Options passed to a call override the Navigator's defaults for that call.
To change the defaults for every link in a scope, use `withOptions()`. It
returns a copy of the Navigator:

```php
<?php

use Windwalker\Core\Router\NavOptions;
use Windwalker\Core\Router\Navigator;

/** @var Navigator $nav */

$muted = $nav->withOptions(new NavOptions(mute: true));

echo $muted->to('front::missing');
// #
```

::: info
The integer flags in `NavConstantInterface`, such as `TYPE_FULL`, still
work but are deprecated. Use `NavOptions` in new code.
:::

## Muted Links and Debug Mode

### Muted Links in Views

The `$nav` variable in views is a Navigator with `mute` enabled. A link to
an unknown route renders as `#`, so one bad name does not break the page.

### Debug Mode

When the app runs in debug mode, `debugAlert` is also enabled. The link
then shows a message instead of `#`:

```blade
<a href="{{ $nav->to('front::missing') }}">Missing</a>
```

```text
Production:
<a href="#">Missing</a>

Debug:
<a href="javascript: alert('Route: front::missing not found.');">
```

::: warning
A mistyped route name in a view renders `#` without any error in
production. Check the names in debug mode, or call `has()` in tests.
:::

### Muting One Link

Use `mute()` on one link when a route can be missing on purpose:

```php
<?php

/** @var Navigator $nav */

$uri = $nav->to('front::home')->mute();
```

## Navigation Events

### Event Types

Navigation emits three events while it builds a URL:

- `PrepareRouteBuildEvent`: before the route lookup. You can change the
  route name, the query, and the options.
- `BeforeRouteBuildEvent`: after the route is found. You can change the
  query and the options.
- `AfterRouteBuildEvent`: after the URL is built. You can change the URL
  and the query.

They live in the `Windwalker\Core\Router\Event` namespace. All three are
skipped when `ignoreEvents` is set.

### Using extra in a Listener

The `extra` option carries your own data into the events. Core does not
read it. This example uses it to prefix the path with a locale, such as
`/ja/post/42`. An explicit `locale` in `extra` replaces the current locale,
so the current locale is not read at all in that case:

```php
<?php

declare(strict_types=1);

namespace App\Listener;

use Windwalker\Core\Language\LangService;
use Windwalker\Core\Router\Event\AfterRouteBuildEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;

#[EventSubscriber]
class NavLocaleSubscriber
{
    public function __construct(protected LangService $lang) {}

    #[ListenTo(AfterRouteBuildEvent::class)]
    public function addLocale(AfterRouteBuildEvent $event): void
    {
        $locale = $event->options->extra['locale'] ?? null;

        if ($locale === null) {
            $locale = $this->lang->getLanguage()->getLocale();
        }

        $event->url = $locale . '/' . $event->url;
    }
}
```

The `url` at this point is relative to the site root, so the prefix goes
in front of it. The routes must accept the same prefix when a request
arrives. A group with a locale prefix looks like this:

```php
<?php

/** @var RouteCreator $router */

$router->group('locale')
    ->prefix('/{locale:[a-z]{2}}')
    ->register(function (RouteCreator $router) {
        $router->get('post_show', '/post/{id}')
            ->handler(PostController::class, 'show');
    });
```

The [Routing](/documentation/framework/core-concepts/http-routing/routing) page covers
groups and their options in full.

### Registering the Subscriber

Register the subscriber in the `listeners` config, under the `Navigator`
class. The listener then attaches to the Navigator's own event dispatcher:

```php
<?php

// etc/app/main.config.php

use App\Listener\NavLocaleSubscriber;
use Windwalker\Core\Router\Navigator;

return [
    'listeners' => [
        Navigator::class => [
            NavLocaleSubscriber::class,
        ],
    ],
];
```

Because the subscriber is registered on the Navigator, it applies to every
link, not only to one route. With the fallback to the current locale, every
URL then gets the locale prefix. Make sure the routes accept it.

In a view, pass an explicit locale with the option:

```php
<?php

use Windwalker\Core\Router\NavOptions;

/** @var Navigator $nav */

$nav->to('front::post_show', [], new NavOptions(
    extra: ['locale' => 'ja'],
))->id(42);
// /ja/post/42
```

::: tip
Use the `Prepare` event to map old route names to new ones, so existing
templates keep working after a rename.
:::
