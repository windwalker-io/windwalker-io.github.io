---
layout: doc
---

# Vue Development

Fusion Next runs on Vite, so Vue components work with the official
Vite plugin. You do not need a separate build task or a separate `vue`
directory. Put Vue files in `resources/assets/src` with the rest of your
TypeScript, and load them from the view's own module.

## Install Vue and the Plugin

Install Vue and `@vitejs/plugin-vue`:

```bash
yarn add @vitejs/plugin-vue vue
```

Add the plugin to `vite.config.ts`:

```ts
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  return {
    // ...
    plugins: [
      // ...
      vue(),
    ],
  };
});
```

Fusion aliases `vue` to the full build with the runtime template
compiler (`fusion.alias('vue', 'vue/dist/vue.esm-bundler.js')` in
`fusionfile.ts`). Keep that alias so runtime template strings compile.

### Keep Whitespace

Static HTML often depends on whitespace. If Vue collapses it, the layout
can break. Preserve it with the template compiler options:

```ts
plugins: [
  vue({
    template: {
      compilerOptions: {
        whitespace: 'preserve',
      },
    },
  }),
],
```

## Create the App Component

Create a root component under `resources/assets/src`:

```vue
<!-- resources/assets/src/app/LessonEditApp.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const title = ref('Lesson');
</script>

<template>
  <div class="lesson-edit">
    <h2>{{ title }}</h2>
  </div>
</template>
```

## Mount the App from a View Module

Place a mount point in the view's Blade template. Use an `id` so the
selector is unambiguous:

```html
<lesson-edit-app id="lesson-edit-app"></lesson-edit-app>
```

Then create and mount the app in the module with the same name as the
view, for example `lesson-edit.ts`:

```ts
// resources/assets/src/app/lesson-edit.ts
import { createApp } from 'vue';
import LessonEditApp from '~/src/app/LessonEditApp.vue';

const app = createApp(LessonEditApp);

app.mount('#lesson-edit-app');
```

Because the file is a view module, Fusion loads it when the view
renders. Changes to the `.vue` file and to this entry are reloaded by
the [dev server](./dev-server).

::: tip
If the same app can appear in several views, move the setup into a
factory function such as `createLessonApp()` and call it from each
module. Mount the returned instance where it is needed.
:::

## Register Plugins and Global Helpers

Install plugins on the app before mounting:

```ts
import { createApp } from 'vue';
import vuedraggable from 'vuedraggable';
import LessonEditApp from '~/src/app/LessonEditApp.vue';
import appPlugin from '~/src/plugin/app-plugin';

const app = createApp(LessonEditApp);

app.use(vuedraggable);
app.use(appPlugin);

app.mount('#lesson-edit-app');
```

A plugin is a function that receives the app. It can add global
properties for shared helpers:

```ts
// resources/assets/src/plugin/app-plugin.ts
import { App } from 'vue';

export default function appPlugin(app: App) {
  app.config.globalProperties.$truncate = (text: string, max: number) => {
    return text.length > max ? text.substring(0, max) + '...' : text;
  };
}
```

To keep the types of these properties, declare them once in a
`shims.d.ts` file:

```ts
// resources/assets/src/types/shims.d.ts
import { ComponentCustomProperties } from 'vue';

declare module 'vue' {
  interface ComponentCustomProperties {
    $truncate: (text: string, max: number) => string;
  }
}
```

## Type Checking

Fusion does not type-check `.vue` files during the build. To check
types, run `vue-tsc` in your project as a separate step:

```bash
yarn add -D vue-tsc
npx vue-tsc --noEmit --skipLibCheck
```

::: info
`vue-tsc` only reports errors. It does not change the bundle, so a
type error does not stop `yarn build`.
:::
