---
layout: doc
title: Image Processing
description: Resize, crop, convert, redraw, and optimize images during upload.
---

# Image Processing

Images from users create three problems. They are often much larger than the
layout needs, they can carry metadata or hidden content, and they need one
consistent size. The Upload Service solves these in one step. It decodes the
image, resizes it, re-encodes it, and optionally compresses it, before the
file reaches the [storage](/documentation/unicorn/services/storage).

## Resizing Images

Image processing is controlled by `ResizeConfig`. You can set it on the
[profile](/documentation/unicorn/services/uploader/upload-service#profiles), or change it for one service with `setResizeConfig()`. The minimal
form limits an uploaded image to 800 pixels in width and height:

```php
use Unicorn\Upload\FileUploadService;
use Unicorn\Upload\ResizeConfig;

$uploader = $app->retrieve(FileUploadService::class, tag: 'image');

$uploader->setResizeConfig(
    new ResizeConfig(
        enabled: true,
        width: 800,
        height: 800,
    ),
);

$result = $uploader->handleFile($app->file('photo'));
```

::: warning
`setResizeConfig()` copies every value of the object, including default
values. `new ResizeConfig(width: 800)` alone also sets `quality` to 85,
`driver` to `gd`, and `enabled` to `true`. Pass every value the profile must
keep in the same object. A `null` value is skipped, so `width: null` keeps
the current width.
:::

Whether resizing runs depends on `enabled`. The shipped `default` profile
disables it, and the `image` profile enables it.

## Complete Example

A gallery stores large photos as JPEG files. Each photo is limited to 1200
pixels, compressed, and always redrawn, so the stored file contains only the
image data. The profile lives in the host app's
`etc/packages/unicorn.config.php`:

```php
use Unicorn\Upload\FileUploadOptions;
use Unicorn\Upload\ResizeConfig;

// etc/packages/unicorn.config.php, inside file_upload.profiles
'gallery' => fn() => new FileUploadOptions(
    storage: 'local',
    dir: 'gallery/{year}/{month}',
    accept: 'image/*',
    forceRedraw: true,
    optimize: true,
    resize: new ResizeConfig(
        width: 1200,
        height: 1200,
        quality: 80,
        outputFormat: 'jpg',
    ),
),
```

The controller uses the profile by its tag, and it needs no image code of
its own:

```php
use Unicorn\Upload\FileUploadService;

$uploader = $app->retrieve(FileUploadService::class, tag: 'gallery');

$result = $uploader->handleFile($app->file('photo'));

echo $result->getUriString();
// For example: gallery/2026/11/<uid>.jpg
```

The next sections explain each setting in this profile.

## Resize Modes

The width and height work as a box. How the image fits the box depends on
the options you set:

```php
use Unicorn\Upload\ResizeConfig;

// Box fit: scale the image down to fit, keep the ratio.
// A smaller image is not enlarged.
$uploader->setResizeConfig(
    new ResizeConfig(width: 800, height: 600),
);

// Cover crop: fill the box exactly, and cut the excess.
// Crop needs both width and height.
$uploader->setResizeConfig(
    new ResizeConfig(width: 800, height: 600, crop: true),
);

// Width only: scale to that width, keep the ratio.
$uploader->setResizeConfig(
    new ResizeConfig(width: 800),
);
```

::: tip
For thumbnails of a fixed shape, use the cover crop. The box fit keeps the
original shape of each image.
:::

## Output Format and Quality

The output format comes from the extension of the destination. With `{ext}`,
the input format is kept. A fixed extension converts the image:

```php
// A PNG is stored as PNG.
$uploader->handleFile($file, 'photos/hero.png');

// {ext} keeps the input format.
$uploader->handleFile($file, 'photos/hero.{ext}');

// An outputFormat sets the extension for {ext}.
$uploader->setResizeConfig(
    new ResizeConfig(outputFormat: 'jpg'),
);
$uploader->handleFile($file, 'photos/hero.{ext}');
// -> photos/hero.jpg, even when the input is PNG
```

Other settings control how the image is written:

```php
$uploader->setResizeConfig(
    new ResizeConfig(
        quality: 80,       // JPEG quality. The default is 85.
        interlaced: true,  // Interlaced PNG and GIF only.
        orientate: true,   // Rotate by EXIF orientation. The default.
    ),
);
```

::: info
`stripExif` is deprecated and has no effect. Do not set it.
:::

## Drivers

Resizing uses the `gd` driver by default. The `imagick` driver is also
available. Both are selected with a constant on `FileUploadOptions`:

```php
use Unicorn\Upload\FileUploadOptions;
use Unicorn\Upload\ResizeConfig;

$uploader->setResizeConfig(
    new ResizeConfig(
        driver: FileUploadOptions::DRIVER_IMAGICK,
    ),
);
```

The shipped configuration reads the driver from `IMAGE_RESIZE_DRIVER`, so
you can switch it per environment without changing code.

## Redrawing Images

A redraw decodes the image and encodes it again. Everything that is not
image data is dropped in the process. Unicorn redraws an image in these
cases:

```php
// Redrawn: resizing is enabled.
// Redrawn: forceRedraw is on, even without resizing.
// Redrawn: the destination has a different extension.
// Kept as is: a GIF when rawGif is on.
// Never redrawn: an SVG file. See SVG Files below.
```

The `rawGif` option keeps the original GIF file, so its animation stays
intact.

::: warning
Without a redraw, an uploaded image keeps its original bytes. Metadata and
any content placed after the image data stay in the file. For uploads from
the public, enable `forceRedraw`, as the shipped `frontend` profile does.
:::

::: info
`ResizeConfig` enables resizing by default. A `FileUploadOptions` object
created without a `resize` argument therefore redraws every image. The
shipped `default` profile turns it off.
:::

## Optimizing Output

Optimization compresses the image after it is resized. It is off by default.
`true` runs the default chain of optimizers:

```php
use Unicorn\Upload\FileUploadOptions;

$options = new FileUploadOptions(
    storage: 'local',
    optimize: true,
);
```

An array replaces the default chain. Each key is an optimizer class, and
each value is the list of its command-line arguments:

```php
use Spatie\ImageOptimizer\Optimizers\Jpegoptim;

$options = new FileUploadOptions(
    storage: 'local',
    optimize: [
        Jpegoptim::class => ['-m70', '--strip-all'],
    ],
);
```

The optimizers come from `spatie/image-optimizer`. Without it, the upload
fails:

```php
// ERROR: DomainException: Please install `spatie/image-optimizer` first.
```

::: tip
Enable optimization only on profiles where the stored size matters. It runs
on every upload to that profile.
:::

## SVG Files

SVG is vector XML, and the GD and Imagick drivers cannot redraw it. The
service sanitizes SVG files instead. It removes scripts, event handlers, and
unsafe URLs. Sanitizing is on by default:

```php
// Sanitized, not redrawn.
$uploader->handleFile($app->file('logo'), 'logos/logo.svg');
```

When `optimize` is set, the sanitized SVG is also minified. The sanitizer
requires `mathiasreker/php-svg-optimizer`. The service rejects invalid files
and files larger than 5 MB:

```php
// ERROR: DomainException: Invalid SVG file. (400)
// ERROR: DomainException: SVG file is too large. (400)
```

::: warning
Turn off `sanitizeSvg` only for uploaders you trust. An SVG file can run
script in the browser when it is opened directly.
:::

## Options Reference

The following tables list the options this page uses. `ResizeConfig` is the
object behind `resize`, and `FileUploadOptions` holds the upload settings.

### ResizeConfig

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `bool` | `true` | Resize images when `true`. |
| `driver` | `string` | `'gd'` | `gd` or `imagick`. Use the `FileUploadOptions::DRIVER_*` constants. |
| `stripExif` | `bool` | `false` | Deprecated. Has no effect. |
| `width` | `?int` | `null` | Maximum width, or the crop width. |
| `height` | `?int` | `null` | Maximum height, or the crop height. |
| `quality` | `?int` | `85` | JPEG quality. |
| `crop` | `bool` | `false` | Fill the box and cut the excess. Needs `width` and `height`. |
| `outputFormat` | `?string` | `null` | Output format. Also replaces `{ext}` in the destination. |
| `orientate` | `bool` | `true` | Rotate the image by its EXIF orientation. |
| `interlaced` | `bool` | `false` | Interlaced output. PNG and GIF only. |

### FileUploadOptions

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `forceRedraw` | `bool` | `false` | Redraw every image, even without resizing. |
| `rawGif` | `bool` | `false` | Store GIF files as they are, without redraw or resize. |
| `optimize` | `bool\|array` | `false` | `true` runs the default optimizer chain. An array replaces it. |
| `sanitizeSvg` | `bool` | `true` | Sanitize SVG files on upload. |

## Related

- [Upload Service](/documentation/unicorn/services/uploader/upload-service)
- [Storage](/documentation/unicorn/services/storage)
