---
layout: global.documentation-layout
title: Attributes
menu: components/di
---

# Attributes

Container can resolve attributes as decorator, by default, there has some basic attributes you can use.

## #[Autowire]

For example, if you create a class with dependencies which has not set to container, 
you will get error. 

```php
class Flower
{
    public function __construct(public Sakura $sakura) 
    {}
}

$container->newInstance(Flower::class); // Error
```

But we can use `#[Autowire]` to auto create dependent objects, you must manually register this attribute first.

```php
use Windwalker\Attributes\AttributeType;
use Windwalker\DI\Attributes\Autowire;

// Register it
$container->getAttributesResolver()
    ->registerAttribute(Autowire::class, AttributeType::PARAMETERS);

class Flower
{
    public function __construct(#[Autowire] public Sakura $sakura) 
    {}
}

$flower = $container->newInstance(Flower::class); // No error

$flower->sakura; // Sakura object
```

It will always create new object everytime:

```php
$flower1 = $container->newInstance(Flower::class);
$flower2 = $container->newInstance(Flower::class);

$flower1->sakura !== $flower2->sakura;
```

More about using attribute decorators, please see [Attributes Document](../attributes/)

## #[Inject]

`#[Inject]` is an attribute to make Container inject object to a property. The class which you want to inject, should 
be set into Container before you inject it.

```php
use Windwalker\Attributes\AttributeType;
use Windwalker\DI\Attributes\Inject;

// Register attribute.
$container->getAttributesResolver()
    ->registerAttribute(Inject::class, AttributeType::PROPERTIES | AttributeType::PARAMETERS);

// Prepare it.
$container->prepareSharedObject(Sakura::class);

class Flower
{
    #[Inject]
    protected Sakura $sakura;

    public function __construct() 
    {}
}

$flower = $container->newInstance(Flower::class);

$flower->sakura; // Sakura object
```

`#[Inject]` can also use on parameters:

```php
    public function __construct(#[Inject] public Sakura $sakura) 
    {}
```

Or directly set a class name:

```php
    #[Inject(Sakura::class)]
    protected FlowerInterface $flower;
```

## #[Service]

`#[Service]` is similar to `#[Autowire], it will create a new object if class haven't set into Container. 
But after first created it, then it will always get same object.

```php
use Windwalker\Attributes\AttributeType;
use Windwalker\DI\Attributes\Service;

// Register attribute.
$container->getAttributesResolver()
    ->registerAttribute(Service::class, AttributeType::PARAMETERS);

class Flower
{
    public function __construct(#[Service] public Sakura $sakura) 
    {}
}

$flower1 = $container->newInstance(Flower::class);
$flower2 = $container->newInstance(Flower::class);

// Same
$flower1->sakura === $flower2->sakura;
```

You can also direct a class name:

```php
    public function __construct(#[Service(Foo::class)] public FooInterface $foo) 
    {}
```

`#[Service]` Can also declare a class as singleton service id Container, just add it to any class:

```php
use Windwalker\DI\Attributes\Service;

// ...

#[Service]
class Foo 
{
    //
}
```

Then you don't need to register this class, just get it, this class will auto create and stored in Container:

```php
$foo = $container->get(Foo::class);
```

## `#[Isolation]`

`#[Isolation]` attribute use to isolate services between parent and child Container. As default, if a service can found from parent, Container will not create a new one.

```php
$parentContainer->prepareSharedOvject(Foo::class);

$foo1 = $parentContainer->get(Foo::class);

$childContainer = $parentContainer->createChild();

$foo2 = $childContainer->get(Foo::class);

$foo1 === $foo2; // TRUE
```

If we add `#[Isolation]` to `Foo` class, the child container will get a new instance.

```php
use Windwalker\DI\Attributes\Isolation;

#[Isolation]
class Foo 
{
    //
}

// ...

$parentContainer->prepareSharedOvject(Foo::class);

$foo1 = $parentContainer->get(Foo::class);

$childContainer = $parentContainer->createChild();

$foo2 = $childContainer->get(Foo::class);

$foo1 === $foo2; // FALSE
```

## Register new Attributes

```php
use Windwalker\DI\Attributes\AttributeType;

$resolver = $container->getAttributesResolver();

$resolver->registerAttribute(MyAttribute::class, AttributeType::CLASSES);
```

See [Attributes Component](../attributes/)
