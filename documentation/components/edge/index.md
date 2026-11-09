---
layout: doc
title: Introduction
part: Components
component: edge
---

# Introduction

Windwalker Edge is a template engine whose syntax follows Laravel Blade
closely. Templates are compiled into PHP, cached, and then executed. The
package also provides a component system for reusable UI pieces, either
as view files or as PHP classes, and extension points for custom
directives, parsers, and global variables.

## Installation

```bash
composer require windwalker/edge ^4.0
```

Windwalker Edge 4.x requires PHP 8.4.6 or later. It depends on
`windwalker/data` and `windwalker/utilities`.

## Core Concepts

An `Edge` instance is built from four parts:

- **Loader** finds a template by its layout name and reads its source.
- **Compiler** converts template source into executable PHP.
- **Cache** stores compiled PHP, so unchanged templates are not compiled
  again.
- **Extensions** add directives, parsers, global variables, and
  components.

A render call passes through these parts in order. Layout names use dots
as directory separators, so `pages.home` resolves to
`pages/home.blade.php` or `pages/home.edge.php` in a loader path.

## Use as Standalone Component

Create the engine with a loader and a cache. The compiler is optional,
and the default compiler is used when it is omitted:

```php
use Windwalker\Edge\Cache\EdgeFileCache;
use Windwalker\Edge\Edge;
use Windwalker\Edge\Loader\EdgeFileLoader;

$edge = new Edge(
    new EdgeFileLoader([__DIR__ . '/views']),
    new EdgeFileCache(__DIR__ . '/var/cache/edge'),
);

$html = $edge->render('pages.home', ['title' => 'Welcome']);
```

Without arguments, `new Edge()` uses a string loader, an in-memory
cache, and the default compiler. That setup is useful for inline
templates, as shown in [Template Syntax](/documentation/components/edge/syntax).

## Use in Windwalker

Windwalker's renderer package registers Edge as the `edge` renderer, and
the `EdgeProvider` connects it to the application container. Your code
renders templates through `RendererService`, which the container already
provides:

```php
use Windwalker\Core\Renderer\RendererService;

class HomeController
{
    public function __construct(
        protected RendererService $renderer
    ) {
    }

    public function index(): string
    {
        return $this->renderer->render(
            'pages.home',
            ['title' => 'Welcome']
        );
    }
}
```

The same service is available through `$container->get(RendererService::class)`
or `$app->retrieve(RendererService::class)`.

Edge settings live in the renderer configuration module. The `edge`
section registers components by name, and it scans namespaces for
classes that carry the `EdgeComponent` attribute:

```php
// etc/packages/renderer.config.php

return static fn() => [
    'edge' => [
        'components' => [
            'alert' => AlertComponent::class,
        ],
        'component_scans' => [
            'App\\Component',
        ],
    ],
];
```

```php
namespace App\Component;

use Windwalker\Core\Edge\Attribute\EdgeComponent;

#[EdgeComponent('card')]
class CardComponent extends AbstractComponent
{
    // ...
}
```

The `cache_path` option in the renderer `options` setting enables the
file cache, and `paths` sets the template directories. See
[Compiled Template Cache](/documentation/components/edge/cache) and
[Template Loaders](/documentation/components/edge/loaders).

## Topic Pages

- [Template Syntax](/documentation/components/edge/syntax): output
  escaping, control structures, and attribute helpers.
- [Layouts, Sections, and Stacks](/documentation/components/edge/layouts):
  layout inheritance, named sections, and stacked assets.
- [Components](/documentation/components/edge/components): anonymous,
  class, and dynamic components with tag syntax.
- [Template Loaders](/documentation/components/edge/loaders): where
  templates come from and how names are resolved.
- [Compiled Template Cache](/documentation/components/edge/cache): file
  and array caches, and how expiration works.
- [Extending Edge](/documentation/components/edge/extending): custom
  directives, parsers, globals, and extension classes.

## Related components

- [Renderer](/documentation/components/renderer/): the renderer package
  that selects Edge, Blade, Plates, and other engines.
