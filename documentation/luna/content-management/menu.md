---
layout: doc
description: Menus in Luna CMF, their fields, and how to add custom menu views.
---

# Menu

Menus are navigation trees for the front end. Each menu item points to a
destination and uses a menu view to build its URL. Menu items are nested, so
they form dropdowns and submenus.

Luna has two sources of menus:

- **Static menus** are defined in PHP code with `MenuBuilder`. They live only
  in memory and are printed by passing the tree object to `<x-menu-root>`.
- **Database menus** are stored in the `menu` table and managed in the admin.
  They are printed by passing a menu type name to `<x-menu-root>`.

## Fields

The `Menu` entity (`Lyrasoft\Luna\Entity\Menu`) stores these fields:

- `id`, `title`: identity and display name.
- `type`: the menu type, such as `mainmenu`.
- `view`: the menu view that builds the URL, such as `link` or `article`.
- `url`: the URL, when the view uses one.
- `target`: the link target, a `MenuTarget` enum value.
- `variables`: JSON values for the view, such as a category ID.
- `image`: an icon or image.
- `state`: the publish state.
- `hidden`: hides the item from the menu without unpublishing it.
- `language`: the language code. `*` means all languages.
- `params`: JSON settings.

## Menu Types

A menu type groups menu items into one menu, such as the main
navigation or a footer. The types are listed in the `types` key of
`etc/menu.config.php`. The key is the type name, and the value is a
language key for its label:

```php
// etc/menu.config.php
return [
    // ...
    'types' => [
        'mainmenu' => 'luna.menu.type.mainmenu',
        'footmenu' => 'luna.menu.type.footmenu',
    ],
];
```

Use a literal label with `raw()` when you do not need a translation:

```php
use function Windwalker\raw;

'types' => [
    'footmenu' => raw('Footer Menu'),
],
```

Each type is a separate tree. Types apply to database menus. A static
menu from `MenuBuilder` is not stored under a type.

## Static Menus

Static menus are built in code with `MenuBuilder` and printed by passing the tree object to `<x-menu-root :menu="$tree">`. See [Static Menus](../systems/menu/static-menus) for building, item methods, and printing.

## Database Menus

Database menus are the items in the `menu` table, grouped by menu type. Load them with `MenuService::getMenusTree()` or print them with `<x-menu-root menu="mainmenu">`. See [Database Menus](../systems/menu/database-menus) for querying, printing, and active-item helpers.

## Menu Rendering

Print a menu with the `<x-menu-root>` component, or walk the tree yourself
for a custom layout. See [Menu Rendering](../systems/menu/menu-rendering)
for the props, the HTML structure, and manual rendering.

## Menu Views

Menu views, params, and template paths for database menus are covered in
[Menu Views](../systems/menu/menu-views).

## Overriding with pkg:install

Copy the config first with `--tag config`, then edit your copy.
Menu modules use the `menu` group:

```shell
php windwalker pkg:install lyrasoft/luna --tag config
php windwalker pkg:install lyrasoft/luna --tag menu_admin
php windwalker pkg:install lyrasoft/luna --tag menu_model
```
