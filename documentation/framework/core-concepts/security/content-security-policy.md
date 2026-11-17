---
layout: doc
title: Content Security Policy
---

# Content Security Policy

A Content Security Policy (CSP) tells the browser which scripts, styles,
and other resources a page may load. Injected or third-party code that
does not match the policy is blocked. Windwalker sends the policy as a
`Content-Security-Policy` header and uses per-request nonces so that only
your own inline scripts and styles run.

## How the Parts Fit Together

- `SimpleCspMiddleware`: builds the policy with `paragonie/csp-builder`,
  sends it as a response header, and attaches the nonce to assets.
- `CspNonceService`: creates one random nonce per request and provides
  it to templates and helper methods.
- `@nonce` (Edge): outputs the `nonce="..."` attribute.
- `UnicornScript`: receives the nonce from the middleware so that its
  generated scripts can run under the policy.

The middleware needs the `paragonie/csp-builder` package, which is not
installed by default. Install it in the host app first:

```bash
composer require paragonie/csp-builder
```

If the package is missing, the middleware throws a `DomainException`
on every request, even when it is disabled.

## Minimal Usage

Attach the middleware to a route or a group with `middleware()`. The
default policy covers scripts, styles, images, and fonts:

```php
<?php

use Windwalker\Core\Middleware\SimpleCspMiddleware;

/** @var RouteCreator $router */

$router->group('front')
    ->prefix('/')
    ->middleware(SimpleCspMiddleware::class)
    ->register(function (RouteCreator $router) {
        // ...
    });
```

In the Edge template, add `@nonce` to every inline `<script>` or
`<style>` element:

```blade
<script @nonce>
    console.log('This inline script is allowed.');
</script>

<style @nonce>
    .hero { color: #333; }
</style>
```

## Complete Example

This example uses the presets for the public site, allows an extra
API origin with `extendCsp`, and disables the middleware on a
development route.

```php
<?php

use ParagonIE\CSPBuilder\CSPBuilder;
use Windwalker\Core\Middleware\SimpleCspMiddleware;
$router->group('front')
    ->prefix('/')
    ->middleware(
        SimpleCspMiddleware::class,
        cspRules: SimpleCspMiddleware::SCRIPT_SRC
            | SimpleCspMiddleware::STYLE_SRC
            | SimpleCspMiddleware::IMG_SRC
            | SimpleCspMiddleware::FONT_SRC,
        extendCsp: function (CSPBuilder $csp) {
            $csp->addSource('connect-src', 'https://api.example.com');

            return $csp;
        },
    )
    ->register(function (RouteCreator $router) {
        // ...
    });

// Development route without a policy header.
$router->group('dev')
    ->prefix('/dev')
    ->middleware(SimpleCspMiddleware::class, enabled: false)
    ->register(function (RouteCreator $router) {
        // ...
    });
```

## Policy Presets

`cspRules` accepts a bit mask of the presets below, or a closure that
builds the whole policy. The default is `DEFAULT_PRESET`, which combines
`SCRIPT_SRC`, `STYLE_SRC`, `IMG_SRC`, and `FONT_SRC`.

```php
<?php

use Windwalker\Core\Middleware\SimpleCspMiddleware;

// Each constant is one bit. Combine them with `|`.
$rules = SimpleCspMiddleware::SCRIPT_SRC // script-src-elem and -attr,
    | SimpleCspMiddleware::STYLE_SRC     // style-src-elem and -attr,
    | SimpleCspMiddleware::IMG_SRC       // self, data:, and blob:
    | SimpleCspMiddleware::FONT_SRC      // data:, blob:, and nonce
    | SimpleCspMiddleware::MEDIA_SRC     // nonce
    | SimpleCspMiddleware::OBJECT_SRC;   // nonce

// `default-src 'self'` is always added.
// SCRIPT_SRC and STYLE_SRC allow inline code only with the nonce,
// and set 'strict-dynamic' on the element directives.
```

::: info
A preset that is not set adds no directive of its own. The browser then
uses `default-src 'self'` for that resource type.
:::

## Custom Policy with a Closure

Pass a closure to `cspRules` to replace the presets entirely. The
closure is called through the container, so you can type-hint
`CSPBuilder` and other services. Return the builder to keep the result;
returning `null` keeps the original builder.

```php
<?php

use ParagonIE\CSPBuilder\CSPBuilder;
use Windwalker\Core\Middleware\SimpleCspMiddleware;
use Windwalker\Core\Security\CspNonceService;

$router->group('admin')
    ->prefix('/admin')
    ->middleware(
        SimpleCspMiddleware::class,
        cspRules: function (CSPBuilder $csp, CspNonceService $nonces) {
            // A closure replaces the presets. Nothing is added to the
            // policy unless you add it here.
            $csp->setSelfAllowed('default-src', true);
            $csp->addDirective('script-src-elem', []);
            $csp->setStrictDynamic('script-src-elem', true);
            $csp->nonce('script-src-elem', $nonces->getNonce());

            return $csp;
        },
    )
    ->register(function (RouteCreator $router) {
        // ...
    });
```

`extendCsp` runs after the preset or closure. Use it to add directives
without replacing the rest of the policy, as in the complete example.

## Nonces in Assets and Scripts

When the middleware is enabled, each request gets one nonce from
`CspNonceService`. The middleware uses it in three places:

- Every stylesheet and script added through `AssetService` gets a
  `nonce` attribute.
- The Import Map gets the same nonce.
- `UnicornScript::exposeCspNonce()` stores the nonce under the
  `csp-nonce` key, so Unicorn's JavaScript can use it.

Templates and helpers read the same value through `CspNonceService`:

```php
<?php

use Windwalker\Core\Security\CspNonceService;

/** @var CspNonceService $nonces */

// The full attribute, as used by the `@nonce` directive.
$attr = $nonces->attr(); // nonce="Xk3...32 chars"

// The raw value, for building your own markup.
$value = $nonces->getNonce();

// Replace the nonce, for example in a test or a queued job.
$nonces->setNonce('fixed-test-nonce');

// Create a new random nonce without touching the service.
$fresh = CspNonceService::generateNonce();
```

`getNonce()` creates the nonce on first call, then returns the same
value for the rest of the request. `CspNonceService` is registered per
request, so each request gets its own nonce.

::: warning
Never reuse a nonce across requests or expose it in cached pages. A
nonce that an attacker can read lets injected scripts run.
:::

## Adding Nonces to Raw HTML

Some HTML is produced outside Edge, such as a string from a Markdown
renderer. `CspNonceService` has static helpers that add the `nonce`
attribute to matching tags:

```php
<?php

use Windwalker\Core\Security\CspNonceService;

$nonce = CspNonceService::generateNonce();
$html = '<p>Hi</p><script>alert(1)</script>';

// Add nonce to the listed tags, skipping ones that already have it.
$html = CspNonceService::addNonceToTags($html, $nonce, ['script']);

// Add nonce to elements with inline on* handlers, such as onclick.
$html = CspNonceService::addNonceToTagWithEvents($html, $nonce);

// Add nonce to elements that have an inline style attribute.
$html = CspNonceService::addNonceToTagWithStyle($html, $nonce);
```

::: warning
These helpers use regular expressions, not an HTML parser. Pass them
only fragments you control, such as a generated block of markup. Do not
run them over a whole page or untrusted user input.
:::

## Static Files Served by the Web Server

`SimpleCspMiddleware` only adds the header to responses that PHP
returns. Files that Apache or Nginx serve directly, such as CSS, JS, and
images, do not need their own CSP header. The page's policy controls
whether the browser may load them.

Static `.html` files are different. They bypass PHP, so they get no
header and the browser applies no policy. Add the header in the web
server config for those files:

```nginx
location ~* \.html$ {
    add_header Content-Security-Policy "default-src 'self'";
}
```

::: warning
Without a header, a static HTML page runs with no CSP protection, and
nothing reports an error.
:::

## Disabling the Policy

Set `enabled: false` to skip both the nonce and the header. This is
useful for local development routes. Keep the policy enabled in
production: without the header, the browser does not apply the policy.

```php
<?php

use Windwalker\Core\Middleware\SimpleCspMiddleware;

$router->group('dev')
    ->prefix('/dev')
    ->middleware(
        SimpleCspMiddleware::class,
        enabled: getenv('APP_ENV') === 'development',
    )
    ->register(function (RouteCreator $router) {
        // ...
    });
```

