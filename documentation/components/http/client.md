---
layout: doc
title: HTTP Client
component: http
---

# HTTP Client

Most applications call other services: a payment gateway, an internal
API, or a file server. `HttpClient` sends these requests and returns
response objects. A client holds the settings shared by all of its
calls, such as the base URI, default headers, and timeout, so each call
only describes what is different. The client does not register itself
anywhere; you create it and pass it where it is needed.

## Minimal Setup

Create a client with `HttpClient::create()` or the constructor. Both
accept an `HttpClientOptions` object or an array, and an optional
transport. The default transport is `CurlTransport`.

```php
use Windwalker\Http\HttpClient;
use Windwalker\Http\HttpClientOptions;

$client = HttpClient::create(
    new HttpClientOptions(
        baseUri: 'https://api.example.com/v1/',
        timeout: 10,
    ),
);
```

## Showcase

This example reads a resource, creates another one with a JSON body,
and checks for an error:

```php
use Windwalker\Http\Exception\HttpRequestException;
use Windwalker\Http\HttpClient;
use Windwalker\Http\HttpClientOptions;

$token = getenv('GITHUB_TOKEN');

$client = HttpClient::create(
    new HttpClientOptions(
        baseUri: 'https://api.github.com/',
        timeout: 10,
        userAgent: 'MyApp/1.0',
        headers: [
            'Accept' => 'application/vnd.github+json',
        ],
    ),
);

$repo = $client->get('repos/windwalker-io/http')->toArray();

$issue = $client->post(
    'repos/windwalker-io/http/issues',
    [
        'title' => 'Bug report',
        'body' => 'Steps to reproduce ...',
    ],
    [
        'headers' => [
            'Authorization' => 'Bearer ' . $token,
        ],
    ],
)->toArray();

try {
    $client->mustGet('repos/windwalker-io/missing')->toArray();
} catch (HttpRequestException $e) {
    $status = $e->response?->getStatusCode();
}
```

An array body is encoded as JSON and sends the `Content-Type` header
`application/json; charset=utf-8` unless you set one yourself. A string
or a stream is sent as is.

## Request Methods

Every verb method takes the URL first. The methods differ in whether
they accept a body and in the order of their arguments. The methods
without a body are `get()`, `head()`, `options()`, `trace()`, and
`connect()`:

```php
$client->get('users/42');
$client->get('users', ['params' => ['page' => 2]]);
```

`post()` and `delete()` accept an optional body:

```php
$client->post('users', ['name' => 'Sakura']);
$client->delete('users/42');
```

`put()` and `patch()` require the body argument, even if it is `null`:

```php
$client->put('users/42', ['name' => 'Sakura']);
$client->patch('users/42', ['email' => 'a@example.com']);
```

For any other method, or when the method is decided at runtime, use
`request()`. Its arguments are the method, the URL, the body, and the
options:

```php
$client->request('PROPFIND', 'files/', null, ['timeout' => 5]);
```

`sendRequest()` is different. It takes a prepared PSR-7 request and
transport options, not `HttpClientOptions`. Build the message with the
factories described on the [Messages](./messages) page:

```php
use Windwalker\Http\HttpFactory;
use Windwalker\Http\Transport\Options\TransportOptions;

$factory = new HttpFactory();

$request = $factory->createRequest('GET', 'https://example.com/');

$response = $client->sendRequest(
    $request,
    new TransportOptions(timeout: 5),
);
```

**Pitfall:** `sendRequest()` sends the request as it is. It does not
apply the base URI, the default headers, or the client options, and it
does not emit `BeforeRequestEvent`. Set the full URL and headers on the
request yourself.

`mustRequest()` is the generic form of the `must*()` methods that throw
on an error status. See [Responses](#responses). Unlike the other
methods, its options parameter accepts only an `HttpClientOptions`
object, not an array:

```php
use Windwalker\Http\HttpClientOptions;

$response = $client->mustRequest(
    'GET',
    'users/42',
    null,
    new HttpClientOptions(timeout: 5),
);
```

## Options and Layers

Options are merged in two layers. The client options are the defaults,
and the options of each call are merged on top of them. Arrays and
`HttpClientOptions` objects are both accepted per call:

```php
$client->get(
    'users/42',
    [
        'timeout' => 3,
        'params' => ['fields' => 'name,email'],
    ],
);
```

Use `params` for query parameters. They are appended to the URL.

The `with*()` methods derive a new client and leave the original
unchanged. Use them to make a variant of a shared client:

```php
$admin = $client
    ->withDefaultHeader('X-Role', 'admin')
    ->withBaseUri('https://admin.example.com/v1/');
```

The options that apply to every transport are `timeout`, `userAgent`,
`followLocation`, `verifyPeer`, `certpath`, `files`, and `progress`.
Transport-specific settings are described on the
[Transports](./transports) page.

**Pitfall:** `verifyPeer` is `true` by default and checks the server
certificate. Setting it to `false` disables TLS verification and exposes
your credentials to anyone on the network path. Use it only in local
tests, and prefer `certpath` for a private certificate authority.

**Pitfall:** Relative URLs are concatenated to the base URI as strings.
Write the base URI with a trailing slash and the path without a leading
slash, for example `users/42`. A URL that starts with a scheme, such as
`https://...`, is sent unchanged and ignores the base URI.

## Uploads and Form Data

Send a multipart form with `formData()`. Wrap files with
`uploadFile()`, `uploadFileData()`, or `uploadFileStream()`:

```php
$body = HttpClient::formData(
    [
        'title' => 'Avatar',
        'file' => HttpClient::uploadFile(
            '/tmp/avatar.png',
            'image/png',
        ),
    ],
);

$client->post('uploads', $body);
```

A `FormData` object is encoded as multipart by the client. A plain array
is encoded as JSON, so do not pass a file inside an array body.

## Downloads

`download()` writes the response body to a file instead of memory. The
second argument is a path, and it must not be empty:

```php
$client->download(
    'https://example.com/exports/report.csv',
    '/tmp/report.csv',
);
```

When you pass a URL string, `download()` sends a `GET`. For another
method or a body, build the request yourself and pass it as the first
argument. `HttpClient::createRequest()` builds it with the same rules as
the other methods:

```php
$request = HttpClient::createRequest(
    'POST',
    'reports/export',
    ['month' => '2026-10'],
);

$client->download($request, '/tmp/report.csv');
```

To write a response to a file without `download()`, call the method
directly and set `writeStream` in the transport options. The same
approach works for `post()`.

The main benefit of `writeStream` is memory. When the driver supports
it, the body is written to the stream chunk by chunk as it arrives, so
the full response is never held in memory. This matters for large
exports or backups, where loading the body into a string could exhaust
the PHP memory limit. `CurlTransport` and `StreamTransport` both write
this way:

```php
use Windwalker\Http\HttpClientOptions;
use Windwalker\Http\Transport\Options\CurlOptions;
use Windwalker\Stream\Stream;

$file = new Stream(fopen('/tmp/report.csv', 'w'));

$client->post(
    'reports/export',
    ['month' => '2026-10'],
    new HttpClientOptions(
        transport: new CurlOptions(writeStream: $file),
    ),
);
```

`writeStream` also accepts a path, such as `'/tmp/report.csv'`, in the
same place.

**Pitfall:** When the target is a stream object, the body is written to
the stream and `getContent()` returns an empty string. Read the file after
the request completes.

## Asynchronous Requests

Every verb has an `Async` variant, such as `getAsync()` or
`postAsync()`. These calls return a promise immediately. `requestAsync()`
is the generic form:

```php
use Windwalker\Promise\Promise;

[$first, $second] = Promise::all(
    [
        $client->getAsync('users/1'),
        $client->getAsync('users/2'),
    ],
)->wait();

$name = $first->toArray()['name'];
```

The concurrent requests run through `MultiCurlTransport`. The async
methods need `CurlTransport`, and the client throws a `DomainException`
if the transport is different.

**Pitfall:** `wait()` blocks the caller until all promises settle. Call
it once, at the point where you need the results.

## Events

The client emits `BeforeRequestEvent` before the request is built and
`AfterRequestEvent` after the response is received. Subscribe with
`on()`:

```php
use Windwalker\Http\Event\HttpClient\AfterRequestEvent;
use Windwalker\Http\Event\HttpClient\BeforeRequestEvent;

$requestId = bin2hex(random_bytes(8));

$client->on(
    BeforeRequestEvent::class,
    function (BeforeRequestEvent $event) use ($requestId) {
        $event->options->headers['X-Request-Id'] = $requestId;
    },
);

$client->on(
    AfterRequestEvent::class,
    function (AfterRequestEvent $event) {
        $event->response->getStatusCode();
    },
);
```

Use `BeforeRequestEvent` to add headers or change the method and URL.
Use `AfterRequestEvent` for logging or metrics.

## Responses

Every call returns an `HttpClientResponse`. It is a PSR-7 response, so it
can be passed to any code that expects one, and it adds helpers for the
checks that API code repeats: the status family, JSON decoding, and
conversion to exceptions.

### Status Helpers

- `isSuccess()`: the 2xx family.
- `isRedirect()`: the 3xx family.
- `isAuthError()`: any 4xx client error, such as 401, 403, or 404.
- `isError()`: any 4xx or 5xx status.
- `isServerError()`: the 5xx family.

The name `isAuthError()` is broader than its name suggests. It is true for
every 4xx status, so compare the status code when you need one code only:

```php
$response = $client->get('users/999');

$response->isError();       // true
$response->isServerError(); // false
$response->isAuthError();   // true, because 404 is a 4xx status

if ($response->getStatusCode() === 401) {
    return $this->refreshToken();
}
```

### Reading the Body

`getContent()` returns the body as a string. `jsonDecode()` decodes JSON
and throws on invalid input. `toArray()` decodes the body with a format
and returns an array:

```php
$raw = $response->getContent();

$data = $response->jsonDecode(associative: true);

$items = $response->toArray();
```

`decode()` returns a `Collection` instead of an array. Use it when you
want the collection methods of Windwalker's data package:

```php
$collection = $response->decode('json');
```

**Pitfall:** `jsonDecode()` throws a `JsonException` when the body is not
valid JSON. An error page from a proxy is often HTML, so check the status
or the `Content-Type` before you decode.

### Converting to Exceptions

Three methods turn a response into an exception. They differ in whether
the exception is thrown:

```php
// Create the exception without throwing it.
$e = $response->toException();

// Throw the exception with the response attached.
$response->throw();

// Throw only when the status is an error.
$response->throwIfError();
```

`toException()` returns an `HttpRequestException` that holds the
response. `throw()` always throws it. `throwIfError()` does nothing when
the status is a success or a redirect.

To use your own exception class, pass its name. The class is created with
the reason phrase and the status code as its constructor arguments:

```php
use RuntimeException;

class ApiException extends RuntimeException
{
}

$response->throwIfError(ApiException::class);
```

**Pitfall:** The exception class must accept a message and a code in its
constructor, because the response is turned into it with those two
values. A class with a different constructor fails when the exception is
created.

### Catching HTTP Errors

The exception of a failed request exposes the response and its body.
Use it to log the server's message:

```php
use Windwalker\Http\Exception\HttpRequestException;

try {
    $client->mustPost('users', ['name' => 'Sakura']);
} catch (HttpRequestException $e) {
    $status = $e->response?->getStatusCode();
    $message = $e->getBodyString();
}
```

`getBodyString()` reads the body as text. `body` is the same content as
a PSR-7 stream.

### Response Information

`getInfo()` returns the information that the transport keeps about the
request. With `CurlTransport` this is the array of `curl_getinfo()`,
which includes timings and the effective URL:

```php
$info = $response->getInfo();

$url = $info['url'] ?? null;
```

The keys depend on the transport, so read them with a fallback instead of
assuming that they exist.

## Debugging

When a remote API rejects a request, the quickest way to find the cause
is to replay it outside the application. `toCurlCmd()` converts a
request into an equivalent `curl` command, so you can paste it into a
terminal, change one part, and run it again. The method is available on
the client, on the response, and on the exception of a failed request.

### Printing a Request

Call `toCurlCmd()` on the client with the same arguments as the request:

```php
echo $client->toCurlCmd(
    'POST',
    'users',
    ['name' => 'Sakura'],
);
```

This example logs the command of a failed request. The exception already
holds the request, so the command matches the call that failed:

```php
use Windwalker\Http\Exception\HttpRequestException;

try {
    $client->mustPost('users', ['name' => 'Sakura']);
} catch (HttpRequestException $e) {
    $this->logger->error(
        'Remote API rejected the request.',
        [
            'status' => $e->response?->getStatusCode(),
            'curl' => $e->toCurlCmd(),
        ],
    );
}
```

The output is a multi-line command. Its shape is similar to this
example, which is simulated:

```bash
curl --location --request POST 'https://api.example.com/v1/users' \
--header 'Content-Type: application/json; charset=utf-8' \
--data-raw '{"name":"Sakura"}'
```

### Three Entry Points

The command can be generated from three places:

```php
// From the client, with the arguments of a call.
$client->toCurlCmd('GET', 'users/42');

// From a failed request, through its exception.
$e->toCurlCmd();

// From any response, including a successful one.
$response->toCurlCmd();
```

The client accepts a `RequestInterface` in place of the method and URL,
so you can also print a prepared PSR-7 request:

```php
$client->toCurlCmd($request);
```

The exception and the response keep the request that was sent, so they
print the exact request. The client builds a new command from the
arguments, and that build runs the `BeforeRequestEvent` listeners, so
the command reflects any change they make.

### How the Command Is Built

The command includes the method, the target URL, and the headers. The
`Host` header is omitted, because `curl` sets it from the URL. The body
is written in the form that matches its content type:

- JSON bodies use `--data-raw`.
- `application/x-www-form-urlencoded` bodies use `--data-urlencode`.
- Other bodies, such as multipart forms, use `--form`.

Each part is quoted for a POSIX shell, so you can paste the command
without editing it.

**Pitfall:** The command contains every header, including
`Authorization` and `Cookie`, and the full request body. Do not write it
to a shared log or show it to users. Remove the sensitive headers before
you log it, or log it only in a development environment.

**Pitfall:** Generating a command does not send the request. It still
runs the `BeforeRequestEvent` listeners of the client, so a listener that
counts requests or writes to a log is called as well.
