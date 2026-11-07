---
layout: doc
title: Serializers
component: cache
---

# Serializers

A serializer converts values to the format the storage accepts, and back. Every serializer implements
`SerializerInterface`.

| Serializer            | Output                                                       |
|-----------------------|--------------------------------------------------------------|
| `RawSerializer`       | Unchanged. The default, suitable for `ArrayStorage`.         |
| `PhpSerializer`       | PHP `serialize()` string.                                    |
| `PhpFileSerializer`   | PHP source file content. Use with `PhpFileStorage`.          |
| `JsonSerializer`      | JSON string, decoded to objects.                             |
| `JsonAssocSerializer` | JSON string, decoded to associative arrays.                  |
| `StringSerializer`    | String cast of a scalar value.                               |
| `DeflateSerializer`   | Compressed output of a wrapped serializer. Requires `zlib`.  |
| `CipherSerializer`    | Encrypted output of a wrapped serializer, using `windwalker/crypt`. |
| `SodiumSerializer`    | Encrypted output using libsodium. Requires `sodium`.         |

Serializers can be wrapped to combine their behavior:

```php
use Windwalker\Cache\Serializer\DeflateSerializer;
use Windwalker\Cache\Serializer\JsonAssocSerializer;

$serializer = new DeflateSerializer(new JsonAssocSerializer());
```

`CipherSerializer` and `SodiumSerializer` encrypt values before they reach the storage. Load their keys from the
environment or a secret store, never from source code. `SodiumSerializer` accepts previous key pairs, so keys can be
rotated: the first key pair encrypts, and every key pair can decrypt. Its wrapped serializer must return a string, so
use `PhpSerializer` or `JsonAssocSerializer` rather than `RawSerializer`.
