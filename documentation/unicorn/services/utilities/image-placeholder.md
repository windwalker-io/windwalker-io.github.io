---
layout: doc
title: ImagePlaceholder
description: Serve fallback images in each aspect ratio for missing media.
---

# ImagePlaceholder

Cards and lists often show records that have no image yet. Without a
fallback, the image slot collapses, and the layout jumps when a real image
loads. `ImagePlaceholder` returns a neutral image in the aspect ratio your
layout expects. The site can replace any ratio with its own image.

## Enabling It

Unicorn registers `ImagePlaceholder` as a shared object. Inject it into a
constructor, or call `$app->make(ImagePlaceholder::class)`. The class
depends on `AssetService`, which the container provides.

## Complete Example

```php
use Unicorn\Image\ImagePlaceholder;

final class ArticleCardPresenter
{
    public function __construct(
        protected ImagePlaceholder $placeholder,
    ) {
    }

    public function image(?string $uri): string
    {
        return $uri ?: $this->placeholder->placeholder('16:9');
    }

    public function avatar(?string $uri): string
    {
        return $uri ?: $this->placeholder->avatar();
    }
}
```

```blade
<img src="{{ $card->image($article->image) }}" alt="">
```

## Choosing a Ratio

Unicorn ships images for four ratios: `1:1`, `4:3` (the default), `16:10`,
and `16:9`. `placeholder()` accepts a colon or an `x` separator.

```php
// placeholder() with no argument uses 4:3.
$a = $placeholder->placeholder();
$b = $placeholder->placeholder('16:9');
$c = $placeholder->placeholder('16x9'); // Same as '16:9'.

// Magic methods are shortcuts for the built-in ratios.
$d = $placeholder->placeholderSquare(); // 1:1
$e = $placeholder->placeholder16x10();
$f = $placeholder->placeholder4to3();   // Alias of 4x3.

// Avatar and loading-spinner images.
$g = $placeholder->avatar();
$h = $placeholder->ajaxLoader();
```

Magic methods accept only the names listed above:

```php
// ERROR: UnhandledMatchError
$placeholder->placeholder99x99();
```

## Overriding a Ratio

Use `setImage()` to replace the image for one ratio. The URI goes through
`AssetService::handleUri()`, so `@` aliases work. Passing `null` removes
the override.

```php
// Use a custom image for every 16:9 placeholder.
$placeholder->setImage('16:9', '@custom/cover-16x9.png');

// Remove the override and restore the built-in image.
$placeholder->setImage('16:9', null);

// Read or replace all overrides at once.
$map = $placeholder->getImageMap();
$placeholder->setImageMap(['4:3' => '@custom/cover-4x3.png']);
```

::: warning
Unicorn ships no image for other ratios, such as `2:1`. Calling
`placeholder('2:1')` builds a path to `image-2x1.png`, which does not exist,
and reports no error. Register an override with `setImage()` for every
ratio you use.
:::

::: warning
`ImagePlaceholder` is a shared object. `setImage()` changes the result of
every later call in the same app instance. Set overrides once, during
bootstrap, not inside a single view.
:::
