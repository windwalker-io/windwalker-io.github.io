# Component doc Overview page template

Use this template when writing the `Overview` page for a component or package. It is a reference manual, not a step-by-step tutorial. Replace each bracketed placeholder and remove sections that do not apply.

```md
---
layout: doc
title: [Component Name]
---

# [Component Name]

[One paragraph: what the package does and when to use it. Name the main classes.]

## Installation

[Composer command and the minimum PHP version, verified from `composer.json`.]

## Use as Standalone Component

[How to use the package without the framework. Show the minimal construction and the main entry point.]

Example code:

```php
use Windwalker\Flower\Sakura;

$sakura = new Sakura(
    new SakuraDriver(),
    new SakuraConfig()
);

$sakura->run();
```

And more...

## Use in Windwalker Application

[Assume the host app has already configured DI and the required environment. Do not create a new Container. Show how to obtain the component through the existing container or app (for example, container->get(), app->retrieve(), or app->make() for non-singletons), or declare it as a constructor dependency. Keep detailed configuration in the component's dedicated reference pages.]

Inject in a constructor:

```php
class MyService
{
    public function __construct(
        protected Sakura $sakura
    ) {
    }

    public function handle(): void
    {
        $this->sakura->run();
    }
}
```

Inject by retrieving from the container:

```php
$sakura = $container->get(Sakura::class);
$sakura->run();
```

Inject by retrieving from the app:

```php
$sakura = $app->retrieve(Sakura::class);
$sakura->run();
```

### Configuration

[If this service has it's own configuration files, show how to override them in the host app.]

```php
// /etc/packages/flower.config.php

return #[ConfigModule(name: 'flower', enabled: true, priority: 100, belongsTo: FlowerPackage::class)]
static fn() => [
    // ...

    'connections' => [
        'local' => [ ... ]
    ],
];
```

## [Feature area]

[Concise description. Then a list or table of public methods, options, or parameters with their types, defaults, and purpose. Follow with a complete, verified code sample.]

## [Feature area]

...

## Events

[Only if the package dispatches or listens to events.]

## Related components

- [Link to related component page, after confirming it exists.]
```

Rules for every section:

- Verify every class, method, parameter, and default against the source.
- Use complete code samples with the imports that matter.
- Keep the wording neutral and concise. Do not use "I" or "we".
- Split a large feature area into a section page only after the user approves it.
