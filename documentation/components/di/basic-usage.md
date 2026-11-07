---
layout: doc
title: Basic Usage
component: di
---

# Basic Usage

## Create A Container

Create a container with `Container`:

```php
use Windwalker\DI\Container;

$container = new Container();
```

Now we can store objects into it.

```php
$input = new \stdClass();

$container->set('input', $input);

$input = $container->get('input');
```

## DIOptions

Pass `DIOptions` to container methods to configure a definition or object creation. Prefer named options over the
deprecated integer flags.

| Option | Effect |
| --- | --- |
| `shared` | Cache a stored definition's resolved value for reuse. |
| `protected` | Prevent a stored definition from being replaced. |
| `isolation` | Create a separate cached definition in child containers. |
| `autowire` | Create unresolved dependencies automatically for object creation or callable invocation. |
| `ignoreAttributes` | Skip all attribute handlers while creating an object or calling a method. |
| `excludeAttributes` | Skip only the listed attribute handlers. |
| `lazy` | Use PHP 8.4 lazy proxies for eligible objects. |
| `providedIn` | Restrict a stored definition to container levels; accepts a level, a list of levels, or a callback. |

Some options apply only to stored definitions, while others affect object creation. See the relevant sections for
[`shared`](#shared-object-singleton), [`autowire`](#autowire), and [`lazy`](./lazy).

## Lazy Loading

Register a closure to defer object creation until the service is requested:

```php
use Windwalker\DI\Container;

$container->set('input', fn (Container $container) => new \stdClass());

// Will call this closure when we get it
$input = $container->get('input');

// Always get new object.
$input !== $container->get('input');
```

This defers the service factory until `get()` is called. To defer constructing an object until its first property
access, use a PHP 8.4 lazy proxy; see [Lazy Loading](./lazy).

## Shared Object (Singleton)

If we use `set()` method to set this callback, then every time we try to get it, Container will return a new object.

Use `share()` or `DIOptions(shared: true)` to reuse the same instance.

```php
use Windwalker\DI\Container;
use Windwalker\DI\DIOptions;

// Share a closure
$container->share('input', fn (Container $container) => new \stdClass());

// Equivalent options when using set()
$container->set('input', fn (Container $container) => new \stdClass(), new DIOptions(shared: true));

// We will always get same instance
$input = $container->get('input');

// The second argument of get() can force create new instance
$newInput = $container->get('input', true);
```

## Protect Object

Use `protect()` to prevent a service definition from being replaced.

```php
use Windwalker\DI\Container;
use Windwalker\DI\DIOptions;

$container->protect(
    'input',
    fn (Container $container) => new \stdClass(),
    new DIOptions(shared: true),
);

// We can still get this object
$input = $container->get('input');

// Replacing this protected key throws DefinitionException.
$container->set('input', $otherInput);
```

## Alias

Set an alias to a service ID:

```php
$app = new \stdClass();

$container->share('system.application', $app)
    ->alias('app', 'system.application');

// Same as system.application
$app = $container->get('app');
```

Aliases can also use class names:

```php
class SystemApp {}
class MainApp {}

$container->prepareSharedObject(SystemApp::class);
$container->alias(MainApp::class, SystemApp::class);

// Same as `SystemApp::class`
$app = $container->get(MainApp::class);
```


## Creating Objects

### New Instance

The container can create objects and resolve registered constructor dependencies.

```php
use Windwalker\DI\Container;

class DatabaseConnection {}

class Repository
{
    public function __construct(public DatabaseConnection $connection) {}
}

$container->share(DatabaseConnection::class, new DatabaseConnection());
$repository = $container->newInstance(Repository::class);

$repository->connection; // DatabaseConnection
```

### Autowire

If you try to create an object with dependencies which is not set in container, container will throw exception.

```php
class MyCar
{
    public function __construct(public Wheel $wheel, public Light $light)
    {
    }
}

// @throw DefinitionResolveException
$container->newInstance(MyCar::class);
```

Enable autowiring with `DIOptions`. Dependencies not registered in the container can then be created automatically.

```php
use Windwalker\DI\DIOptions;

$car = $container->newInstance(MyCar::class, options: new DIOptions(autowire: true));
```

### Create Object

`createObject()` creates an instance and registers its definition in the container:

```php
class Sakura {}

$sakura = $container->createObject(Sakura::class);

// Now we can get this class with new instance from container
$sakura !== $container->get(Sakura::class);
```

Use `createSharedObject()` to set object as singleton.

```php
use Windwalker\DI\Container;

$container = new Container();
class Katana {}

// Now this object is singleton 
$katana = $container->createSharedObject(Katana::class);

$katana === $container->get(Katana::class); // Same
```

### Create with Custom Arguments

Pass non-class constructor arguments by parameter name:

```php
class AnotherClass
{
    public function __construct(public string $name, public array $config) {}
}

$object = $container->newInstance(AnotherClass::class, [
    'name' => 'primary',
    'config' => ['debug' => true],
]);
```


### Prepare Object

We can set a class as prepared, then it will be created when we really need it:

```php
$container->prepareObject(MyClass::class);

// If we get MyClass, this class will be created.
$myObject = $container->get(MyClass::class);
```

Pass a callback to extend the object after it is created:

```php
class MyClass
{
    public bool $debug = false;
}

$container->prepareObject(MyClass::class, function (MyClass $myClass, \Windwalker\DI\Container $container) {
    $myClass->debug = true;
    
    return $myClass;
});
```

Prepare a shared object with `prepareSharedObject()`:

```php
class MyClass {}

$container->prepareSharedObject(MyClass::class);
```

### Prepare Creating Arguments

We can prepare some named arguments which will be injected to constructor when object creating.

```php
class MyModel
{
    public function __construct(public array $config, public object $db) {}
}

$config = ['debug' => true];
$db = new \stdClass();

// Set class meta
$container->whenCreating(MyModel::class)
    ->setArgument('config', $config)
    ->setArgument('db', $db);

// ...

$object = $container->newInstance(MyModel::class);
```

Or just created it instantly:

```php
class MyModel
{
    public function __construct(public array $config, public object $db) {}
}

$config = ['debug' => true];
$db = new \stdClass();

$container->whenCreating(MyModel::class)
    ->setArgument('config', $config)
    ->setArgument('db', $db)
    ->newInstance($container);
```

## Binding Classes

Bind an interface to a concrete class when a dependency should resolve to a specific implementation.

The container uses `FileLogger` when creating `ReportService`:

```php
interface LoggerInterface {}

class FileLogger implements LoggerInterface {}

class ReportService
{
    public function __construct(public LoggerInterface $logger) {}
}

$container->bind(LoggerInterface::class, FileLogger::class);

$reportService = $container->createObject(ReportService::class);

$reportService->logger; // FileLogger
```

Use `bindShared()` to bind a class as a shared service:

```php
$container->bindShared(LoggerInterface::class, FileLogger::class);
```

`bind()` also accepts a factory callback:

```php
$container->bind(LoggerInterface::class, fn () => new FileLogger());
```

## Tagged Services

Tags let multiple definitions share a service ID or let a factory build a variant from the requested tag. See
[Tagged Services](./tagged-services) for preset and dynamic tag behavior.

## Service Providers and Configuration

Implement `ServiceProviderInterface` to register definitions in one place:

```php
use Windwalker\DI\Container;
use Windwalker\DI\ServiceProviderInterface;

class AppServiceProvider implements ServiceProviderInterface
{
    public function register(Container $container): void
    {
        $container->share(Clock::class, fn () => new Clock());
    }
}

$container->registerServiceProvider(new AppServiceProvider());
```

`registerByConfig()` accepts an array or a PHP file returning an array. It registers attributes, bindings, providers,
aliases, and service extensions:

```php
$container->registerByConfig([
    'attributes' => [
        \Windwalker\DI\Attributes\Decorator::class
            => \Windwalker\DI\Attributes\AttributeType::CLASSES,
    ],
    'bindings' => [
        LoggerInterface::class => FileLogger::class,
    ],
    'providers' => [
        AppServiceProvider::class,
    ],
    'aliases' => [
        'logger' => LoggerInterface::class,
    ],
]);
```

Class-string bindings in this configuration are registered as shared services. Providers implementing
`BootableProviderInterface` are booted after registration through `registerByConfig()`.

Use the `Windwalker\DI\share()` helper when a configuration entry needs a shared factory definition:

```php
use Windwalker\DI\Container;
use function Windwalker\DI\share;

$container->registerByConfig([
    'bindings' => [
        'report.file' => share(
            static fn(Container $container) =>
                $container->newInstance(FileLogger::class),
        ),
    ],
]);
```

For factories with explicit constructor arguments, use `create()` as described in
[Parameters](./parameters#resolve-factories).

## Extending

Use `extend()` to modify a service after its factory returns it:

```php
class Flower
{
    public string $name = '';
}

// Create an object first
$container->share('flower', fn () => new Flower());

$container->extend('flower', function (Flower $flower, \Windwalker\DI\Container $container) {
    // Set a property to this object
    $flower->name = 'sakura';

    return $flower;
});

$flower = $container->get('flower');

$flower->name; // sakura
```

## Calling Function

The container can invoke a callable and resolve its dependencies:

```php
$result = $container->call($closure);

$result = $container->call([$object, 'method']);

$result = $container->call($invokableObject);
```

You can also add arguments:

```php
use Windwalker\DI\DIOptions;

class Sakura {}
$container->prepareSharedObject(Sakura::class);

$closure = function (Sakura $sakura, int $numbers = 3) {
    return $numbers;
};

// Add argument with name
$result = $container->call($closure, [
    'sakura' => new Sakura(),
    'numbers' => 5,
]);

// Add argument with class type, and ignore optional argument.
$result = $container->call($closure, [
    Sakura::class => new Sakura(),
]);

// Enable autowiring for unresolved dependencies.
$result = $container->call($closure, options: new DIOptions(autowire: true));
```
