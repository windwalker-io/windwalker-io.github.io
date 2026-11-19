---
layout: doc
description: Organize frontend TypeScript modules for Fusion Next, covering the stage entry, view modules, chunks, tree shaking, and how modules run in the browser.
---

# JavaScript Development

Frontend behavior is written as TypeScript modules. Fusion Next
bundles them into one entry per stage (`Front`, `Admin`), and the
runtime loads each module only when its Blade view renders.

## Where Code Goes

Most code belongs in one of three places:

- **`main.ts`**: the stage entry (`src/front/main.ts` or
  `src/admin/main.ts`). Load global packages here.
- **View modules**: `assets/*.ts` next to a view. Fusion loads the file
  with the same name as the view when that view renders, so you do not
  import it yourself.
- **Shared modules**: any TypeScript file in `resources/assets/src`, such
  as helper functions or composables. Import them with normal ES module
  syntax from any module.

## Entry File

The entry creates an `App` with `defineJsModules()`. Fusion replaces
that call at build time with the list of modules it found:

```ts
// resources/assets/src/front/main.ts
import { App, defineJsModules } from '@windwalker-io/core/app';

const app = new App(defineJsModules());

export { app as default };
```

## Module Discovery

`jsModulizeDeep(stage, entry, dest)` merges the per-view modules into
the entry. It collects:

- `${stage}/**/assets/*.ts`: view modules, keyed by file.
- `${stage}/**/*.blade.php` and `views/**/*.blade.php`: inline
  `<script lang="ts" data-macro="name">` blocks, keyed as `inline:name`.

```ts
// fusionfile.ts
import { jsModulizeDeep } from '@windwalker-io/core/next';

jsModulizeDeep(
  'Front',
  'resources/assets/src/front/main.ts',
  'js/front/main.js'
);
```

Both behaviors are on by default. Turn them off with the options
`mergeScripts` and `parseBlades` if you only want file-based modules.

::: info
Build temp files go to `tmp/fusion/jsmodules/`. They are removed after
the build by default (`cleanTmp` is `true`).
:::

## Chunks and Tree Shaking

Fusion Next runs on Vite 8, which bundles with Rolldown. A module
imported by more than one entry is moved into its own chunk file, so it
is loaded once and shared. For
example, if `datetime.ts` is used by both `front/main.ts` and
`admin/main.ts`, Rolldown extracts it into `datetime-XXXXXX.js`. Code
used by only one entry is inlined into that entry's file. The chunk
folder defaults to `chunks/`. See
[Output Paths](./setup#output-paths) to change the folder.

Development builds (`yarn build`) keep the source name in each chunk,
such as `chunks/datetime-XXXXXX.js`, which makes debugging easier.
Production builds (`yarn build:prod`) replace the name with a serial
number, such as `chunks/3-XXXXXX.js`. To keep readable names in a
production build, turn off `chunkNameObfuscation` in `fusionfile.ts`:

```ts
// fusionfile.ts
fusion.overrideOptions({
  chunkNameObfuscation: false,
});
```

Rolldown also removes exported functions that nothing imports (tree
shaking). Keep the bundle small with these habits:

- Import only what you use: `import { dateFormat } from ...`.
- Put each helper in its own exported function, and export every
  helper you want to keep. Unused helpers are dropped from the output.
- Keep heavy work out of module top-level code. Run it inside the
  default export, which runs only when the view renders.
- Load large packages only in the view module that needs them, not in
  `main.ts`, so every page does not pay for them.

Avoid running code at module top level in shared files, such as
`import '~js/utilities/download'` that registers a directive as a side
effect. In some cases Rolldown removes that code. Export a setup function
instead, and call it from the view module:

```ts
// resources/assets/src/utilities/download.ts
import { useUniDirective } from '@windwalker-io/unicorn-next';

export function useDownloadDirective() {
  useUniDirective('download', {
    mounted(el, { value }) {
      el.addEventListener('click', (e) => {
        e.preventDefault();

        window.open(value);
      });
    },
  });
}
```

```ts
// src/Module/Front/Page/assets/page.ts
import { useDownloadDirective } from '~js/utilities/download';

useDownloadDirective();
```

::: tip
Check the output size after a production build. A large entry file
usually means a shared module pulls in a package you do not need.
:::

## Running Modules

Modules are plain ES modules. Import them with native `import`
statements, the same way you would in any TypeScript project. Each
module's top-level code runs once, because the browser caches the
module after its first load.

```ts
// src/Module/Front/Cart/assets/cart.ts
export function formatPrice(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

export default function () {
  const total = formatPrice(1299.5);

  document.querySelector('#cart-total')!.textContent = total;
}
```

Import the named exports when another module needs only the helpers:

```ts
// src/Module/Front/Checkout/assets/checkout.ts
import { formatPrice } from '~/js/utils/price';

const total = formatPrice(49.9, 'EUR');
```

::: warning
Aliases that start with `~` (such as `~/`, `~js/`) are resolved at build
time. Keys in the browser `import_map`, such as `@core/` or a package
name you mark as external, are resolved only by the browser. Importing
an import-map key from a TypeScript file fails the build unless the
package is marked as external, and an external package must also be
listed in the import map or it fails at runtime.
:::

Modules that need data from PHP receive it as props. See
[Blade Macros](./blade-macros#passing-props).

::: warning
`main.ts` runs before any view module is loaded. Avoid top-level
`await` in it. The page waits for `main.ts` to finish, so a slow
top-level `await` delays every view script.
:::
