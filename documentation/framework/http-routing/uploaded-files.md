---
layout: doc
title: Uploaded Files
---

# Uploaded Files

## Overview

A browser sends an uploaded file in a `multipart/form-data` request. The
server stores the file in a temporary location and exposes it as a PSR-7
`UploadedFileInterface`. Windwalker reads these objects with `file()`,
and the `#[File]` attribute injects them into a method parameter.

The file layer has two parts:

- `AppRequest::file()`, also available as `AppContext::file()`: returns
  one file, several files, or all files.
- `Windwalker\Http\UploadedFile`: the object that moves and describes
  the file.

Uploaded files do not come from the query string or the parsed body.
Use [Request & Input](/documentation/framework/http-routing/request-and-input)
for the other input sources.

## Minimal Setup

The form must send `multipart/form-data`. Plain text fields in the same
form are still read with `input()`:

```blade
<form method="post" action="/profile/avatar"
    enctype="multipart/form-data">
    <input type="file" name="avatar">
    <button type="submit">Upload</button>
</form>
```

Read the file in a controller:

```php
<?php

$avatar = $app->file('avatar');
```

`file('avatar')` returns the `UploadedFileInterface` for the `avatar`
field, or `null` when the field is missing.

## Showcase: Saving an Avatar

The following controller validates the upload and moves it into a
storage folder. It runs end to end with the form above:

```php
<?php

declare(strict_types=1);

namespace App\Module\Front\Profile;

use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Controller\Controller;
use Windwalker\Http\Response\JsonResponse;

class ProfileController extends Controller
{
    public function avatar(AppContext $app): JsonResponse
    {
        $file = $app->file('avatar');

        if ($file === null || $file->getError() !== UPLOAD_ERR_OK) {
            return new JsonResponse(['error' => 'Upload failed.'], 400);
        }

        if ($file->getSize() > 2 * 1024 * 1024) {
            return new JsonResponse(['error' => 'File too large.'], 413);
        }

        $name = bin2hex(random_bytes(16)) . '.jpg';

        $file->moveTo('/path/to/storage/avatars/' . $name);

        return new JsonResponse(['saved' => $name]);
    }
}
```

Replace `/path/to/storage/avatars/` with the storage folder of your app.

```text
POST /profile/avatar  (avatar: 1 MB JPEG)   200  {"saved":"3f9c...jpg"}
POST /profile/avatar  (no file)             400  {"error":"Upload failed."}
POST /profile/avatar (5 MB file)  413  {"error":"File too large."}
```

The example checks the upload error code before it reads the size or
moves the file. A failed upload has no usable temporary file.

## Reading Files

`file()` has three forms:

- `file()` returns every uploaded file, keyed by field name.
- `file('avatar')` returns one file, or `null`.
- `file('avatar', 'banner')` returns a `Collection` keyed by field
  name. A missing field maps to `null`.

```php
<?php

$all = $app->file();

[$avatar, $banner] = $app->file('avatar', 'banner')->dump();
```

Use `#[File]` to inject a file into a method parameter. It follows the
same rules as `#[Input]`:

```php
<?php

use Psr\Http\Message\UploadedFileInterface;
use Windwalker\Core\Attributes\Request\File;

public function avatar(
    AppContext $app,
    #[File] ?UploadedFileInterface $avatar = null,
): JsonResponse {
    //
}
```

A non-nullable `#[File]` parameter with no upload throws a
`RuntimeException` with status code `400`.

## Working with `UploadedFile`

`UploadedFile` implements the PSR-7 methods. These are the ones you
call most often:

- `getError()`: an `UPLOAD_ERR_*` constant. `UPLOAD_ERR_OK` means the
  upload succeeded.
- `getSize()`: the size in bytes, or `null` when unknown.
- `getClientFilename()`: the name the browser sent.
- `getClientMediaType()`: the MIME type the browser declared.
- `moveTo($path)`: moves the file to `$path`.

::: warning
`getClientFilename()` and `getClientMediaType()` come from the client. Do
not use them as a storage path or as proof of the file type. Generate
the stored name yourself, and check the content of the file when the type
matters.
:::

::: info
`moveTo()` can be called only once per file. A second call, or a failed
move, throws a `RuntimeException`.
:::
