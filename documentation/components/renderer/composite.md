---
layout: doc
title: Composite Renderer
component: renderer
---

# Composite Renderer

Applications often keep templates in more than one engine, for example during a migration from PHP templates to
Edge, or when a package ships Twig templates. `CompositeRenderer` lets calling code request a layout by name
without knowing which engine renders it. It searches the template directories, reads the file extension, and
passes the layout to the matching adapter.

## Minimal Setup

Pass the template directories to the constructor. The second argument holds the options shared by all adapters:

```php
use Windwalker\Renderer\CompositeRenderer;

$renderer = new CompositeRenderer(
    __DIR__ . '/views',
    [
        'cache_path' => __DIR__ . '/cache/renderer',
    ],
);
```

## Showcase

Suppose the `views` directory contains templates in three engines:

```text
views/
├── admin/
│   └── dashboard.edge.php
├── mail/
│   └── welcome.twig
└── layout/
    └── header.mustache
```

Each layout is rendered with the same method:

```php
echo $renderer->render(
    'admin.dashboard',
    ['user' => 'Alice'],
);

echo $renderer->render(
    'mail.welcome',
    ['name' => 'Bob'],
);

echo $renderer->render(
    'layout.header',
    ['title' => 'Home'],
);
```

The Twig and Mustache libraries must be installed for the last two calls. See
[Installation](./index#installation).

## Resolving Layout Names

A layout name is resolved in two steps. For each directory, in priority order:

- The name is matched as a file name, for example `sunflower.twig`.
- The name is matched as a path, with dots replaced by slashes. The
  extensions are tried in the order of the registered factories.

The first match wins:

```php
$renderer = new CompositeRenderer(
    [
        __DIR__ . '/views',
        __DIR__ . '/fallback-views',
    ],
);

// Loads views/admin/dashboard.edge.php if it exists,
// otherwise fallback-views/admin/dashboard.edge.php.
$renderer->render('admin.dashboard', []);
```

When several directories contain the same layout, the higher priority directory wins. Use `addPath()` with a
priority argument, or pass an `SplPriorityQueue` to the constructor, when the order matters.

### Explicit Extensions

Include the extension to pick a specific template when a name matches more than one file:

```php
$renderer->render('mail/welcome.twig', ['name' => 'Bob']);
```

Include the extension too when the file name contains dots. A file named `report.v2.twig` is referenced as
`report.v2.twig`, because the dots in the name would otherwise be read as directories.

### Absolute Paths

An absolute file path bypasses the lookup. The directory of the file is used as the base directory:

```php
echo $renderer->render(
    __DIR__ . '/views/admin/dashboard.edge.php',
    ['user' => 'Alice'],
);
```

### Checking and Finding Templates

`has()` returns whether a layout exists, and `findFile()` returns its `SplFileInfo` or `null`:

```php
if ($renderer->has('admin.dashboard')) {
    echo $renderer->render('admin.dashboard', []);
}

$file = $renderer->findFile('admin.dashboard');

echo $file?->getPathname();
```

A missing layout makes `make()` and `render()` throw
`Windwalker\Edge\Exception\LayoutNotFoundException`. Its message lists the searched directories.

::: info
The extension `php` belongs to Plates. Any `.php` file in a template directory is treated as a Plates
template, so keep templates for other engines in separate directories or use their specific extensions.
:::

## Registering Engines

The default factories are:

- `edge`: `edge.php`, `blade.php`
- `blade`: `blade.php`
- `plates`: `php`
- `mustache`: `mustache`
- `twig`: `twig`

The order of this list decides which factory handles a file. A name ending in `.edge.php` is read by Edge
before the Plates factory, because Edge is registered first.

Add an engine with `addFactory()`. The class must implement `TemplateFactoryInterface`, and is usually a subclass
of `AbstractEngineRenderer`. The following registers a custom adapter, `MarkdownRenderer`, for `.md` files:

```php
use App\Renderer\MarkdownRenderer;

$renderer->addFactory(
    'markdown',
    MarkdownRenderer::class,
    ['md'],
);
```

Use `addFileExtensions()` to add extensions to a registered engine, and `removeFactory()` to disable one. The
`setFactories()` method replaces the whole list, as the `renderers` configuration key does.

```php
$renderer->addFileExtensions('twig', 'html.twig');

$renderer->removeFactory('mustache');
```

::: tip
`getRenderer()` caches each adapter by type after it is created. Call `extend()` on the composite before the first
render of that type. Later calls only affect adapters that are created afterwards.
:::

## Extending the Composite

`extend()` adds a callback that decorates the adapters the composite creates. The callback runs once for each
engine type, when that adapter is first created. It receives two arguments:

- `$adapter`: The adapter instance, such as a `TwigRenderer`.
- `$options`: The options used to create the adapter. This is an empty array when the adapter is created by
  `make()` or `render()`.

The callback does not receive the type name, such as `twig`. Identify the engine from the adapter class with
`instanceof`:

```php
use League\Plates\Engine as PlatesEngine;
use Windwalker\Renderer\EdgeRenderer;
use Windwalker\Renderer\PlatesRenderer;
use Windwalker\Renderer\TwigRenderer;

$renderer->extend(
    function (object $adapter, array $options): object {
        if ($adapter instanceof PlatesRenderer) {
            $adapter->extend(
                function (PlatesEngine $engine): PlatesEngine {
                    $engine->addFolder('shared', __DIR__ . '/shared');

                    return $engine;
                }
            );
        }

        if ($adapter instanceof TwigRenderer) {
            $adapter->extend(
                function ($twig) {
                    $twig->addGlobal('site', 'Windwalker');

                    return $twig;
                }
            );
        }

        if ($adapter instanceof EdgeRenderer) {
            $adapter->extend(
                function ($edge) {
                    $edge->addGlobal('site', 'Windwalker');

                    return $edge;
                }
            );
        }

        return $adapter;
    }
);
```

The callback must return the adapter. The engine-level changes go through the adapter's own `extend()`, as shown
in [Engine Renderers](./engines#customizing-the-engine).

::: info
`instanceof` also matches subclasses. A custom subclass of `TwigRenderer` is handled by the Twig branch. To match
one class exactly, compare with `$adapter::class === TwigRenderer::class`.
:::

::: tip
Callbacks run in the order they were added. Use one `extend()` call for each concern, and keep the branches
small. Adapters for custom factories are identified by their own class names.
:::
