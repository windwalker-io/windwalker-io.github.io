---
layout: doc
title: Introduction
part: Components
component: renderer
---

# Introduction

Windwalker Renderer provides one interface for rendering templates from several template engines. Each engine is
wrapped by an adapter class, such as `PlatesRenderer` or `TwigRenderer`. `CompositeRenderer` selects the adapter for
each layout from its file extension, so calling code does not depend on the engine behind a template.

## Supported Engines

- Plates: `PlatesRenderer`, an adapter for [league/plates](https://platesphp.com/)
- Twig: `TwigRenderer`
- Mustache: `MustacheRenderer`
- Edge: `EdgeRenderer`, a Blade-compatible engine
- Blade: `BladeRenderer`, based on `illuminate/view`

## Installation

Install the package with Composer:

```bash
composer require windwalker/renderer ^4.0
```

The package requires PHP 8.4.6 or later. It does not install the template engine libraries. Install the library
for each engine you use, for example:

```bash
composer require league/plates
```

## Use as Standalone Component

Create a `CompositeRenderer` with the directories that contain your templates. It resolves layout names across
those directories and chooses the engine by file extension:

```php
use Windwalker\Renderer\CompositeRenderer;

$renderer = new CompositeRenderer(
    [
        __DIR__ . '/views',
    ],
    [
        'cache_path' => __DIR__ . '/cache/renderer',
    ],
);

echo $renderer->render(
    'admin.dashboard',
    ['user' => 'Alice'],
);
```

With the file `views/admin/dashboard.edge.php`, the layout name
`admin.dashboard` loads that Edge template. When an application uses only one engine, create its adapter
directly. See [Engine Renderers](./engines).

## Use in Windwalker

The core `RendererService` wraps `CompositeRenderer` with the application's view paths and global variables.
Inject it as a constructor dependency:

```php
use Windwalker\Core\Renderer\RendererService;

class DashboardService
{
    public function __construct(
        protected RendererService $renderer
    ) {
    }

    public function render(array $data): string
    {
        return $this->renderer->render('admin.dashboard', $data);
    }
}
```

Or retrieve it from the application:

```php
$renderer = $app->retrieve(RendererService::class);

echo $renderer->render('admin.dashboard', ['user' => 'Alice']);
```

::: info
`RendererService::render()` merges the global variables into `$data`. A value in `$data` overrides a global
with the same name.
:::

`RendererInterface` is bound to `CompositeRenderer`, but that instance does not receive the application's view
paths or globals. Use `RendererService` in application code.

## Configuration

The package config is `etc/renderer.config.php`. Override it in the host app with the same module name:

```php
// /etc/packages/renderer.config.php

namespace App\Config;

use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\Renderer\RendererPackage;

return #[ConfigModule(
    name: 'renderer',
    enabled: true,
    priority: 100,
    belongsTo: RendererPackage::class,
)]
static fn() => [
    'options' => [
        'cache_path' => WINDWALKER_CACHE . '/renderer',
    ],
];
```

The main keys are:

- `renderers`: Maps each type to an adapter class and its file extensions.
- `options`: Options passed to every adapter.
- `aliases`: Layout aliases, such as `@pagination`.
- `pagination`: The default pagination template and neighbours.

## Core Concepts

- **Layout**: The name passed to `render()` or `make()`, not a file path. Dots in a name are directory
  separators, so `admin.dashboard` means `admin/dashboard`.
- **Engine adapter**: A class that builds an engine from options and returns a `Closure` for a template. Each
  adapter keeps the engine's own syntax; the package does not parse templates.
- **Composite**: Finds the template file, selects the adapter by extension, and delegates the rendering.

## Topic Pages

- [Engine Renderers](./engines): The adapter classes, the options each engine reads, and how to customize the
  underlying engine.
- [Composite Renderer](./composite): Layout name resolution, file extensions, and registering engines.

## Related Components

- [Edge](../edge/): The Blade-compatible engine used by `EdgeRenderer`.
