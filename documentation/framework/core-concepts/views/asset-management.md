---
layout: doc
description: How AssetService collects and renders CSS and JavaScript and resolves asset URLs, including Vite mode with the @vite alias.
---

# Asset Management

`AssetService` collects the CSS and JavaScript a page needs, renders
them as tags in the order they were added, and resolves asset URLs.
It can also resolve entries from a Vite build when a Vite manifest or
dev server is active.

Use it when a page needs stylesheets or scripts that must be linked
from the layout, and the URLs should follow one consistent rule.

For how the frontend build produces these files, see
[Styles and Assets](../../frontend/styles-and-assets).

## Vite Mode

Vite mode is active when a Vite manifest exists or the Vite dev server
is running. `ViteResolver` provides the `@vite` alias, and its base
defaults to `resources/assets`.

Reference an entry with the `@vite` alias or the `~/` prefix:

```php
$asset->viteEntry('@vite/main.ts');
```

When the dev server is running, `viteEntry()` links the dev server
URL. Otherwise it links the built file from the manifest, and it adds
the CSS that the manifest lists for that entry.

::: warning
A plain path such as `src/main.ts` is not resolved as a Vite entry.
Use the `@vite` alias or the `~/` prefix for every Vite entry.
:::

### Registering Entries from PHP

Register entries in a controller or middleware. The `~/` prefix and
the `@vite` alias are equivalent:

```php
$this->unicornScript->init('@vite/src/front/main.ts');
$this->asset->css('@vite/scss/front/main.scss');

// Same as above
$this->unicornScript->init('~/src/front/main.ts');
$this->asset->css('~/scss/front/main.scss');
```

`@vite/...` and `~/` point to the source path, so the Vite resolver
handles them.

### Compiling Styles

Fusion Next compiles stylesheets. `cssModulizeDeep(stage, entry, dest)`
compiles the stage's entry SCSS and merges every
`${stage}/**/assets/*.scss` module into it:

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

Stage entry files (`main.ts`, `main.scss`) are written to the `dest`
you pass, relative to `fusion.outDir()`. Style and script macros are
merged into the stage bundle they belong to.

### Images

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

Reference an image with the `~/` prefix in each context, so Vite
resolves it through the manifest.

In Blade:

```blade
<img src="{{ $asset->path('~/images/logo-h.svg') }}" alt="Logo">
```

In TypeScript:

```ts
import logo from '~/images/logo-h.svg';

document.querySelector('#logo')?.setAttribute('src', logo);
```

In SCSS:

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

### Prefixed or Output Paths

- A path that starts with `~/` (or `@vite/`) points to the source
  file, so it keeps its source extension, such as `.ts`, `.scss`, or
  `.svg`. Vite compiles it, hashes the output, and looks up the result
  in the manifest.
- A path without a prefix points to the compiled output file name. It
  works only when you fix the output name explicitly, for example with
  `dest` in `cssModulizeDeep()` or a fixed name in `cloneAssets()`.

Use a prefixed source path by default. Use an output path only when a
file must keep a fixed name, such as a favicon read by external tools.

### Adding a Custom Alias

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

See [Setup](../../frontend/setup) and
[Styles and Assets](../../frontend/styles-and-assets) for the frontend
build workflow.

## Minimal Usage

Call `css()` or `js()` with a path relative to the assets folder, and
render the layout's asset output:

```php
$asset->css('css/app.css');
$asset->js('js/app.js');
```

In Edge templates, `$asset` is available as a global variable. See
[Edge Templates](./edge-templates) for details.

## Complete Example

This example declares assets in a ViewModel and renders them from a
layout.

First, declare the view's own assets with the `#[ViewModel]` attribute:

```php
use Windwalker\Core\Attributes\ViewModel;

#[ViewModel(
    layout: 'index',
    css: ['home.css'],
    js: ['home.js'],
)]
class HomeView
{
    public function prepare(AssetService $asset): void
    {
        $asset->css('css/vendor/chart.css');
        $asset->jsAsync('https://cdn.example.com/lib.js');
    }
}
```

The layout adds its shared assets with the same service:

```php
$asset->css('css/app.css');
$asset->js('js/app.js', [], ['defer' => true]);
$asset->module('js/widgets.js');
```

Each call adds a link to the page. Tags are rendered in the order
the links were added.

## Declaring Assets

Assets are declared in two places: the `#[ViewModel]` attribute and
direct calls to `AssetService`.

### ViewModel Attribute

The `#[ViewModel]` attribute accepts these asset parameters:

- `css`: stylesheets for the view.
- `js`: scripts for the view.
- `modules`: ES module scripts for the view.

A single string is cast to a one-item array. Each file is resolved
relative to the view's own folder, under the `@view` alias.

::: info
Entries in `js` and `modules` have their extension removed when Vite
mode is active. Plain asset mode keeps the file name as written.
:::

For string keys in `css`, the file applies only when the key equals
the current layout name. Numeric keys always apply.

```php
#[ViewModel(
    css: [
        'base.css',
        'index' => 'index.css',
        'edit' => 'edit.css',
    ],
)]
```

In this example, `base.css` loads for every layout, and `index.css`
loads only for the `index` layout.

When Vite mode is active, `modules` is ignored. Put module scripts in
`js` if the page uses Vite.

### AssetService Methods

`AssetService` provides these methods for adding links:

- `css(url, options, attrs)`: adds a stylesheet link.
- `footerCSS(url, options, attrs)`: adds a stylesheet marked for the
  footer.
- `js(url, options, attrs)`: adds a script tag.
- `jsAsync(url, options, attrs)`: adds a script with `async`.
- `module(url, options, attrs)`: adds a script with `type="module"`.
- `moduleAsync(url, options, attrs)`: adds a module script with
  `async`.
- `viteEntry(url, options, attrs)`: adds a Vite entry script and its
  CSS. It returns an array of links.
- `internalCSS()`, `internalJS()`, `internalModule()`: add inline
  content.

The second argument holds link options. The third argument holds
HTML attributes:

```php
$asset->js('js/chart.js', [], ['defer' => true]);
$asset->css('css/print.css', [], ['media' => 'print']);
```

::: warning
`defer` is an HTML attribute, not a link option. Pass it in the third
argument. In the second argument, `['defer' => true]` is ignored.
:::

`module()` sets `type="module"` itself. Do not pass a `type` attribute
for the same script.

### Link Options

These options have a meaning in `AssetService`:

- `version`: set to `false` to skip the cache-busting version.
- `sri`: adds an `integrity` value and `crossorigin` to the tag.
- `body`: inline content for a script.
- `footer`: set by `footerCSS()` for stylesheets.

Other keys are stored with the link and are not interpreted.

::: info
Passing `footer` to `js()` is stored with the link, but scripts
are not moved by that option.
:::

## Path Resolution

`AssetService` converts a URL in this order:

1. Aliases are resolved first.
2. Vite aliases (`@vite/...` or `~/...`) are resolved when Vite mode
   is active.
3. Full URLs (`https://...`) are returned unchanged.
4. Other paths are joined with the assets folder and the asset base
   URI.

The assets folder is read from the `asset.folder` config key. It
defaults to `assets`. A leading assets folder in the path is removed
before the base is added, so `assets/css/app.css` and `css/app.css`
resolve to the same file.

For relative paths, `AssetService` looks for a `.min` file and a plain
file:

- In debug mode, the plain file is preferred, then the `.min` file.
- Outside debug mode, the `.min` file is preferred, then the plain
  file.
- If neither exists, the path is used as written.

A missing file does not raise an error.

### Path Helpers

Use `path()` to build a public URL without adding a tag:

```php
$asset->path('images/logo.png');
```

`path()` with no argument returns the assets base directory with a
trailing slash. `root()` returns the same URL without the host.

Use `has()` to check a file. It returns the public URL, or `false` if
no file is found. Non-strict mode also checks the `.min` and plain
variants.

Use `alias()` to define a short name for a path:

```php
$asset->alias('images', '@images');
```

::: tip
Use an alias for a folder that appears in many templates. Changing the
alias target then updates every reference.
:::

### Overriding Upper-Package Paths

An alias also works as a temporary override. A package may hard-code a
path such as `@vendor/acme/widget/css/widget.css`. Your project can
point that path to its own file without changing the package:

```php
$asset->alias(
    '@vendor/acme/widget/css/widget.css',
    '@theme/css/widget.css'
);
```

Every reference to the original path now resolves to the new target.
Remove the alias when the package provides a proper configuration option.

::: warning
An alias applies to the whole application, so every view that uses the
original path receives the replacement. Check the other views before you
add an override.
:::

## Versioning and Debug

`path()` accepts a version as its second argument:

- `true`: uses the current asset version.
- A string: appends the string as a query parameter, for example
  `?v=...` or `&v=...` when a query already exists.
- `false` (the default): adds no version.

::: info
In debug mode, the asset version changes on every request. Browsers
then fetch the file again each time.
:::

Outside debug mode, the version is read from the file set by the
`asset.version_file` config key. If that file does not exist,
`AssetService` detects a version itself.

## Related

- [Edge Templates](./edge-templates): using `$asset` in templates.
- [View Components](./view-components): loading assets from a
  component.
- [Renderer](./renderer): how views are rendered.
- [HTML Frame](./html-frame): the page frame that receives assets.
- [Styles and Assets](../../frontend/styles-and-assets): compiling
  styles, images, and aliases in the frontend build.
