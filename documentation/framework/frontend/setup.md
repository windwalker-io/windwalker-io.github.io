---
layout: doc
description: Configure Fusion Next in Vite with useFusion and a fusionfile, set output paths and aliases, and run the dev, build and production scripts.
---

# Setup and Build

Fusion Next runs inside Vite. You do not install a separate CLI.
The project's Vite config loads a `fusionfile` through `useFusion()`,
and every `vite` command runs the frontend tasks.

## Minimal Configuration

Add `useFusion()` to `vite.config.mts` and point it at the `fusionfile`:

```ts
// vite.config.mts
import { defineConfig } from 'vite';
import { useFusion } from '@windwalker-io/fusion-next';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      useFusion(() => import('./fusionfile')),
    ],
  };
});
```

The `fusionfile.ts` configures the fusion instance and exports the tasks:

```ts
// fusionfile.ts
import fusion from '@windwalker-io/fusion-next';
import { jsModulizeDeep } from '@windwalker-io/core/next';

// Output directory for every task
fusion.outDir('www/assets/');

export function js() {
  return [
    jsModulizeDeep(
      'Front',
      'resources/assets/src/front/main.ts',
      'js/front/main.js'
    ),
  ];
}

export default [js];
```

## Fusion Options

The instance returned by `fusion` has methods for shared configuration:

- `fusion.outDir(dir)`: sets the Vite output directory.
- `fusion.alias(from, to)`: adds a resolver alias.
- `fusion.plugin(...plugins)`: adds Vite plugins.
- `fusion.clean(...paths)`: removes old files before a build.
- `fusion.overrideOptions({ ... })`: overrides Fusion options.

```ts
// fusionfile.ts
import fusion from '@windwalker-io/fusion-next';
import { resolve } from 'node:path';

fusion.alias('~js', resolve('./resources/assets/src'));
```

## Dev Server and Builds

Use the scripts from `package.json`:

```bash
# Dev server with hot module reload
yarn dev

# Development build
yarn build

# Production build (minified)
yarn build:prod
```

::: tip
Use `yarn watch` to rebuild on every change without a server.
:::

## Output Paths

Pages reference compiled files through the asset helpers, not by
hard-coded URLs. See [Styles and Assets](./styles-and-assets).
