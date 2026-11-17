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
