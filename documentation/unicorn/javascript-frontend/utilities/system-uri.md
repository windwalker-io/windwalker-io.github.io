---
layout: doc
title: System URI
description: Read the server's base URLs and current route in Unicorn JS.
---

# System URI

Scripts need to know where the application is installed. The application
can live in a sub-folder such as `/sub/`, so a hard-coded `/api/` path
breaks. The system URI helpers read the base URLs and the current route
that Unicorn PHP sends with each page. Scripts build correct URLs from
these values.

## Enabling the URI Helpers

Unicorn PHP writes the URI data in `UnicornScript::main()`. Use the helpers
only on pages that call it. JavaScript needs no extra setup. Import the
helpers you use:

```ts
import {
  useAssetUri,
  useSystemUri,
} from '@windwalker-io/unicorn-next';

const root = useSystemUri('root');
const logo = useAssetUri('path', 'images/logo.png');
```

## Complete Example

A search box keeps the query in the address bar. It calls an API under the
application root. It also shows a placeholder image from the asset folder:

```ts
import {
  useAssetUri,
  useSystemUri,
} from '@windwalker-io/unicorn-next';

const system = useSystemUri();
const endpoint = useSystemUri('root', 'api/users/search');
const placeholder = useAssetUri('path', 'images/placeholder.png');

const input = document.querySelector<HTMLInputElement>('#user-search')!;
const list = document.querySelector<HTMLElement>('#user-list')!;
const avatar = document.querySelector<HTMLImageElement>('#avatar')!;

avatar.src = placeholder;

// Restore the query from the address bar on page load.
input.value = system.searchParams.get('q') ?? '';

async function search(q: string) {
  const url = new URL(endpoint);
  url.searchParams.set('q', q);

  const res = await fetch(url);
  const users: { name: string }[] = await res.json();

  list.replaceChildren(...users.map((user) => {
    const li = document.createElement('li');
    li.textContent = user.name;

    return li;
  }));
}

input.addEventListener('input', () => {
  const q = input.value.trim();

  // Copy the shared URL object before changing it.
  const url = new URL(system.current());
  url.searchParams.set('q', q);
  history.replaceState(null, '', url);

  search(q);
});
```

## Reading Application URLs

`useSystemUri()` with a type returns a string. Without arguments, it
returns a `UnicornSystemUri` object. The object extends the browser's
`URL` class, so `origin` and `searchParams` are also available.

The examples below use the request
`https://example.com/sub/index.php/foo/bar?x=1#frag`:

```ts
const system = useSystemUri();

// Full URL: "https://example.com/sub/index.php/foo/bar?x=1#frag"
system.full();
system.current();        // "https://example.com/sub/index.php/foo/bar"
system.root();           // "https://example.com/sub/"
system.path();           // "/sub/"
system.route();          // "foo/bar/"
system.script();         // "index.php"
system.routeWithQuery(); // "foo/bar/?x=1"
system.routeAndQuery();  // ["foo/bar/", "x=1"]
system.origin;           // "https://example.com"
```

The first argument of `useSystemUri()` selects one of these values:

- `full`: the complete request URL, with query and fragment.
- `current`: the URL with host and path, without query or fragment.
- `root`: the application root URL, with host. It ends with `/`.
- `path`: the application path, without host. It ends with `/`.
- `route`: the route after the script name, such as `foo/bar/`.
- `script`: the script file name, such as `index.php`.

`path()` and `root()` take a suffix and append it to the base. The other
types ignore the second argument.

```ts
useSystemUri('path', 'api/users'); // "/sub/api/users"
useSystemUri('root', 'api/users'); // "https://example.com/sub/api/users"
```

::: warning
Write the suffix without a leading slash. The base already ends with `/`.
`root('/api/users')` returns `https://example.com/sub//api/users`. The
helper does not remove the extra slash.
:::

::: info
`routeWithQuery()` adds the `?` only when the URL has a query. Without a
query, it returns the route alone, such as `foo/bar/`.
:::

::: warning
`useSystemUri()` returns one shared object for the whole page. Changing it
changes the value for every caller:

```ts
// Changes the shared object for every caller.
useSystemUri().searchParams.set('q', 'shoes');
```

Copy the URL before you change it, as the complete example does.
:::

## Reading Asset URLs

`useAssetUri()` works like `useSystemUri()`, but it reads only the asset
values. Use `root` for the asset root URL and `path` for the asset path.
Both values end with `/`, so suffixes have no leading slash:

```ts
const css = useAssetUri('path', 'css/app.css');
const img = useAssetUri('root', 'images/logo.png');

// Without arguments, returns the object itself.
const assets = useAssetUri();

assets.path('css/app.css'); // Same value as the first line.
```

## Building URLs from Paths

`addUriBase()` turns a value into a URL that works in the page. Use it
when the value may be absolute or relative, such as a URL from a CMS field.
Absolute URLs return unchanged. Relative paths join the asset URL of the
given type. The default type is `path`:

```ts
// Absolute URLs pass through unchanged.
addUriBase('https://cdn.example.com/a.png');
// "https://cdn.example.com/a.png"

// Relative paths join the asset path URL (default type).
addUriBase('images/avatar.png');

// Relative paths join the asset root URL.
addUriBase('images/logo.png', 'root');
```

::: tip
When you know a path is relative, call `useAssetUri()` instead. It reads
the asset value directly and skips the absolute-URL check.
:::

A value counts as absolute when it starts with `http`. A relative path such
as `httpdocs/a.png` also returns unchanged.

## Related

- [Unicorn JS](../unicorn-js)
- [Router](./router)
- [Loader](./loader)
