---
layout: doc
title: MultiUploader
description: MultiUploader field page for Windwalker Unicorn.
---

# MultiUploader

A gallery or an attachment list needs several files, thumbnails, a way to
reorder and remove them, and often a title or alt text for each file.
MultiUploader provides these by [vue-multi-uploader](https://www.npmjs.com/package/vue-multi-uploader). Each file uploads as soon as the user selects
it. The field then stores the list of uploaded URLs with the form.

## Enabling the Field

Add `MultiUploaderField` with `$form->add()`:

```php
use Unicorn\Field\MultiUploaderField;

$form->add('gallery', MultiUploaderField::class)
    ->label('Gallery');
```

The value is always a list, so the field needs no `multiple()` option. Each
file uploads to the `image` profile through the built-in `file_upload`
route. Change the profile with `uploadProfile()`.

## Complete Example

This product form stores a gallery where each image has a title and alt
text. The sub-form fields appear in a dialog when the user clicks an image.

```php
use Unicorn\Field\MultiUploaderField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

$form->add('gallery', MultiUploaderField::class)
    ->label('Gallery')
    ->uploadProfile('image')
    ->accept('image/*')
    ->maxFiles(10)
    ->resize(true)
    ->width(1200)
    ->height(1200)
    ->quality(85)
    ->configureForm(function (Form $form): void {
        $form->add('title', TextField::class)
            ->label('Title');

        $form->add('alt', TextField::class)
            ->label('Alt text');
    });
```

The form posts one item per image. Each item has a `url` key and one key
for each sub-form field:

```php
// Posted value.
[
    [
        'url' => '/images/products/front.jpg',
        'title' => 'Front',
        'alt' => 'Front view of the product',
    ],
    [
        'url' => '/images/products/back.jpg',
        'title' => '',
        'alt' => '',
    ],
]
```

Store the list as JSON. When the field renders a saved value, it accepts
JSON, a comma-separated list of URLs, or an array.

```php
$data['gallery'] = json_encode($data['gallery'] ?? []);
```

When the list is empty, the form sends the `__EMPTY_ARRAY__` marker. Unicorn
converts it to an empty array. See
[Empty Array Utilities](/documentation/unicorn/form-fields/form-utilities#empty-array-utilities).

## Upload Options

Each file is posted to the upload endpoint when it is selected. The
endpoint is the built-in route unless you set `url()`.

- `uploadProfile()` selects the profile of the built-in route.
- `resize()`, `width()`, `height()`, `crop()`, and `quality()` are sent as
  query values to the built-in route. The server applies them to each file.
- `maxConcurrent()` sets how many files upload at the same time. The default
  is `2`.

```php
$form->add('gallery', MultiUploaderField::class)
    ->uploadProfile('image')
    ->resize(true)
    ->crop(true)
    ->width(1200)
    ->height(1200)
    ->maxConcurrent(3);
```

Unlike SingleImageDrag, the [crop](/documentation/unicorn/services/uploader/image-processing) runs on the server. The browser does not
crop the images.

::: info
Files upload when they are selected, not when the form is saved. A form
that is never saved leaves its uploaded files in storage.
:::

## Titles and Other Fields

`configureForm()` receives the sub-form. Return nothing, or return a `Form`
to replace the sub-form. Each sub-form field is saved as a key of its item.

When the field has a sub-form, a click on an image opens a dialog with the
sub-form fields. Without a sub-form, a click opens the file in a new
window.

`canReplace(true)` lets the user drop a new file on the image in the dialog.
The new file replaces the image, and the URL changes. The option has no
effect without a sub-form, because the dialog is the only place where the
drop works.

```php
$form->add('gallery', MultiUploaderField::class)
    ->canReplace(true)
    ->configureForm(function (Form $form): void {
        $form->add('title', TextField::class)
            ->label('Title');
    });
```

## Limits and Appearance

- `maxFiles()` limits the number of images in the browser.
- `thumbSize()` sets the thumbnail size in pixels. The default is `150`.
- `placeholder()` sets the text of the drop area.
- `stackName()` names the upload stack that tracks running uploads. The
  default is `uploading`.
- `required(true)` makes an empty list fail validation.
- `disabled()` and `readonly()` prevent changes to the list.

```php
$form->add('gallery', MultiUploaderField::class)
    ->maxFiles(10)
    ->thumbSize(200)
    ->placeholder('Drop images here')
    ->required(true);
```

::: warning
The posted list comes from the browser. The upload endpoint also takes the
profile name from the browser. Accept only URLs that your upload service
created, and check the number of items on the server. See
[Uploads from the Browser](/documentation/unicorn/services/uploader/upload-service#uploads-from-the-browser).
:::

## Accessing the Uploader in JavaScript

The field renders a `<uni-multi-uploader>` custom element. The element holds the Vue
app of the uploader in its `vm` property. The app exposes the uploader
instance as `instance`, which has `checkFile()` and `uploadFile()`:

```js
// Select the element of your field, for example by its id.
const element = document.querySelector('uni-multi-uploader');

const uploader = element.vm.instance;
```

::: info
The `vm` property is set after the element connects. Read it in an event
handler, not at the start of the script.
:::

## Blocking Save During Uploads

Each running upload pushes an item onto a [stack](/documentation/unicorn/javascript-frontend/ui/simple-stack), and it pops the item when
the upload ends. `stackName()` names the stack, which defaults to
`uploading`. If a user clicks save during an upload, the form can submit
before the upload finishes, so the saved list may miss the new file.

```php
$form->add('gallery', MultiUploaderField::class)
    ->stackName('uploading'); // <-- Manually set the stack name
```

`useDisableIfStackNotEmpty()` disables every save button while the stack has
items. The generated edit page already calls it with the default names:

```js
import { useDisableIfStackNotEmpty } from '@windwalker-io/unicorn-next';

// Matches the default stack name of the field.
useDisableIfStackNotEmpty('[data-task=save]', 'uploading');
```

Use the same name in `stackName()` and in the second argument when you
change it.

## Options Reference

`MultiUploaderField` adds the following methods to the Windwalker
`AbstractField`. Each row lists a setter and its getter.

| Method | Description | Default |
| --- | --- | --- |
| `placeholder()` / `getPlaceholder()` | Sets the text shown in the empty drop area. | Language string |
| `url()` / `getUrl()` | Sets the upload URL. | Built-in `file_upload` route |
| `resize()` / `getResize()` | Resizes uploaded images on the server. | — |
| `crop()` / `getCrop()` | Crops uploaded images on the server. | — |
| `width()` / `getWidth()` | Sets the width used for resize or crop. | — |
| `height()` / `getHeight()` | Sets the height used for resize or crop. | — |
| `quality()` / `getQuality()` | Sets the image quality of the built-in upload URL. | — |
| `maxFiles()` / `getMaxFiles()` | Limits the number of files in the list. | — |
| `thumbSize()` / `getThumbSize()` | Sets the thumbnail size. | `150` |
| `accept()` / `getAccept()` | Sets the allowed file types. | — |
| `canReplace()` / `isCanReplace()` | Allows replacing an uploaded file. | `false` |
| `maxConcurrent()` / `getMaxConcurrent()` | Sets how many uploads run at the same time. | `2` |
| `stackName()` / `getStackName()` | Sets the name of the upload stack. | `uploading` |
| `uploadProfile()` / `getUploadProfile()` | Sets the upload profile of the built-in upload URL. | `image` |
| `configureForm()` / `getSubForm()` | Configures the sub-form of each item. | Empty form |
| `layout()` / `getLayout()` | Replaces the default template. | `@theme::field.multi-uploader` |

[Common form field methods](/documentation/components/form/fields) such as `label()`, `required()`, and `disabled()` also work.

See:
- [Blocking Save During Uploads](/documentation/unicorn/mvc-crud/css-js-in-mvc-pages#blocking-save-during-uploads)
- [SimpleStack](/documentation/unicorn/javascript-frontend/ui/simple-stack)

## Related

- [SingleImageDrag](./single-image-drag)
- [FileDrag](./file-drag)
- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
- [Image Processing](/documentation/unicorn/services/uploader/image-processing)
