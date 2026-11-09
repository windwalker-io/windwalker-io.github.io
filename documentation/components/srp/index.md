---
layout: doc
title: Introduction
part: Components
chapter: SRP
menu: components/srp
component: srp
---

# Introduction

The SRP package provides an implementation of SRP-6a, the Secure Remote
Password protocol defined in
[RFC 5054](https://datatracker.ietf.org/doc/html/rfc5054). It lets a user
prove that they know a password without sending the password to the
server. At the end of the exchange, both sides hold the same session key,
and the server has verified the client's identity.

::: info
This is a standalone package. It has no dependency on the Windwalker
framework and can be installed in any PHP or JavaScript project, in any
environment. The examples in this documentation do not require a
framework container or application.
:::

The package ships in two parts with the same protocol and API shape:

- **PHP**: `Windwalker\SRP\SRPServer`, `Windwalker\SRP\SRPClient`
- **JavaScript (TypeScript)**: `@windwalker-io/srp`, exporting `SRPServer`
  and `SRPClient`

The package passed the
[srptools test vectors](https://github.com/secure-remote-password/test-vectors/),
so it fully implements RFC 5054 and can interoperate with other
RFC-compliant SRP implementations.

## Installation

PHP

```bash
composer require windwalker/srp
```

The PHP package requires PHP 8.1 or later. It depends on `brick/math`
for big integer operations, version `0.14` to `0.20`, or `1.x`.

JavaScript

```bash
npm i @windwalker-io/srp --save

# OR

yarn add @windwalker-io/srp
```

The JavaScript package uses ES2020 `BigInt`. Make sure the target
browser or runtime supports it.

## Main Classes

- `SRPClient`: Generates the salt and verifier during registration, and
  computes the client ephemeral values and proofs during login.
- `SRPServer`: Generates the server ephemeral values and verifies the
  client proof during login.
- Step result objects (`PasswordFile`, `EphemeralResult`, `ProofResult`)
  carry the values returned by each step. See [Protocol](./protocol) for
  the meaning of each value.

## Create Instances

Use `create()` to get both sides with the default, secure group
parameters:

```php
use Windwalker\SRP\SRPClient;
use Windwalker\SRP\SRPServer;

$server = SRPServer::create();
$client = SRPClient::create();
```

See [Configuration](./configuration) to customize the group parameters,
secret size, hash algorithm, and padding.

## Next Steps

- [Configuration](./configuration): Parameters, secret size, hashers, and
  padding.
- [Protocol](./protocol): The SRP flow, registration, login, and security
  rules.
- [Sample Flow](./sample-flow): A complete PHP server and client round
  trip.
- [JavaScript](./javascript): Using the JavaScript package.
