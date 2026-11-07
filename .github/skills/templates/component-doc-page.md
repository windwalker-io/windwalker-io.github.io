# Component doc Overview page template

Use this template when writing the `Overview` page for a component or package. The Overview is a guide to the package: what it is for, how its main parts relate, and where to go next. Feature details belong on topic pages. Replace each bracketed placeholder and remove sections that do not apply.

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

## Core Concepts

[Explain the package's philosophy and the domain terms that the rest of the docs depend on. Keep it short. Link to the topic pages for details.]

## Topic Pages

[List each topic page and what it covers. Add one line of context per topic, not a parameter list. Split topics by subsystem, domain concept, or optional add-on, as described in the documentation style instructions.]

## Events

[Only if the package dispatches or listens to events. Explain the event flow and link to the page that covers it.]

## Related components

- [Link to related component page, after confirming it exists.]
```

Rules for every section:

- Verify every class, method, parameter, and default against the source.
- Use complete code samples with the imports that matter. Keep samples short and show a pattern or an assembly.
- Keep the wording neutral and concise. Do not use "I" or "we".
- Do not list every method or option. Name the main ones and point to the source for complete signatures.
- Topic pages follow the same style and flow: purpose, minimal enabling and assembly, a complete showcase example, detailed features, with reminders placed in the relevant sections. Never open a topic page with detailed features. Explain why a feature works the way it does.
- Keep every line in code samples at 75 characters or fewer. If a line is longer, break it vertically, one argument, array item, or chained call per line.
- Create a topic page only when the split follows the structure rules in the documentation style instructions.
