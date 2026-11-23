---
layout: doc
title: S3 Service
description: Work with Amazon S3 objects, URLs, presigned links, and streams through Unicorn's S3Service.
---

# S3 Service

`S3Service` wraps the AWS SDK's `S3Client` with the conventions Unicorn uses.
It adds the bucket and subfolder from the storage configuration to every
key, builds public URLs through the CDN when one is configured, and offers
helpers for presigned links, listings, and streams.

The [Storage](/documentation/unicorn/services/storage) layer uses this class
internally. Use it directly when you need an S3-only feature, such as a
presigned URL, a listing, or a raw AWS command.

## Getting the Service

The [container](/documentation/framework/core-concepts/dependency-injection/dependency-injection) binds `S3Service` to the `s3` storage instance, so a lookup
without a tag returns the service for that bucket:

```php
use Unicorn\Aws\S3Service;

/** @var S3Service $s3 */
$s3 = $app->retrieve(S3Service::class);
```

Another S3 account is available through its storage. `S3Storage` exposes
its service with `getS3Service()`:

```php
use Unicorn\Storage\Adapter\S3Storage;
use Unicorn\Storage\StorageInterface;

/** @var S3Storage $storage */
$storage = $app->retrieve(StorageInterface::class, tag: 'backup_s3');

$backup = $storage->getS3Service();
```

To create a service from settings in code, use `StorageFactory`. The factory
attaches the middleware that applies the subfolder and default arguments to
every command:

```php
use Unicorn\Storage\StorageFactory;

$factory = $app->retrieve(StorageFactory::class);

$s3 = $factory->s3Service([
    'access_key' => env('AWS_ACCESS_KEY'),
    'secret' => env('AWS_SECRET'),
    'bucket' => 'media-bucket',
    'subfolder' => 'site-a',
    'region' => 'ap-northeast-1',
]);
```

::: info
A service built with `new S3Service(...)` directly does not get the
subfolder middleware. Keys then reach S3 without the subfolder prefix. Use
`StorageFactory` unless you need that behavior.
:::

## Complete Example

A contract page shows a download link for a private file. The link is valid
for ten minutes, and it saves the file under a name the user chose. The
service checks the object first, so the page never links to a missing file:

```php
use Unicorn\Aws\S3Service;
use Windwalker\Http\Helper\HeaderHelper;

class ContractLinks
{
    public function __construct(protected S3Service $s3) {}

    public function linkFor(string $key, string $name): ?string
    {
        if (!$this->s3->exists($key)) {
            return null;
        }

        $disposition = HeaderHelper::attachmentContentDisposition($name);

        return (string) $this->s3->getPreSignedUrl(
            $key,
            '+10 minutes',
            [
                'ResponseContentDisposition' => $disposition,
            ],
        );
    }
}

$links = $app->service(ContractLinks::class);

echo $links->linkFor('contracts/2026/acme.pdf', 'Acme contract.pdf');
```

The class receives `S3Service` through its constructor. The container passes
the default bucket service, so the class never names a bucket.

## Configuration Options

The service reads its settings from the array the storage was created with.
The table lists the keys that `S3Service` itself uses:

| Option | Type | Description |
| --- | --- | --- |
| `access_key` | `string` | Returned by `getKey()`. |
| `secret` | `string` | Returned by `getSecret()`. Keep it out of views and logs. |
| `bucket` | `string` | Default bucket for every command. Required. |
| `subfolder` | `string` | Prefix for every key. `getHost()` appends it to the host path. |
| `cdn.root` | `string` | Base URL for `getViewerHost()`, `getUri()`, and signed links. |
| `cdn.provider` | `string` | `cloudfront` makes signed links use CloudFront. |
| `cdn.private_key` | `string` | Path to the CloudFront private key file. |
| `cdn.key_pair_id` | `string` | CloudFront key pair ID for signed links. |

The client created by `StorageFactory::s3Client()` also reads these keys:

| Option | Type | Description |
| --- | --- | --- |
| `credentials` | `CredentialsInterface` | Replaces `access_key` and `secret`. |
| `region` | `string` | AWS region. Defaults to `storage.s3.default_region`. |
| `version` | `string` | SDK API version. Defaults to `latest`. |
| `endpoint` | `string` | Custom endpoint for an S3-compatible service. |
| `http` | `array` | HTTP client options. |
| `args` | `array` | Arguments added to every command, such as `ACL`. |
| `public_host` | `string` | Replaces `ObjectURL` in results. |
| `cdn.auto_clear_cache` | `bool` | Clears the CloudFront cache for a changed key. |
| `cdn.id` | `string` | CloudFront distribution ID for cache clearing. |

## Working with Objects

Methods that take a key accept the path inside the subfolder. The client
adds the subfolder for you:

```php
// Upload a local file. The file is streamed to S3.
$s3->uploadFile('/tmp/q4.pdf', 'reports/q4.pdf', [
    'ACL' => S3Service::ACL_PRIVATE,
    'ContentType' => 'application/pdf',
]);

// Upload a string.
$s3->uploadFileData('hello', 'notes/hello.txt');

// Send any PutObject arguments, for full control.
$s3->putObject([
    'Key' => 'notes/raw.txt',
    'Body' => 'raw body',
    'CacheControl' => 'max-age=3600',
]);

// Read metadata without downloading the body.
$info = $s3->getFileInfo('reports/q4.pdf');
$size = $info['ContentLength'];

// Check whether the object exists.
if ($s3->exists('reports/q4.pdf')) {
    // ...
}

// List objects under a prefix. Keys have no subfolder prefix.
foreach ($s3->listObjects('reports/') as $object) {
    $key = $object['Key'];
    $url = (string) $object['Uri'];
}

// Delete a file by key or by full URL.
$s3->deleteFile('reports/q4.pdf');
```

::: tip
`uploadFile()` and `uploadFileData()` pass `ContentType` through as given.
The storage layer replaces it with its own guess, so set `mime_type` when
you use [Storage](/documentation/unicorn/services/storage).
:::

::: info
`deleteByFullPath()` is deprecated. Use `deleteFile()`, which accepts the
same full URLs.
:::

### Running Other Commands

`runCommand()` sends any AWS command by name. The subfolder and default
arguments still apply. Use it for operations without a helper method:

```php
// Send a HeadBucket request to check the bucket.
$s3->runCommand('HeadBucket', [
    'Bucket' => $s3->getBucketName(),
]);
```

## URLs and Hosts

`S3Service` builds URLs from the endpoint, the bucket, and the subfolder.
The CDN root takes priority for public URLs when it is set:

```php
// The storage host, in virtual style: bucket.endpoint/subfolder.
$s3->getHost();

// The storage host, in path style: endpoint/bucket/subfolder.
$s3->getHost(true, true);

// The CDN root when cdn.root is set, else the storage host.
$s3->getViewerHost();

// A public URL for a key, built from the viewer host.
$url = $s3->getUri('reports/q4.pdf');

// Turn a full URL back into a key.
$key = $s3->getPathFromFullUrl($url);
```

`getHost()` uses path style for an IP endpoint, for an HTTPS endpoint with a
dotted bucket name, or when `$pathStyle` is `true`.

::: warning
`getPathFromFullUrl()` recognizes the storage host, the path-style host, and
the CDN root. Any other URL is returned unchanged. `deleteFile()` and
`getPreSignedUrl()` then use that whole string as the key, which points at
the wrong object. Pass keys, or URLs from the same storage, to these methods.
:::

## Presigned Links

A presigned link lets a client read a private object for a limited time.
The expiration is a relative time such as `+300seconds` or `+5 minutes`, or
a `DateTimeInterface`:

```php
// A signed GetObject URL, valid for five minutes.
$url = $s3->getPreSignedUrl('reports/q4.pdf', '+5 minutes');

// The same link, with a download name in UTF-8.
$url = $s3->getPreSignedUrlWithFilename(
    'reports/q4.pdf',
    '+5 minutes',
    'Q4 report.pdf',
);
```

The third argument of `getPreSignedUrl()` is passed to `GetObject`. Use it
for response headers, such as `ResponseContentDisposition`. See
[Original File Names on Download](/documentation/unicorn/services/storage#original-file-names-on-download)
for the header helpers.

When `cdn.provider` is `cloudfront`, `getPreSignedUrl()` signs the CDN URL
instead. It needs `cdn.private_key` and `cdn.key_pair_id`:

```php
// etc/packages/storage.config.php, inside the s3 instance options
'cdn' => [
    'root' => 'https://cdn.example.com',
    'provider' => 'cloudfront',
    'private_key' => env('CLOUDFRONT_PRIVATE_KEY_PATH'),
    'key_pair_id' => env('CLOUDFRONT_KEY_PAIR_ID'),
],
```

::: info
Keep the CloudFront private key file readable by the PHP process only, and
outside the public web root.
:::

## Streams

Streams read a large object without loading it into memory:

```php
// A seekable PHP resource for the key.
$handle = $s3->createReadStream('reports/q4.pdf');

// A PSR-7 stream, for example as a response body.
$stream = $s3->createPsr7ReadStream('reports/q4.pdf');

// Open s3:// paths with fopen() after registering the wrapper.
$s3->registerStreamWrapperV2();
```

::: info
`createReadStream()` returns `false` when the stream cannot be opened.
Check the result before reading from it.
:::

## Client and Settings Access

The service exposes its client and the values it was built with:

```php
use Aws\S3\S3Client;

$client = $s3->getClient();

// Replace the client, for example in a test.
$s3->setClient($mockClient);

$bucket = $s3->getBucketName();   // Throws when no bucket is set.
$subfolder = $s3->getSubfolder();
```

`getBucketName()` throws when the bucket is empty:

```php
// ERROR: UnexpectedValueException: Please enter bucket first.
```

::: warning
`getSecret()` returns the secret access key. Do not print it, render it in
a template, or write it to a log.
:::

## Access Constants

The class provides canned ACL values, storage classes, and server-side
encryption values. Pass them in the arguments of a write:

```php
$s3->uploadFile('/tmp/contract.pdf', 'private/contract.pdf', [
    'ACL' => S3Service::ACL_PRIVATE,
    'StorageClass' => S3Service::STORAGE_CLASS_STANDARD,
    'ServerSideEncryption' => S3Service::SSE_AES256,
]);
```

## Related

- [Storage](/documentation/unicorn/services/storage)
- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
- [Image Processing](/documentation/unicorn/services/uploader/image-processing)
