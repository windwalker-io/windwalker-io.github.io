---
layout: doc
title: Introduction
component: http
---

# Introduction

Windwalker HTTP is the PSR-7 and PSR-15 message foundation of the
framework. It provides immutable request and response objects, an HTTP
client for calling remote services, and the output layer that sends a
response back to the PHP SAPI. Because the message classes implement the
PSR-7 interfaces, code that uses them does not depend on the framework.

The package has three main parts:

- **Messages**: `Request`, `Response`, and `ServerRequest` objects, and the
  factories that create them. See [Messages](./messages).
- **HTTP Client**: `HttpClient`, which builds requests from a base URI,
  default headers, and options, and returns `HttpClientResponse` objects.
  See [HTTP Client](./client).
- **Output**: `Output` and `StreamOutput`, which write a response to the
  SAPI or a stream. See [Output](./output).

## Installation

Install the package with Composer. It requires PHP 8.4.6 or later.

```bash
composer require windwalker/http ^4.0
```

The default transport of `HttpClient` uses the cURL extension.

## Use as Standalone Component

Create a client with a base URI and a timeout. Relative URLs are appended
to the base URI.

```php
use Windwalker\Http\HttpClient;
use Windwalker\Http\HttpClientOptions;

$http = HttpClient::create(
    new HttpClientOptions(
        baseUri: 'https://api.example.com/v1/',
        timeout: 10,
    ),
);

$user = $http->get('users/42')->toArray();
```

The factory methods of PSR-17 are also available without a client:

```php
use Windwalker\Http\HttpFactory;

$factory = new HttpFactory();

$request = $factory->createRequest('GET', 'https://example.com/');
```

## Use in Windwalker

Windwalker does not bind `HttpClient` by default. Your application
binds it once, for example in a service provider, and then obtains it
from the existing container or app:

```php
$container->bindShared(
    HttpClient::class,
    fn() => HttpClient::create(
        new HttpClientOptions(
            baseUri: 'https://api.example.com/v1/',
            timeout: 10,
        ),
    ),
);
```

Inject it in a constructor:

```php
class UserService
{
    public function __construct(
        protected HttpClient $http
    ) {
    }
}
```

Retrieve it from the container or app:

```php
$http = $container->get(HttpClient::class);
$http = $app->retrieve(HttpClient::class);
```

The current web request is registered as `ServerRequest` and aliased to
`ServerRequestInterface`:

```php
$request = $app->retrieve(ServerRequestInterface::class);
```

## Core Concepts

Every message is a PSR-7 object. Methods named `with*()` return a new
instance and never change the original, so the result must be assigned.

`HttpClient` combines options in layers. The options passed to the
client are defaults; the options of a single request are merged on top
of them. Events can change a request before it is sent, and transports
such as `CurlTransport` perform the network call.

## Topic Pages

- [HTTP Client](./client): sending requests, handling errors, uploads,
  downloads, async requests, and events.
- [Messages](./messages): PSR-7 request and response objects, the
  factories, and the server request.
- [Output](./output): sending a response to the PHP SAPI or a stream.

## Related components

- [Uri](/components/uri/index): the PSR-7 URI implementation used by
  requests.
- [Stream](/components/stream/index): the PSR-7 stream implementation
  used for bodies.
- [Promise](/components/promise/index): the promises returned by
  asynchronous requests.
- [Reactor](/components/reactor/index): Swoole and event-loop servers
  that handle HTTP requests.
