---
layout: doc
title: Theming
description: How Unicorn separates its layouts from the CSS framework, and how to override or replace the Bootstrap 5 theme.
---

# Theming

Unicorn renders its admin screens, grids, and form fields through Blade layouts, not hard-coded HTML. Those layouts depend on a CSS framework, so Unicorn keeps them in a theme folder and refers to them by logical name. You can restyle one layout or replace the whole CSS framework without changing PHP code.

## How Unicorn Works with CSS Frameworks

PHP classes never name a CSS framework. A field, a grid column, or a breadcrumb asks for a layout such as `@theme::form.label`, and the renderer finds that layout in the active theme. The `@theme` namespace is the only point where a CSS framework is chosen.

`UnicornPackage` maps Unicorn's UI roles to theme layouts with aliases:

```php
// Aliases registered by UnicornPackage::register()
'@card' => '@theme::components.card',
'@sort' => '@theme::grid.sort',
'@state-button' => '@theme::grid.state-button',
```

The default theme is `views/ui/bootstrap5`, which Unicorn registers under the `@theme` namespace:

```text
views/ui/bootstrap5/
  bool-icon.blade.php
  components/    card, tabs, breadcrumb, pagination-stats, ...
  field/         switcher, modal, repeatable, multi-uploader, ...
  form/          label, input, fieldset, title-bar, ...
  grid/          sort, state-button, filter-bar, batch-modal, ...
```

::: info
`views/ui/bootstrap4` contains only `components/input-group.blade.php`. If you need this, you can switch to it and writing your own layouts.
:::

## The Theme Namespace

Unicorn registers the Bootstrap 5 theme for you. To add your own theme, add
a `@theme` entry to the existing `namespaces` key in
`etc/packages/renderer.config.php`. Your host config already defines
`@front` and `@admin` there, so keep them:
                                                                                                                                                                        
```php
static fn() => [
    'namespaces' => [
        '@front' => [
            // Existing entries stay as they are.
        ],
        '@theme' => [
            '@root/views/theme',
        ],
    ],
];
```

Layouts are searched in priority order. Your folder is added before Unicorn's
Bootstrap 5 folder, so a layout in your folder wins. A layout your folder does
not contain falls back to Bootstrap 5.

::: warning
A missing layout falls back to Bootstrap 5 without an error. A partial theme
renders a mix of Bootstrap and your own classes.
:::

## Overriding a Layout

A layout is overridden by name. If a folder earlier in the `@theme` search
order contains a file with the same relative path, that file replaces
Unicorn's version. Unicorn's aliases then render your file without any other
change. For how overrides and priorities work in general, see
[Layout Rendering](../../framework/core-concepts/views/renderer).

## Existing Documentation

Review these pages for the parts that a theme touches:

- [Layout Rendering](../../framework/core-concepts/views/renderer): paths, priorities, and namespaces.
- [Edge Templates](../../framework/core-concepts/views/edge-templates): layout inheritance and partials.
- [View Components](../../framework/core-concepts/views/view-components): component layouts.
- [Form Fields Layout](../form-fields/form-utilities/form-fields-layout): how field layouts are composed.
- [Conditional Display](../form-fields/form-utilities/conditional-display): `showon` markup.
- [Modal Alert](../javascript-frontend/bootstrap-5/modal-alert), [Keep Tab](../javascript-frontend/bootstrap-5/keep-tab), and [IFrame Modal](../javascript-frontend/bootstrap-5/iframe-modal): Bootstrap-based JavaScript.

## Example: Overriding One Layout

Copy the layout you want to change, then keep the same variables and change
only the markup you need. This example replaces the Font Awesome icons in
`bool-icon` with Bootstrap Icons. Create the file at
`views/theme/bool-icon.blade.php`:

```blade
{{-- views/theme/bool-icon.blade.php --}}
<?php

$trueIcon ??= 'bi-check-lg text-success';
$falseIcon ??= 'bi-x-lg text-dark';

$attributes->class([
    'bi',
    $value ? $trueIcon : $falseIcon,
]);
?>

<i {{ $attributes->toHtml() }}></i>
```

Because the folder is registered under `@theme`, Unicorn's `@bool-icon`
alias now renders this file.

::: info
This version ignores the `type` and `size` options of Unicorn's original
layout. Callers that pass them see no effect.
:::

## Example: Replacing the CSS Framework

Replacing the framework means providing a complete set of layouts in another
folder. This example adds a Bulma version of the card layout. Point the
`@theme` namespace at the Bulma folder:

```php
static fn() => [
    'namespaces' => [
        '@theme' => [
            '@root/views/themes/bulma',
        ],
    ],
];
```

Create `views/themes/bulma/components/card.blade.php` with the same variables
as Unicorn's card, and Bulma classes:

```blade
{{-- views/themes/bulma/components/card.blade.php --}}
<div {!! $attributes !!}>
    @if ($header ?? null)
        <header class="card-header">
            <p class="card-header-title {{ $headerClass ?? '' }}">
                {!! $header !!}
            </p>
        </header>
    @endif

    <div class="card-content {{ $bodyClass ?? '' }}">
        {!! $slot ?? '' !!}
    </div>

    @if ($footerTitle ?? null)
        <footer class="card-footer">
            <span class="card-footer-item {{ $footerClass ?? '' }}">
                {!! $footerTitle !!}
            </span>
        </footer>
    @endif
</div>
```

This version accepts only string headers and footers. Unicorn's Bootstrap
card also accepts callables, so add that branch if your code uses it.

::: warning
Unicorn ships its layouts under `views/ui/bootstrap5`. Browse the full list on
[GitHub](https://github.com/windwalker-io/unicorn/tree/main/views/ui/bootstrap5)
before you start. Until your theme provides every layout you use, the rest
render with Bootstrap 5 classes. Check each screen after you change the theme.
:::

## JavaScript and the CSS Framework

Unicorn's JavaScript is split the same way as its layouts. A UI theme adapter
is installed with `useUITheme()` from `@windwalker-io/unicorn-next`. The
default adapter, `UIBootstrap5`, is bundled with Bootstrap's JavaScript.

The Bootstrap helpers are plain functions, not automatic behaviors. They do
nothing until your code imports and calls them, for example
`useBs5Tooltip()`, `useBs5KeepTab()`, `useBs5ButtonRadio()`, and
`useBsModalAlert()`:

```ts
import { useBs5Tooltip } from '@windwalker-io/unicorn-next';

// Nothing happens until this call runs.
await useBs5Tooltip('[data-bs-toggle="tooltip"]');
```

To switch to a custom theme, replace these calls with your own JavaScript, and
import that module from your entry script. A custom adapter implements
`renderMessage()` and `clearMessages()`:

```ts
import { useUITheme } from '@windwalker-io/unicorn-next';

class BulmaTheme {
  renderMessage(messages: string | string[], type = 'info') {
    const list = Array.isArray(messages) ? messages : [messages];
    const el = document.createElement('div');

    el.className = `notification is-${type}`;
    el.textContent = list.join(' ');
    document.querySelector('.message-wrap')?.append(el);

    // Return a function that removes the message.
    return () => el.remove();
  }

  clearMessages(): void {
    document.querySelector('.message-wrap')?.replaceChildren();
  }
}

// Install the theme once, at application start.
useUITheme(BulmaTheme);
```

If you leave Bootstrap behind, each feature below needs your own
implementation:

- Tooltips: `useBs5Tooltip()` and `data-bs-toggle="tooltip"` markup.
- Tabs: `useBs5KeepTab()`, and the tab helpers in `BootstrapScript`.
- Button radio: `useBs5ButtonRadio()`.
- Modals: `useBsModalAlert()`, the IFrame modal, and the multi-uploader and single-image-drag modals, which use Bootstrap's `Modal`.
- Other `BootstrapScript` helpers: popover, collapse, offcanvas, and scrollspy. These PHP helpers emit code only when they are called.

Bootstrap's JavaScript stays in the bundle. A `data-bs-*` attribute does
nothing unless code initializes it, so check each helper you still use.


## Related

- [Layout Rendering](../../framework/core-concepts/views/renderer)
- [Core Concepts](./core-concepts)

