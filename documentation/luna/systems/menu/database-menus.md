---
layout: doc
description: Load database menus from the menu table with MenuService and print them with the menu component in Luna CMF.
---

# Database Menus

Database menus are the items in the `menu` table. Admins create them, and
each item belongs to a menu type. The tree is loaded through `MenuService`.

The page covers menu types, loading and printing a tree, and the
active-item helpers. To control what an item links to, see
[Menu Views](./menu-views).

## Menu Types

A menu type groups items, such as `mainmenu` or `footmenu`. Each type
is a separate tree. Register types in the `types` key of
`etc/menu.config.php`. The value is a language key, or a `raw()` string
to show plain text:

```php
return [
    'types' => [
        'mainmenu' => 'luna.menu.type.mainmenu',
        'footmenu' => \Windwalker\raw('Footer Menu'),
    ],
];
```

`MenuService::getMenuTypes()` merges these with the types already used
in the `menu` table. Link to a type's admin page with
`$nav->to('menu_list')->var('type', 'footmenu')`.

## Loading a Menu Tree

`MenuService::getMenusTree()` returns the tree for a menu type. It takes
the type, whether to include only available items, and an optional parent:

```php
use Lyrasoft\Luna\Services\MenuService;

class NavProvider
{
    public function __construct(protected MenuService $menuService)
    {
    }

    public function mainMenu(): mixed
    {
        return $this->menuService->getMenusTree('mainmenu');
    }
}
```

## Printing a Database Menu

Pass the type name to `<x-menu-root>` with `menu`. The component loads the
tree with `getMenusTree()` for you:

```blade
<x-menu-root menu="mainmenu" class="navbar-nav" />
<x-menu-root menu="footmenu" tag="div" />
```

To load the tree yourself, pass the result of `getMenusTree()` with `:menu`:

```blade
<x-menu-root :menu="$mainMenu" class="navbar-nav" />
```

## Resolving a Link Manually

When you print a menu without the built-in templates, resolve an item's
link through its view:

```php
$view = $menuService->getViewInstance($menu->view);

$uri = $view->route($nav, $menu->variables, $menu->params);
```

`getViewInstance()` returns `null` when the view name is not registered.

## Active Menu

The menu marks the item that matches the current route. Use these
helpers to control which item is active:

```php
// Return the active DbMenuNode, optionally by menu type.
$node = $menuService->getActiveMenu('mainmenu');
$menu = $node?->getValue(); // The Menu entity.

// Mark the menu of a view as active for the given query.
$menuService->forceMenuActive(
    'article',
    ['category_id' => 3]
);

// Mark a view active only when no item already matches.
$menuService->forceActiveIfNoExists('article');
```

- `forceMenuActive(string $view, array $variablesQuery = [], bool $onlyFirst = true)`:
  matches the view and its variables. `$onlyFirst` defaults to `true`.
- `forceActiveIfNoExists(string $view, array $conditions = [])`: marks
  the view active only when no item already matches.
- `findMenu(callable $callback)`: returns the first node, across all
  types, for which the callback returns true.
- `each(callable $callback, ?string $type = null)`: calls the callback
  for every node of one type, or of all types.

