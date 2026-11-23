---
layout: doc
title: SingleImageDrag
description: SingleImageDrag field page for Windwalker Unicorn.
---

# SingleImageDrag

A picture field needs more than a file input. Users expect a preview, a
clear select button, a way to remove the picture, and often a fixed crop
for product or profile images. SingleImageDrag provides these in one field.
It stores one image, either as a URL from an AJAX upload or as a file that
is sent with the form.

## Enabling the Field

Add `SingleImageDragField` with `$form->add()`:

```php
use Unicorn\Field\SingleImageDragField;

$form->add('image', SingleImageDragField::class)
    ->label('Image');
```

The default layout, `sid-default`, shows the preview, a select button, a
paste button, and a drop area. Users can select a file, paste an image from
the clipboard, or drop a file on the area.

By default the file is sent with the form on save. Call `ajax()` to upload
the file as soon as the user selects it.

## Complete Example

This product form crops the image to 800 by 800 pixels and uploads it on
selection. The built-in upload route returns the URL, and the field stores
that URL.

```php
use Unicorn\Field\SingleImageDragField;

$form->add('image', SingleImageDragField::class)
    ->label('Product image')
    ->ajax(true)
    ->crop(true)
    ->width(800)
    ->height(800)
    ->showSizeNotice(true)
    ->defaultImage('/assets/img/no-image.png')
    ->required(true);
```

The value is a string URL, so the save code treats it like any text value:

```php
return [
    'image' => $data['image'] ?: null,
];
```

## Uploading with AJAX

`ajax(true)` posts the file to the built-in `file_upload` route. The route
uses the `image` profile. Change it with `uploadProfile()`:

```php
$form->add('image', SingleImageDragField::class)
    ->ajax(true)
    // A profile defined in `file_upload.profiles`.
    ->uploadProfile('product');
```

The built-in route requires a logged-in user. It turns resizing off for
each request, so the crop is the only resize.

::: warning
The route takes the `profile` name from the request, so a client can ask for
any profile. Use a profile with an `accept` list for user uploads. See
[Uploads from the Browser](/documentation/unicorn/services/uploader/upload-service#uploads-from-the-browser).
:::

Pass a URL to `ajax()` to use your own endpoint. The field sends the file
in a `file` field, and it reads `data.url` from the JSON response. The
`#[JsonApi]` attribute provides the `data` envelope:

```php
use Unicorn\Upload\FileUploadService;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Attributes\JsonApi;
use Windwalker\Core\Http\AppRequest;

#[JsonApi]
public function uploadProductImage(
    AppRequest $request,
    AppContext $app
): array {
    $uploader = $app->retrieve(FileUploadService::class, tag: 'image');

    $result = $uploader->handleFile($request->file('file'));

    return [
        'url' => (string) $result->getUri(),
    ];
}
```

```php
$form->add('image', SingleImageDragField::class)
    ->ajax((string) $nav->to('product_image_upload'));
```

::: info
With AJAX, the file is stored when the user selects it. A form that is
never saved leaves the file in storage.
:::

## Uploading with the Form

Without `ajax()`, the file is sent with the form. Read it from the request
and pass it to the upload service:

```php
use Unicorn\Upload\FileUploadService;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Http\AppRequest;

public function saveProduct(AppRequest $request, AppContext $app): array
{
    $uploader = $app->retrieve(FileUploadService::class, tag: 'image');

    // Returns NULL when no file was selected.
    $result = $uploader->handleFileIfUploaded(
        $request->file('image')
    );

    return [
        'image' => $result
            ? (string) $result->getUri()
            : ($request->input('image') ?: null),
    ];
}
```

## Cropping and Size

`crop(true)` opens a crop dialog after the user selects a file. The crop box
keeps the aspect ratio of `width()` and `height()`. The cropped image is
sent as a PNG with the original file name. The default size is 800 by 800.

```php
$form->add('banner', SingleImageDragField::class)
    ->crop(true)
    ->width(1200)
    ->height(400)
    ->showSizeNotice(true);
```

`showSizeNotice(true)` shows the crop size under the drop area.

## Preview

`defaultImage()` sets the picture to show when the field is empty.
`previewHandler()` receives the image URL, and returns the URL to show. The
stored value does not change.

```php
$form->add('image', SingleImageDragField::class)
    ->defaultImage('/assets/img/no-image.png')
    ->previewHandler(
        fn (string $url): string => 'https://cdn.example.com' . $url
    );
```

## Accepted Types

The default list is JPEG, PNG, WebP, AVIF, and GIF. `accept()` replaces it.
It takes a string or an array. Entries are MIME types, wildcards, or
extensions.

```php
$form->add('image', SingleImageDragField::class)
    ->accept(['image/jpeg', 'image/png']);

$form->add('photo', SingleImageDragField::class)
    ->accept('image/*');
```

## Required and Removing

An optional field shows a remove checkbox. Checking it clears the value.
Unchecking it restores the previous value. `required(true)` hides the
checkbox, so a stored image cannot be cleared.

```php
// Optional: shows the remove checkbox.
$form->add('image', SingleImageDragField::class);

// Required: no remove checkbox.
$form->add('image', SingleImageDragField::class)
    ->required(true);
```

::: info
Clearing the value does not delete the stored file. The form saves an empty
value, and the old file stays in storage.
:::

::: warning
The browser checks the file type and the crop. It does not validate the
upload. Check the type and the size on the server, and use a profile with
an `accept` list for uploads from the browser.
:::

## Options Reference

`SingleImageDragField` adds the following methods to the Windwalker `TextField`.
Each row lists a setter and its getter.

| Method | Description | Default |
| --- | --- | --- |
| `accept()` / `getAccept()` | Sets the allowed types as MIME types, wildcards, or extensions. | `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif` |
| `width()` / `getWidth()` | Sets the crop width, in pixels. | `800` |
| `height()` / `getHeight()` | Sets the crop height, in pixels. | `800` |
| `maxWidth()` / `getMaxWidth()` | Sets the maximum image width, in pixels. | — |
| `minWidth()` / `getMinWidth()` | Sets the minimum image width, in pixels. | — |
| `maxHeight()` / `getMaxHeight()` | Sets the maximum image height, in pixels. | — |
| `minHeight()` / `getMinHeight()` | Sets the minimum image height, in pixels. | — |
| `crop()` / `isCrop()` | Enables the crop dialog. | `false` |
| `showSizeNotice()` / `isShowSizeNotice()` | Shows the crop size under the drop area. | — |
| `defaultImage()` / `getDefaultImage()` | Sets the picture shown when the field is empty. | — |
| `ajax()` / `getAjax()` | `true` uploads to the built-in route, a string sets a custom URL. | — |
| `previewHandler()` / `getPreviewHandler()` | Receives the image URL and returns the URL to show. | — |
| `uploadProfile()` / `getUploadProfile()` | Sets the upload profile of the built-in upload URL. | `image` |
| `layout()` / `getLayout()` | Replaces the default template. | `@theme::field.single-image-drag.sid-default` |

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

See:
- [Blocking Save During Uploads](/documentation/unicorn/mvc-crud/css-js-in-mvc-pages#blocking-save-during-uploads)
- [SimpleStack](/documentation/unicorn/javascript-frontend/ui/simple-stack)

::: info
The AJAX upload (`ajax(true)`) does not push onto the upload stack, so the save lock does not wait for it.
:::

## Related

- [FileDrag](./file-drag)
- [MultiUploader](./multi-uploader)
- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
- [Image Processing](/documentation/unicorn/services/uploader/image-processing)
