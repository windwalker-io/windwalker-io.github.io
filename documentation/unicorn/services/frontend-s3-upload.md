---
layout: doc
title: Frontend S3 Upload
description: Upload files from the browser straight to S3, as one request or as multipart chunks.
---

# Frontend S3 Upload

Uploads that pass through PHP use PHP's memory and time twice. PHP receives
the whole file, then sends it to S3 again. Frontend S3 upload removes that
second step. PHP only signs a policy or a request, and the browser sends the
file bytes directly to the bucket.

Unicorn offers two methods:

- **Direct upload** sends the file in one signed POST form. Use it for files
  that a single request can carry.
- **Multipart upload** splits the file into chunks in the browser. Each
  chunk is signed and sent on its own. Use it for large files.

## Choosing a Method

Both methods share the bucket setup. They differ in what PHP signs and in
the JavaScript object you call:

- Direct upload: `AwsScript::s3BrowserUploader()` on the PHP side, and
  `useS3Uploader()` on the JavaScript side.
- Multipart upload: `S3MultipartUploadController` or your own controller
  with `S3MultipartUploadControllerTrait` on the PHP side, and
  `useS3MultipartUploader()` on the JavaScript side.

## Bucket Setup

The browser calls the bucket directly, so the bucket must allow the origin
of your site. Add a CORS rule to the bucket:

```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
            "AllowedOrigins": ["https://example.com"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3600
        }
    ]
}
```

Apply the rule with the AWS CLI. The `--endpoint-url` option is needed for
S3-compatible services:

```bash
aws s3api put-bucket-cors \
  --cors-configuration file://cors.json \
  --bucket my-bucket \
  --endpoint-url https://s3.example.com
```

::: warning
Allow only your site origins. A wildcard origin lets any web page send
requests to the bucket.
:::

::: info
`ExposeHeaders` must include `ETag`. The multipart uploader reads the ETag
of each part, and the browser hides it otherwise.
:::

## Direct Upload

Direct upload embeds a signed POST policy in the page. The policy lets the
browser upload to one bucket for a limited time, with the conditions PHP
set.

### Enabling the Uploader

Call `AwsScript::s3BrowserUploader()` in the controller that renders the
page. The first argument is a name. JavaScript uses it to find the uploader:

```php
use Unicorn\Aws\S3Service;
use Unicorn\Script\AwsScript;

$awsScript = $app->service(AwsScript::class);

$awsScript->s3BrowserUploader(
    'video',
    S3Service::ACL_AUTHENTICATED_READ,
);
```

The second argument is the ACL of each uploaded object. It defaults to
`S3Service::ACL_PUBLIC_READ` when you omit it, so pass the ACL you need.

The third argument takes options. The `profile` key selects the S3 storage
instance from [Storage](/documentation/unicorn/services/storage):

```php
$awsScript->s3BrowserUploader(
    'image',
    S3Service::ACL_PUBLIC_READ,
    [
        'profile' => 'backup_s3',
    ],
);
```

A storage that is not S3 is rejected:

```php
// ERROR: DomainException: Storage profile "local" must be S3Storage.
```

### Uploading from JavaScript

Get the uploader by its name, then call `upload()` with the file and a
path. The path can contain `{ext}`, which the uploader replaces with the
extension of the file:

```js
import { useS3Uploader } from '@windwalker-io/unicorn-next';

const s3 = await useS3Uploader('video');

const res = await s3.upload(file, 'videos/clip.{ext}');

console.log(res.url);
```

The `url` is the viewer host followed by the path. The subfolder and the
storage host are chosen by the storage configuration, as described in
[Storage](/documentation/unicorn/services/storage).

### Complete Example

A form has a file input and a hidden field that stores the uploaded URL.
PHP prepares the uploader for the page, and JavaScript fills the field
after the upload succeeds:

```php
use Unicorn\Aws\S3Service;
use Unicorn\Script\AwsScript;

// In the controller that renders the form.
$app->service(AwsScript::class)->s3BrowserUploader(
    'video',
    S3Service::ACL_AUTHENTICATED_READ,
    [
        'starts_with' => [
            'key' => 'videos/',
        ],
    ],
);
```

```js
import { useS3Uploader } from '@windwalker-io/unicorn-next';

const input = document.querySelector('#video');
const urlField = document.querySelector('#video-url');
const s3 = await useS3Uploader('video');

input.addEventListener('change', async () => {
  const file = input.files[0];

  if (!file) {
    return;
  }

  try {
    const { url } = await s3.upload(
      file,
      'videos/' + crypto.randomUUID() + '.{ext}',
    );

    urlField.value = url;
  } catch (e) {
    console.error('Upload failed:', e);
  }
});
```

### Paths and Extensions

A `File` keeps its own extension. A `Blob` or a string has none, so the
path must name the extension:

```js
// File: the .mp4 extension is taken from the file name.
await s3.upload(file, 'videos/clip.{ext}');

// String or Blob: write the extension in the path.
await s3.upload(text, 'notes/readme.txt');
```

A `{ext}` placeholder with a string or a Blob fails before the request is
sent:

```js
// ERROR: Error: If using Blob or file data string, you must provide
//        a valid file extension in the path.
await s3.upload(text, 'notes/readme.{ext}');
```

### Download Names and Headers

Pass `filename` to make the browser save the file under a readable name.
The uploader sets an `attachment` Content-Disposition with a UTF-8 name:

```js
await s3.upload(file, 'files/' + id + '.{ext}', {
  filename: '[Windwalker] Report 2026.pdf',
  'Content-Type': 'application/pdf',
});
```

`Content-Type` and `Content-Disposition` can be sent because they are in the
default `starts_with` list of the uploader. A `filename` option replaces an
explicit `Content-Disposition` value. To send another header, add its key
to `starts_with` in the PHP options.

### Progress and Events

Pass `onUploadProgress` for one upload. Use the events for a reusable
uploader:

```js
await s3.upload(file, path, {
  onUploadProgress: (e) => {
    progress.value = Math.round(e.loaded / e.total * 100);
  },
});

s3.onStart((formData) => { /* Before the request is sent. */ })
  .onProgressWithTotal((ratio, e) => { /* ratio = loaded / total */ })
  .onSuccess((url, res) => { /* The file is stored. */ })
  .onEnd(() => { /* Runs after success or failure. */ });
```

The first argument of `onProgressWithTotal()` is a ratio from 0 to 1, not a
percentage.

### Restricting the Destination

The policy allows any key in the bucket until it expires, unless the PHP
side sets a prefix. The default `starts_with` key is an empty string:

```php
// Any key in the bucket is accepted until the policy expires.
$awsScript->s3BrowserUploader('video', $acl);

// Only keys under videos/ are accepted.
$awsScript->s3BrowserUploader('video', $acl, [
    'starts_with' => [
        'key' => 'videos/',
    ],
]);
```

::: warning
The policy is valid for two hours. Anyone who can load the page can upload
to every key the policy allows during that time. Always set a key prefix and
the narrowest ACL for each uploader.
:::

## Multipart Upload

A single request has a size limit, and a failed large request must start
over. Multipart upload splits the file into chunks. Each chunk is uploaded
on its own, and S3 joins the chunks after the last one arrives.

### How It Works

The browser and PHP exchange four requests for each upload:

- `init` creates the multipart upload and returns its ID.
- `sign` returns a signed URL for one part. It runs once per part.
- The browser sends each part to S3 with a `PUT`, then reads its ETag.
- `complete` joins the parts. Only this step makes the file available.

If a part fails or the user cancels, the browser calls `abort`, which
discards the parts. Unicorn does not resume an interrupted upload. Every part
except the last must be at least 5 MiB, so the default chunk size is 5 MiB.

### Routes

Register a route for the controller. The four actions are the `{task}`
values, and the route needs a login [middleware](/documentation/framework/core-concepts/http-routing/middleware) in front of it:

```php
use Lyrasoft\Luna\Middleware\LoginRequireMiddleware;
use Unicorn\Controller\S3MultipartUploadController;

$router->any('multipart_upload', '/upload/s3/multipart[/{task}]')
    ->controller(S3MultipartUploadController::class, 'ajax')
    ->middleware(LoginRequireMiddleware::class);
```

::: warning
Without a login middleware, anyone can start uploads to any key in the
bucket. The `path` and `profile` values come from the browser, so the route
must be protected.
:::

Then push the route name to the page's JavaScript data in the controller
that renders the page:

```php
use Unicorn\Script\UnicornScript;

$app->retrieve(UnicornScript::class)->addRoute('@multipart_upload');
```

### Customizing the Uploader

The controller creates an `S3MultipartUploader` for each request. Set its
properties in `configureUploader()`. There are two ways to do this.

With your own controller, use the trait and implement
`configureUploader()`:

```php
use Unicorn\Aws\S3MultipartUploadControllerTrait;
use Unicorn\Aws\S3MultipartUploader;
use Windwalker\Core\Attributes\Controller;

#[Controller]
class VideoUploadController
{
    use S3MultipartUploadControllerTrait;

    protected function configureUploader(
        S3MultipartUploader $uploader,
    ): void
    {
        $uploader->profile = 'backup_s3';
        $uploader->presignExpires = '+15 minutes';
    }
}
```

Register it with `->controller(VideoUploadController::class, 'ajax')`.

With the shipped controller, set the callback as a route extra:

```php
$router->any('multipart_upload', '/upload/s3/multipart[/{task}]')
    ->controller(S3MultipartUploadController::class, 'ajax')
    ->extra(
        'configureUploader',
        function (S3MultipartUploader $uploader): void {
            $uploader->profile = 'backup_s3';
        }
    );
```

The properties you can set are listed here:

| Property | Default | Description |
| --- | --- | --- |
| `profile` | `null` | S3 storage instance name. `null` uses the default storage, which must be S3. |
| `acl` | `authenticated-read` | ACL added when the browser sends none. Set `null` for services without ACL support. |
| `presignExpires` | `+10 minutes` | How long each part's signed URL stays valid. |
| `allowedExtra` | `ContentDisposition`, `ContentType` | AWS arguments the browser may send. Add keys with `allowExtra()`. |
| `autoUpdateExpires` | `false` | Update the bucket's abort rule on every `init`. |
| `tempExpireDays` | `7` | Days before an incomplete upload is aborted by the bucket rule. |

`allowExtra()` takes the keys to add to `allowedExtra`:

```php
protected function configureUploader(S3MultipartUploader $uploader): void
{
    // Let the browser send an ACL and a download header.
    $uploader->allowExtra('ACL', 'ContentDisposition');
}
```

::: warning
Only allow the keys the browser needs. Every allowed key is passed to
`CreateMultipartUpload`, so each one must be a valid argument of that
command.
:::

### Complete Example

A video page uses multipart upload for large files. The uploader splits the
file into 10 MiB chunks and sends three at a time. Progress shows in a bar,
and the user can cancel:

```js
import { useS3MultipartUploader } from '@windwalker-io/unicorn-next';

const input = document.querySelector('#video');
const bar = document.querySelector('#progress-bar');
const urlField = document.querySelector('#video-url');
const cancelButton = document.querySelector('#cancel');

const s3 = await useS3MultipartUploader({
  routes: {
    init: '@multipart_upload/init',
    sign: '@multipart_upload/sign',
    complete: '@multipart_upload/complete',
    abort: '@multipart_upload/abort',
  },
  chunkSize: 10 * 1024 * 1024,
  concurrency: 3,
  leaveAlert: true,
});

input.addEventListener('change', async () => {
  const file = input.files[0];

  if (!file) {
    return;
  }

  const controller = new AbortController();

  cancelButton.onclick = () => controller.abort();

  try {
    const { url } = await s3.upload(
      file,
      'videos/' + crypto.randomUUID() + '.{ext}',
      {
        filename: file.name,
        abortController: controller,
        onProgress: (e) => {
          bar.style.width = e.percentage.toFixed(1) + '%';
        },
      },
    );

    urlField.value = url;
  } catch (e) {
    console.error('Upload failed:', e);
  }
});
```

### Options

The uploader takes these options when it is created:

| Option | Type | Description |
| --- | --- | --- |
| `routes` | object or function | Route for each action. A function receives the action name. |
| `profile` | string | S3 storage instance name, sent with every request. |
| `chunkSize` | number | Part size in bytes. Defaults to 5 MiB. |
| `concurrency` | number | Parts sent at the same time. Defaults to 2. |
| `leaveAlert` | boolean | Ask for confirmation before the page closes during an upload. |
| `requestHandler` | function | Replaces the AJAX call for every action. |
| `onProgress` | function | Progress for every upload. |
| `ACL` | string | ACL sent with every upload. Needs `allowExtra('ACL')` in PHP. |
| `extra` | object | AWS arguments sent with every upload. Each key must be allowed in PHP. |

Each `upload()` call accepts these options:

| Option | Type | Description |
| --- | --- | --- |
| `filename` | string | Download name. PHP sets an attachment Content-Disposition from it. |
| `ContentType` | string | Content type. Defaults to the type of the file. |
| `ACL` | string | ACL for this upload. Needs `allowExtra('ACL')` in PHP. |
| `extra` | object | AWS arguments for this upload. Each key must be allowed in PHP. |
| `onProgress` | function | Progress for this upload. |
| `abortController` | AbortController | Cancels the upload. |

Chunk size can also be changed after the uploader is created:

```js
s3.setChunkSize(10 * 1024 * 1024);

// Or in MiB.
s3.setChunkSizeInMiB(30);
```

### Events

The uploader fires these events. Each handler receives the data shown:

```js
s3.on('start', (file, data) => {
  // data.path and data.extra, before the upload is initialized.
});

s3.on('inited', ({ id, path }) => {
  // The multipart upload was created in S3.
});

s3.on('progress', ({ percentage, loaded, total }) => {
  // Progress of the whole file.
});

s3.on('success', ({ url, id, path }) => {
  // The complete step finished and the file is available.
});

s3.on('failure', ({ error, id, path }) => {
  // The upload failed and abort was requested.
});
```

### Custom Requests

By default, the uploader calls the routes with the [Unicorn HTTP client](/documentation/unicorn/javascript-frontend/ui/http-client). To
send the requests yourself, set `requestHandler`. It receives the action and
the data, and it must return the data part of the JSON response:

```js
const s3 = await useS3MultipartUploader({
  routes: {
    init: '@multipart_upload/init',
    sign: '@multipart_upload/sign',
    complete: '@multipart_upload/complete',
    abort: '@multipart_upload/abort',
  },
  requestHandler: async (action, data) => {
    const response = await fetch('/upload/s3/multipart/' + action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(data),
    });

    return (await response.json()).data;
  },
});
```

### Cancel and Leave Alert

Pass an `AbortController` to `upload()` to cancel an upload. The uploader
sends `abort` to PHP, so the parts are discarded. With `leaveAlert: true`,
the browser asks for confirmation when the user closes the page or goes
back during an upload.

### Abandoned Uploads

A user can close the browser during an upload, and then no `abort` request
is sent. The parts stay in the bucket and take space until a rule removes
them. Add a bucket rule that aborts incomplete multipart uploads after a
number of days:

```php
protected function configureUploader(S3MultipartUploader $uploader): void
{
    // Write the rule on every init. The default is false.
    $uploader->autoUpdateExpires = true;

    // Abort incomplete uploads after three days.
    $uploader->tempExpireDays = 3;
}
```

Call `updateExpiresRules()` yourself when you prefer to set the rule once:

```php
$uploader->updateExpiresRules();
```

::: info
`autoUpdateExpires` reads and writes the bucket's lifecycle configuration on
every `init`. The credentials need permission for both calls.
:::

## Cloudflare R2

R2 does not support ACLs. Set the uploader's `acl` property to `null`, so
the uploader does not send one:

```php
protected function configureUploader(S3MultipartUploader $uploader): void
{
    $uploader->acl = null;
}
```

For the public URL of an uploaded file, set `public_host` and `cdn.root` in
the storage configuration, as described in
[Services That Require a Bound Domain](/documentation/unicorn/services/storage#services-that-require-a-bound-domain).
The `url` returned by `complete` then uses that domain.

## Related

- [Storage](/documentation/unicorn/services/storage)
- [S3 Service](/documentation/unicorn/services/s3-service)
- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
