---
layout: doc
title: Unicorn JS
description: Overview of Unicorn JS, the browser-side library for Unicorn RAD.
---

# Unicorn JS

Unicorn JS is the browser-side library of Unicorn RAD. Admin and frontend
pages often need the same wiring: events between components, DOM lookups,
bootstrap-based UI, forms, grids, and HTTP calls. Unicorn JS provides this
wiring in one shared application object, so each page only adds the
behavior it needs.

## Getting the App

Install the package from npm:

```bash
yarn add @windwalker-io/unicorn-next
```

Call `useUnicorn()` to get the application object. The first call creates
the instance, and every later call returns the same one:

```ts
import { useUnicorn } from '@windwalker-io/unicorn-next';

const u = useUnicorn();
```

::: tip
Call `useUnicorn()` wherever you need the app. You do not need to pass
the instance around.
:::

## Complete Example

The following entry file sets up the app for a typical admin page. It
installs the Bootstrap 5 theme, enables the PHP adapter, exposes `u` to
inline HTML, and reacts to an event once the page is ready.

```ts
import {
  pushUnicornToGlobal,
  useUnicorn,
  useUIBootstrap5,
  useUnicornPhpAdapter,
} from '@windwalker-io/unicorn-next';

const u = useUnicorn();

// Register the loaded handler before any await.
u.on('loaded', () => {
  console.log('Page is ready.');
});

// Install the Bootstrap 5 theme and expose bootstrap on window.
await useUIBootstrap5(true, true);

// Register the PHP-rendered field helpers, such as modal fields.
useUnicornPhpAdapter();

// Make `u` available to inline <script> blocks.
pushUnicornToGlobal();

u.on('user.saved', (user) => {
  console.log(`User ${user.id} was saved.`);
});

// Somewhere in a component:
u.trigger('user.saved', { id: 1 });
```

## The Application Object

The app is a small event bus with a registry, macros, plugins, and a
document-level data store. Each part works independently, and they share
the same instance.

### Events

Use `on()` to listen, `once()` for a single call, and `off()` to remove a
listener. `trigger()` calls every listener registered for the event:

```ts
const handler = (id: number) => console.log('Deleted', id);

u.on('item.deleted', handler);
u.once('item.deleted', () => console.log('First delete only.'));

u.trigger('item.deleted', 5);

u.off('item.deleted', handler);
```

Unicorn fires `loaded` after the DOM is ready and all async work registered
with `u.wait()` has completed.

::: warning
`loaded` fires only once, after `DOMContentLoaded`. A listener added after
that point never runs. Register `loaded` handlers synchronously in your
entry file.
:::

### Registry

`provide()` stores a value under a key, and `inject()` reads it back. A
key can be a string, a symbol, or a class:

```ts
class Mailer {
  send(to: string) {
    // ...
  }
}

u.provide(Mailer, new Mailer());

const mailer = u.inject(Mailer);

// Fallback when the key is not provided.
const debug = u.inject('debug', false);
```

```ts
u.inject('mailer');

// ERROR: Error: Injectable: "mailer" not found.
```

### Plugins

A plugin is an object with an `install()` method. `use()` calls it with the
app and the options you pass. `detach()` calls the plugin's `uninstall()`:

```ts
const analytics = {
  install(app, options) {
    app.on('user.saved', () => {
      // Send the event to options.endpoint.
    });
  },
};

u.use(analytics, { endpoint: '/api/track' });
```

### Data Store

The `data()` function stores values on the document, or on a specific
element when you pass one first:

```ts
import { data } from '@windwalker-io/unicorn-next';

data('app.theme', 'dark');
data('app.theme'); // 'dark'

const form = document.querySelector('#admin-form');

data(form, 'dirty', true);
data(form, 'dirty'); // true
```

## Macros

A macro adds a function to the app object, so inline HTML can call it as
`u.<name>()`. Use `useMacro()` to register one or several macros:

```ts
import {
  fadeIn,
  useMacro,
  useTomSelect,
} from '@windwalker-io/unicorn-next';

useMacro('useTomSelect', useTomSelect);

useMacro({
  fadeIn,
});
```

```html
<script>
  u.useTomSelect('.js-tom-select');
  u.fadeIn('#notice');
</script>
```

::: info
A macro name must be unique on the app. Registering the same name twice
throws an error.
:::

```ts
useMacro('fadeIn', fadeIn);
useMacro('fadeIn', fadeIn);

// ERROR: Error: Macro: fadeIn already exists.
```

::: tip
Declare your macros with `declare module` to get IDE autocompletion for
`u.` calls:

```ts
const macro = useMacro({ fadeIn });

declare module '@windwalker-io/unicorn-next' {
  type MyMacros = typeof macro;

  interface UnicornApp extends MyMacros {}
}
```
:::

::: warning
Every macro is reachable from inline HTML through `u` once
`pushUnicornToGlobal()` runs. Expose only the functions the HTML needs.
:::

## Bundled Imports

Unicorn JS is built for a bundler such as Vite. Import the functions you use
by name, and the bundler includes them in your page bundle. You do not need
the app object for these:

```ts
import {
  animateTo,
  fadeIn,
  selectOne,
  useBs5Tooltip,
  useTomSelect,
} from '@windwalker-io/unicorn-next';

await useBs5Tooltip();

await fadeIn(selectOne('#notice'));

await useTomSelect('.js-tom-select');
```

Use `useImport()` to load a module at runtime, when the bundler should not
include it. The module must be available through the page's import map:

```ts
import { useImport, useCssImport } from '@windwalker-io/unicorn-next';

const swiper = await useImport('@swiper');

await useCssImport('@swiper/swiper.css');
```

::: warning
Do not load the same library with both `import` and `useImport()`. The page
then contains two copies, and the second copy can break the first. Pick one
method for each library.
:::

## Service Overview

The package groups its helpers by concept. Use the functions you need from
the package and skip the rest:

```ts
import {
  route,
  selectAll,
  trans,
  useForm,
  useGrid,
} from '@windwalker-io/unicorn-next';

// DOM: find elements and bind behavior.
selectAll('.js-row-check', (el) => {
  el.addEventListener('change', () => {});
});

// Language: translate a key from the server-provided dictionary.
const label = trans('app.save.button');

// Routing: build a URL from a named route.
const editUrl = route('user.edit', { id: 1 });

// Forms and grids: attach behavior to existing markup.
const form = useForm('#admin-form');
const grid = useGrid('#admin-grid');
```

The main groups are:

- DOM: `selectOne()`, `selectAll()`, `module()`, `delegate()`.
- Animation and UI: `animateTo()`, `fadeIn()`, `slideDown()`.
- Loading: `useImport()`, `useScriptImport()`, `useCssImport()`.
- Language and routing: `trans()`, `route()`, `useSystemUri()`.
- Composables: `useForm()`, `useGrid()`, `useTomSelect()`,
  `useHttpClient()`, `useStack()`, `useQueue()`.

::: info
`route()` reads the route map that the server embeds as `unicorn.routes`.
:::

For the complete list of functions and signatures, see the
[functions reference](https://github.com/windwalker-io/unicorn/blob/main/assets/docs/functions.md).

## Related

- [Macros](./basics/macros)
- [Mixin](./basics/mixin)
- [Data Transfer](./basics/data-transfer)
