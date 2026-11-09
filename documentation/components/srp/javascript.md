---
layout: doc
title: JavaScript
part: Components
chapter: SRP
menu: components/srp
component: srp
---

The JavaScript package, `@windwalker-io/srp`, is a TypeScript
implementation of the same SRP-6a protocol. It runs in the browser and
interoperates with the PHP package and other RFC 5054 implementations.
Its `SRPClient` and `SRPServer` classes have the same methods as the PHP
classes, with `bigint` values in place of `BigInteger`.

::: info
The package is standalone. You can use it on its own, without any server
framework.
:::

## Installation

```bash
npm i @windwalker-io/srp --save

# OR

yarn add @windwalker-io/srp
```

The package uses ES2020 `BigInt`. Make sure the target browser or
runtime supports it.

## Create Instances

`create()` uses the default, secure group parameters:

```ts
import { SRPServer, SRPClient } from '@windwalker-io/srp';

const server = SRPServer.create();
const client = SRPClient.create();
```

The package also exports `DEFAULT_PRIME`, `DEFAULT_GENERATOR`, and
`DEFAULT_KEY`, all as `bigint`. To use custom values, pass `bigint`
values to the constructor, which takes `prime`, `generator`, and `key`
in that order:

```ts
import {
  SRPServer,
  DEFAULT_PRIME,
  DEFAULT_GENERATOR,
  DEFAULT_KEY,
} from '@windwalker-io/srp';

const server = new SRPServer(
  DEFAULT_PRIME,
  DEFAULT_GENERATOR,
  DEFAULT_KEY,
);
```

## Configuration

Setters return the same instance, so you can chain them:

```ts
server
  .setSize(512) // Bits. Same as setLength(64).
  .setHasher('sha512')
  .enablePad(true);
```

- `setSize(bits)`: Secret size in bits. The default is 256.
- `setLength(bytes)`: Secret size in bytes. The default is 32.
- `setHasher(name | callback)`: Hash algorithm. The default is `sha256`.
- `enablePad(enable)`: Padding before hashing. The default is `true`.

::: warning
Use the same hasher and padding setting on the server and the client.
A mismatch makes every login fail with an invalid proof.
:::

## Custom Hasher

Web browsers have no native BLAKE2b, so pass a callback when you need
another algorithm. The callback receives the input as a `Uint8Array`
and the expected length. It returns a `Promise` of either a hexadecimal
string or a `Uint8Array`:

```ts
server.setHasher(async (buffer: Uint8Array) => {
  return await someHashFunc(buffer);
});

server.setHasher(async (buffer: Uint8Array) => {
  return str2uint8(await someHashFuncOnlyReturnString(buffer));
});
```

If you need to operate on the values yourself, consider a `bigint`
library such as
[bigint-toolkit](https://www.npmjs.com/package/bigint-toolkit).

## Sample Flow

This example runs the full flow with the JavaScript client and server.
You can replace the server part with the PHP server or another backend
that implements the protocol. The values are `bigint`, so convert them
to hex with `toString(16)` before storing them or sending them over HTTP.

```ts
const server = SRPServer.create();
const client = SRPClient.create();

const identity = 'alice@example.com';
const password = 'my-secret-password';

// Registration: generate a new salt and verifier.
const { salt, verifier } = await client.register(identity, password);

// Store identity, salt, and verifier on the server.
salt.toString(16);
verifier.toString(16);

// Hello: the server loads salt and verifier, and creates b and B.
// Keep b in the session, and return salt and B to the client.
const { secret: b, public: B } = await server.step1(
  identity,
  salt,
  verifier,
);

// Client: compute a, A, and x, then the proof M1.
const { secret: a, public: A, hash: x } = await client.step1(
  identity,
  password,
  salt,
);
const { key: K, proof: M1 } = await client.step2(
  identity,
  salt,
  A,
  a,
  B,
  x,
);

// Authenticate: send identity, A, and M1 to the server.
// The server loads verifier from storage and b, B from the session.
const { proof: M2 } = await server.step2(
  identity,
  salt,
  verifier,
  A,
  B,
  b,
  M1,
);

// Client (optional): verify M2. Throws if the server is not trusted.
await client.step3(A, K, M1, M2);
```

For the meaning of each value, the security rules, and HTTPS
requirements, see [Protocol](./protocol).
