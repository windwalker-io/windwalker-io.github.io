---
layout: doc
title: Template Loaders
part: Components
component: edge
---

# Template Loaders

Edge separates two jobs: finding a template and compiling it. The loader
handles the first job. It turns a layout name such as `pages.home` into
a template source, and the compiler and cache handle the rest. Because
the engine depends only on the loader interface, you can change where
templates come from without changing how they are rendered.

Two loaders ship with the package. `EdgeFileLoader` reads templates from
directories. `EdgeStringLoader` treats the layout name as the template
source, which is convenient for small inline templates.

## Minimal Setup

Pass a file loader with one or more directories as the first argument
of `Edge`:

```php
use Windwalker\Edge\Edge;
use Windwalker\Edge\Loader\EdgeFileLoader;

$edge = new Edge(
    new EdgeFileLoader([__DIR__ . '/views']),
);

echo $edge->render('pages.home', ['title' => 'Welcome']);
```

The layout `pages.home` resolves to `views/pages/home.blade.php` or
`views/pages/home.edge.php`. Dots become directory separators.

When you create `new Edge()` without arguments, the engine uses
`EdgeStringLoader`. The layout name is then the template itself, as shown
in [Template Syntax](/documentation/components/edge/syntax).

## Showcase

A common need is a theme that overrides a few templates from a default
set. Give the loader the theme directory first. The loader returns the
first file it finds, so the theme wins for every template that exists in
both places:

```php
use Windwalker\Edge\Edge;
use Windwalker\Edge\Loader\EdgeFileLoader;

$loader = new EdgeFileLoader([
    __DIR__ . '/themes/dark/views',
    __DIR__ . '/views',
]);

$edge = new Edge($loader);

// Uses themes/dark/views/pages/home.blade.php when it exists.
// Otherwise uses views/pages/home.blade.php.
echo $edge->render('pages.home', ['title' => 'Welcome']);
```

## How Lookup Works

For each directory, in the order given, the loader checks each file
extension in order. The first match wins. The default extensions are
`edge.php` and `blade.php`.

- `addPath()` adds a directory at the end of the search order.
- `prependPath()` adds a directory at the start, so it takes priority.
- `addFileExtension()` appends an extension to the search list.
- `setExtensions()` replaces the whole list.

Use `has()` to check whether a template exists without an exception:

```php
if ($loader->has('pages.home')) {
    // ...
}
```

`find()` throws `LayoutNotFoundException` when the template is missing.
The exception message lists the directories that were searched.

::: info
In a Windwalker application, the directories come from the `paths`
setting of the renderer configuration, and the extensions come from
`file_extensions` when they are set. See
[Overview](/documentation/components/edge/).
:::

## Layout Names and File Paths

`render()` accepts two kinds of layout argument. A dotted name is looked
up through the loader. A string that is an existing file path is loaded
directly and bypasses the loader.

::: warning
Never pass a layout name that comes from user input. An existing file
path is compiled and executed as a template, so a user-supplied path
can run arbitrary PHP. Use a fixed list of template names, or map user
choices to names in your own code.
:::

## String Templates

`EdgeStringLoader` is useful for templates kept in code, such as an
email body or a short fragment in a test:

```php
use Windwalker\Edge\Edge;
use Windwalker\Edge\Loader\EdgeStringLoader;

$edge = new Edge(new EdgeStringLoader());

echo $edge->render(
    'Hello, {{ $name }}!',
    ['name' => 'Simon']
);
```

The string loader does not look up names, so the whole argument is the
template. Keep long templates in files, where the cache can detect
changes by file modification time.

## Replacing the Loader

Pass a loader to `setLoader()` or read it back with `getLoader()`. Any
object that implements `EdgeLoaderInterface` can serve templates from
another source, such as a database. The interface requires `find()`,
`load()`, and `has()`.
