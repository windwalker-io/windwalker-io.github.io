---
layout: doc
---

# Dev Server and Live Reload

The dev server compiles your frontend files as you edit them and
pushes the changes to the browser. You do not reload the page by
hand for most edits. Fusion Next runs on the Vite dev server, so
`yarn dev` starts it.

## Starting the Dev Server

Run the `dev` script from the project root:

```bash
yarn dev
```

Vite prints the local URL when the server is ready:

```text
  VITE ready in 420 ms

  ➜  Local:   http://localhost:5173/
```

Open the URL in the browser. Pages that load the Fusion entry get
their JavaScript and CSS from the dev server. Vite uses port `5173`
by default. Set `server.port` in `vite.config.mts` to change it.

## What Reloads Automatically

Fusion Next watches the files that the tasks read. The behavior
depends on the file type:

- **Styles**: Changes to the stylesheet entry and its SCSS imports
  are rebuilt and sent to the browser.
- **Scripts**: Changes to the entry file and the `assets/*.ts` files
  are rebuilt and sent to the browser.
- **Scripts loaded by a view**: A TypeScript file that a view loads with
  `$this->unicornScript->init()` is watched too. Saving it triggers a
  reload, so this is the common case when you write view-level scripts.
- **Macros**: JavaScript and CSS inside `<script data-macro>` and
  `<style data-macro>` blocks reload live. See
  [Macros in Dev Mode](#macros-in-dev-mode).
- **Other Blade views**: Views with HTML & PHP are not watched by default. Edits to them
  need a full reload, which is set up with `fusion.fullReloads()` below.

## Full Reloads for Blade Views

Add the Blade paths to `fusionfile.ts` with `fusion.fullReloads()`:

```ts
// fusionfile.ts
import fusion from '@windwalker-io/fusion-next';

fusion.fullReloads(
  './src/Module/**/*.blade.php',
  './views/**/*.blade.php',
);
```

When a matching file is added or changed, the server sends a
`full-reload` event. The browser then reloads the page. The paths
are relative to the project root.

::: tip
Keep the list narrow. Every match triggers a full page reload, so a
broad pattern such as `**/*` slows down the development loop.
:::

## Macros in Dev Mode

Macros are generated from the Blade files and reload with the dev
server. Edit a `<script data-macro>` or `<style data-macro>` block and
save the view. The browser picks up the change without a restart.

For a closer look at the generated files, see
[Debugging Macros](./blade-macros#debugging-macros).

## Watch Mode Without a Server

To rebuild the files on every change without starting a server, use
the `watch` script:

```bash
yarn watch
```

This runs `vite build --watch --mode development`. Output is written to
the same folders as a normal build, and the browser does not reload
by itself. Reload the page manually after each rebuild. Use the dev
server for live updates.

## Production Builds

The `dev` server is not used for production. Build the final assets
with:

```bash
yarn build:prod
```

This runs `vite build` without `--mode development`, and minifies the
output.

::: warning
Do not deploy the output of `yarn dev` or `yarn build`. Development
builds are not minified. Use `yarn build:prod` for release.
:::
