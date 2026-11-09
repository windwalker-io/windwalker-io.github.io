---
layout: doc
title: Configuration
part: Components
chapter: SRP
menu: components/srp
component: srp
---

Both `SRPServer` and `SRPClient` extend the same base class and share
the same group parameters and settings. Client and server must use the
same parameters, hash algorithm, and padding setting. Otherwise the
proof check fails at login.

## Group Parameters

SRP computes all values modulo a large safe prime `N`, with a generator
`g` and a multiplier `k`. The package provides a default, secure set of
these values:

- `SRPServer::DEFAULT_PRIME`: The large safe prime `N`, in decimal form.
- `SRPServer::DEFAULT_GENERATOR`: The generator `g`, `2`.
- `SRPServer::DEFAULT_KEY`: The multiplier `k`, in hexadecimal form.

`create()` uses these defaults when you pass no arguments. Use it unless
you need to interoperate with another implementation that requires
different values.

```php
use Windwalker\SRP\SRPClient;
use Windwalker\SRP\SRPServer;

$server = SRPServer::create();
$client = SRPClient::create();
```

To use custom values, pass `BigInteger` objects to the constructor. The
`brick/math` package provides the `BigInteger` class:

```php
use Brick\Math\BigInteger;
use Windwalker\SRP\SRPServer;

$server = new SRPServer(
    BigInteger::of(SRPServer::DEFAULT_PRIME),
    BigInteger::of(SRPServer::DEFAULT_GENERATOR),
    BigInteger::fromBase(SRPServer::DEFAULT_KEY, 16),
);
```

::: tip
Passing the default values explicitly, as above, produces the same
result as `SRPServer::create()`. Use it as a starting point when you
change only one of the values.
:::

### Configuration Array

Use `createFromConfig()` to build an instance from an array. Keys are
`prime`, `generator`, `key`, `hasher`, and `size`. The `prime` and
`generator` values are decimal strings, and `key` is a hexadecimal
string. Each value can also be a `BigInteger` object:

```php
use Windwalker\SRP\SRPServer;

$server = SRPServer::createFromConfig([
    'prime' => SRPServer::DEFAULT_PRIME,
    'generator' => SRPServer::DEFAULT_GENERATOR,
    'key' => SRPServer::DEFAULT_KEY,
    'hasher' => 'sha256',
    'size' => 256,
]);
```

::: warning
The string parsing differs from `create()`. `create()` reads all string
arguments as hexadecimal, so pass `BigInteger` objects to `create()` when
you use a decimal prime.
:::

## Secret Size

The random secrets `a` and `b` are generated with a fixed byte length.
The default is 256 bits, which is 32 bytes. Change it with `setSize()`,
which takes bits, or with `setLength()`, which takes bytes:

```php
$server->setSize(512); // 512 bits, same as setLength(64)

$client->setLength(32); // 32 bytes, the default
```

## Hash Algorithm

All hashes in the protocol use one hasher. The default is `sha256`.
Call `setHasher()` to choose another algorithm:

- `sha1`, `sha256`, `sha384`, `sha512`
- `blake2s-256`
- `blake2b-224`, `blake2b-256`, `blake2b-384`, `blake2b-512`

BLAKE2 algorithms use the `sodium` extension (`sodium_crypto_generichash`),
so it must be available.

```php
$server->setHasher('sha512');
$client->setHasher('sha512');
```

You can also pass a closure. It receives the input string and must
return a hexadecimal string, which the package parses as a number:

```php
$hasher = fn(string $str): string => hash('sha3-256', $str);

$server->setHasher($hasher);
$client->setHasher($hasher);
```

::: warning
Use the same hasher on the server and the client. The package does not
send the hasher name to the other side. A mismatch causes login to fail
for every user.
:::

## Padding

By default, values are padded to the byte length of the prime before
they are hashed. This matches RFC 5054. Some implementations do not pad
before hashing. To interoperate with them, disable padding with
`enablePad()`:

```php
$server->enablePad(false);
$client->enablePad(false);

$server->isPadEnabled(); // false
```

::: warning
Padding must match on both sides. If only one side disables it, the
proof check fails. The failure reports an invalid proof, not a
configuration error.
:::

## Chaining

All setters return the same instance, so you can chain them:

```php
$server = SRPServer::create()
    ->setHasher('sha512')
    ->setSize(512)
    ->enablePad(true);
```
