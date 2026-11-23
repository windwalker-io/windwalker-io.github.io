---
layout: doc
title: KeepTab
description: Remember the active Bootstrap 5 tab across page loads with Unicorn JS.
---

# KeepTab

Bootstrap tabs show their first tab on every page load. A user who
switches to another tab loses that choice when the page reloads. KeepTab
stores the tab a user clicks and shows it again on the next visit to the
same URL. It works with the Bootstrap 5 tab components described in the
[Bootstrap 5 overview](./overview).

## How It Works

KeepTab saves the clicked tab in `localStorage`. It does not read the URL
hash to choose a tab.

- When a tab is clicked, KeepTab saves its target. The target is the
  `data-bs-target` or `data-target` attribute, or the `href` of the
  trigger, in that order.
- On startup, KeepTab reads the saved target and calls `show()` on the
  matching trigger.
- The storage key is `tab-href-` followed by a SHA-256 hash of the full
  page URL and a uid. The key is different for each URL and uid.

## Enabling KeepTab

Import `useBs5KeepTab()` and pass a selector. The selector points to the
element that contains the tab triggers, not to the tab panes:

```js
import { useBs5KeepTab } from '@windwalker-io/unicorn-next';

await useBs5KeepTab('#settings-tabs');
```

## Complete Example

This page has three tabs. Select the Security tab, reload the page, and
the Security tab stays active.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet"
    href="https://unpkg.com/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="p-4">
  <h1>Settings</h1>

  <ul id="settings-tabs" class="nav nav-tabs" role="tablist">
    <li class="nav-item" role="presentation">
      <button class="nav-link active" type="button" role="tab"
        data-bs-toggle="tab" data-bs-target="#general-pane">
        General
      </button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" type="button" role="tab"
        data-bs-toggle="tab" data-bs-target="#security-pane">
        Security
      </button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" type="button" role="tab"
        data-bs-toggle="tab" data-bs-target="#advanced-pane">
        Advanced
      </button>
    </li>
  </ul>

  <div class="tab-content border border-top-0 p-3">
    <div class="tab-pane fade show active" id="general-pane"
      role="tabpanel">
      General settings.
    </div>
    <div class="tab-pane fade" id="security-pane" role="tabpanel">
      Security settings.
    </div>
    <div class="tab-pane fade" id="advanced-pane" role="tabpanel">
      Advanced settings.
    </div>
  </div>

  <script type="module">
    import { useBs5KeepTab } from '@windwalker-io/unicorn-next';

    await useBs5KeepTab('#settings-tabs');
  </script>
</body>
</html>
```

The tab triggers must be Bootstrap tab triggers. They need
`data-bs-toggle="tab"` (or `pill`) and a target or `href`. Bootstrap's
markup stays the same. KeepTab only adds the saving and restoring.

## Using the Attribute

Unicorn registers a `uni-keeptab` [directive](/documentation/unicorn/javascript-frontend/ui/web-directive). Put the attribute on the
element that contains the tabs. The element's `id` is used as the uid.

```html
<ul id="settings-tabs" class="nav nav-tabs" role="tablist"
  uni-keeptab>
  <!-- Tab triggers -->
</ul>
```

The directive is registered when `useBs5KeepTab()` loads its module. Call
it once at startup, without a selector:

```js
import { useBs5KeepTab } from '@windwalker-io/unicorn-next';

await useBs5KeepTab();
```

Pass options as JSON in the attribute value. Use single quotes around the
value so the double quotes stay valid HTML:

```html
<ul id="settings-tabs" class="nav nav-tabs" role="tablist"
  uni-keeptab='{"delay": 100}'>
  <!-- Tab triggers -->
</ul>
```

## Options

Pass an element when you need options. The three options are `uid`,
`delay`, and `tabItemSelector`:

```js
import { useBs5KeepTab } from '@windwalker-io/unicorn-next';

const tabs = document.getElementById('settings-tabs');

await useBs5KeepTab(tabs, {
  // Storage key part. Defaults to the element id.
  uid: 'settings',

  // Milliseconds to wait before the saved tab is restored.
  // Defaults to 0.
  delay: 100,

  // Selector for the tab triggers inside the element.
  // Defaults to the Bootstrap tab and pill triggers.
  tabItemSelector: '[data-bs-toggle=tab]',
});
```

### The uid

The uid separates the saved tab of one tab group from another on the same
URL. The default is the element `id`. Give every tab group a unique `id`,
or a unique `uid`. Tab groups without an `id` and without a `uid` share a
key on the same URL.

When the selector is a string, the selector text is the uid. The `uid`
option applies to element targets.

### The delay

`delay` waits before the saved tab is restored. Use it when another
script renders the tabs after KeepTab starts.

### The tab selector

`tabItemSelector` finds the triggers that KeepTab listens to. The default
matches `data-toggle` and `data-bs-toggle` with the values `tab` and
`pill`. Override it only when your triggers use other attributes.

## Instance Methods

`useBs5KeepTab()` with a selector returns the `KeepTab` instance. Use its
methods to check or change the tab from code:

```js
import { useBs5KeepTab } from '@windwalker-io/unicorn-next';

const tabs = await useBs5KeepTab('#settings-tabs');

// True when a trigger targets this pane.
tabs.hasTab('#security-pane');

// Show a tab without saving it.
tabs.activateTab('#security-pane');
```

::: info
`activateTab()` shows the tab but does not save it. The saved tab changes
only when a user clicks a trigger.
:::

## Restore Rules

On startup, KeepTab handles the saved tab in one of three ways:

- The saved tab exists and is enabled. KeepTab shows it.
- The saved tab exists but has the `disabled` attribute or the `disabled`
  class. KeepTab skips it and keeps the saved value.
- The saved tab is not on the page. KeepTab removes the saved value.

If the selector does not match an element, KeepTab logs a warning and does
not start:

```js
// ERROR: [KeepTab] Element #missing-tabs not found.
await useBs5KeepTab('#missing-tabs');
```

## Events

KeepTab does not dispatch its own events. Restoring a tab calls Bootstrap's
`show()`, so the usual Bootstrap events fire, including `shown.bs.tab`. The
event bubbles to the tab container:

```js
const tabs = document.getElementById('settings-tabs');

tabs.addEventListener('shown.bs.tab', (e) => {
  console.log(e.target.dataset.bsTarget); // '#security-pane'
});
```

::: info
The saved value is kept per URL. A URL with a different query string or
hash has its own saved tab. For example, `/settings?view=a` and
`/settings?view=b` remember different tabs.
:::
