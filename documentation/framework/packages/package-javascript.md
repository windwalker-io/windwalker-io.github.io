---
layout: doc
description: Build and ship JavaScript and TypeScript assets from a custom Windwalker package with Vite, then import them into a host app.
---

# Package JavaScript

Many packages ship front-end code, such as UI modules, form widgets, or
Vue components. A package builds this code into its own `dist/` folder,
so a host app can load it without knowing how the source is compiled.
This page shows how to set up the JavaScript environment, build it,
control the output, and load it in a host app.

## Without a Build: Declaring npm Vendors

A package does not always need its own `dist/`. If it only needs some
npm modules, such as a Vue library or a chart library, the host app can
install them and compile them at the end. Declare these modules in the
package's `composer.json` under `extra.windwalker.assets.vendors`:

```json
{
  "name": "acme/portfolio",
  "extra": {
    "windwalker": {
      "assets": {
        "vendors": {
          "chart.js": "^4.4",
          "dayjs": "^1.11"
        }
      }
    }
  }
}
```

Run `asset:sync` in the host app. It writes these versions into the
host's `package.json` dependencies. Then install and build:

```bash
php windwalker asset:sync
yarn install
yarn build
```

The `installVendors()` step of the host build copies each declared
module from `node_modules/` into `www/assets/vendor/`, so pages can load
them by path. The package itself ships no `dist/` and no build step.

::: tip
Use this method when the package only consumes third-party modules.
Build your own `dist/` as described in the rest of this page when the
package has its own JavaScript or TypeScript source.
:::

## Setup Package Own Bundles

Keep the JavaScript project in an `assets/` directory of the package.
Create a `package.json` there and use Vite as the bundler.

```json
{
  "name": "@acme/portfolio-ui",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --mode development --watch",
    "build": "vite build --mode development",
    "build:prod": "vite build",
    "watch": "vite build --watch --mode development",
    "upgrade": "yarn up '**' -R"
  },
  "devDependencies": {}
}
```

Install the build tools. If there is no `yarn.lock` yet, create an
empty one first:

```bash
yarn touch yarn.lock

yarn add vite unplugin-dts --dev

# Install other dependencies as needed
yarn add @windwalker-io/unicorn-next --dev
yarn add vue @vitejs/plugin-vue --dev
```

Add a `vite.config.ts` that builds the entry file as a library:

```ts
import vuePlugin from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'Portfolio',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
      external: [
        // Do not bundle packages that the host app already provides.
        '@windwalker-io/unicorn-next',
      ],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    // Add this only when the package ships Vue components.
    vuePlugin(),

    // Generate .d.ts declaration files.
    dts({
      tsconfigPath: resolve('./tsconfig.json'),
      bundleTypes: true,
    }),
  ],
});
```

Add a `tsconfig.json` for the source files:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules/**/*"]
}
```

Add a `tsconfig.node.json` for the Vite config file:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "nodenext",
    "skipLibCheck": true
  },
  "include": ["./vite.config.ts"]
}
```

Run `yarn dev` to build and watch for changes. All output goes to
`dist/`.

::: tip
Use `yarn build:prod` for release builds. It skips the development mode
and writes the final output.
:::

### Build Output

Vite writes the entry file to `dist/index.js` and splits shared code into
`dist/chunks/`. Declaration files go next to the entry file.

```text
acme/portfolio-ui/
└── assets/
    ├── src/
    │   └── index.ts
    ├── dist/
    │   ├── index.js
    │   ├── index.d.ts
    │   ├── chunks/
    │   └── assets/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── tsconfig.node.json
```

Declare the entry points in `package.json` so editors and bundlers can
find them:

```json
{
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

Use `exports` when the package has more than one entry file. Each key
maps a subpath to its file.

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./editor": {
      "types": "./dist/editor.d.ts",
      "import": "./dist/editor.js"
    }
  }
}
```

### Controlling Chunk and Asset Names

By default, every split chunk goes to `chunks/` with its original name.
If two chunks share a name, Vite adds a number to one of them. Use
`chunkFileNames` to set a rule for a specific chunk:

```ts
chunkFileNames(chunkInfo) {
  if (chunkInfo.name === 'editor') {
    return 'path/to/editor.js';
  }

  return 'chunks/[name].js';
},
```

Print `chunkInfo` with `console.log()` to see the values you can use.
Add `[hash]` to cache-bust files:

```ts
chunkFileNames: 'chunks/[name][hash].js',
```

Assets can be any file type, so keep `[extname]` in the name:

```ts
assetFileNames(assetInfo) {
  return 'assets/[name][extname]';
},
```

See the Rollup documentation for all variables:

- [output.chunkFileNames](https://rollupjs.org/configuration-options/#output-chunkfilenames)
- [output.assetFileNames](https://rollupjs.org/configuration-options/#output-assetfilenames)

### Externals and Dependencies

Packages that the host app already provides should not be bundled
again. Add them to `external` in `vite.config.ts`:

```ts
external: [
  '@windwalker-io/unicorn-next',
  '@lyrasoft/ts-toolkit',
  /^@lyrasoft\/ts-toolkit/,
  'bootstrap',
  'vue',
  'sortablejs',
],
```

An external package is still a required dependency. Put it in the
`dependencies` section of `package.json`, not `devDependencies`. This
makes the host install it, so the build can resolve it.

Some packages can be bundled, such as small single-use utilities. For
example, `lodash-es` functions that the package uses once are fine to
bundle. This avoids adding many dependencies to the host app.

### Type Declarations

The `unplugin-dts` plugin writes the `.d.ts` files. `bundleTypes: true`
merges them into one file. If the merged output causes type conflicts,
set `bundleTypes` to `false` and use the separate files.

Export the public types from `src/index.ts`, so host apps can import
them:

```ts
export type * from './types';

// Or export named types
export type {
  FooType,
  BarInterface,
} from './types';
```

The host app can then import the types:

```ts
import type { FooType } from '@acme/portfolio-ui';

const foo: FooType = { /* ... */ };
```

::: warning
Put type declarations in `.ts` files, not `.d.ts` files. Only `.ts`
files are emitted to the output. A type in a `.d.ts` file is missing
from the declaration output, and the host app fails to find it.
:::

### What to Bundle

Bundle code that the package needs, unless the host already provides it.
Keep the list of externals short, so the package stays self-contained.

### Multiple Entry Points

A package can offer several features in one `dist/` folder. Export a
function for each feature from `src/index.ts`, and load the feature
with a dynamic `import()`. Each feature becomes its own chunk.

```ts
// src/index.ts
export function usePortfolio(): Promise<typeof import('./portfolio')> {
  return import('./portfolio');
}

export async function usePortfolioEditor() {
  const { createEditor } = await import('./portfolio-editor');

  return createEditor();
}
```

The host app must call each function at least once, so the bundler
keeps the chunk:

```ts
import { usePortfolio } from '@acme/portfolio-ui';

usePortfolio('#gallery', options);
```

### Unicorn Integration

The package's JavaScript can use the Unicorn runtime from
`@windwalker-io/unicorn-next`. The main APIs are shown below. For the
full reference, see [Unicorn JS](/documentation/unicorn/javascript-frontend/unicorn-js).

#### Directives

Use `useUniDirective()` to bind behavior to elements that carry a
`uni-<name>` attribute. The handler runs for each matching element.

```ts
import { useUniDirective } from '@windwalker-io/unicorn-next';

useUniDirective<HTMLButtonElement>('portfolio-toggle', {
  ready(el) {
    el.addEventListener('click', () => {
      el.classList.toggle('active');
    });
  },
});
```

```html
<button uni-portfolio-toggle>Toggle</button>
```

#### Injecting CSS

Use `injectCssToDocument()` to add styles at runtime, so the package does
not need a separate stylesheet tag.

```ts
import { injectCssToDocument } from '@windwalker-io/unicorn-next';

const css = `
  .portfolio-card {
    border: 1px solid #ddd;
    padding: 1rem;
  }
`;

injectCssToDocument(css);
```

::: info
Inline CSS is added to the document when the module runs. Use a
stylesheet file when the styles are large or need to be cached.
:::

### Declare As Host App Dependencies

#### Link

After building, the host app must know the package's dependencies, and
it must install the other node modules the package depends on.
Windwalker uses the yarn `portal:` protocol to link the package's
`node_modules` into the host app's `node_modules`. The host app can then
import the package's dependencies directly.

```json
{
  "name": "acme/portfolio-ui",
  "extra": {
    "windwalker": {
      "assets": {
        "vendors": {
          "@acme/portfolio-ui": "portal:./vendor/acme/portfolio-ui/assets"
        }
      }
    }
  }
}
```

In the host app, run `asset:sync` to add the declared versions to the
host's `package.json`:

```bash
php windwalker asset:sync
```

The command reads `extra.windwalker.assets.vendors` from every installed
package. Packages that point to a local path (`./` or `file:`) are
linked as local dependencies, which is useful during development.

::: tip
The `portal:` protocol is supported only by yarn. If the host app uses
another package manager, change `portal:` to `file:` or `link:` by hand
after `asset:sync` finishes.
:::

#### NPM

You can also publish the package to npm. The host app then installs it
like any other npm package. The host app must still run `asset:sync` to
declare the package in its `package.json`, so the host app can import it.

```json
{
  "name": "acme/portfolio-ui",
  "extra": {
    "windwalker": {
      "assets": {
        "vendors": {
          "@acme/portfolio-ui": "^0.1.0"
        }
      }
    }
  }
}
```

## Loading the Package in a Host App

Import the package in the host app in one of three ways. Pick the one
that matches the stage of your work.

### During Development

Import the built file with its full path. Run the package's `yarn dev`
in the package folder, and the host's dev server reloads the page after
each change.

```ts
// Host app: src/main.ts
import { usePortfolio } from
  '../vendor/acme/portfolio-ui/assets/dist/index.js';

usePortfolio('#gallery');
```

### Testing the Source Directly

The host can import the package's TypeScript source instead of `dist/`.
Package aliases do not exist in the host, so use relative paths in the
package source. Add an alias in the host's Vite config when the source
uses one:

```ts
// Host app: vite.config.ts
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '~portfolio': resolve('./vendor/acme/portfolio-ui/assets/src'),
    },
  },
});
```

The host's TypeScript settings must allow the same syntax as the package.
For example, if the package imports `.ts` files, the host must allow
that as well.

### Production: Installing as an npm Package

This is the recommended method. The package is mounted as a
`node_modules` entry, so the host imports it by name:

```ts
import { usePortfolio } from '@acme/portfolio-ui';

usePortfolio('#gallery');
```

To set it up, run `asset:sync` as shown above, then run `yarn` in the
host:

```bash
php windwalker asset:sync
yarn
```

Run `composer update` and `yarn` again if the package does not appear in
`node_modules`.

::: info
A package mounted in `node_modules` can also be installed for the
browser with `installVendors()`. Use this for CSS, fonts, or other files
that the browser loads by path.
:::

### Legacy: Linking Assets to the Public Folder

Windwalker 4.1 and earlier mounted assets into the public folder. Use
this method only for older projects. Set `link` in the package's
`composer.json`:

```json
{
  "extra": {
    "windwalker": {
      "assets": {
        "link": "assets/"
      }
    }
  }
}
```

Run `yarn install` in the host. The files are mounted under
`www/assets/vendor/acme/portfolio-ui/`. The host imports them with the
`~vendor` path:

```ts
import { usePortfolio } from '~vendor/acme/portfolio-ui/dist';

usePortfolio('#gallery');
```

## Avoiding Duplicate Bundles

A host can end up with two copies of a library, such as Vue or Bootstrap.
This happens when the host and the package use different versions, or
when both have their own `node_modules`. Duplicate Vue or Bootstrap copies
break features such as dropdowns or Vue rendering.

Use `resolve.dedupe` in the host's Vite config to force a single copy:

```ts
export default defineConfig({
  resolve: {
    dedupe: ['vue', 'bootstrap', '@windwalker-io/unicorn-next'],
  },
});
```

::: info
`dedupe` is a workaround. Duplicate copies usually come from a
package with a wrong `external` list or a conflicting dependency.
Fix the package when this happens.
:::

## Vue Components

When a package ships Vue components, mark Vue as external, so the host's
copy of Vue is used:

```ts
// assets/vite.config.ts
external: ['vue', '@windwalker-io/unicorn-next'],
```

Keep the Vue app setup inside a function, and export that function.
The function runs only when the host calls it:

```ts
// src/portfolio-vue.ts
import { createApp } from 'vue';
import PortfolioApp from './components/PortfolioApp.vue';

export function init(
  selector: string | Element,
  props?: Record<string, any>,
) {
  const app = createApp(PortfolioApp, props);

  return app.mount(selector);
}
```

```ts
// src/index.ts
export async function usePortfolioVue(
  selector: string | Element,
  props?: Record<string, any>,
) {
  const { init } = await import('./portfolio-vue');

  return init(selector, props);
}
```

The host calls the exported function:

```ts
import { usePortfolioVue } from '@acme/portfolio-ui';

usePortfolioVue('#portfolio-app');
```

## Overriding the Package Source

A host can copy the package's TypeScript source into the project and
build it there. This replaces the package's behavior with the host's own
code. The package copies its files in its `install()` method with
`installFiles()`:

```php
use Windwalker\Core\Package\AbstractPackage;
use Windwalker\Core\Package\PackageInstaller;

class PortfolioPackage extends AbstractPackage
{
    public function install(PackageInstaller $installer): void
    {
        $installer->installFiles(
            static::path('assets/src/**/*'),
            'resources/assets/src/portfolio',
            'assets',
        );
    }
}
```

The files are installed when the host runs the install step for the
`assets` tag. The host then builds them with its own Vite config.

For a smaller change, the package can allow the host to replace one
component. Design the package to accept a replacement, and document the
name of the slot. This method needs the package to expose the extension
point, so it works only where the package author planned for it.

## Side Effects and Tree Shaking

Code that runs when the module loads, such as custom element
registration or a directive, can be removed by the host's bundler. The
bundler removes code that is not exported and not used. Wrap the
registration in a function and export its result:

```ts
// src/index.ts
import { useUniDirective } from '@windwalker-io/unicorn-next';

async function init() {
  customElements.define('portfolio-card', PortfolioCard);

  return useUniDirective('portfolio', {
    mounted(el) {
      // ...
    },
  });
}

export const ready = init();
```

The host then imports `ready` or calls one of the package's exported
functions, so the registration stays in the build.

## Styles

If the package has one SCSS file that always loads with the script, import
it as an inline string and inject it:

```ts
import css from '../scss/portfolio.scss?inline';
import { injectCssToDocument } from '@windwalker-io/unicorn-next';

async function init() {
  injectCssToDocument(css);
}

export const ready = init();
```

If the package has several stylesheets that the page loads on demand, build
them in a second Vite config that outputs separate CSS files. Unicorn uses
this approach. The host loads each file by its path.

## Troubleshooting

- **A shared library appears twice on the page.** Add it to `external`
  in `vite.config.ts`, and make sure the host app provides it. Use
  `dedupe` in the host as a temporary fix.
- **A tree-shaken export is missing at runtime.** Wrap the code in a
  function and export its result, as shown in
  [Side Effects and Tree Shaking](#side-effects-and-tree-shaking).
- **`composer update` does not change the vendor versions.** Run
  `php windwalker asset:sync` again after `composer update`, then run the
  host's package manager install.
