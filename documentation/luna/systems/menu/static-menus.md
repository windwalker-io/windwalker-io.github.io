---
layout: doc
description: Build static menus in code with MenuBuilder and print them with the menu component in Luna CMF.
---

# Static Menus

Static menus are built in code with `MenuBuilder`. Nothing is written to the
database, so the menu changes when the code changes.

## Building a Static Menu

Inject `MenuBuilder` into your class and call `createTree()` with the menu
name. It sets the root of the tree. Call the item methods on the builder
and finish with `getTree()`. Each item method returns the new `MenuNode`,
not the builder, so do not chain builder methods after it:

```php
use Lyrasoft\Luna\Menu\MenuBuilder;

class SidebarProvider
{
    public function __construct(protected MenuBuilder $menu)
    {
    }

    public function build(): mixed
    {
        $menu = $this->menu->createTree('sidebar');

        $menu->link('Articles', '/admin/article');
        $menu->link('Categories', '/admin/category');
        $menu->link('Settings', '/admin/setting');

        return $menu->getTree();
    }
}
```

## Item Methods

The builder methods are:

- `add(string $title, mixed $uri = null)`: adds an item and makes it
  the current node. A `Closure` URI is called through `app->call()`,
  so its parameters are resolved from the container.
- `link(string $title, mixed $uri = null)`: an alias of `add()`.
- `header(string $title)`: a section title.
- `divider()`: a separator line.
- `text(string $text)`: plain text with no link.
- `load(array|string $path)`: adds items from PHP files or globs.
- `registerChildren(callable $callback)`: adds children to the last item.
- `registerChildrenFor(MenuNodeInterface $node, callable $callback)`:
  adds children to a given item.
- `addNode(MenuNodeInterface $node)`: attaches an existing node.
- `fromTree(NodeInterface|iterable $node, callable $callback)`:
  walks a source tree and calls `$callback($child, $menu)` for each
  node, keeping the hierarchy.
- `getLast()`: returns the last item added.
- `getTree()`: returns the finished tree.

A `Closure` as the URI can use type-hinted services:

```php
$this->menu->link(
    'Settings',
    fn (Navigator $nav) => $nav->to('setting')
);
```

## Nested Items

Nested items go inside a callback. Build a parent, then add its children:

```php
$this->menu->link('Content', '/admin/article');

$this->menu->registerChildren(function (MenuBuilder $menu) {
    $menu->link('Articles', '/admin/article');
    $menu->link('Tags', '/admin/tag');
});
```

## Header, Divider and Text

`header()` and `divider()` create placeholder nodes. The menu template
decides how they look. `text()` adds a node with plain text and no link.

::: info
In a static menu, `header()`, `divider()` and `text()` render as
placeholders only inside submenus. At the first level the template
always uses `link.link`, so they print as empty links. Put them inside
`registerChildren()`:

```php
$this->menu->link('Content', '/admin/article');

$this->menu->registerChildren(function (MenuBuilder $menu) {
    $menu->header('Articles');
    $menu->link('All', '/admin/article');
    $menu->divider();
    $menu->text('Updated daily');
});
```
:::

## Loading from Files

Load PHP files to keep a large menu out of the provider. Paths can be
globs:

```php
$tree = $this->menu->createTree('sidebar')
    ->load(__DIR__ . '/menu/*.php')
    ->getTree();
```

Inside a loaded file, `$menu` (the builder), `$app`, `$nav` and `$lang`
are available. `$nav` runs in mute mode, so an unknown route does not
throw an exception:

```php
// menu/sidebar.php
$menu->link('Articles', $nav->to('article_list'));

$menu->link('Users', '/admin/user')
    ->icon('fas fa-users');
```

## Configuring Items

`add()` and its aliases return the `MenuNode`, so the node can be
configured by chaining:

```php
$this->menu->link('Docs')
    ->to('https://example.com/docs')    // string or UriInterface
    ->linkTarget('_blank')              // MenuTarget or string
    ->icon('fas fa-book')
    ->addClass('text-primary')
    ->attr('data-section', 'docs');

$this->menu->link('Hidden')
    ->hidden(true);                     // skipped when rendering

$this->menu->link('Reports', '/admin/report')
    ->activeFor('report_list')          // route name to match
    ->setExtraValue('badge', 5);        // read with getExtraValue()
```

- `title()`, `icon()`, `link()` / `to()`, `hidden()`
- `linkTarget()`: an unknown string falls back to `MenuTarget::SELF`.
- `attr()` and `addClass()`: HTML attributes of the item element.
- `activeFor(string|array $path, array|false $query = false)`: matches
  by route name, and optionally by query.
- `activeHandler(callable $handler)`: a custom active check. The
  handler receives the node.
- `forceActive(?bool $active)`: overrides every other active check.
- `setLayout()`: changes the item template. The default is `link.link`.

By default, an item is active when its `RouteUri` link matches the
current route and variables. A plain string link is never active unless
you use `activeFor()` or `activeHandler()`.

## Combining with Database Menus

To mix both kinds, attach the database items under a static item:

```php
$tree = $menuService->getMenusTree('mainmenu');

$menu->link('Blog', $nav->to('article_category'));
$menu->getLast()->setChildren($tree->getChildren());
```

`MenuService::createBuilder(string $name)` returns a builder with the
tree created, and `loadMenuFromFile(string $name, string|array $path)`
builds a tree from files in one call.

## Printing a Static Menu

Pass the tree object to `<x-menu-root>` with `:menu`. Do not pass the
name as a string. A string is always looked up in the database, and a
static tree is not stored there:

```blade
{{-- $tree comes from SidebarProvider::build() --}}
<x-menu-root :menu="$tree" :vertical="true" />
```

Build the tree in your controller or view model, then pass it to the
template as a variable, such as `tree`. The `build()` method above
returns the tree directly. See [Menu Rendering](./menu-rendering) for
the component props.
