---
layout: doc
title: HttpClient
description: Call the server with an axios-based client that understands Unicorn responses.
---

# HttpClient

Pages that call Unicorn PHP controllers repeat the same work. Each
request needs the CSRF token, each error needs its server message, and
each caller needs the same base URL. `useHttpClient()` wraps an Axios
instance and handles these steps for every request.

## Enabling the Client

Import `useHttpClient` and call it. The returned object has the request
methods, so you can call them without awaiting the client first:

```ts
import { useHttpClient } from '@windwalker-io/unicorn-next';

const api = useHttpClient();

const res = await api.get('/api/items');
```

The client module loads on first use. The requests wait for it
internally.

If you need the full client object, await it. Await returns the
`UnicornHttpClient` with the Axios instance and the hook functions:

```ts
const client = await useHttpClient();

client.axios; // The underlying Axios instance
```

## Complete Example

The following module lists items for a category and saves a new item
from a form. It uses one client for the whole module:

```ts
import {
  useHttpClient,
  type ApiReturn,
} from '@windwalker-io/unicorn-next';

interface Item {
  id?: number;
  title: string;
  categoryId: number;
}

const api = useHttpClient({ baseURL: '/api', timeout: 10000 });

export async function loadItems(categoryId: number): Promise<Item[]> {
  const res = await api.get<ApiReturn<Item[]>>('/items', {
    params: { category: categoryId },
  });

  return res.data.data;
}

export async function saveItem(item: Item): Promise<Item> {
  const res = await api.post<ApiReturn<Item>>('/items', item);

  return res.data.data;
}

const list = document.querySelector<HTMLUListElement>('#item-list')!;
const category = document.querySelector<HTMLSelectElement>('#category')!;
const form = document.querySelector<HTMLFormElement>('#item-form')!;

async function render(categoryId: number) {
  const items = await loadItems(categoryId);

  list.innerHTML = '';

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item.title;
    list.append(li);
  }
}

category.addEventListener('change', () => {
  render(Number(category.value));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = String(new FormData(form).get('title'));

  try {
    await saveItem({ title, categoryId: Number(category.value) });
    await render(Number(category.value));
  } catch (err) {
    if (api.isAxiosError(err)) {
      alert(err.message);
    }
  }
});
```

Load the module at the end of the page body. The page needs a `select`
with id `category`, a `ul` with id `item-list`, and a form with id
`item-form` that contains a `title` field.

## Request Methods

The proxy exposes one method for each HTTP verb. Each method accepts
the URL, the body where the verb uses one, and the Axios options:

```ts
const api = useHttpClient();

// GET, HEAD, and OPTIONS take (url, options).
await api.get('/items', { params: { page: 2 } });
await api.head('/items');
await api.options('/items');

// POST, PUT, PATCH, and DELETE take (url, data, options).
await api.post('/items', { title: 'Demo' });
await api.put('/items/1', { title: 'Demo' });
await api.patch('/items/1', { title: 'Demo' });
await api.delete('/items/1');

// Any method, with a full Axios config.
await api.request({
  method: 'POST',
  url: '/items',
  data: { title: 'Demo' },
});
```

A `FormData` object works as the body. Axios sends it as
`multipart/form-data`:

```ts
import type { ApiReturn } from '@windwalker-io/unicorn-next';

const input = document.querySelector<HTMLInputElement>('#file')!;

const body = new FormData();
body.append('file', input.files![0]);

const res = await api.post<ApiReturn<{ url: string }>>(
  '/upload',
  body
);
```

## Configuration

The first argument passes options to `Axios.create()`. Use any Axios
option, such as `baseURL`, `timeout`, or `headers`:

```ts
const api = useHttpClient({
  baseURL: '/api',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});
```

To reuse an existing Axios instance, pass the instance instead. The
client adds its interceptors to that instance:

```ts
import Axios from 'axios';

const instance = Axios.create({ baseURL: '/api' });

const api = useHttpClient(instance);
```

## URL Helpers

Two URL features apply before each request:

- A URL that starts with `@` is resolved with the `route()` service.
- A `vars` option expands `{name}` placeholders in the URL.

```ts
// Expands to /items/42
await api.get('/items/{id}', { vars: { id: 42 } });

// Resolved as a route name, then expanded with vars.
await api.get('@item.show', { vars: { id: 42 } });
```

The route name `item.show` in the second line is an example. It must
exist in the route map that the page provides.

## Method Simulation

Some servers accept only `GET` and `POST`. Set `methodSimulate` to send
other verbs as `POST`. The client adds the original verb to the body as
`_method`. Any non-empty string enables the option, and the value itself
is not used:

```ts
// Sends POST with { title: 'Demo', _method: 'PUT' }
await api.put('/items/42', { title: 'Demo' }, {
  methodSimulate: 'on',
});
```

The option adds `_method` only to plain object bodies. `GET` requests
keep their verb.

## Hooks

Use `requestMiddleware()` and `responseMiddleware()` to add interceptors
to the client. Both are available on the awaited client:

```ts
const client = await useHttpClient({ baseURL: '/api' });

const id = client.requestMiddleware((config) => {
  config.headers['X-Client'] = 'unicorn-admin';

  return config;
});

client.responseMiddleware((res) => {
  console.debug(res.config.url, res.status);

  return res;
});

// Remove the request hook later.
client.axios.interceptors.request.eject(id);
```

The hook callbacks receive only the success path. Errors pass through
to the caller of the request.

::: info
Request hooks run in reverse order of registration. The client's own
request interceptor is registered first, so it runs last. A hook
registered with `requestMiddleware()` sees the URL before `@` route
names and `vars` are resolved.
:::

::: warning
Each call to `useHttpClient()` creates a new Axios instance. Hooks added
to one client do not apply to another. Create the client once, and
share the returned object between modules.
:::

## CSRF Token

The client sets the `X-CSRF-Token` header on every request. The value
comes from `data('csrf-token')`.

::: warning
Do not send requests to other origins with this client. The CSRF token
is sent with every request, including requests to third-party URLs.
Use plain Axios for external APIs.
:::

## Response Shape

The client types successful responses as `ApiReturn<T>`. The body has
this shape, and Axios exposes it as `res.data`:

```ts
// res.data
{
  success: true,
  message: 'Item saved.',
  code: 200,
  status: 200,
  data: { id: 42, title: 'Demo' },
}
```

The client code reads `success` and `data` from a successful body. The
`message` field is read from error responses.

## Error Handling

When a request fails, the client rejects with an `AxiosError`. If the
response body has a `message`, the client replaces `err.message` with
it. The original Axios message is kept in `err.originMessage`:

```ts
try {
  await api.get('/items/999');
} catch (err) {
  if (api.isAxiosError(err)) {
    // ERROR: Item not found.
    console.error(err.message);

    // ERROR: Request failed with status code 404
    console.error(err.originMessage);

    // 404
    console.error(err.response?.status);
  }
}
```

The `ERROR` comments show the values for a 404 response whose body has
the message `Item not found.`.

Use `isAxiosError()` to check that an error came from a request. Use
`isCancel()` to skip requests that you aborted on purpose:

```ts
const controller = new AbortController();

const search = api.get('/items', {
  params: { q: 'demo' },
  signal: controller.signal,
});

controller.abort();

try {
  await search;
} catch (err) {
  // A canceled request rejects with CanceledError.
  if (api.isCancel(err)) {
    // Ignore the canceled search.
  }
}
```

The proxy also exposes `http`, which is the promise of the client.
Use it when you need the client without the request methods.
