---
layout: doc
title: Storage
description: Store, read, and link files on local disk, S3, or Flysystem S3 with Unicorn storages.
---

# Storage

A storage decides where files live. Your code calls one interface,
`StorageInterface`, and the configuration decides whether a file goes to
the local disk, an S3 bucket, or another S3 account. Moving from local disk
to S3 is then a configuration change, not an application change.

Unicorn uses storages in two places. The
[Upload Service](/documentation/unicorn/services/uploader/upload-service)
writes uploads through a storage. Your own code can also read, list, and
delete files through the same object.

## Storage Types

Unicorn ships three storage instances. Each one maps to its own adapter
class:

| Instance | Adapter | Backed by |
| --- | --- | --- |
| `local` | `LocalStorage` | A directory on the server |
| `s3` | `S3Storage` | The AWS SDK S3 client |
| `flys3` | `FlysystemStorage` | A Flysystem S3 adapter |

The sections below describe each type. The configuration and lookup steps
that apply to all of them come first.

## Defining Storage Instances

The host app keeps the storage configuration in
`etc/packages/storage.config.php`. Its `factories.instances` section defines
named storages. Each entry is a closure that returns a storage object created
by `StorageFactory`:

```php
// etc/packages/storage.config.php, inside the returned array
'factories' => [
    'instances' => [
        'local' => static function (StorageFactory $factory) {
            return $factory->localStorage([
                'path' => 'www/assets/upload',
                'uri_base' => 'assets/upload',
            ]);
        },
        's3' => static function (StorageFactory $factory) {
            return $factory->s3Storage([
                'access_key' => env('AWS_ACCESS_KEY'),
                'secret' => env('AWS_SECRET'),
                'bucket' => env('AWS_S3_BUCKET'),
                'region' => env('AWS_S3_REGION'),
            ]);
        },
    ],
],
```

The `default` key chooses the storage for an untagged lookup. The shipped
configuration reads it from `UPLOAD_STORAGE_DEFAULT` and falls back to
`local`.

A second S3 account is another instance name. Each name is a tag, so two
instances can point to the same kind of storage with different credentials:

```php
// etc/packages/storage.config.php, inside instances
'backup_s3' => static function (StorageFactory $factory) {
    return $factory->s3Storage([
        'access_key' => env('BACKUP_S3_ACCESS_KEY'),
        'secret' => env('BACKUP_S3_SECRET'),
        'bucket' => env('BACKUP_S3_BUCKET'),
        'region' => env('BACKUP_S3_REGION'),
    ]);
},
```

Storage factories take arrays. Storage has no option object, so every
option is a key in the array. The options for each type are listed in its
section.

## Getting a Storage

Look up `StorageInterface` from the container. Without a tag you get the
`default` instance. A tag selects a named instance:

```php
use Unicorn\Storage\StorageInterface;

// The default storage from the `default` key.
$storage = $app->retrieve(StorageInterface::class);

// A named storage, selected by tag.
$backup = $app->retrieve(StorageInterface::class, tag: 'backup_s3');
```

A service can receive the storage through its constructor. The
`#[Inject]` attribute selects the tag, as described in
[Injecting by Tag](/documentation/framework/core-concepts/dependency-injection/dependency-injection#injecting-by-tag):

```php
use Unicorn\Storage\StorageInterface;
use Windwalker\DI\Attributes\Inject;

class AvatarService
{
    public function __construct(
        #[Inject(tag: 'backup_s3')]
        protected StorageInterface $storage,
    ) {}
}
```

::: tip
Older code uses `StorageManager` to look up storages. It is deprecated.
Use `StorageInterface` with a tag instead.
:::

## Complete Example

An export job archives a generated PDF to the backup bucket. The service
receives the storage by tag, so the job never mentions a bucket name:

```php
use Unicorn\Storage\StorageInterface;
use Windwalker\DI\Attributes\Inject;

class ReportArchiver
{
    public function __construct(
        #[Inject(tag: 'backup_s3')]
        protected StorageInterface $storage,
    ) {}

    public function archive(string $localFile, string $name): string
    {
        $result = $this->storage->putFile(
            $localFile,
            'reports/' . date('Y/m') . '/' . $name,
            [
                'mime_type' => 'application/pdf',
            ],
        );

        return $result->getUriString();
    }
}

// In a controller or command:
$url = $app->service(ReportArchiver::class)
    ->archive('/tmp/q4.pdf', 'q4-summary.pdf');
```

## Writing and Reading Files

Every storage implements the same methods. Paths are relative to the
storage root, so `reports/2026/q4.pdf` works on every storage type:

```php
// Write a string.
$result = $storage->put('hello', 'notes/hello.txt');

// Write a local file.
$storage->putFile('/tmp/q4.pdf', 'reports/2026/q4.pdf');

// The PutResult describes what was written.
$result->path;          // notes/hello.txt
$result->fileSize;      // 5
$result->getUriString(true); // URI with a cache-busting suffix

// Check, read, and stream.
if ($storage->exists('reports/2026/q4.pdf')) {
    $content = $storage->read('reports/2026/q4.pdf');
}

// Stream large files instead of loading them into memory.
$stream = $storage->readStream('reports/2026/q4.pdf');

// List a folder. Each item is a GetResult.
foreach ($storage->listContents('reports/2026', true) as $item) {
    // ...
}

// Delete a file.
$storage->delete('reports/2026/q4.pdf');
```

`getUri($path)` returns the public URL of a file. How that URL is built
depends on the storage type, as described in each section below.

## Local Storage

The `local` instance writes to a directory on the server. It is the default
for development and for small sites that serve their files from the same
machine.

### Configuration

`localStorage()` takes these options:

| Option | Type | Description |
| --- | --- | --- |
| `path` | `string` | Directory for the files. A relative path starts at the project root. |
| `host` | `string` | Host used to build public URLs. |
| `uri_base` | `string` | Path prefix of public URLs, after the site root. |
| `uri_handler` | `callable` | Builds the public URL yourself. Receives the path. |

```php
// etc/packages/storage.config.php, inside instances
'local' => static function (StorageFactory $factory) {
    return $factory->localStorage([
        'path' => 'storage/uploads',
        'uri_base' => 'files',
        'host' => 'https://example.com',
    ]);
},
```

### Public URLs

`getUri()` joins the site root and `uri_base`, or calls `uri_handler` when
you set it. A `cdn.root` option passed to `getUri()` builds the URL from the
CDN instead:

```php
// https://example.com/files/notes/hello.txt
$storage->getUri('notes/hello.txt');

// https://cdn.example.com/notes/hello.txt
$storage->getUri('notes/hello.txt', [
    'cdn' => [
        'root' => 'https://cdn.example.com',
    ],
]);
```

::: warning
The default path, `www/assets/upload`, is inside the public web root.
Anyone who knows a file's URL can read it. Store private files outside
`www/`, or on a private S3 bucket.
:::

::: info
Local storage has no presigned URLs. Serve private local files through your
own download route, and send the `Content-Disposition` header from there.
:::

## S3 Storage

The `s3` instance uses the AWS SDK. It works with Amazon S3 and with
services that speak the S3 API, such as Cloudflare R2. Use it when files
must be served from a bucket, and when you need presigned links.

### Configuration

`s3Storage()` takes these options. The same keys build the client used by
[S3 Service](/documentation/unicorn/services/s3-service):

| Option | Type | Description |
| --- | --- | --- |
| `access_key` | `string` | Access key ID. |
| `secret` | `string` | Secret access key. |
| `credentials` | `CredentialsInterface` | Credentials object. Used instead of the keys. |
| `region` | `string` | AWS region. Defaults to `storage.s3.default_region`. |
| `version` | `string` | S3 API version. Defaults to `latest`. |
| `endpoint` | `string` | Custom endpoint for an S3-compatible service. |
| `bucket` | `string` | Bucket name. |
| `subfolder` | `string` | Prefix added to every object key. |
| `public_host` | `string` | Host used for the public URL of a stored file. See below. |
| `cdn` | `array` | CDN settings: `root`, `provider`, `auto_clear_cache`, `id`, `private_key`, and `key_pair_id`. |
| `http` | `array` | Options for the HTTP client. |
| `args` | `array` | Arguments added to every S3 command, such as `ACL`. |

### Public URLs and `public_host`

A stored file has two URLs. The `PutResult` returned by a write holds the
object URL from S3. `getUri()` builds a URL from the storage host or the
CDN. `public_host` changes the first one:

```php
// etc/packages/storage.config.php, inside the s3 instance options
'public_host' => 'https://media.example.com',
```

```php
$result = $storage->put('hello', 'notes/hello.txt');

// https://media.example.com/notes/hello.txt
$result->getUriString();

// The storage host, unless cdn.root is set. public_host is not used here.
$storage->getUri('notes/hello.txt');
```

Use `public_host` when the bucket is served from a domain you control. A
reverse proxy, a CDN, or a custom domain bound to the bucket all qualify.

::: info
The public URL is `public_host`, a slash, and the key you passed to the
write. The `subfolder` is not added, so include it in `public_host` when
the objects live under a subfolder:
:::

```php
// etc/packages/storage.config.php, inside the s3 instance options
'subfolder' => 'site-a',
'public_host' => 'https://media.example.com/site-a',
```

::: tip
Do not end `public_host` with a slash. The storage adds one between the host
and the key.
:::

::: info
When `cdn.root` is also set, it replaces the public URL that `public_host`
built, because the CDN option is applied last. `cdn.root` also drives
`getUri()`.
:::

### Services That Require a Bound Domain

Some object storage services only serve files through a domain that is bound
to the bucket. The API endpoint can accept requests, but it does not serve
the files to browsers. Cloudflare R2 is an example. Set `endpoint` to the
account endpoint for requests, set `public_host` to the bound domain for
URLs, and set `cdn.root` to the same domain so `getUri()` returns it:

```php
// etc/packages/storage.config.php, inside instances
'r2' => static function (StorageFactory $factory) {
    return $factory->s3Storage([
        'access_key' => env('R2_ACCESS_KEY'),
        'secret' => env('R2_SECRET'),
        'bucket' => env('R2_BUCKET'),
        'endpoint' => env('R2_ENDPOINT'),
        'region' => 'auto',
        'public_host' => env('R2_PUBLIC_HOST'),
        'cdn' => [
            'root' => env('R2_PUBLIC_HOST'),
        ],
    ]);
},
```

Here `R2_ENDPOINT` is the account endpoint, and `R2_PUBLIC_HOST` is the
bound domain, such as `https://files.example.com`.

::: tip
Use `PutResult::getUriString()` to store a file's URL, and `getUri()` to
build links for files that are already stored. Both return the bound domain
when `public_host` and `cdn.root` are set.
:::

### Access Control

For S3, the ACL is passed as a write option. The shipped `image` profile
uses public read, so every uploaded image is public:

```php
use Unicorn\Aws\S3Service;

// Anyone with the URL can read the object.
$storage->put($data, 'public/logo.png', [
    'ACL' => S3Service::ACL_PUBLIC_READ,
]);

// Only the owner can read it. Use a presigned URL to share it.
$storage->put($data, 'private/contract.pdf', [
    'ACL' => S3Service::ACL_PRIVATE,
]);
```

### Presigned URLs

A presigned URL gives temporary read access to a private S3 object. Use
`S3Service::getPreSignedUrl()`, which is bound to the `s3` instance. The
full API is on the [S3 Service](/documentation/unicorn/services/s3-service)
page:

```php
use Unicorn\Aws\S3Service;

/** @var S3Service $s3 */
$s3 = $app->retrieve(S3Service::class);

$url = $s3->getPreSignedUrl(
    'private/contract.pdf',
    '+5 minutes',
);
```

::: info
Presigned URLs exist only for S3. The `flys3` instance has no presigned
URLs, so use the `s3` instance for private links.
:::

### Original File Names on Download

Uploaded files often have random names, while users expect their original
names. `HeaderHelper` builds the `Content-Disposition` value for either case.
`attachmentContentDisposition()` forces a download, and
`inlineContentDisposition()` previews in the browser:

```php
use Windwalker\Http\Helper\HeaderHelper;

$download = HeaderHelper::attachmentContentDisposition(
    $originalName,
);

// Set the header when the object is stored.
$storage->putStream($stream, 'files/' . uid() . '.pdf', [
    'mime_type' => 'application/pdf',
    'ContentDisposition' => $download,
]);

// Or set it per link, when the URL is created.
$url = $s3->getPreSignedUrl(
    'files/' . $name,
    '+5 minutes',
    [
        'ResponseContentDisposition' => $download,
    ],
);
```

::: tip
Set the header on the presigned URL when the same file is shared under
different names. Set it on the object when every download uses one name.
:::

::: info
S3 sets `ContentType` from the file path. To choose the type yourself, pass
`mime_type`. A `ContentType` option is replaced by the storage's own guess.
:::

### Call Options for S3

Write, read, and link methods take an array of options. These are the
options this section uses:

| Option | Used by | Description |
| --- | --- | --- |
| `ACL` | Writes | Canned access control, such as `S3Service::ACL_PRIVATE`. |
| `mime_type` | Writes | Content type of the object. Overrides the guess from the path. |
| `ContentType` | Writes | Replaced by the storage's guess. Use `mime_type` instead. |
| `ContentDisposition` | Writes | Header stored with the object, such as one from `HeaderHelper`. |
| `ResponseContentDisposition` | `getPreSignedUrl()` | Response header for one presigned link. |
| `pathStyle` | `getUri()` | Builds path-style object URLs when `true`. |
| `cdn` | `getUri()` | Overrides the CDN root for one call. |

## Flysystem S3 Storage

The `flys3` instance builds a Flysystem S3 adapter. `flysystemStorage()`
wraps it as a `StorageInterface`, so the instance works like the others. Its
configuration uses the same account keys as `s3`, and it passes them to the
adapter factory:

```php
// etc/packages/storage.config.php, inside instances
'flys3' => static function (StorageFactory $factory) {
    return $factory->flysystemStorage(
        fn(FlysystemFactory $factory) => $factory->s3v3Adapter([
            'access_key' => env('AWS_ACCESS_KEY'),
            'secret' => env('AWS_SECRET'),
            'bucket' => env('AWS_S3_BUCKET'),
            'region' => env('AWS_S3_REGION'),
        ]),
    );
},
```

`s3v3Adapter()` takes these options:

| Option | Type | Description |
| --- | --- | --- |
| `access_key` | `string` | Access key ID. |
| `secret` | `string` | Secret access key. |
| `region` | `string` | AWS region. Defaults to `storage.s3.default_region`. |
| `endpoint` | `string` | Custom endpoint. Defaults to `https://s3.amazonaws.com`. |
| `version` | `string` | S3 API version. Defaults to `latest`. |
| `bucket` | `string` | Bucket name. |
| `subfolder` | `string` | Prefix added to every object key. |
| `acl` | `string` | Default visibility for writes: `public` or `private`. Defaults to `public`. |
| `http` | `array` | Options for the HTTP client. |

::: tip
`flysystem()` returns a Flysystem `Filesystem`. `flysystemStorage()` returns
a `StorageInterface`, which is what the storage lookup expects.
:::

`getUri()` and the `PutResult` URI come from the adapter. They use the
endpoint, the bucket, and the subfolder, so `public_host` and `cdn` have no
effect on this instance:

```php
// https://bucket.example.r2.test/site-a/notes/x.txt
$storage->put('hello', 'notes/x.txt')->getUriString();
```

::: info
Use `s3` when you need `public_host`, `cdn`, presigned URLs, or the S3
service methods. The `flys3` configuration is a Flysystem adapter, so its
`acl` option controls visibility instead of the S3 `ACL` argument.
:::

## Related

- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
- [Image Processing](/documentation/unicorn/services/uploader/image-processing)
- [S3 Service](/documentation/unicorn/services/s3-service)
- [Service Variants](/documentation/framework/core-concepts/dependency-injection/service-variants)
- [Configuration](/documentation/framework/getting-started/configuration)
