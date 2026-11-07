---
layout: doc
title: Introduction
part: Components
component: di
---

# Introduction

Windwalker DI provides an [inversion of control](https://en.wikipedia.org/wiki/Inversion_of_control) container for
managing objects and their dependencies.

It also provides service providers for registering services through a common interface.

Windwalker DI 4.x includes a redesigned container API and requires PHP 8.4.6 or later.

## Installation

Install the package with Composer:

```bash
composer require windwalker/di ^4.0
```

## Use in Windwalker

### Dependency injection

Windwalker applications configure a DI container for the application. Constructor dependencies can be type-hinted in
services and controllers.

```php
class MyClass
{
    public function __construct(protected FooService $fooService) {}
}
```

Register the classes in `etc/di.php`:

```php
return [
    'bindings' => [
        FooService::class,
        MyClass::class,
    ],
];
```

The application can then inject `MyClass` into a controller action:

```php
use Windwalker\Core\Attributes\Controller;

#[Controller()]
class DashboardController
{
    public function index(MyClass $myClass)
    {
        // Use $myClass.
    }
}
```

### Directly use Container

If you want to directly use Container, you can inject itself.

```php
use Windwalker\Core\Attributes\Controller;
use Windwalker\DI\Container;

#[Controller]
class DashboardController
{
    public function index(Container $container)
    {
        $fooService = $container->get(FooService::class);
    }
}
```

Or use `AppContext`, it is a container wrapper:

```php
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Attributes\Controller;

#[Controller]
class DashboardController
{
    public function index(AppContext $app)
    {
        $fooService = $app->make(FooService::class);
    }
}
```

## Use as Standalone Component

To use the container without Windwalker Core, create it directly:

```php
use Windwalker\DI\Container;

$container = new Container();

class MyService {}

$container->bind(MyService::class, MyService::class);
$myService = $container->get(MyService::class);
```
