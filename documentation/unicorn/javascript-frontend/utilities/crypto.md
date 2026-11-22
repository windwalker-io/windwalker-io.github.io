---
layout: doc
title: Crypto
description: Encode URL-safe base64 and generate unique ids in Unicorn JS.
---

# Crypto

Scripts often pass small values through URLs and create DOM elements at
runtime. Base64 values can contain characters that break a URL, and
generated ids can collide. The crypto helpers solve both problems: a
URL-safe base64 encoding and random ids.

## Enabling the Helpers

Import the functions from the package. They need no setup:

```ts
import {
  base64UrlDecode,
  base64UrlEncode,
  uid,
} from '@windwalker-io/unicorn-next';
```

## Complete Example

A preview link carries a small filter object in its query string. The
script encodes the filter when it builds the link, and decodes it when the
preview page opens. Each preview panel also gets a unique DOM id:

```ts
import {
  base64UrlDecode,
  base64UrlEncode,
  uid,
} from '@windwalker-io/unicorn-next';

// Build the link.
const filter = JSON.stringify({ status: 'open', page: 2 });
const token = base64UrlEncode(filter);

const link = `/admin/preview?f=${token}`;
// /admin/preview?f=eyJzdGF0dXMiOiJvcGVuIiwicGFnZSI6Mn0

// Run on the preview page.
const param = new URLSearchParams(location.search).get('f')!;
const restored = JSON.parse(base64UrlDecode(param));
// { status: 'open', page: 2 }

// Give each preview panel its own id.
const panel = document.createElement('div');
panel.id = uid('preview-');
document.body.append(panel);
```

## Encoding Values

`base64UrlEncode()` converts a string to base64 for use in a URL. It
replaces `+` with `-` and `/` with `_`, and it removes the `=` padding.
The result can go into a path or query parameter without escaping.
`base64UrlDecode()` reverses the encoding:

```ts
import {
  base64UrlDecode,
  base64UrlEncode,
} from '@windwalker-io/unicorn-next';

const encoded = base64UrlEncode('hello world');
// aGVsbG8gd29ybGQ

base64UrlDecode(encoded);
// hello world
```

::: warning
Encoding is not encryption. Anyone who sees the value can decode it. Never
put passwords, tokens, or private records in an encoded string.
:::

Both functions work on Latin-1 text only, because they call `btoa()` and
`atob()`. Other characters throw an error:

```ts
base64UrlEncode('€');
// ERROR: InvalidCharacterError: The string to be encoded
// contains characters outside of the Latin1 range.
```

To encode other text, convert it to ASCII first with
`encodeURIComponent()`. Reverse the steps in the opposite order when you
decode:

```ts
const text = '€ 5';

const token = base64UrlEncode(encodeURIComponent(text));
// JUUyJTgyJUFDJTIwNQ

const original = decodeURIComponent(base64UrlDecode(token));
// € 5
```

## Generating Unique Ids

`uid()` returns the prefix followed by 24 random hexadecimal characters.
Use it for DOM ids and for keys of items in a list:

```ts
import { uid } from '@windwalker-io/unicorn-next';

uid();
// 3f9c1a0e7b2d4c6e8a1b9d0f

uid('row-');
// row-3f9c1a0e7b2d4c6e8a1b9d0f

const item = { uid: uid(), title: 'Draft' };
```

`tid()` is `uid()` with a time component. It places a base-12 timestamp
before the random part, so ids created later in a page load sort roughly
after earlier ones. The random part is shorter, with 8 hexadecimal
characters:

```ts
import { tid } from '@windwalker-io/unicorn-next';

const id = tid('upload-');
// upload-<base-12 time><8 hex characters>
```

::: tip
Use `uid()` when only uniqueness matters. Use `tid()` when the creation
order of the ids matters, such as a list of uploads.
:::

## Random Bytes

`randomBytes()` returns a `Uint8Array` of random bytes. `randomBytesString()`
returns the same kind of bytes as a hexadecimal string, with two characters
per byte. Both read from the browser's `crypto.getRandomValues()`:

```ts
import {
  randomBytes,
  randomBytesString,
} from '@windwalker-io/unicorn-next';

const bytes = randomBytes(16); // Uint8Array(16)

// 64 hexadecimal characters, from 32 random bytes.
const nonce = randomBytesString(32);
```

::: tip
Use these values for client-side nonces and request ids. Tokens that
protect the server must come from the server. For example, read the CSRF
token with `data('csrf-token')`.
:::

## Sequence Numbers

`serial()` returns an increasing number. The first call returns 1, and each
later call returns the next number. The counter lives in the script module,
so it resets on each page load and is shared by all callers in the page.
Use it to order items created during the page's lifetime:

```ts
import { serial } from '@windwalker-io/unicorn-next';

const first = serial(); // 1
const second = serial(); // 2
```

## Related

- [Unicorn JS](../unicorn-js)
- [DOM Utilities](./dom-utilities)
- [Data Transfer](../basics/data-transfer)
