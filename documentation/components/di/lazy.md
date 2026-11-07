---
layout: doc
title: Lazy Loading
component: di
---

# Lazy Loading

Windwalker DI can use PHP 8.4 lazy proxies to defer creating an object until its first property access. This is
different from a lazy service definition: a definition defers its factory until the service is requested. See
[Basic Usage](./basic-usage#lazy-loading) for lazy service definitions.

Lazy proxies defer initialization, not object lifetime. Use `shared` or a transient definition separately to control
whether the container reuses an object.

## Initialization

The proxy is initialized when a property is first read or written. A method call that does not access any properties
does not necessarily initialize it. Constructors, dependency resolution, and `whenCreating()->extend()` callbacks run
when initialization occurs, so errors and side effects are deferred until then.

## Container-wide lazy proxies

Set `lazy: true` on the container options to make eligible objects created by the container lazy by default:

```php
use Windwalker\DI\Container;
use Windwalker\DI\DIOptions;

$container = new Container(options: new DIOptions(
    autowire: true,
    lazy: true,
));

$report = $container->newInstance(ExpensiveReport::class);
// The report is not constructed until its first property access.
$status = $report->status;
```

The option applies to nested dependencies resolved during that creation as well. If you already have a container,
preserve its existing options when enabling lazy proxies:

```php
$options = clone $container->getOptions();
$options->lazy = true;
$container->setOptions($options);
```

This affects objects created after the option is changed; it does not turn already-created objects into proxies.

## Lazy for one creation call

Pass `DIOptions(lazy: true)` to `newInstance()` to enable lazy proxies for one creation call and its recursively
resolved dependencies:

```php
use Windwalker\DI\DIOptions;

$report = $container->newInstance(
    ExpensiveReport::class,
    options: new DIOptions(lazy: true),
);
```

Per-call options are merged with the container defaults, so other settings such as `autowire` continue to apply. To
override a container-wide lazy setting for a creation call, pass `lazy: false`:

```php
$report = $container->newInstance(
    ExpensiveReport::class,
    options: new DIOptions(lazy: false),
);
```

Where the target is otherwise proxyable, an explicit `#[Lazy]` attribute still requests lazy behavior for its target.

## `#[Lazy]` attribute

Use the attribute to opt in a class or a specific dependency without enabling lazy proxies for the whole container.

### Class

```php
use Windwalker\DI\Attributes\Lazy;

#[Lazy]
class ExpensiveReport
{
    public string $status = 'ready';
}

$report = $container->newInstance(ExpensiveReport::class);
```

### Constructor or method parameter

```php
use Windwalker\DI\Attributes\Lazy;

class ReportController
{
    public function __construct(
        #[Lazy]
        public ExpensiveReport $report,
    ) {}
}
```

The container must be able to resolve the dependency, either through a registered service or autowiring. A nullable
parameter is lazy only when its service is registered; otherwise its normal nullable/default behavior is used.

### Property injection

For property injection, mark the property with both `#[Inject]` and `#[Lazy]`, and register the built-in attributes:

```php
use Windwalker\DI\Attributes\Inject;
use Windwalker\DI\Attributes\Lazy;

$container->registerDefaultAttributes();
$container->prepareSharedObject(ExpensiveReport::class);

class ReportController
{
    #[Inject, Lazy]
    public ExpensiveReport $report;
}

$controller = $container->newInstance(ReportController::class);
```

The built-in `Lazy` attribute registration targets properties. Class and parameter targets are recognized during
lazy-proxy resolution without registering an attribute handler.

## Limitations

Windwalker DI 4.x requires PHP 8.4.6 or later. Lazy proxies can be created only for compatible, instantiable classes.
The container skips proxy creation and uses normal eager resolution for interfaces, abstract classes, traits, enums,
final classes, internal classes, and classes that extend an internal class. A bound interface dependency can still
resolve to a lazy concrete service when that implementation is eligible.

A class with any class-level attribute other than `#[Lazy]` is created eagerly because an attribute may decorate or
replace the object with an incompatible type. Ignoring or excluding attributes does not remove this proxy restriction.

The real object returned during initialization must be the same class as the declared proxy type, or a compatible
subclass that adds no instance properties and overrides neither `__destruct()` nor `__clone()`. A factory or binding
that returns an incompatible class causes a `DefinitionResolveException` on first access. Type-hint the concrete
service class or disable lazy behavior for that resolution.

Constructor and dependency errors are likewise deferred until first access and reported as a
`DefinitionResolveException` with the original error as its previous exception. Avoid lazy proxies when constructor
side effects or errors must happen at injection time, or when the class cannot satisfy PHP's proxy compatibility
requirements.
