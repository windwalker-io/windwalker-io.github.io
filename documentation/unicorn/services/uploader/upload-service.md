---
layout: doc
title: Upload Service
description: Upload files with Unicorn profiles, validate them, and store them through a storage.
---

# Upload Service

The Upload Service receives files from forms, AJAX requests, and base64
strings. It checks the file, chooses the destination, optionally [processes](/documentation/unicorn/services/uploader/image-processing)
images, and writes the result to a storage. Without it, each controller
repeats the same error checks, extension checks, path building, and storage
calls.

## Profiles

Each upload mode is a profile. A profile is a `FileUploadOptions` object
under `file_upload.profiles` in `unicorn.config.php`. It sets the storage,
the directory, the accepted file types, and the image processing. The
shipped configuration defines `default`, `image`, and `frontend`.

Get the service from the container. Without a tag you receive the `default`
profile. A tag selects another profile:

```php
use Unicorn\Upload\FileUploadService;

// The `default` profile.
$uploader = $app->retrieve(FileUploadService::class);

// The `image` profile.
$uploader = $app->retrieve(FileUploadService::class, tag: 'image');
```

A service can also receive a profile through its constructor. Use the same
`#[Inject]` tag syntax as in
[Injecting by Tag](/documentation/framework/core-concepts/dependency-injection/dependency-injection#injecting-by-tag):

```php
use Unicorn\Upload\FileUploadService;
use Windwalker\DI\Attributes\Inject;

class ProfileController
{
    public function __construct(
        #[Inject(tag: 'image')]
        protected FileUploadService $uploader,
    ) {}
}
```

## Complete Example

A form saves a book with an optional cover image. The cover is stored under
a random name. If the form has no cover, the saved value stays unchanged:

```php
use Unicorn\Upload\FileUploadService;
use Windwalker\Core\Application\AppContext;

use function Windwalker\uid;

function saveBook(AppContext $app, array $data): void
{
    $uploader = $app->retrieve(FileUploadService::class, tag: 'image');

    // Returns null when no cover was sent.
    $cover = $uploader->handleFileIfUploaded(
        $app->file('cover'),
        'covers/' . uid() . '.{ext}',
    );

    $coverUri = $cover?->getUriString(true);

    $data['cover'] = $coverUri ?? $data['cover'] ?? null;

    // Save $data with your repository here.
}
```

`{ext}` becomes the extension of the uploaded file. `getUriString(true)`
adds a suffix to the URI, so browsers do not show an old cached image after
a replacement.

## Uploading Files

The service has one method per input. Each one returns a `PutResult` when it
succeeds. Use `getUriString()` to read the stored location:

```php
use Unicorn\Upload\FileUploadService;

$uploader = $app->retrieve(FileUploadService::class, tag: 'image');

// A required file: throws when the upload failed.
$result = $uploader->handleFile($app->file('photo'));

// An optional file: returns null when nothing was sent.
$result = $uploader->handleFileIfUploaded($app->file('photo'));

// A base64 data URI, such as a value from a canvas.
$result = $uploader->handleBase64(
    $app->input('image'),
    'avatars/me.{ext}',
);

// A file that already exists on the server. Use a path, not a URL.
$result = $uploader->handleFile(
    '/tmp/report.pdf',
    'reports/report.pdf',
);

// Raw content: a string, a resource, or a PSR-7 stream.
$result = $uploader->handleFileData($csv, 'exports/data.csv');

echo $result->getUriString();
```

::: info
`handleFile()` requires a file. When a form field is missing, `$app->file()`
returns `null`, and PHP raises a type error:

```php
// ERROR: TypeError: handleFile(): Argument #1 ($file) must be of
//        type UploadedFileInterface|SplFileInfo|string, null given
```

Use `handleFileIfUploaded()` for optional fields.
:::

## Destination Paths

The destination decides the final file path. When you omit it, the profile
`dir` and a random name are used. When you give one, it is used as it is,
and the profile `dir` is not added:

```php
// No destination: the profile dir and a random name.
// For example: images/2026/11/23/<uid>.jpg
$uploader->handleFile($file);

// A destination: used as given. The dir is not added.
$uploader->handleFile($file, 'docs/manual.{ext}');
// -> docs/manual.jpg
```

Placeholders are replaced when the file is stored. Date variables are
always available. File variables are available in `handleFile()`:

```php
$uploader->setPathVar('tenant', 'acme');

$uploader->handleFile(
    $file,
    'tenants/{tenant}/{year}/{month}/{basename}.{ext}',
);
// -> tenants/acme/2026/11/photo.jpg
```

The placeholders are:

- `{year}`, `{month}`, `{day}`, `{hour}`, `{minute}`, `{second}`
- `{timestamp}` for the Unix time
- `{ext}` for the extension of the input, or the output format of an image
- `{basename}` and `{filename}` for the client's file name
- `{folder}` when the upload includes its folder path
- Any name set with `setPathVar()`

::: warning
A fixed name such as `{basename}.{ext}` replaces an existing file with the
same path. Add `uid()` to the name when files must not overwrite each other.
`{basename}` comes from the client, so it is not a safe identifier.
:::

::: info
`FileUploadSubscriber` rewrites a result URI that starts with the site root.
The stored result then holds a path without the host or root, so
`getUriString()` returns, for example, `assets/upload/...`.
:::

## Per-Call Options

A call can change the profile options for one file. Pass an array with the
same keys as the profile options. This example stores a document privately,
even when the profile is public:

```php
use Unicorn\Aws\S3Service;

$uploader->handleFile(
    $file,
    'docs/' . uid() . '.{ext}',
    [
        'storageOptions' => [
            'ACL' => S3Service::ACL_PRIVATE,
        ],
    ],
);
```

The call values are merged over the profile values, so the call wins.

## Defining a Profile

A new mode is a profile. It belongs in the host app's
`etc/packages/unicorn.config.php`, inside `file_upload.profiles`. This
profile creates square avatars and always redraws the image:

```php
use Unicorn\Upload\FileUploadOptions;
use Unicorn\Upload\ResizeConfig;

// etc/packages/unicorn.config.php, inside file_upload.profiles
'avatar' => fn() => new FileUploadOptions(
    storage: 'local',
    dir: 'avatars/{year}',
    accept: 'image/*',
    forceRedraw: true,
    resize: new ResizeConfig(
        width: 256,
        height: 256,
        crop: true,
    ),
),
```

### FileUploadOptions

The profile is a `FileUploadOptions` object. Its constructor accepts these
options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `storage` | `string` | `'local'` | Name of the storage instance to write to. |
| `dir` | `?string` | `null` | Directory used when no destination is given. |
| `accept` | `array\|string\|null` | `null` | Allowed extensions or MIME types. A comma-separated string or an array. |
| `forceRedraw` | `bool` | `false` | Redraw every image, for untrusted uploaders. |
| `rawGif` | `bool` | `false` | Store GIF files without redraw or resize. |
| `optimize` | `bool\|array` | `false` | Optimize images after resizing. |
| `resize` | `ResizeConfig` | `new ResizeConfig()` | Image processing settings. |
| `storageOptions` | `array` | `[]` | Options sent to the storage on every write, such as `ACL`. |
| `options` | `array` | `[]` | Merged into `storageOptions` when set. |
| `sanitizeSvg` | `bool` | `true` | Sanitize SVG files. Turn it off only for trusted uploaders. |

`acceptExtensions` and `acceptMimeTypes` are computed from `accept`. They
cannot be set. The image options are explained on the
[Image Processing](/documentation/unicorn/services/uploader/image-processing)
page.

The `storage` key names a storage instance from
[Storage](/documentation/unicorn/services/storage).

To change one option for the rest of a request, set it on the service:

```php
$uploader->options->dir = 'avatars/' . $userId;
```

## Accepting File Types

The `accept` list limits which files the profile stores. An entry without a
slash is an extension. An entry with a slash is a MIME type, and wildcards
are allowed:

```php
// Extensions: entries without a slash.
'accept' => 'jpg,png,pdf',

// MIME types: entries with a slash.
'accept' => ['image/*', 'application/pdf'],
```

The check uses the extension of the destination, not the name sent by the
browser. The MIME check maps that extension to its type. Both checks must
pass when both kinds of entries are set.

::: warning
Without an extension list, the service blocks executable and active-content
extensions such as `php`, `html`, `js`, and `exe`. This includes names such
as `shell.php.jpg`. It is a block list, not an allow list. Set `accept` on
every profile that takes files from users.
:::

Destinations are also checked. A destination with a `..` segment or a NUL
byte is rejected before anything is stored.

The service throws these errors:

```php
// ERROR: DomainException: File extension is not allowed. (400)
// ERROR: DomainException: File type is not allowed. (400)
// ERROR: FileUploadException: Upload error: ... (400)
```

## Uploads from the Browser

The `file_upload` [route](/documentation/framework/core-concepts/http-routing/routing) accepts uploads from AJAX and Unicorn fields, such as
`SingleDragImageField` and `MultiUploaderField`. It is a `POST` route named
`file_upload`, and it requires a [logged-in](/documentation/framework/core-concepts/security/authentication) user. It reads these inputs:

| Input | Description |
| --- | --- |
| `file` | Uploaded file. Used when `data` is not sent. |
| `data` | Base64 data URI. Used instead of `file`. |
| `profile` | Profile name. Omitted means `default`. |
| `dir` | Replaces the profile `dir` for this request. |
| `path` | Destination path. Omitted means a random name in `dir`. |
| `resize` | `1` enables resizing with the inputs below. `0` disables it. |
| `size` | `WIDTHxHEIGHT`. Used when `width` or `height` is not sent. |
| `width` | Width in pixels. |
| `height` | Height in pixels. |
| `crop` | `1` crops to the exact box. |
| `quality` | JPEG quality. |
| `output_format` | Output extension, for example `jpg`. |
| `orientate` | `1` rotates by EXIF orientation. |

The response contains the file URI in a `url` field. To pick a profile in
a link, add it as a query value:

```php
// $nav is a Navigator instance.
$nav->to('file_upload')->var('profile', 'image');

// Also set the directory and the path for one request.
$nav->to('file_upload')
    ->var('profile', 'image')
    ->var('dir', 'banners')
    ->var('path', 'banners/home.jpg');
```

::: warning
The route is protected by login, but the client still chooses the `profile`,
`dir`, and `path`. Any profile can be requested by name. A profile without an
`accept` list stores any file that is not blocked. Use a profile with an
`accept` list for user uploads, and never pass request input directly as a
destination in your own code.
:::

## Related

- [Storage](/documentation/unicorn/services/storage)
- [Image Processing](/documentation/unicorn/services/uploader/image-processing)
- [Dependency Injection](/documentation/framework/core-concepts/dependency-injection/dependency-injection)
