---
layout: doc
title: Data Transfer
description: Pass values from PHP to Unicorn JS, and read them in the browser.
---

# Data Transfer

Server-rendered pages often need values in JavaScript, such as a [CSRF token](/documentation/framework/core-concepts/security/csrf-protection),
[translated strings](/documentation/unicorn/javascript-frontend/utilities/translation), [route URLs](/documentation/unicorn/javascript-frontend/utilities/router), or the selected items of a field. Unicorn
PHP collects these values and writes them to the page once. Unicorn JS then
reads them with `data()`, `trans()`, `route()`, and `useSystemUri()`.

## Enabling Data Transfer

Inject `UnicornScript` into the class that renders the page. The same
shared instance is used for the whole request:

```php
use Unicorn\Script\UnicornScript;

class UserEditView
{
    public function __construct(
        protected UnicornScript $unicornScript,
    ) {
    }
}
```

`UnicornScript` writes the collected values into `document.__unicorn`
before the page scripts run. `main()` already exposes the [URI data](/documentation/unicorn/javascript-frontend/utilities/system-uri) and the
CSRF token, so you only add what the page needs.

## Complete Example

The PHP side registers a translation, a route, and a value for the page:

```php
public function prepare(array $selectedTags): void
{
    // Translation keys for the JS side.
    $this->unicornScript->translate('user.edit.*');

    // Route the JS side can resolve with route().
    $this->unicornScript->addRoute(
        'user_delete',
        '/admin/user/delete'
    );

    // Any value, stored under its own key.
    $this->unicornScript->data('user.tags', $selectedTags);
}
```

The JS side reads the same values by name:

```ts
import {
  data,
  route,
  trans,
  useSystemUri,
} from '@windwalker-io/unicorn-next';

const tags = data('user.tags');
const label = trans('user.edit.save');
const deleteUrl = route('user_delete', { id: 5 });
const rootUrl = useSystemUri('root');
```

## Adding Values with data()

`data()` stores a value under a name. If the name already exists, the new
value is merged with it by default. Pass `false` as the third argument to
replace the stored value:

```php
$this->unicornScript->data('user.tags', ['php']);

// Replace the value stored under the same name.
$this->unicornScript->data('user.tags', ['php', 'js'], false);
```

## Translations

`translate()` copies the strings into `unicorn.languages`. Pass a single
key, or a key ending with `*` to copy every key with that prefix:

```php
// One key.
$this->unicornScript->translate('user.edit.save');

// Every key that starts with "user.edit.".
$this->unicornScript->translate('user.edit.*');
```

```ts
const save = trans('user.edit.save');
```

::: tip
Copy only the keys the page uses. Every copied string is sent to the
browser on each request.
:::

## Routes

`addRoute()` stores a named URL. `route()` looks it up and appends the query
you pass:

```php
$this->unicornScript->addRoute(
    'user_delete',
    '/admin/user/delete'
);
```

```ts
// Result: /admin/user/delete?id=5
const url = route('user_delete', { id: 5 });
```

```ts
route('user_unknown');

// ERROR: Error: Route: "user_unknown" not found
```

## URIs

`useSystemUri()` reads the URI data that `main()` exposes. Pass one of
`full`, `path`, `root`, `current`, `route`, or `script`:

```ts
const root = useSystemUri('root');
const path = useSystemUri('path');
```

`useAssetUri()` reads the asset root and path from the same data.

## CSRF Token and CSP Nonce

`main()` already calls `exposeCsrfToken()`. The token is available as
`data('csrf-token')`:

```ts
const token = data('csrf-token');
```

Call `exposeCspNonce()` when your page uses a [Content Security Policy](/documentation/framework/core-concepts/security/content-security-policy) with
nonces. The nonce is then available as `data('csp-nonce')`:

```php
$this->unicornScript->exposeCspNonce();
```

::: warning
Everything in `data()`, `translate()`, and `addRoute()` appears in the page
source as JSON. Anyone who can load the page can read it. Never pass
passwords, API keys, or private records.
:::

::: info
Values written from JS with `data('name', value)` stay in the browser. They
are not sent back to PHP.
:::

## Related

- [Unicorn JS](../unicorn-js)
- [Macros](./macros)

