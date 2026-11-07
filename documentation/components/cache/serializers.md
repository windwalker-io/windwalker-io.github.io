---
layout: doc
title: Serializers
component: cache
---

# Serializers

A serializer converts values to the format the storage accepts, and back. Every serializer implements
`SerializerInterface`. Serializers can be wrapped, so one serializer can call another. Wrapping decides the order of
the steps. For example, compress first and encrypt second:

```php
use Windwalker\Cache\Serializer\CipherSerializer;
use Windwalker\Cache\Serializer\DeflateSerializer;
use Windwalker\Cache\Serializer\PhpSerializer;

$serializer = new CipherSerializer(
    cipher: $cipher,
    key: $key,
    serializer: new DeflateSerializer(new PhpSerializer()),
);
```

Compressing encrypted output does not reduce its size, so compression must sit inside the cipher.

## RawSerializer

Returns the value unchanged. It is the default and suits `ArrayStorage`, which keeps PHP values.

```php
use Windwalker\Cache\CachePool;
use Windwalker\Cache\Serializer\RawSerializer;
use Windwalker\Cache\Storage\ArrayStorage;

$pool = new CachePool(new ArrayStorage(), new RawSerializer());
```

::: warning
Storages that write strings, such as files, Redis, or databases, cannot store arrays or objects through this
serializer. Use `PhpSerializer` or a JSON serializer instead.
:::

## PhpSerializer

Uses PHP's `serialize()` and `unserialize()`. It keeps arrays, objects, and scalar types exactly as they were.

```php
use Windwalker\Cache\Serializer\PhpSerializer;

$serializer = new PhpSerializer();

$data = $serializer->serialize(['id' => 1, 'tags' => ['a']]);
$value = $serializer->unserialize($data);
```

::: warning
Objects are rebuilt from the stored class name. Only read data that your own application wrote. Reading tampered
data can instantiate arbitrary classes.
:::

::: warning
Serialized objects tie the cache to class names and property layouts. A change to a class can make old entries
fail to load.
:::

## PhpFileSerializer

Writes PHP source with `var_export()`, which `PhpFileStorage` can `include`. It is only meaningful with that storage.

```php
use Windwalker\Cache\Serializer\PhpFileSerializer;

$serializer = new PhpFileSerializer();

$source = $serializer->serialize(['debug' => false]);
```

::: warning
Closures cannot be exported. Objects become `__set_state` calls, which need the class to exist when the file is
included.
:::

## JsonSerializer

Encodes to JSON and decodes to `stdClass` objects. Use it for data exchanged with other systems.

```php
use Windwalker\Cache\Serializer\JsonSerializer;

$serializer = new JsonSerializer();

$data = $serializer->serialize(['name' => 'Alice']);
$user = $serializer->unserialize($data);

echo $user->name; // Alice
```

::: warning
Class names are lost. An object becomes a `stdClass`.
:::

::: warning
Large integers and floats can lose precision.
:::

## JsonAssocSerializer

Encodes to JSON and decodes to associative arrays. It is the default choice for the `db` profile in the default
configuration.

```php
use Windwalker\Cache\Serializer\JsonAssocSerializer;

$serializer = new JsonAssocSerializer();

$user = $serializer->unserialize($serializer->serialize(['id' => 1]));

echo $user['id']; // 1
```

::: warning
Objects become arrays. Values that need to stay objects must be rebuilt by the caller.
:::

::: warning
Same precision caveat as `JsonSerializer`.
:::

## StringSerializer

Casts values to strings. It suits plain text, such as a rendered HTML fragment.

```php
use Windwalker\Cache\Serializer\StringSerializer;

$serializer = new StringSerializer();

$html = $serializer->serialize(42); // "42"
```

::: warning
Types are not preserved. A stored `42` comes back as `"42"`, and an array cannot be converted to a string.
:::

## DeflateSerializer

Compresses the output of a wrapped serializer with `gzdeflate()`. It reduces storage size and network transfer for
large payloads, at the cost of CPU time on each write and read.

```php
use Windwalker\Cache\Serializer\DeflateSerializer;
use Windwalker\Cache\Serializer\JsonAssocSerializer;

$serializer = new DeflateSerializer(
    serializer: new JsonAssocSerializer(),
);
```

- `serializer`: the wrapped serializer. Defaults to `RawSerializer`.

::: warning
Requires the `zlib` extension. The constructor throws `RuntimeException` without it.
:::

- **Tip:** Small values may grow after compression. Use it for large payloads only.
- **Tip:** Do not wrap a `CipherSerializer` with it, because encrypted data does not compress. Place `DeflateSerializer` inside.

## CipherSerializer

Encrypts the output of a wrapped serializer with a `windwalker/crypt` cipher.

```php
use Windwalker\Cache\Serializer\CipherSerializer;
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Crypt\Symmetric\SodiumCipher;

$cipher = new SodiumCipher();
$key = env('CACHE_CIPHER_KEY');

$serializer = new CipherSerializer(
    cipher: $cipher,
    key: $key,
    serializer: new PhpSerializer(),
);
```

- `cipher`: a `CipherInterface` implementation, such as `SodiumCipher`.
- `key`: the encryption key, as a string or `Key` object.
- `serializer`: the wrapped serializer. Defaults to `RawSerializer`.
- `encoder`: how ciphertext is encoded into a string. Defaults to `base64url`.

Generate a key once with `SodiumCipher::generateKey()`, then store it in the environment. Do not commit it.

::: warning
Losing the key makes every cached value unreadable. Treat the key like any other secret.
:::

::: warning
Changing the key or the cipher makes old entries fail to decrypt. Clear the cache after rotating either.
:::

## SodiumSerializer

Encrypts values with libsodium sealed boxes. It requires the `sodium` extension, and it uses a key pair instead of a
symmetric key.

```php
use Windwalker\Cache\Serializer\PhpSerializer;
use Windwalker\Cache\Serializer\SodiumSerializer;

$keyPair = env('CACHE_SODIUM_KEYPAIR');

$serializer = new SodiumSerializer(
    key: $keyPair,
    previousKeys: [],
    serializer: new PhpSerializer(),
);
```

- `key`: a libsodium key pair, created with `sodium_crypto_box_keypair()`.
- `previousKeys`: older key pairs that can still decrypt entries. Use them during key rotation.
- `serializer`: the wrapped serializer. It must return a string, so `RawSerializer` does not work here.

Rotation: add the new key pair as `key` and move the old one into `previousKeys`. New writes use the new key, and
old entries remain readable until they expire.

::: warning
Losing the key pair makes the entries unreadable.
:::

::: warning
Requires the wrapped serializer to return a string. Use `PhpSerializer` or a JSON serializer.
:::
