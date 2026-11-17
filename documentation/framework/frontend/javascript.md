---
layout: doc
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

Modules that need data from PHP receive it as props. See
[Blade Macros](./blade-macros#passing-props).

::: warning
`main.ts` runs before any view module is loaded. Avoid top-level
`await` in it. The page waits for `main.ts` to finish, so a slow
top-level `await` delays every view script.
:::
