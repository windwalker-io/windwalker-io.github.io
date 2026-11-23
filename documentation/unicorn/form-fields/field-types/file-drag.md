---
layout: doc
title: FileDrag
description: FileDrag field page for Windwalker Unicorn.
---

# FileDrag

A plain file input shows a small browse button and no context. Users cannot
see which file is selected, or which file the record already holds.
FileDrag replaces the input with a drop area. It shows the selected file
name, the stored file, and a button to delete the stored file's reference.

FileDrag sends the file with the rest of the form when the user saves. It
does not upload anything before that. For pictures with a preview and crop,
use [SingleImageDrag](./single-image-drag). For lists of files, use
[MultiUploader](./multi-uploader).

## Enabling the Field

`FileDragField` extends the Windwalker `FileField`. Add it with
`$form->add()`, the same way as other fields:

```php
use Unicorn\Field\FileDragField;

$form->add('manual', FileDragField::class)
    ->label('Manual')
    ->accept('pdf');
```

The field has no upload endpoint of its own. The form must be sent with
`enctype="multipart/form-data"`, which the generated edit views set.

## Complete Example

The form field accepts PDF files up to 10 MB. The top of the field shows
the stored file.

```php
use Unicorn\Field\FileDragField;

$form->add('manual', FileDragField::class)
    ->label('Product manual')
    ->accept('pdf')
    ->maxSize(10)
    ->height(120)
    ->showUploaded('top');
```

The controller stores the new file, or keeps the stored value:

```php
use Unicorn\Upload\FileUploadService;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Http\AppRequest;

public function saveProduct(AppRequest $request, AppContext $app): array
{
    $uploader = $app->retrieve(FileUploadService::class);

    // Returns NULL when no file was selected.
    $result = $uploader->handleFileIfUploaded(
        $request->file('manual')
    );

    // No new file: keep the stored value, or '' after the delete button.
    $manual = $result
        ? (string) $result->getUri()
        : $request->input('manual');

    return [
        'manual' => $manual ?: null,
    ];
}
```

## Showing the Stored File

`showUploaded()` displays the stored file's name in a preview bar.

- `true` or `'bottom'` places the bar below the drop area.
- `'top'` places the bar above the drop area.

```php
// Preview below the drop area.
$form->add('manual', FileDragField::class)
    ->showUploaded(true);

// Preview above the drop area.
$form->add('manual', FileDragField::class)
    ->showUploaded('top');
```

The name comes from the basename of the stored value. The link points to the
stored value itself. Use `downloadLinkHandler()` to build a different URL:

```php
$form->add('manual', FileDragField::class)
    ->showUploaded('top')
    ->downloadLinkHandler(
        fn (mixed $value) => '/download/' . $value
    );
```

`previewLayout()` replaces the whole bar. A closure returns the markup:

```php
$form->add('manual', FileDragField::class)
    ->showUploaded('top')
    ->previewLayout(
        fn (mixed $value): string => htmlspecialchars(
            basename((string) $value)
        )
    );
```

::: warning
The bar outputs the closure's return value as HTML. Escape any value that
the user could have set, as `htmlspecialchars()` does above.
:::

A string passed to `previewLayout()` is a view layout name. The layout
receives the field as `field`.

Deleting the preview clears the value in the form. It does not delete the
stored file, so the form saves an empty value and the old file stays in
storage.

::: info
Clicking the delete button only clears the value. Remove the stored file
in your own code if you need the space back.
:::

## Accepted Types and Size Limits

`accept()` takes a comma-separated list. An entry without a slash is an
extension, and the field adds the leading dot. MIME types and wildcards are
kept as they are:

```php
$form->add('documents', FileDragField::class)
    // Sent to the browser as ".pdf,.docx,application/pdf".
    ->accept('pdf, docx, application/pdf')
    ->multiple(true)
    ->maxFiles(3)
    ->maxSize(10);
```

- `maxFiles()` limits the number of selected files. It matters with
  `multiple(true)`.
- `maxSize()` limits the total size of all selected files, in megabytes.

A rejected file type clears the input and shows an alert. With
`multiple(true)`, the whole selection is cleared. The field name then ends
with `[]`, so the request reads the files as a list. The stored preview is hidden in multiple mode.

::: warning
The browser checks the type and the size. A request can skip these checks,
so check both on the server. The upload service checks a profile's `accept`
list. See [Accepting File Types](/documentation/unicorn/services/uploader/upload-service#accepting-file-types).
:::

## Required Fields

`required(true)` requires a file only when nothing is stored. When a stored
file is shown, the field stops asking for a new file. After the delete
button is clicked, the field asks for a file again.

```php
$form->add('manual', FileDragField::class)
    ->required(true);
```

## Height and Layout

`height()` sets the height of the drop area in pixels. The default is `125`.

```php
$form->add('manual', FileDragField::class)
    ->height(90);
```

`layout()` replaces the default template, `@theme::field.file-drag`.

## Related

- [SingleImageDrag](./single-image-drag)
- [MultiUploader](./multi-uploader)
- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
