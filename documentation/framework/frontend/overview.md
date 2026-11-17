---
layout: doc
description: How Windwalker integrates Vite-based frontend assets, JavaScript modules, and Blade macros through Fusion Next.
---

# Frontend Integration

Windwalker renders pages on the server with Blade views. The frontend
layer adds the client-side code, styles, and build tooling. Fusion Next
is the build layer. It runs inside Vite and compiles the entries your
pages use.

## How the Parts Fit Together

- **Fusion Next** (`@windwalker-io/fusion-next`) configures Vite and
  defines the build tasks in a `fusionfile`.
- **Core processors** (`@windwalker-io/core/next`) merge per-view
  modules, styles, and macros into one bundle per stage.
- **Blade macros** put TypeScript and SCSS next to the view that uses
  them. Windwalker moves the code out of the page and loads it by name.
- **The runtime** (`@windwalker-io/core/app`) starts each module with
  the props that PHP passed in.

## Stages

Code is grouped by stage, such as `Front` and `Admin`. Each stage has
its own entry file and output bundle. A view belongs to the stage of
its module folder.

## Topics

- [Setup and Build](./setup): configure `useFusion()`, the `fusionfile`,
  and the `dev`, `build`, and `watch` scripts.
- [JavaScript Development](./javascript): entry files, module discovery,
  and running modules.
- [Blade Macros](./blade-macros): inline script and style macros and
  how props reach them.
- [Styles and Assets](./styles-and-assets): compiling SCSS and
  registering assets from PHP.
