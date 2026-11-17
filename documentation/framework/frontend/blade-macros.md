---
layout: doc
---

# Blade Macros

A Blade macro is a `<script>` or `<style>` block inside a view that
has a `data-macro` attribute. Windwalker moves the script out of the
page and registers it as a named module. Blade passes PHP values to
it as props.

## Script Macros

Macros are removed from the page after compilation, so they can sit
anywhere in the view:

```blade
{{-- src/Module/Front/Home/views/home.blade.php --}}
<script data-macro="home" lang="ts" type="module">
  import { onMacroReady, useMacroProps } from '@windwalker-io/core/app';

  export default function () {
    const props = useMacroProps();

    onMacroReady(() => {
      console.log(props.title);
    });
  }
</script>
```

::: tip
Wrapping a macro in `@push('macro')` is optional. It works as a
visual marker and guards against leaking code into the page if a
macro is accidentally left outside its block.
:::

The macro is loaded when the view renders its `<script>` block with
`lang="ts"` and content. You do not call it yourself.

### Passing Props

Pass props as attributes on the script tag:

- `data-prop:name="php expression"`: adds one prop named `name`.
- `data-props="php expression"`: spreads an array of props.

```blade
<script
  data-macro="user-card"
  lang="ts"
  data-prop:user-id="$user->getId()"
  data-prop:title="__('app.user.title')"
  data-props="$extraProps"
  type="module"
>
  import { useMacroProps } from '@windwalker-io/core/app';

  export default function () {
    const { userId, title } = useMacroProps();
  }
</script>
```

Prop names are passed through as written. Use the same key in
JavaScript that you wrote in the attribute.

::: warning
Props are PHP expressions. Do not put untrusted user input directly
into `data-prop:*` or `data-props`. Escape or validate it first.
:::

### Prop Name Case

HTML attribute names are case-insensitive. The HTML parser lowercases
them before Windwalker reads the attribute, so camelCase names are lost:

```blade
<script
  data-macro="user-card"
  lang="ts"
  data-prop:userId="$user->getId()"
  type="module"
>
```

```ts
// Received as "userid" in the props, not "userId"
const { userid } = useMacroProps();
```

Write the prop name in kebab-case. Windwalker converts it to camelCase:

```blade
<script
  data-macro="user-card"
  lang="ts"
  data-prop:user-id="$user->getId()"
>
```

```ts
const { userId } = useMacroProps();
```

::: warning
Do not rely on camelCase in `data-prop:*` names. A name such as
`data-prop:userId` silently produces a different key, and the JavaScript
gets `undefined` without an error.
:::

### Macros Included More Than Once

A macro's top-level code runs only once per page, because the module
is cached after its first load. If a view with the macro is included
several times, only the first include runs top-level code. To run the
code on every include, and to receive each include's own props, put
it in a function:

- **`export default`**: the runtime calls the default export on every
  include.

```blade
{{-- views/partials/foo-runner.blade.php --}}
<script
  data-macro="foo-runner"
  lang="ts"
  type="module"
  data-prop:foo="$foo"
  data-prop:options="$options"
>
  import { useMacroProps } from '@windwalker-io/core/app';

  export default async function () {
    // Call useMacroProps() before the first await
    const { foo, options } = useMacroProps<{
      foo: string;
      options: { a: number; b: number };
    }>();

    console.log(foo);
    await new Foo(options).run();
  }
</script>
```

```blade
{{-- Each include receives its own props --}}
@include('partials.foo-runner', [
  'foo' => 'first',
  'options' => ['a' => 1, 'b' => 2],
])
@include('partials.foo-runner', [
  'foo' => 'second',
  'options' => ['a' => 3, 'b' => 4],
])
```

- **`onMacroReady()`**: registers a handler that runs after each
  include.

```blade
{{-- views/partials/foo-runner.blade.php --}}
<script
  data-macro="foo-runner"
  lang="ts"
  type="module"
  data-prop:foo="$foo"
  data-prop:options="$options"
>
  import { onMacroReady, useMacroProps } from '@windwalker-io/core/app';

  onMacroReady(async () => {
    const { foo, options } = useMacroProps<{
      foo: string;
      options: { a: number; b: number };
    }>();

    console.log(foo);
    await new Foo(options).run();
  });
</script>
```

::: warning
Call `useMacroProps()` before the first `await`. It reads the props of
the include that is loading, so read them before the code yields.
:::

## Style Macros

A `<style data-macro>` block is compiled as SCSS or CSS and removed
from the page body:

```blade
<style data-macro type="text/scss">
  .home-hero {
    padding: 4rem 0;
  }
</style>
```

Style macros are collected by `cssModulizeDeep()`. See
[Styles and Assets](./styles-and-assets).

::: info
Use a `data-scope` attribute on a style macro to limit its selectors
to a scope in the compiled CSS.
:::

## How Macros Are Built

A script macro goes through four steps:

1. **Scan**: `jsModulizeDeep()` reads the Blade files in the scan
   directories (see below) and collects every non-empty
   `<script data-macro lang="ts">` block.
2. **Write**: each block is saved as a TypeScript file in the tmp
   folder, named `<blade-file>__<macro-id>.ts`. Dots in the id become
   dashes.
3. **Bundle**: the file is bundled under the key `inline:<macro-id>`.
4. **Compile**: when Blade renders the view, the `<script data-macro>`
   tag is replaced with a call that loads the module under the key
   `inline:<macro-id>`. The `data-prop:*` attributes become the props
   object.

At runtime, the module runs its `export default` or `onMacroReady()`
handlers.

### Default Scan Directories

Macros are found in these locations by default:

- `src/Module/<Stage>/**/*.blade.php`: views in each module.
- `views/**/*.blade.php`: views at the project root and in each
  Windwalker package.
- Packages listed in `composer.json` under
  `extra.windwalker.modules`, plus the `src/Module/` folder of the
  project.

The `<Stage>` name is `Front` or `Admin`, matching the stage passed to
`jsModulizeDeep()` in `fusionfile.ts`.

### Adding Scan Directories

Add extra patterns on the processor returned by `jsModulizeDeep()`.
Patterns are glob strings relative to the project root:

```ts
import { jsModulizeDeep } from '@windwalker-io/core/next';

jsModulizeDeep(
  'Front',
  'resources/assets/src/front/main.ts',
  'js/front/main.js',
  { parseBlades: false },
)
  .parseBlades('src/Shared/**/*.blade.php')
  .parseBlades('src/Components/**/*.blade.php');
```

- `parseBlades: false`: turns off the default Blade scan.
- `mergeScripts: false`: turns off the default `assets/*.ts` merge.
- `.mergeScripts(pattern)`: adds more `.ts` files to merge.

::: warning
A macro is bundled only when its Blade file matches a scan pattern.
If a macro in another folder does not run, add its folder as a
pattern.
:::

### Where Compiled Files Are Stored

Each part of the build writes to its own folder:

- **Macro TypeScript files**: `./tmp/fusion/jsmodules/`. The folder is
  removed after each build and when the dev server stops. Change the
  path with `tmpPath`.
- **Bundled JavaScript**: the `dest` of the Fusion file, under the
  output folder. For example, `js/front/main.js` is written to
  `www/assets/js/front/main.js`.
- **Compiled Blade views**: the `cache_path` folder. It defaults to
  `cache/renderer/`, using the `CACHE_PATH` environment variable when
  it is set. Files are named `~<hash>.php`. In debug mode the name
  also starts with the view name, for example
  `~home-<hash>.php`.

## Debugging Macros

To inspect the generated TypeScript for a macro, keep the tmp folder:

```ts
jsModulizeDeep(
  'Front',
  'resources/assets/src/front/main.ts',
  'js/front/main.js',
  { cleanTmp: false },
);
```

Then open the matching file in `tmp/fusion/jsmodules/`. Check it for
the code that Fusion bundled.

To see the PHP that Blade generated, open the file in `cache/renderer/`
that matches the view. Search for `inline:<macro-id>` to confirm the key
and props. If a change does not appear, delete the cached file, or the
whole folder, so Blade compiles it again.

::: tip
Set `cleanTmp: false` only while debugging, and remove the setting
afterwards. The default setting keeps the tmp folder clean.
:::

