---
layout: doc
title: Loader
description: Load JavaScript modules, scripts, and stylesheets at runtime.
---

# Loader

Some code loads only when a page needs it, such as a date picker on one
form or a chart on one report. The loader functions fetch modules, scripts,
and stylesheets at runtime. The bundler then leaves that code out of the
pages that do not use it.

The loader covers four kinds of resources:

- Modules, with `useImport()` and `useSeriesImport()`.
- Classic scripts, with `useScriptImport()`.
- Stylesheets as `<link>` tags, with `useCssIncludes()`.
- Stylesheets as `CSSStyleSheet` objects, with `useCssImport()`.

## Enabling the Loader

Import the functions from the package. No setup is needed for paths that
start with `/`:

```ts
import { useImport } from '@windwalker-io/unicorn-next';

const chart = await useImport('/assets/charts/chart.js');
```

Prefixes such as `@vendor/` need an import map on the page. See
[Import Maps](#import-maps) below.

## Complete Example

A report page loads its chart library and stylesheet only when the user
opens the chart tab. The page markup has a tab button and an empty canvas:

```html
<button id="chart-tab" type="button">Charts</button>
<div id="chart"></div>
```

The script loads both files on the first click:

```ts
import {
  selectOne,
  useCssImport,
  useImport,
} from '@windwalker-io/unicorn-next';

const tab = selectOne('#chart-tab');

tab?.addEventListener('click', async () => {
  const [chart] = await Promise.all([
    useImport<any>('/assets/charts/chart.js'),
    useCssImport('/assets/charts/chart.css'),
  ]);

  new chart.default(selectOne('#chart')!, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{ label: 'Sales', data: [12, 19, 7] }],
    },
  });
}, { once: true });
```

The `{ once: true }` option runs the handler on the first click only.
Later clicks do not start another load.

## Importing Modules

`useImport()` calls the browser's native `import()` at runtime. With one
source, it returns the module object. With several sources, it loads them
in parallel and returns an array in the same order:

```ts
import { useImport } from '@windwalker-io/unicorn-next';

// One source returns the module object.
const { default: Chart } = await useImport('/assets/charts/chart.js');

// Several sources load in parallel and return an array.
const [chartModule, tableModule] = await useImport(
  '/assets/charts/chart.js',
  '/assets/tables/table.js',
);
```

A source can also be a Promise. The loader awaits it and places its
resolved value in the result array:

```ts
const [config, chartModule] = await useImport(
  loadReportConfig(),
  '/assets/charts/chart.js',
);
```

A bare name such as `@vendor/swiper/swiper.js` works when the page's import
map defines a matching prefix. The browser resolves it:

```ts
const { default: Swiper } = await useImport(
  '@vendor/swiper/swiper.js',
);
```

A missing module rejects the promise:

```ts
// ERROR: TypeError: Failed to fetch dynamically imported module
await useImport('/assets/missing.js');
```

The exact message depends on the browser.

`useSeriesImport()` loads sources one after another. Use it when a module
needs the previous one to be ready. Wrap sources in an array to load that
group in parallel:

```ts
import { useSeriesImport } from '@windwalker-io/unicorn-next';

const [core, [grid, form]] = await useSeriesImport(
  '/assets/core.js',
  ['/assets/grid.js', '/assets/form.js'],
);
```

The result array has one entry per argument. A group returns its own array
of modules.

::: info
A group with one source returns that module, not an array of one module.
:::

::: info
Modules loaded this way are not part of the bundle. Use them for code that
the bundler should not include, and import the rest normally.
:::

## Loading Scripts

`useScriptImport()` appends a classic `<script>` element to the body. It
resolves when the script loads. The element is removed after the load, so
the page does not keep extra script tags. Pass extra attributes as the
second argument. Attribute values are strings:

```ts
import { useScriptImport } from '@windwalker-io/unicorn-next';

await useScriptImport('https://www.google.com/recaptcha/api.js', {
  async: 'true',
  defer: 'true',
});
```

A failed load rejects with the element's error event:

```ts
try {
  await useScriptImport('/assets/missing-widget.js');
} catch (e) {
  // ERROR: e is an Event with type "error", not an Error object.
}
```

The source may also be a function that returns a module whose `default`
is the URL. This suits Vite's `?url` imports:

```ts
await useScriptImport(() => import('./legacy-widget.js?url'));
```

## Loading Stylesheets

Two functions load CSS. They differ in how the styles reach the page.

`useCssIncludes()` adds a `<link>` element to the document head. It
resolves when the stylesheet loads:

```ts
import { useCssIncludes } from '@windwalker-io/unicorn-next';

await useCssIncludes('/assets/charts/chart.css');
```

`useCssImport()` fetches the CSS text, builds a `CSSStyleSheet`, and adopts
it into the document. It returns the sheets in argument order:

```ts
import { useCssImport } from '@windwalker-io/unicorn-next';

const [chartSheet, themeSheet] = await useCssImport(
  '/assets/charts/chart.css',
  '/assets/charts/theme.css',
);
```

`useCssImport()` fetches each URL once per page and reuses the sheet on
later calls. Use it when the CSS should stay out of the page's `<link>`
list.

::: info
Each `useCssIncludes()` call adds a new `<link>`, even for a URL that the
page already loads. Call it once per stylesheet.
:::

## Import Maps

`useScriptImport()`, `useCssIncludes()`, and `useCssImport()` map their
source through the page's `<script type="importmap">` before loading. The
loader checks the source in this order:

- If the source equals a key, the key's target is used.
- Otherwise, the first key that the source starts with is replaced by its
  target.
- Otherwise, the source is used unchanged.

The following import map lets the stylesheet path use a short prefix:

```html
<script type="importmap">
  {
    "imports": {
      "@vendor/": "/assets/vendor/"
    }
  }
</script>
```

```ts
// Loads /assets/vendor/tom-select/dist/css/tom-select.css
await useCssImport('@vendor/tom-select/dist/css/tom-select.css');
```

The loader reads the map on the first call that needs it and keeps it.
Changes to the import map after that call have no effect on the loader.

::: info
Only the top-level `imports` object is read. Entries under `scopes` are
ignored by these three functions.
:::

If the map is not valid JSON, the loader logs an error and uses no mapping:

```ts
// ERROR: Failed to parse import map: SyntaxError: ...
// The source is then loaded as written.
await useCssIncludes('@vendor/tom-select/dist/css/tom-select.css');
```

::: info
`useImport()` does not apply this mapping. It calls the native `import()`,
and the browser resolves bare module names through the page's import map
on its own.
:::

::: tip
Load a library with `useImport()` or with a normal `import`, never both.
A library loaded at runtime and the same library bundled by the build can
create two separate module instances.
:::

## Related

- [Unicorn JS](../unicorn-js)
- [DOM Utilities](./dom-utilities)
