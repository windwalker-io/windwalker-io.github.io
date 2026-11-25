---
layout: doc
title: Proxies
description: How Windwalker reads the client address and public host behind a CDN, load balancer, or tunnel, and how dev.php restricts access.
---

# Proxies

Many production apps do not receive requests directly. A CDN, a load
balancer, or a tunnel such as Cloudflare Tunnel accepts the browser
connection and forwards it to your app. The server then sees the proxy's
address, not the visitor's. The original address, host, and scheme are
sent in `X-Forwarded-*` headers instead.

Windwalker reads those headers only from proxies you configure. This page
explains why that matters and how `ProxyResolver` handles the details.

## Why Proxies Matter

Behind a proxy, three values change:

- **Client IP.** `REMOTE_ADDR` is the proxy. Logs, rate limits, and
  allow lists need the visitor's address.
- **Host and scheme.** The proxy may terminate TLS, so the app receives
  `http` while the browser uses `https`. Generated URLs and redirects
  must use the public host and scheme.
- **Trust.** Any client can send an `X-Forwarded-For` header. If the app
  believes it, a visitor can pretend to be `127.0.0.1` or any other
  address that your rules allow.

Windwalker solves the last point by trusting forwarding headers only when
the connection really comes from a proxy in your list.

## Configuring Trusted Proxies

Two settings control trust. Both live under `http` in the application
configuration:

- `trusted_headers`: the forwarding headers to read, in lowercase.
- `trusted_proxies`: the addresses or CIDR ranges of your proxies.

```php
<?php

// etc/app/main.config.php
return [
    'http' => [
        'trusted_proxies' => env('PROXY_TRUSTED_IPS'),
        'trusted_headers' => [
            'x-forwarded-for',
            'x-forwarded-host',
            'x-forwarded-proto',
        ],
    ],
];
```

Set `PROXY_TRUSTED_IPS` in `.env`. Separate multiple entries with commas
or new lines:

```ini
PROXY_TRUSTED_IPS=10.0.0.0/8,127.0.0.1
```

::: tip
List only the addresses of your own proxies. Use a CIDR range for a
private network, such as a load balancer's subnet, and list specific
addresses for a single tunnel.
:::

## ProxyResolver

`ProxyResolver` (`Windwalker\Core\Http\ProxyResolver`) reads the forwarding
headers and decides which values to trust. Each request gets its own
instance. Get it from the request object:

```php
<?php

use Windwalker\Core\Http\ProxyResolver;

$proxy = $app->getAppRequest()->getProxyResolver();
```

The main methods are:

```php
<?php

use Windwalker\Core\Http\ProxyResolver;

$proxy = $app->getAppRequest()->getProxyResolver();

// Client IP. Walks the chain from the server side and returns the
// first address that is not a trusted proxy. Use it for logs.
$clientIp = $proxy->getTrustedProxyIP();

// Values as the headers state them. Check isTrustedProxy() before
// using them, because a visitor can send these headers.
$forwardedIp = $proxy->getForwardedIP();
$forwardedIps = $proxy->getForwardedIPs();
$chain = $proxy->getIpsChain();

// The address of the connection itself (REMOTE_ADDR).
$remoteAddr = $proxy->getRemoteAddr();

// True when X-Forwarded-For is present and the chain passes the
// trusted-proxy check.
$trusted = $proxy->isTrustedProxy();

// Forwarded host and scheme. They are returned only when the
// header name is in trusted_headers.
$host = $proxy->getForwardedHost();    // ?string
$scheme = $proxy->getForwardedProto(); // ?string

// The trusted proxy list in effect for this request.
$proxies = $proxy->getTrustedProxies();
```

`getClientIP()` on the request object already uses this logic. It returns
`getTrustedProxyIP()` when a forwarding header is present, and
`REMOTE_ADDR` otherwise. Use `getClientIP()` in most code.

The `SystemUri` object applies the forwarded host and scheme. It does so
only when `X-Forwarded-For` is present and `isTrustedProxy()` is true. Read
`getSystemUri()` for URLs that must match the public address.

::: warning
`getForwardedIP()`, `getNearestClientIp()`, and `getForwardedHost()`
return the header exactly as the client sent it when the header name is
in `trusted_headers`. They do not check the connection. Use them only after
you check `isTrustedProxy()`, or use `getTrustedProxyIP()` and
`getClientIP()` instead.
:::

## Trusted Proxy Callback

Sometimes the proxy has no fixed address. For example, a CDN connects from
a large pool of addresses. Set `trusted_proxy_callback` to a factory that
returns a `Closure`. The closure receives the request and returns `true`
when the connection comes from your proxy:

```php
<?php

// etc/app/main.config.php
use Psr\Http\Message\ServerRequestInterface;
use Windwalker\DI\Container;

return [
    'http' => [
        'trusted_proxies' => env('PROXY_TRUSTED_IPS'),
        'trusted_headers' => [
            'x-forwarded-for',
            'x-forwarded-host',
            'x-forwarded-proto',
        ],
        'trusted_proxy_callback' => static function (Container $c) {
            return static fn(ServerRequestInterface $request): bool
                => $request->getHeaderLine('X-Proxy-Token')
                    === env('PROXY_TOKEN');
        },
    ],
];
```

When the closure returns `true`, the connecting address (`REMOTE_ADDR`) is
added to the trusted list for that request only. The factory is resolved
through the container, so it can receive services.

::: warning
The callback decides who is trusted, so it must check something the
visitor cannot forge. A header that the client can send, as in the example
above, is not proof. Prefer a signed header, a client certificate, or a
verified token that only your proxy can issue. Compare secrets with
`hash_equals()` in production code.
:::

## Behind a CDN or Tunnel

With a tunnel that runs on the same host, the connection arrives from
`127.0.0.1`. The visitor's address appears only in `X-Forwarded-For`:

```ini
; .env
PROXY_TRUSTED_IPS=127.0.0.1
```

Then the app reads the visitor's address as the client IP. A request from
`203.0.113.9` that passes through the tunnel gives this result:

```php
<?php

// Connection: REMOTE_ADDR = 127.0.0.1 (the tunnel)
// Header:     X-Forwarded-For: 203.0.113.9
$ip = $app->getAppRequest()->getClientIP();
// $ip === '203.0.113.9'
```

Without `PROXY_TRUSTED_IPS`, the same request returns `127.0.0.1`. The app
then treats every visitor as the local proxy.

::: info
Load balancers and CDNs usually add their own address to the chain. Each
address that appears after the client must also be listed in
`PROXY_TRUSTED_IPS`, or `getTrustedProxyIP()` stops at that address.
:::

## Development Access: dev.php

The `www/dev.php` entry sets `APP_ENV=dev` and includes `index.php`. Before
the application boots, `index.php` calls `Runtime::shouldBlock()`:

```php
<?php

// www/index.php
if (Runtime::shouldBlock(['dev'], env('DEV_ALLOW_IPS'))) {
    Runtime::forbidden();
}
```

The check runs only when the environment is `dev`. Requests to
`index.php` in production are not affected. A blocked request receives a
403 response before your code runs:

```text
// ERROR: 403 Forbidden
```

The rules are:

- `127.0.0.1`, `::1`, and `fe80::1` are always allowed.
- `DEV_ALLOW_IPS` adds more addresses. Separate them with commas. Each
  entry is an exact address. CIDR ranges are not supported.
- A request with `X-Forwarded-For` is checked in two steps. First the
  connection and proxy chain must be trusted by `PROXY_TRUSTED_IPS`. Then
  the forwarded client address must be in `DEV_ALLOW_IPS`.

The first step prevents forgery. If a visitor connects directly and sends
`X-Forwarded-For: 127.0.0.1`, the request is blocked, even though
`127.0.0.1` is allowed:

```text
// Connection: REMOTE_ADDR = 203.0.113.9 (not a trusted proxy)
// Header:     X-Forwarded-For: 127.0.0.1
// ERROR: 403 Forbidden
```

To open `dev.php` through a tunnel, trust the tunnel and allow your own
address:

```ini
; .env
PROXY_TRUSTED_IPS=127.0.0.1
DEV_ALLOW_IPS=198.51.100.23
```

::: warning
Setting `DEV_ALLOW_IPS` to `all` or `REMOTE_ADDR` turns off the check.
Anyone who reaches `dev.php` then sees full errors and database queries.
Keep the list to addresses you control. A home or mobile address can
change, so update the list when it does.
:::

## Related

- [Request & Input](/documentation/framework/core-concepts/http-routing/request-and-input)
- [Request Lifecycle](/documentation/framework/core-concepts/applications/request-lifecycle)
