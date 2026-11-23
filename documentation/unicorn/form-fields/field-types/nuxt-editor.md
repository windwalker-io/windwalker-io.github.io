---
layout: doc
title: NuxtEditor
description: NuxtEditor field page for Windwalker Unicorn.
---

# NuxtEditor

`NuxtEditorField` provides a Notion like block editor built on Nuxt UI's `UEditor`, which runs on TipTap.
It adds a slash menu, a block menu with drag handles, tables with cell
colors, code blocks with a language selector, image upload by paste or
drop, and video embeds.

## Enabling the Field

Add `NuxtEditorField` to a form. The field renders a `<textarea>`, and
Unicorn JS mounts the editor next to it. The textarea holds the value
that the form submits, so the editor and the form stay in sync.

```php
use Unicorn\Field\NuxtEditorField;

$form->add('content', NuxtEditorField::class)
    ->label('Content');
```

The defaults need no extra options. The built-in [image upload](/documentation/unicorn/services/uploader/upload-service) also needs
an `image` profile in your configuration.

## Complete Example

The following article form stores HTML. It uploads images to the
`article` profile, and it adds a Rust entry to the code block languages.
The drag handle's block menu is hidden for this field:

```php
use Unicorn\Field\NuxtEditorField;
use Unicorn\Field\NuxtFieldOptions;

$form->add('content', NuxtEditorField::class)
    ->label('Content')
    ->format('html')
    ->enableImageUpload('article')
    ->configureOptions(
        function (NuxtFieldOptions $options) {
            $options->codeBlockLanguages = [
                ...NuxtFieldOptions::DEFAULT_CODE_BLOCK_LANGUAGES,
                'rust' => 'Rust',
            ];

            // A JavaScript option, not declared on NuxtFieldOptions.
            $options->toolbars = ['blockMenu' => false];

            return $options;
        }
    );
```

```php
// In the controller: the value is the HTML string.
$content = $app->input('content');
```

::: warning
The editor value is HTML written by users. The field does not sanitize
it. Sanitize the HTML before you render it on a public page.
:::

## Formats

`format()` sets the type of the stored value. The editor reads and
writes that type:

```php
// HTML (default): the value is an HTML string.
->format('html')

// Markdown: the value is a Markdown string.
->format('markdown')

// JSON: the value is the editor document, encoded as JSON.
->format('json')
```

::: warning
With the `json` format, invalid stored JSON opens an empty editor. The
next change in the editor replaces the stored value.
:::

## Image Uploads

Image upload is on by default. The field uses the built-in `file_upload`
route, with the profile `image`. The route requires a logged-in user, and
the profile must exist in `file_upload.profiles`. See
[Upload Service](/documentation/unicorn/services/uploader/upload-service).

Pass a string to `enableImageUpload()` to choose another profile. The
`uploadProfile()` value takes precedence over that string:

```php
// Built-in endpoint, profile "article".
->enableImageUpload('article')

// Built-in endpoint, the same profile set on its own.
->uploadProfile('article')

// Your own endpoint. Return the same JSON shape as the built-in upload.
->imageUploadUrl((string) $nav->to('article_image_upload'))

// No upload. The editor cannot insert uploaded images.
->enableImageUpload(false)
```

Pasted or dropped images from other hosts are not fetched by default. Set
`imageFetchUrl` to re-host them through an endpoint of your own. The
endpoint receives a POST with `url` and returns the same shape as the
upload endpoint. Hosts in `imageOwnHosts` are never fetched.

## Editor Options

`editorOptions()` passes options to the JavaScript editor. Options are
merged in this order, and the later value wins:

1. The field state, such as the format and the locale.
2. The application defaults in `NuxtEditorField::$defaultOptions`.
3. The values from `editorOptions()`.

Set the application defaults once, for example when the app boots:

```php
use Unicorn\Field\NuxtEditorField;
use Unicorn\Field\NuxtFieldOptions;

NuxtEditorField::$defaultOptions = new NuxtFieldOptions(
    captionFigure: true,
    tableColors: [
        'Primary' => 'var(--bs-primary)',
        'Warning' => 'var(--bs-warning)',
    ],
);
```

Use `configureOptions()` for logic that depends on the field. The callback
receives the merged `NuxtFieldOptions` and the field. It runs last, and it
must return the options:

```php
$form->add('content', NuxtEditorField::class)
    ->configureOptions(
        function (NuxtFieldOptions $options, NuxtEditorField $field) {
            $options->imageOwnHosts = ['cdn.example.com'];

            return $options;
        }
    );
```

List options, such as `codeBlockLanguages`, `tableColors`, and
`captionSyncAttrs`, replace the default list. They do not extend it. To
add to the built-in code block languages or table colors, start from the
`NuxtFieldOptions::DEFAULT_CODE_BLOCK_LANGUAGES` and
`NuxtFieldOptions::DEFAULT_TABLE_COLORS` constants.

### Toolbars

The `toolbars` key of `editorOptions()` hides or replaces a toolbar.
Pass `false` to hide one, or an array to replace its items:

```php
->editorOptions([
    'toolbars' => [
        'fixed' => false,
        'textBubble' => false,
    ],
])
```

Toolbar items contain functions, which PHP cannot send. From PHP, use
`false` or plain arrays only. To add or reorder items, use the JavaScript
API. See [Editors](/documentation/unicorn/javascript-frontend/ui/editors#nuxt-editor).

## Captions and Images

An image caption is saved in the `alt` and `title` attributes of the
image, which the default `captionSyncAttrs` sets. With the default
`captionFigure` of `false`, the HTML has no figure, and the frontend
renders the caption from those attributes. Set `captionFigure` to `true`
to output a `<figure>` with a `<figcaption>`:

```php
->editorOptions([
    'captionFigure' => true,
])
```

## Read-only Fields

A field that is `readonly()` or `disabled()` opens the editor read-only.
Users can read the content, but they cannot change it:

```php
$form->add('content', NuxtEditorField::class)
    ->readonly(true);
```

## Editor Events

The editor dispatches its events on the `<textarea>`. Listen to
`nuxt-editor:create` to reach the TipTap instance, and to `upload-start`,
`upload-success`, `upload-error`, and `upload-complete` to track uploads.
See [Editors](/documentation/unicorn/javascript-frontend/ui/editors#nuxt-editor)
for the JavaScript side.

## Option Reference

`NuxtFieldOptions` declares these keys. Set them with `configureOptions()`,
in `NuxtEditorField::$defaultOptions`, or as array keys of `editorOptions()`:

- `format`: `html`, `markdown`, or `json`. Use `format()` on the field.
- `locale`: the editor language. The field sets it from the application locale.
- `readonly`: opens the editor read-only.
- `imageUploadUrl`: the endpoint for pasted and dropped images. The field sets
  it from `enableImageUpload()`.
- `props`: extra props passed to the Nuxt UI `UEditor` component.
- `unicorn`: internal settings. The field sets `stack_name` from `stackName()`,
  so change the name there.
- `captionSyncAttrs`: image attributes that mirror the caption, such as `alt`
  and `title`. The field sets `alt` and `title`. A list, replaced as a whole.
- `captionFigure`: when `true`, the output renders a caption as a `<figure>`.
  The field sets `false`.
- `imageFetchUrl`: an endpoint that downloads a remote image and stores it.
- `imageOwnHosts`: hosts that are not fetched. Empty means the current host.
  A list, replaced as a whole.
- `codeBlockLanguages`: the language selector values and labels. Replaced as a
  whole. Start from `NuxtFieldOptions::DEFAULT_CODE_BLOCK_LANGUAGES` to extend.
- `codeBlockAliases`: a map of aliases to languages. Empty means
  `DEFAULT_CODE_BLOCK_ALIASES`.
- `tableColors`: the palette for table cell colors. Replaced as a whole. Start
  from `NuxtFieldOptions::DEFAULT_TABLE_COLORS` to extend.

Other keys, such as `toolbars`, pass to the JavaScript editor unchanged. See
[Toolbars](#toolbars).

## Options Reference

The table lists the methods specific to the Nuxt editor field.

| Method | Description | Default |
|--------|-------------|---------|
| `enableImageUpload()` | Enable image upload, or pass a profile name. | `true` |
| `getEnableImageUpload()` | Return the image upload setting. | `null` |
| `imageUploadUrl()` | Set a custom image upload URL. | Built-in `image` URL |
| `getImageUploadUrl()` | Return the upload URL for a profile. | Built-in `image` URL |
| `stackName()` | Set the loading stack name used during uploads. | `uploading` |
| `getStackName()` | Return the loading stack name. | `null` |
| `format()` | Set the content format, such as `html`. | `html` |
| `getFormat()` | Return the content format. | `null` |
| `configureOptions()` | Set a callback that adjusts the editor options. | `null` |

[Common form field methods](/documentation/components/form/fields) such as `label()`, `required()`, and `disabled()` also work.

See:
- [Blocking Save During Uploads](/documentation/unicorn/mvc-crud/css-js-in-mvc-pages#blocking-save-during-uploads)
- [SimpleStack](/documentation/unicorn/javascript-frontend/ui/simple-stack)

## Related

- [TinyMCE Editor](./tinymce-editor)
- [Editors](/documentation/unicorn/javascript-frontend/ui/editors)
- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
- [Form Utilities](/documentation/unicorn/form-fields/form-utilities)

