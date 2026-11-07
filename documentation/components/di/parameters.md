---
layout: doc
title: Parameters
component: di
---

# Parameters

Container can create a parameters structure to resolve object and dependencies.

## Load Parameters

Use `loadParameters()` to merge an array of configuration values into the container's current parameters:

```php
$container->loadParameters([
    'cache' => [
        'enabled' => true,
        'ttl' => 300,
    ],
]);
```

The method returns the container's `Parameters` instance. Use `setParameters()` when replacing the current parameter
structure instead of merging more values into it.

## Resolve Factories

This is a sample parameters, we set a class name as param: `car`, then we can use `resolve()` to create it.

```php
$container->setParameters(
    [
        'car' => MyCar::class
    ]
);

class MyCar
{}

$car = $container->resolve($container->getParam('car'));

// Same as 

$car = $container->resolve(MyCar::class);
```

Most of all, object may have some constructor arguments, we can use `\Windwalker\DI\create()` to define the factory 
with some custom arguments.

```php
use Windwalker\DI\Container;
use function Windwalker\DI\create;

$container = new Container();
$container->setParameters(
    [
        // Define factory by create()
        'car' => create(
            MyCar::class,
            crew: 4
        )
    ]
);

class MyCar
{
    public function __construct(public int $crew)
    {}
}

$car = $container->resolve($container->getParam('car'));
// Same as
$car = $container->resolve(\Windwalker\ref('car'));
// Same as
$car = $container->resolveParam('car');
```

### Define Factory with Dependencies

You may need a class with dependencies, for example:

```php
class CachePool
{
    public function __construct(protected StorageInterface $storage)
    {}
}
```

There are two ways to provide dependencies. One is to use a callback:

```php
use Windwalker\DI\Container;
use function Windwalker\DI\create;

[
    'cache' => create(
        fn (Container $container) => new CachePool(
            // Also handle FileStorage's dependencies
            $container->newInstance(
                FileStorage::class,
                args: [
                    'path' => '/path/to/storage/cache',
                    'ttl' => 300,
                ],
            )
        )
    )
]
```

The second is to use `ref()` to resolve another parameter path:

```php
use function Windwalker\DI\create;

[
    'cache' => create(
        CachePool::class,
        storage: \Windwalker\ref('storages.file')
    ),
    'storages' => [
        'file' => FileStorage::class
    ] 
]
```

Or a callback of argument, the first level closure will resolve as argument factory:

```php
use Windwalker\DI\Container;
use function Windwalker\DI\create;

[
    'cache' => create(
        CachePool::class,
        storage: fn (Container $container) => $container->newInstance(
            FileStorage::class,
            [
                'path' => '/path/to/storage/cache',
                'ttl' => 300,
            ],
        )
    )
]
```

If you want to set a pure closure into it, use `\Windwalker\raw()` to wrap it.

```php
use function Windwalker\DI\create;

create(
    Runner::class,
    // Use raw() to wrap closure
    task: \Windwalker\raw(
        function () {
            // ...
        }
    )
)
```

### Array of Objects

Container can only handle first level of callback, for an array of objects, you must use callback factory 
to handle dependencies:

Below is not work:

```php
use function Windwalker\DI\create;

[
    'log' => create(
        Logger::class,
        // This will not work, Container won't resolve this factories
        handlers: [
            \Windwalker\ref('log_handlers.file'), 
            \Windwalker\ref('log_handlers.mail'), 
            \Windwalker\ref('log_handlers.redis'),
        ]
    ),
    'log_handlers' => [
        'file' => FileLogHandler::class,
        'mail' => MailLogHandler::class,
        'redis' => RedisLogHandler::class,
    ]
]
```

Use this instead.

```php
use Windwalker\DI\Container;
use function Windwalker\DI\create;

[
    'log' => create(
        Logger::class,
        handlers: function (Container $container) {
            return [
                $container->resolveParam('log_handlers.file'), 
                $container->resolveParam('log_handlers.mail'), 
                $container->resolveParam('log_handlers.redis'),
            ];
        }
    ),
    // ...
]
```

-----

## About `resolve()`

`resolve()` is a method to handle any object or parameter definitions of Container.

```php
// Send a class name or id, if this name exists in container, will get it.
$container->resolve('foo');
$container->resolve(Foo::class);

// Send a class name which is not set, will create it.
$container->resolve(SomeClass::class);

// Send a definition object, will resolve this definition.
$container->resolve(
    \Windwalker\DI\create(SomeClass::class)
);

// Send a callback, will call it as factory.
$container->resolve(function (\Windwalker\DI\Container $container) {
    return $container->newInstance(SomeObject::class, ['foo' => $container->get('foo')]);
});

// Send a params ref, will get this param value and resolve it
$container->resolve(\Windwalker\ref('foo.bar.classname'));

// Same as 
$container->resolveParam('foo.bar.classname');
```

## Child Parameter Views

Reads from a child container combine local parameter arrays with inherited parent values. `extract()` returns a detached
snapshot of the merged branch. Use `proxy()` when you need a view that writes to the child scope:

```php
use Windwalker\DI\Container;

$parentContainer = new Container();
$parentContainer->setParameters([
    'cache' => [
        'enabled' => true,
        'ttl' => 300,
    ],
]);

$childContainer = $parentContainer->createChild();
$childContainer->getParameters()->setDeep('cache.ttl', 60);

$snapshot = $childContainer->getParameters()->extract('cache');
$snapshot->dump(); // ['ttl' => 60, 'enabled' => true]

$cache = $childContainer->getParameters()->proxy('cache');
$cache->set('ttl', 90);

$childContainer->getParam('cache.ttl'); // 90
$parentContainer->getParam('cache.ttl'); // 300
```

Associative array branches merge recursively, and list values concatenate. A local scalar overrides its inherited
value; an empty local array does not clear an inherited array. A `null` leaf retains the normal fallback behavior,
while a branch snapshot can preserve explicit `null` entries as `dump()` does.

Merged arrays returned by reads, dumps, and inherited iteration are computed snapshots, not writable references. Use
`set()` or `setDeep()` to write local values, or use a proxy for a live branch view. A proxy writes to the child scope,
includes only its selected branch when dumped or iterated, and continues to see parent updates that are not overridden
locally. `extract($path, true)` is equivalent to `proxy($path)`.

By default, iterating child parameters includes inherited values and yields merged keys once. Pass `false` to
`getIterator()` to iterate only the child's local values. References are resolved after inheritance lookup, so an
inherited reference can observe an override in the child scope.

## Merge

You may merge a config array to an exists position.

```php
$container->mergeParameters(
    'foo.bar',
    [
        'yoo' => 'The data you want to merge'
    ]
);
```

By default, `mergeParameters()` keeps existing values when keys overlap. Pass `MergeOptions(override: true)` to let the
new values override them:

```php
use Windwalker\DI\MergeOptions;

$container->mergeParameters(
    'foo.bar',
    [
        'yoo' => 'The data you want to merge'
    ],
    new MergeOptions(override: true),
);
```

Use `MergeOptions(recursive: true)` to merge nested arrays recursively:

```php
use Windwalker\DI\MergeOptions;

$container->mergeParameters(
    'foo.bar',
    [
        'yoo' => [
            'goo' => 'The data you want to merge'
        ]
    ],
    new MergeOptions(recursive: true),
);
```
