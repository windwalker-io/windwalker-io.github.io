---
layout: doc
title: Transports
component: http
---

# Transports

A client describes a request, and a transport performs it. The client
handles the URL, headers, body, and events, and then hands the finished
PSR-7 request to its transport. The transport decides how the bytes go
over the network, and it has its own options for that: timeouts, TLS,
progress callbacks, and driver-specific settings. This split lets you
change the driver, for example to run on a host without the cURL
extension, without touching the calls in your application.

## Available Drivers

`CurlTransport` is the default. It uses the cURL extension and is the
only transport that supports the async methods. `StreamTransport` uses
PHP's stream wrappers and needs `allow_url_fopen`. Use it when cURL is
not available:

```php
use Windwalker\Http\HttpClient;
use Windwalker\Http\Transport\StreamTransport;

$client = new HttpClient(
    transport: new StreamTransport(),
);
```

Each driver reports whether it can run in the current PHP environment
with its static `isSupported()` method. The client checks this before
it sends a request.

## Minimal Usage

Most settings can be given to the client without naming a transport.
The shared options are the same for both drivers:

```php
use Windwalker\Http\HttpClient;
use Windwalker\Http\HttpClientOptions;

$client = HttpClient::create(
    new HttpClientOptions(
        timeout: 10,
        userAgent: 'MyApp/1.0',
        followLocation: true,
    ),
);
```

## Transport Options

Every driver reads the same base set from `TransportOptions`:

- `timeout`: the total time limit in seconds.
- `userAgent`: the `User-Agent` string.
- `followLocation`: whether redirects are followed.
- `verifyPeer` and `certpath`: TLS verification and the CA file. See
  [CA Bundle](#ca-bundle) below.
- `writeStream`: a path or a stream that receives the body.
- `files`: multipart file uploads.
- `progress`: a callback that receives a `ProgressEvent`.

The client copies `timeout`, `userAgent`, `followLocation`, `verifyPeer`,
`certpath`, `files`, and `progress` from its `HttpClientOptions` into
every request. You only need the transport options for settings that the
client does not expose.

`CurlOptions` adds the cURL-specific settings:

- `curl`: an array of `CURLOPT_*` values.
- `ignoreCurlError`: skip the exception when cURL reports an error.
- `autoCalcContentLength`: calculate the `Content-Length` header.

`StreamOptions` adds the stream-specific settings:

- `context`: an array passed to `stream_context_create()`.
- `targetFile`: a path for the body.

The client takes the transport options from the `transport` property of
`HttpClientOptions`. Pass the options object of the driver you use:

```php
use Windwalker\Http\HttpClient;
use Windwalker\Http\HttpClientOptions;
use Windwalker\Http\Transport\Options\CurlOptions;

$client = HttpClient::create(
    new HttpClientOptions(
        timeout: 10,
        transport: new CurlOptions(
            curl: [
                CURLOPT_ENCODING => 'gzip',
                CURLOPT_MAXREDIRS => 3,
            ],
        ),
    ),
);
```

With `StreamTransport`, the same idea applies to the stream context:

```php
use Windwalker\Http\HttpClientOptions;
use Windwalker\Http\Transport\Options\StreamOptions;

$options = new HttpClientOptions(
    transport: new StreamOptions(
        context: [
            'http' => [
                'protocol_version' => 1.1,
            ],
        ],
    ),
);
```

## Overriding Driver Settings

The `curl` array is the escape hatch for any cURL option that the
transport does not expose. Its values are applied last, after the
transport has set its own options, so they override them:

```php
use Windwalker\Http\HttpClient;
use Windwalker\Http\HttpClientOptions;
use Windwalker\Http\Transport\Options\CurlOptions;

$client = HttpClient::create(
    new HttpClientOptions(
        timeout: 10,
        transport: new CurlOptions(
            curl: [
                CURLOPT_TIMEOUT => 30,
                CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            ],
        ),
    ),
);
```

The request above uses a 30-second timeout, not the 10 seconds of
`timeout`, because the `curl` value wins. Use this for options that have
no shared equivalent, such as `CURLOPT_IPRESOLVE`.

Transport values can also differ per call. Use the `transport` key of
the request options. It is merged with the client's transport values, and
the values of the call take precedence. The keys are not limited to the
known options, so you can pass a value that only your own transport
reads:

```php
$client->get(
    'reports/monthly',
    [
        'transport' => [
            'timeout' => 60,
        ],
    ],
);
```

::: warning
A value in `curl` silently replaces the value that the
transport computed from a shared option. If you set both `timeout` and
`CURLOPT_TIMEOUT`, the `curl` value is the one that takes effect.
:::

::: warning
`ignoreCurlError: true` turns a network failure into an
ordinary response instead of an exception. Only use it when you check the
response yourself, because the status and body may be empty.
:::

## CA Bundle

Each driver checks TLS certificates against a certificate authority
(CA) file. By default, the file is the bundle that ships with
`composer/ca-bundle`. The lookup follows a fixed order:

1. The `certpath` option of the request or client.
2. The default path set with `CaBundleFinder::setDefaultPath()`, if the
   file exists.
3. The bundle path returned by the finder, which is the bundled file by
   default.

A file path is passed as the CA file. A directory is passed as the CA
path. The lookup is the same for both drivers, so the same `certpath`
works with `CurlTransport` and `StreamTransport`.

For one client, set `certpath`:

```php
$client = HttpClient::create(
    new HttpClientOptions(
        certpath: '/etc/ssl/certs/internal-ca.pem',
    ),
);
```

For the whole application, for example in a bootstrap file, change the
default path or the finder:

```php
use Windwalker\Http\CaBundleFinder;

CaBundleFinder::setDefaultPath('/etc/ssl/cert.pem');

CaBundleFinder::setFinder(
    fn() => '/etc/ssl/certs/corporate-bundle.pem',
);
```

A custom transport can change the lookup as well. The method
`findCAPathOrFile()` is protected in `AbstractTransport`, and a subclass
can override it to return its own path or `null`.

::: warning
If the file set with `setDefaultPath()` does not exist, the
lookup falls back to the bundled file without any warning. A typo in the
path therefore does not fail; it silently uses a different certificate
list. Check the path at startup.
:::

::: warning
`verifyPeer: false` disables the CA check entirely, so the
CA settings have no effect. Keep it `true` outside of local tests.
:::
