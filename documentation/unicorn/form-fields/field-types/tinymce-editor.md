---
layout: doc
title: TinymceEditor
description: TinymceEditor field page for Windwalker Unicorn.
---

# TinymceEditor

Articles, product descriptions, and other content often need headings,
tables, and images. Asking users to write HTML is not practical.
`TinymceEditorField` shows a TinyMCE rich text editor in a form. The field
is a textarea, so the editor keeps the content as HTML in the submitted
value. Images inserted in the editor are uploaded to the server, and the
editor stores the URL that the server returns.

## Enabling the Field

Add the field with `TinymceEditorField::class`. It extends `TextareaField`,
so `label()`, `required()`, and the other textarea options work as usual:

```php
use Unicorn\Field\TinymceEditorField;

$form->add('content', TinymceEditorField::class)
    ->label('Content')
    ->toolbar(TinymceEditorField::TOOLBAR_FULL);
```

The editor loads TinyMCE from the `tinymce` npm package and the language
files from `tinymce-i18n`. Install both in the front-end dependencies of the
host app.

## Complete Example

The following form edits the body of an article. It uses the simple
toolbar, a taller editing area, and a profile for image uploads:

```php
use Unicorn\Field\TinymceEditorField;

// $form is the form of the current page.
$form->add('content', TinymceEditorField::class)
    ->label('Content')
    ->required(true)
    ->toolbar(TinymceEditorField::TOOLBAR_SIMPLE)
    ->editorOptions([
        'height' => 600,
        'menubar' => false,
    ])
    ->uploadProfile('image');
```

The submitted `content` value is the HTML of the editor.

## Toolbar Presets

`toolbar()` selects one of two presets. The full preset is used when
`toolbar()` is not set.

- `TinymceEditorField::TOOLBAR_FULL` (`'full'`): Text styles, block formats,
  font sizes, alignment, lists, links, images, media, tables, and the source
  code view.
- `TinymceEditorField::TOOLBAR_SIMPLE` (`'simple'`): Text styles, font
  sizes, alignment, lists, links, images, and media.

To use a toolbar of your own, pass the `toolbar` key to `editorOptions()`.
It replaces the preset:

```php
$form->add('summary', TinymceEditorField::class)
    ->editorOptions([
        'toolbar' => 'bold italic | bullist numlist | link',
    ]);
```

## Editor Options

`editorOptions()` passes options to `tinymce.init()`. Its values override
the values that the field computes and the global defaults. Use the
[TinyMCE configuration reference](https://www.tiny.cloud/docs/tinymce/latest/)
for the full list of keys.

List values such as `plugins` are appended to the built-in list. The
following example adds a plugin to the default plugins:

```php
$form->add('content', TinymceEditorField::class)
    ->editorOptions([
        'height' => 500,
        'plugins' => ['codesample'],
    ]);
```

`contentCss()` sets the stylesheets of the editing area. The default is the
Unicorn editor stylesheet:

```php
$form->add('content', TinymceEditorField::class)
    ->contentCss(['/css/article-content.css']);
```

`configureOptions()` receives the final options and the field. Return the
options array after your changes:

```php
$form->add('content', TinymceEditorField::class)
    ->configureOptions(
        function (array $options, TinymceEditorField $field): array {
            $options['height'] = 800;

            return $options;
        }
    );
```

### Global Defaults

`TinymceEditorField::getDefaultOptions()` and `setDefaultOptions()` read
and replace the defaults for every editor on the page. `setDefaultOptions()`
replaces the whole array, so keep the built-in keys with a spread:

```php
use Unicorn\Field\TinymceEditorField;

// Set once, before the forms are rendered.
TinymceEditorField::setDefaultOptions([
    ...TinymceEditorField::getDefaultOptions(),
    'height' => 500,
]);
```

::: info
The default license key is `gpl`. Set `license_key` in `editorOptions()`
when you use a commercial TinyMCE license.
:::

## Image Uploads

Image uploads are enabled by default. The editor posts each image to the
`file_upload` route. Its `profile` parameter selects a profile from the
Unicorn [file upload configuration](/documentation/unicorn/services/uploader/upload-service). The `image` profile is used when no
profile is given. It resizes images and accepts `image/*`.

Use `uploadProfile()` to pick another profile, or turn uploads off:

```php
// The profile must be defined in the upload configuration.
$form->add('gallery', TinymceEditorField::class)
    ->uploadProfile('gallery');

// The editor does not upload images.
$form->add('notes', TinymceEditorField::class)
    ->enableImageUpload(false);
```

`uploadProfile()` takes precedence over a profile name passed to
`enableImageUpload()`. To replace the endpoint, use `imageUploadUrl()`.
The endpoint must return JSON with the URL in `data.url`:

```php
$form->add('content', TinymceEditorField::class)
    ->imageUploadUrl('/article/image/upload');
```

::: warning
The `profile` value comes from the request, and the upload route requires
only a logged-in user. Any logged-in user can send the name of another
profile. Give each profile an `accept` list. A profile without `accept`
checks only for dangerous extensions, so it accepts any other file.
:::

`stackName()` names the [stack](/documentation/unicorn/javascript-frontend/ui/simple-stack) that the field uses while an upload runs. The
default is `uploading`. The save button can be disabled while the stack is
not empty with `u.$ui.disableIfStackNotEmpty()`:

```js
u.$ui.disableIfStackNotEmpty('[data-task=save]', 'uploading');
```

### Upload Events

The field dispatches upload events on its textarea. The events do not bubble,
so listen on the textarea itself:

```js
const textarea = document.querySelector('textarea[name="content"]');

textarea.addEventListener('upload-start', () => {
  console.log('Image upload started.');
});

// The detail is the Axios error from the request.
textarea.addEventListener('upload-error', (e) => {
  console.error(e.detail.message);
});

textarea.addEventListener('upload-complete', () => {
  console.log('Image upload finished.');
});
```

The event `upload-success` is dispatched after a successful upload.

## Reading and Writing the Content

Get the controller of an editor with `u.$ui.tinymce.init()`, using the id of
the textarea. The call returns the existing controller for that id:

```js
const textarea = document.querySelector('textarea[name="content"]');
const editor = await u.$ui.tinymce.init('#' + textarea.id);

editor.getValue();           // The current HTML.
editor.setValue('<p>Hi</p>'); // Replace the content.
editor.insert('<p>Next</p>'); // Insert at the cursor.
```

The textarea receives the content when the editor fires a change event.
Read the content with `getValue()` to get the latest version.

## Read-Only Mode

When the field is readonly or disabled, the editor opens in read-only mode.

## Security of the Stored HTML

::: warning
The field does not sanitize the value on the server. TinyMCE cleans the
content only inside the editor, so the stored HTML can contain any markup
that reaches the database. Sanitize the HTML before you render it outside
the editor, and validate it when you save it.
:::

## Extra Editor Options

Keys that TinyMCE does not define, or that Unicorn handles itself, are listed
here. For all other keys, use the
[TinyMCE configuration reference](https://www.tiny.cloud/docs/tinymce/latest/).

- `extra_buttons`: a list of toolbar button names. The field appends them to
  the toolbar.
- `content_css`: the stylesheet URLs of the editing area. Same as
  `contentCss()`.
- `language_url`: a custom language file. When it is set, the field skips the
  built-in language lookup.
- `license_key`: the TinyMCE license key. The default is `gpl`.
- `images_upload_url`: the upload endpoint. The field sets it from
  `enableImageUpload()`, and `editorOptions()` can replace it.
- `readonly`: the read-only state. The field sets it from `readonly()` and
  `disabled()`.
- `unicorn`: internal settings. The field sets `stack_name` after the merge, so
  use `stackName()` to change the stack name.

```php
$form->add('content', TinymceEditorField::class)
    ->editorOptions([
        'extra_buttons' => ['superscript', 'subscript'],
        'license_key' => 'your-license-key',
    ]);
```

## Options Reference

`TinymceEditorField` provides the following methods for the editor
content styles, the image upload, and the final editor options. Each setter
returns the field for chaining.

| Method | Description | Default |
|--------|-------------|---------|
| `contentCss()` | Sets the CSS files loaded inside the editor. | `@unicorn/editor.css` |
| `getContentCss()` | Returns the CSS files loaded inside the editor. | — |
| `langFolder()` | Sets the language folder value stored on the field. | — |
| `getLangFolder()` | Returns the language folder value. | — |
| `enableImageUpload()` | Enables or disables image upload, or sets the upload profile. | `true` |
| `getEnableImageUpload()` | Returns the image upload setting. | — |
| `imageUploadUrl()` | Sets a custom URL for image uploads. | Built-in file upload route |
| `getImageUploadUrl()` | Returns the image upload URL for a profile. | — |
| `stackName()` | Sets the name of the upload stack that blocks saving. | `uploading` |
| `getStackName()` | Returns the name of the upload stack. | — |
| `uploadProfile()` | Sets the upload profile used for image uploads. | `null` |
| `getUploadProfile()` | Returns the upload profile. | `null` |
| `plugins()` | Sets a list of plugin names stored on the field. | `[]` |
| `getPlugins()` | Returns the list of plugin names stored on the field. | `[]` |
| `configureOptions()` | Sets a callback that changes the final editor options. | `null` |

[Common form field methods](/documentation/components/form/fields) such as `label()`, `required()`, and `disabled()` also work.

See:
- [Blocking Save During Uploads](/documentation/unicorn/mvc-crud/css-js-in-mvc-pages#blocking-save-during-uploads)
- [SimpleStack](/documentation/unicorn/javascript-frontend/ui/simple-stack)

## Related

- [NuxtEditor](./nuxt-editor)
- [Editors](/documentation/unicorn/javascript-frontend/ui/editors)
- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
- [Unicorn Form Fields](../field-generation)
