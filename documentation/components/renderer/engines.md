---
layout: doc
title: Engine Renderers
component: renderer
---

# Engine Renderers

Each template engine has an adapter class. The adapter builds the engine from your options, then renders a
template by name. Calling code uses the same `render()` and `make()` methods for every engine, so a project can
switch engines, or mix several of them, without changing the code that renders a page.

The adapters are:

- `PlatesRenderer`: [league/plates](https://platesphp.com/) templates.
- `TwigRenderer`: Twig templates.
- `MustacheRenderer`: Mustache templates.
- `EdgeRenderer`: Edge templates, which use Blade-compatible syntax.
- `BladeRenderer`: Laravel Blade templates through `illuminate/view`.

Use an adapter directly when the application uses one engine. Use `CompositeRenderer` when templates come from
several engines. See [Composite Renderer](./composite).

## Rendering Templates

Every adapter has the same two entry points. `render()` returns the rendered string. `make()` returns a `Closure`
bound to the template, which you can call with different data:

```php
use Windwalker\Renderer\PlatesRenderer;

$renderer = new PlatesRenderer(
    [
        'base_dir' => __DIR__ . '/views',
    ],
);

echo $renderer->render(
    'profile',
    ['name' => 'Tony Stark'],
);

$template = $renderer->make('profile');

echo $template(['name' => 'Tony Stark']);
echo $template(['name' => 'Bruce Banner']);
```

::: tip
`render()` calls `make()` each time, and each `make()` builds a new engine instance. When the same template is
rendered many times, keep the `Closure` returned by `make()` and call it again.
:::

## Common Options

All adapters accept the same base options. Each engine reads only the options it needs:

- `paths`: Template directories. Twig, Edge, and Blade search these directories. Plates and Mustache use the
  first entry when `base_dir` is not set.
- `base_dir`: A single template directory for Plates and Mustache. It takes priority over `paths`.
- `file_extensions`: Template file extensions. Edge uses the list. Plates uses the first entry.
- `cache_path`: A directory for compiled templates. Edge uses a file cache when this is set, and otherwise an
  in-memory cache. Blade requires it.
- `root_path`: The root path passed to Twig's filesystem loader.
- `debug`: Enables Twig's debug extension when truthy.
- `context`: Passed to Edge's `renderWithContext()` as the rendering context.
- `twig`: Options for the Twig environment.
- `mustache`: Options for the Mustache engine.

Engine-specific options are listed in each engine section below.

## Plates

`PlatesRenderer` adapts [league/plates](https://platesphp.com/). Plates is a native PHP template engine, so
templates are plain PHP files with the `$this` template helpers. It fits projects that want PHP syntax with a
small layer for layouts and escaping.

Create the adapter with `base_dir`, or with `paths`:

```php
use Windwalker\Renderer\PlatesRenderer;

$renderer = new PlatesRenderer(
    [
        'base_dir' => __DIR__ . '/views',
    ],
);
```

With this base directory, `profile` loads `views/profile.phtml`. The default file extension is `phtml`. Set
`file_extensions` to use another one:

```php
$renderer = new PlatesRenderer(
    [
        'base_dir' => __DIR__ . '/views',
        'file_extensions' => ['php'],
    ],
);
```

## Twig

`TwigRenderer` adapts [Twig](https://twig.symfony.com/). Pass the directories in `paths`. Use `twig` for Twig's
own environment options, and `debug` to add the debug extension:

```php
use Windwalker\Renderer\TwigRenderer;

$renderer = new TwigRenderer(
    [
        'paths' => [
            __DIR__ . '/views',
        ],
        'debug' => true,
        'twig' => [
            'cache' => __DIR__ . '/cache/twig',
        ],
    ],
);

echo $renderer->render('mail/welcome.twig', ['name' => 'Bob']);
```

The Twig environment is created for each `make()` call, so the `cache` directory is what keeps compiled templates
across requests.

## Mustache

`MustacheRenderer` adapts [Mustache](https://mustache.github.io/). Mustache uses a logic-less syntax, so
templates receive only the data they are given. The adapter reads the template directory from `base_dir`, or from
the first entry of `paths`:

```php
use Windwalker\Renderer\MustacheRenderer;

$renderer = new MustacheRenderer(
    [
        'base_dir' => __DIR__ . '/views',
        'mustache' => [
            'cache' => __DIR__ . '/cache/mustache',
        ],
    ],
);

echo $renderer->render('greeting', ['name' => 'Alice']);
```

Use `mustache` for the options of `Mustache_Engine`.

## Edge

`EdgeRenderer` adapts Windwalker Edge, a Blade-compatible engine. Templates use `@extends`, `@section`, and
`{{ }}` syntax. Pass the directories in `paths`, and set `cache_path` to store compiled templates on disk:

```php
use Windwalker\Renderer\EdgeRenderer;

$renderer = new EdgeRenderer(
    [
        'paths' => [
            __DIR__ . '/views',
        ],
        'cache_path' => __DIR__ . '/cache/edge',
    ],
);

echo $renderer->render(
    'admin.dashboard',
    ['user' => 'Alice'],
);
```

Edge reads the layout name with dots as directories, so `admin.dashboard` loads
`views/admin/dashboard.edge.php`.

Edge stores compiled templates in memory when `cache_path` is not set. The cache is then discarded at the end of
the process, so set `cache_path` in production.

## Blade

`BladeRenderer` adapts `illuminate/view`, the Laravel Blade engine. Install `illuminate/view` before using it. Pass
the directories in `paths`:

```php
use Windwalker\Renderer\BladeRenderer;

$renderer = new BladeRenderer(
    [
        'paths' => [
            __DIR__ . '/views',
        ],
        'cache_path' => __DIR__ . '/cache/blade',
    ],
);

echo $renderer->render('welcome', ['name' => 'Alice']);
```

Blade requires `cache_path`. It throws an `InvalidArgumentException` when the option is missing, and the error
appears on the first render. Set the option when you create the adapter.

::: info
Standalone, `CompositeRenderer` maps `.blade.php` to `BladeRenderer` by default. Windwalker's default configuration
routes `.blade.php` files to Edge instead. See [Composite Renderer](./composite#registering-engines).
:::

## Customizing the Engine

Adapters let you change the engine after it is created, or replace how it is created. Both approaches receive
the merged options, so they can read `paths` and other values.

### extend()

`extend()` adds a callback that receives the engine and the options. Each call wraps the callbacks added before
it, and the callback must return the engine:

```php
use League\Plates\Engine;

$renderer->extend(
    function (Engine $engine, array $options): Engine {
        $engine->addFolder(
            'shared',
            __DIR__ . '/shared-views',
        );

        return $engine;
    }
);
```

The callback runs each time an engine is built, which is on every `make()` call.

### setEngineBuilder()

`setEngineBuilder()` replaces the default builder. Use it when the engine needs a setup that the options cannot
express:

```php
use League\Plates\Engine;

$renderer->setEngineBuilder(
    fn(array $options): Engine => new Engine(
        '/path/to/templates',
        'php',
    )
);
```

Passing `null` restores the default builder. Callbacks added with `extend()` wrap the builder that is set when
they are called. Set the builder before calling `extend()`, so the callbacks apply to your builder.

::: info
`setEngineBuilder()` replaces the default builder completely. Options such as `paths` and `base_dir` have no
effect unless your builder reads them.
:::
