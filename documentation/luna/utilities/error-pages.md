---
layout: doc
title: Error Pages
description: How Luna's LunaErrorHandler renders production error pages inside the site layout, and the luna.error options that control it.
---

# Error Pages

In production, a visitor who hits a missing page or a server error should see a branded page with the site header and footer, not a blank screen or a stack trace. `Lyrasoft\Luna\Error\LunaErrorHandler` renders the error inside a normal Luna route context, so the page uses the same layout, middleware, and language files as the rest of the site.

## How It Works

`LunaPackage` registers the handler in `bootBeforeRequest()`. It is added to `ErrorService` as the `default` handler only when both conditions are true:

- The application is not in debug mode.
- The client is a web request, not the CLI.

In debug mode, the framework's own error handler runs, so detailed error output stays available while developing. For the framework's error handling model, see [Error Handling](/documentation/framework/core-concepts/error-handling).

When an exception reaches the handler, it runs these steps:

1. Loads Luna's language files, so messages such as `luna.error.not.found` are available.
2. Looks up the configured route and makes it the matched route of the current request.
3. Creates `Lyrasoft\Luna\Module\Front\Error\ErrorView`, optionally with a custom layout.
4. Runs the route's middleware stack, then renders the view inside it.
5. Sends the response with the exception code as the HTTP status.

The visitor is never redirected to the route. It only supplies the context: its middleware (for example, one that loads the current user) and its `namespace` extra value, which becomes the `$stage` variable (`front` or `admin`) in the view.

## Configuration

The handler reads two options from `etc/packages/luna.config.php`:

```php
return [
    // ...

    'error' => [
        // The route whose middleware and stage wrap the error page.
        'route' => 'front::home',

        // The layout of ErrorView. null falls back to "error".
        'layout' => null,
    ],

    'view_extends' => [
        'front' => [
            'error' => 'global.body',
        ],
        'admin' => [
            'error' => 'admin.global.pure',
        ],
    ],
];
```

- `luna.error.route` is a route name. It decides which middleware runs and which stage is used.
- `luna.error.layout` is the view layout name used by `ErrorView`.
- `luna.view_extends.{stage}.error` is the parent layout that the default error template extends, chosen by stage.

### Choosing the Route

`route` also accepts a closure. It is resolved through the container when an error occurs, so it can depend on the current request:

```php
use Lyrasoft\Luna\LunaPackage;

return [
    'error' => [
        'route' => function (LunaPackage $luna) {
            return $luna->isAdmin()
                ? 'admin::home'
                : 'front::home';
        },
        'layout' => null,
    ],
];
```

If `luna.error.route` is removed from the config, Luna falls back to this same closure.

Use a route name that exists in your application. When the name is not found, the handler renders the view with the `front` stage and without any route middleware.

### Using Your Own Layout

Set `layout` to render a different template than the built-in `error` layout:

```php
'error' => [
    'route' => 'front::home',
    'layout' => 'my-error',
],
```

The template receives `$exception` and `$stage`. If you only need to change the surrounding page, change `luna.view_extends.front.error` instead of replacing the whole template.

## What the Visitor Sees

The built-in template chooses the message from the exception code:

```php
throw new RuntimeException('Missing', 404);
// Shows: 404 + the "Page not Found" message

throw new RuntimeException('Not allowed', 403);
// Shows: 403 + the original message "Not allowed"

throw new RuntimeException('Database is down', 500);
// Shows: 500 + the "Internal Server Error" message
```

Codes from 400 to 499, except 404, show the exception message. Any other code is replaced with the generic message and displayed as `500`.

The response status is taken from the exception code. A code below 300 becomes `500`, so an error page is never sent with a `1xx` or `2xx` status.

::: warning
Messages of `4xx` exceptions other than 404 are shown to the visitor as-is. Keep internal details out of the messages of exceptions that carry such codes.
:::
