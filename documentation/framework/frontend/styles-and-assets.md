---
layout: doc
---

# Styles and Assets

Stylesheets are compiled by Fusion Next, and Windwalker registers them
on the page. Stage-level SCSS entries are merged with the SCSS that
Blade views declare.

## Compiling Styles

`cssModulizeDeep(stage, entry, dest)` compiles the stage's entry SCSS
and merges every `${stage}/**/assets/*.scss` module into it:

```ts
// fusionfile.ts
import fusion from '@windwalker-io/fusion-next';
import { cssModulizeDeep } from '@windwalker-io/core/next';

export function css() {
  fusion.clean('css/**/*');

  return [
    cssModulizeDeep(
      'Front',
      'resources/assets/scss/front/main.scss',
      'css/front/main.css'
    ),
  ];
}

export default [css];
```

## Registering Assets from PHP

Use the asset services in a controller or middleware. The host project
calls them in its front middleware:

```php
// src/Module/Front/FrontMiddleware.php
$this->unicornScript->init('@vite/src/front/main.ts');

$this->asset->css('@vite/scss/front/main.scss');
```

`@vite/...` refers to the source path, so the Vite resolver handles it.
`~/` is a shorter form of the same prefix, so the following is equivalent:

```php
$this->unicornScript->init('~/src/front/main.ts');

$this->asset->css('~/scss/front/main.scss');
```

## Where Assets Go

- Stage entry files (`main.ts`, `main.scss`) are written to the `dest`
  you pass, relative to `fusion.outDir()`.
- Style and script macros are merged into the stage bundle they belong to.

## Images

Put source images under `resources/assets/images/`. The host's
`fusionfile.ts` copies them to `www/assets/images/` with `cloneAssets`:

```ts
// fusionfile.ts
export function images() {
  return [
    cloneAssets({
      'resources/assets/images/**/*': 'images/',
    })
  ];
}
```

Reference an image from Blade with the `asset` service and the `~/`
prefix, so Vite resolves it through the manifest:

```blade
<img src="{{ $asset->path('~/images/logo-h.svg') }}" alt="Logo">
```

Reference an image from TypeScript or SCSS with the `~/` prefix:

```ts
import logo from '~/images/logo-h.svg';

document.querySelector('#logo')?.setAttribute('src', logo);
```

```scss
.hero {
  background-image: url('~/images/hero.jpg');
}
```

Use a Vite glob to load many images at once:

```ts
// Eager: all URLs are available synchronously.
const icons = import.meta.glob(
  '~/images/icons/*.svg',
  { eager: true, import: 'default' }
);

// Lazy: each image is loaded on demand.
const photos = import.meta.glob(
  '~/images/photos/*.jpg',
  { import: 'default' }
);
```

### `~/` or No Prefix

- A path that starts with `~/` (or `@vite/`) is processed by Vite,
  so the file is hashed and listed in the manifest.
- A path without a prefix is a plain file. Windwalker does not
  process it, so it is served as-is from `www/` or `public/`.

Use `~/` for images that your code or styles reference. Use a plain
path only for files that must keep a fixed URL, such as favicons
referenced by external tools.

::: warning
Vite removes duplicate files. If the same image is referenced under
two different path prefixes, only one output file may be emitted, and
a reference without the prefix may not find it. Always use `~/` (or
`@vite/`) for images, in Blade, TypeScript, and SCSS alike.
:::

## Adding a Custom Alias

To add an alias such as `~img/`, define it in both places:

```ts
// fusionfile.ts
fusion.alias('~img', resolve('./resources/assets/images'));
```

```json
// tsconfig.json
{
    "compilerOptions": {
        "paths": {
            "~img/*": ["./resources/assets/images/*"]
        }
    }
}
```

`fusion.alias` lets the build resolve the path, and `paths` lets
TypeScript type-check it. Missing either one causes an error.
