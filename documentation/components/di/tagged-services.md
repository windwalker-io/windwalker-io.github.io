---
layout: doc
title: Tagged Services
component: di
---

# Tagged Services

Tags are useful when one service has several fixed implementations or must build a driver variant at runtime. For
example, a storage service may use a local or remote driver. Tags let callers select the implementation through the
same service ID instead of maintaining separate IDs and selection logic.

The examples assume `$container` is the application's configured container in Windwalker, or a container created by
a standalone application.

## Preset tag

Use a preset tag when each driver is known in advance. Register each implementation under the same service ID and
retrieve it with its matching tag:

```php
interface ImageStorageDriver
{
    public function backend(): string;
}

class LocalImageDriver implements ImageStorageDriver
{
    public function backend(): string
    {
        return 'local';
    }
}

class RemoteImageDriver implements ImageStorageDriver
{
    public function backend(): string
    {
        return 'remote';
    }
}

$container->bindShared(
    ImageStorageDriver::class,
    LocalImageDriver::class,
    tag: 'local',
);
$container->bindShared(
    ImageStorageDriver::class,
    RemoteImageDriver::class,
    tag: 'remote',
);

$local = $container->get(ImageStorageDriver::class, tag: 'local');
$remote = $container->get(ImageStorageDriver::class, tag: 'remote');

$local->backend();  // local
$remote->backend(); // remote
```

Each definition belongs to its registered tag. A request for another tag does not select either preset definition.
The container checks for an untagged definition as a fallback; if none exists, it throws `DefinitionNotFoundException`.

Use `bindShared()` or `set()` with `DIOptions(shared: true)` when a preset-tagged definition should be cached.
`share()` creates an untagged shared definition and does not accept a preset `tag` argument.

## Factory pattern

Use an untagged factory when a service should construct a driver variant from each requested tag. The factory receives
the tag and decides which driver to assemble:

```php
use Windwalker\DI\Container;

enum StorageBackend
{
    case LOCAL;
    case REMOTE;
}

interface StorageDriver
{
    public function backend(): string;
}

class LocalStorageDriver implements StorageDriver
{
    public function backend(): string
    {
        return 'local';
    }
}

class RemoteStorageDriver implements StorageDriver
{
    public function backend(): string
    {
        return 'remote';
    }
}

class StorageService
{
    public function __construct(
        private StorageDriver $driver,
    ) {}

    public function backend(): string
    {
        return $this->driver->backend();
    }
}

$container->share(
    StorageService::class,
    static function (
        Container $container,
        StorageBackend|null $tag = null,
    ): StorageService {
        $driver = match ($tag) {
            StorageBackend::LOCAL => $container->newInstance(
                LocalStorageDriver::class,
            ),
            StorageBackend::REMOTE => $container->newInstance(
                RemoteStorageDriver::class,
            ),
            null => $container->newInstance(LocalStorageDriver::class),
        };

        return new StorageService($driver);
    },
);

$local = $container->get(
    StorageService::class,
    tag: StorageBackend::LOCAL,
);
$remote = $container->get(
    StorageService::class,
    tag: StorageBackend::REMOTE,
);

$local->backend();  // local
$remote->backend(); // remote
```

The factory definition is untagged, so it acts as the fallback for both tagged lookups. Unlike preset tags, one
factory selects and constructs the driver for each requested variant. `share()` caches one service per tag; use an
untagged `bind()` when each lookup should create a fresh service.

## Choosing the factory tag type

The container accepts tags as `UnitEnum|string|null`. A factory receives the tag as the named `$tag` argument, so its
parameter must have that name. If it also receives `Container` as its first parameter, `$tag` is the second parameter.

The callback's type declaration determines which values it accepts. The example uses `StorageBackend|null` to allow
only the enum cases and an untagged lookup. Use a union such as `string|StorageBackend|null` when strings are also
valid; a `string` type alone accepts any string.
