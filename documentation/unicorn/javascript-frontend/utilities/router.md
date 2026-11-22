---
layout: doc
title: Router
description: Build URLs from named routes registered by the server.
---

# Router

Hard-coded URLs break when a route changes. Unicorn JS keeps a map of named
routes, so scripts ask for `user_edit` and receive the current URL. The
server registers the map, and the browser resolves names when it needs them.

## Enabling Routes

Register routes on the server with `UnicornScript::addRoute()`. The values
are sent to the page with the rest of the Unicorn data:

```php
$unicornScript->addRoute(
    'user_edit',
    // '/admin/user/edit[/{id}]'
    $nav->to('user_edit')->id($id)
);
```

Omit the URL to let the server build it with its navigation service:

```php
$unicornScript->addRoute('@post_ajax');
```

::: info
The server stores every name with an `@` prefix, so `user_edit` is saved as
`@user_edit`. You can pass the name with or without `@`. `route()` finds
the route either way. `hasRoute()` follows the same rule.
:::

Then build URLs in JavaScript with `route()`:

```ts
import { route } from '@windwalker-io/unicorn-next';

const url = route('user_edit', { id: 5 });
// /admin/user/edit/5
```

::: tip
Separate words in a route name with underscores, such as `user_edit`.
Keep `/` out of the name. The first `/` separates the name from a path.
:::

## Complete Example

A user list links each row to its edit page. A delete button posts to a
route with a query string. The server defines both routes, and the script
builds every URL from their names:

```php
$unicornScript->addRoute(
    'user_edit',
    '/admin/user/edit/{id}'
);
$unicornScript->addRoute(
    'user_delete',
    '/admin/user/delete'
);
```

```html
<a class="js-user-row" data-id="5" href="#">Ann</a>
<a class="js-user-row" data-id="6" href="#">Ben</a>
<button type="button" class="js-user-delete" data-id="5">
  Delete
</button>
```

```ts
import { route, selectAll } from '@windwalker-io/unicorn-next';

selectAll<HTMLAnchorElement>('.js-user-row').forEach((row) => {
  const id = row.dataset.id!;

  // Edit link for each row.
  row.href = route('user_edit', { id });
});

async function deleteUser(id: number): Promise<void> {
  // Query string: /admin/user/delete?id=5&confirm=1
  const url = route('user_delete', { id, confirm: 1 });

  await fetch(url, { method: 'POST' });
}

selectAll<HTMLButtonElement>('.js-user-delete').forEach((button) => {
  button.addEventListener('click', () => {
    deleteUser(Number(button.dataset.id));
  });
});
```

## Building URLs

`route()` looks up the name and fills placeholders in the URL. Keys that do
not match a placeholder become query parameters:

```ts
route('user_edit', { id: 5 });
// /admin/user/edit/5

route('user_edit', { id: 5, tab: 'profile' });
// /admin/user/edit/5?tab=profile
```

Placeholders are removed from the object you pass. `route()` and
`addQuery()` delete each key they use, so a reused object loses its values:

```ts
const params = { id: 5, tab: 'profile' };

route('user_edit', params);
// /admin/user/edit/5?tab=profile

// params is now { tab: 'profile' }

route('user_edit', params);
// /admin/user/edit/{id}?tab=profile
```

::: warning
A reused object silently leaves `{id}` in the URL. Pass a copy, such as
`route('user_edit', { ...params })`, when you need the object again.
:::

## Path Suffixes

Text after the first `/` in a name is appended to the registered URL. This
suits files or subpaths below a route:

```php
$unicornScript->addRoute('media', '/assets/media');
```

```ts
route('media/images/logo.png');
// /assets/media/images/logo.png
```

## Query in the Name

A query string can follow the path in the name. The result is the same as
passing the values as an object. The examples assume that `foo_ajax` is
registered as `/admin/foo/ajax`:

```ts
const id = 5;

route('@foo_ajax/taskName?id=5');
// /admin/foo/ajax/taskName?id=5

route(`@foo_ajax/taskName?id=${id}`);
// /admin/foo/ajax/taskName?id=5

// Same as:
route(`@foo_ajax/taskName`, { id });
// /admin/foo/ajax/taskName?id=5
```

Use the object form when the values come from variables, because it
encodes them. Values inside the name are inserted as written.

## Route Name Lookup

`route()` tries the name as given. If nothing matches, it retries with the
`@` prefix added or removed. Server routes are stored with the `@` prefix,
so both forms reach the same route:

```ts
route('@user_edit', { id: 5 });
// /admin/user/edit/5

route('user_edit', { id: 5 });
// /admin/user/edit/5
```

Unknown names throw an error:

```ts
route('user_unknown');

// ERROR: Error: Route: "user_unknown" not found
```

::: warning
An uncaught error stops the rest of the script. Make sure the server
registers each route the script uses. To test a name first, see
`hasRoute()` below.
:::

## Checking and Adding Routes

`hasRoute()` returns whether a name is registered. `addRoute()` adds a
route from the browser, which suits routes that depend on the page. A call
to `addRoute()` replaces any route with the same name, and the route lasts
until the page reloads:

```ts
import { addRoute, hasRoute } from '@windwalker-io/unicorn-next';

if (!hasRoute('user_preview')) {
  addRoute('user_preview', '/admin/user/preview/{id}');
}

route('user_preview', { id: 5 });
// /admin/user/preview/5
```

::: info
`hasRoute()` uses the same `@` rule as `route()`. It checks the name as
given, then retries with the `@` prefix added or removed. Both forms return
`true` for a server route:

```ts
hasRoute('user_edit');
// true

hasRoute('@user_edit');
// true
```
:::

## Building Query Strings

`addQuery()` appends a query object to a URL. `buildQuery()` converts an
object to a query string, and `parseQuery()` converts a query string to an
object:

```ts
import {
  addQuery,
  buildQuery,
  parseQuery,
} from '@windwalker-io/unicorn-next';

addQuery('/admin/users', { page: 2, q: 'ann' });
// /admin/users?page=2&q=ann

addQuery('/admin/users?sort=name', { page: 2 });
// /admin/users?sort=name&page=2

buildQuery({ page: 2, sort: 'name' });
// page=2&sort=name

parseQuery<{ page: string }>('page=2');
// { page: '2' }
```

An empty object leaves the URL unchanged. The type argument of
`parseQuery()` only tells TypeScript the result shape. Values are not
converted, so `'2'` stays a string.

## Related

- [Unicorn JS](../unicorn-js)
- [System URI](./system-uri)
- [Data Transfer](../basics/data-transfer)
