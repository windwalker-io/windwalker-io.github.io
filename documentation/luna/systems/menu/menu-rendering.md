---
layout: doc
description: Print a Luna menu with the menu-root component or render it manually.
---

# Menu Rendering

Static and database menus print the same way. Pass a tree to
`<x-menu-root>`, or walk the tree yourself for a custom layout.

## Menu Component

Luna registers the `<x-menu-root>` [Edge](/documentation/framework/core-concepts/views/edge-templates) component. It renders a whole menu
tree as a `<ul>` with the `c-luna-menu nav` classes. It works for both
static and database menus. The `menu` prop accepts a type name or a tree:

```blade
{{-- Database menu, by type name --}}
<x-menu-root menu="mainmenu" class="navbar-nav" />

{{-- Static menu, by tree object, as a vertical list --}}
<x-menu-root :menu="$tree" :vertical="true" />

{{-- Use a custom tag and wrap the items with extra markup --}}
<x-menu-root menu="footmenu" tag="div">
    <h5>Links</h5>
</x-menu-root>
```

The component reads these props:

- `menu`: a menu type name, or a tree node. Defaults to `mainmenu`.
- `tag`: the wrapping element. Defaults to `ul`.
- `click`: open dropdowns on click instead of on hover.
- `fade`: add the `dropdown-fade` class.
- `vertical`: add the `flex-column` class.
- `dropdown`: enable the multi-level dropdown script.
- `level`: accepted as a prop, but the root `<ul>` always renders
  `data-level="1"`. Do not rely on it to change the starting level.
- `start` and `end`: HTML to print before and after the items.

A string `menu` is loaded with [`MenuService::getMenusTree()`](./database-menus). The
component renders `@menu::menu-items` unless you pass a slot, so a slot
replaces the default items.

The component is defined in `views/menu/bootstrap5/menu-root.blade.php`.
Copy it to your app's `views/menu/bootstrap5/` directory to change it.

## Rendering a Menu Manually

`<x-menu-root>` covers most layouts. For a custom layout, walk the
tree yourself. Each node exposes its title, link (`route($nav)`), active state, and
children:

```blade
<ul class="my-menu">
    @foreach ($menu->getChildren() as $item)
        <li class="{{ $item->isActive(true) ? 'active' : '' }}">
            <a href="{{ $item->route($nav) }}">
                {{ $item->getTitle() }}
            </a>

            @if (count($item->getChildren()) > 0)
                <ul>
                    @foreach ($item->getChildren() as $child)
                        <li>
                            <a href="{{ $child->route($nav) }}">
                                {{ $child->getTitle() }}
                            </a>
                        </li>
                    @endforeach
                </ul>
            @endif
        </li>
    @endforeach
</ul>
```

`isActive(true)` also checks the children, so a parent stays active
while one of its children matches the current page.

The built-in `<x-menu-root>` output uses this HTML structure:

```html
<ul
  class="c-luna-menu nav dropdown-hover"
  data-menu-id="1"
  data-level="1"
>
  <li class="nav-item dropdown">
    <a class="nav-link dropdown-toggle">Parent</a>
    <ul class="dropdown-menu">
      <li class="dropdown-submenu">
        <a class="dropdown-item">Child</a>
      </li>
    </ul>
  </li>
</ul>
```

Keep these class names when you style the menu in CSS.

For example, a footer with one column per top-level item, or an
accordion that opens the parent of the active page:

```blade
<div class="row">
    @foreach ($menu->getChildren() as $item)
        <div class="col-6 col-lg-3">
            <a href="{{ $item->route($nav) }}">{{ $item->getTitle() }}</a>

            @foreach ($item->getChildren() as $child)
                <a href="{{ $child->route($nav) }}">
                    {{ $child->getTitle() }}
                </a>
            @endforeach
        </div>
    @endforeach
</div>

<div class="accordion" id="mobileMenu">
    @foreach ($menu->getChildren() as $i => $item)
        @continue($item->isHidden())

        @if (!$item->hasChildren())
            <a href="{{ $item->route($nav) }}">{{ $item->getTitle() }}</a>
        @else
            @php($open = $item->isActive(true))
            <div class="accordion-item">
                <button
                    class="accordion-button {{ $open ? '' : 'collapsed' }}"
                    data-bs-toggle="collapse"
                    data-bs-target="#mobile-{{ $i }}">
                    {{ $item->getTitle() }}
                </button>
                <div id="mobile-{{ $i }}"
                    class="accordion-collapse collapse {{ $open ? 'show' : '' }}"
                    data-bs-parent="#mobileMenu">
                    @foreach ($item->getChildren() as $child)
                        <a href="{{ $child->route($nav) }}">
                            {{ $child->getTitle() }}
                        </a>
                    @endforeach
                </div>
            </div>
        @endif
    @endforeach
</div>
```

Use `route($nav)` to get an item's link. It works for both kinds of
tree, and `$nav` is available in every Edge template.

## Responsive Menus

Print the same tree twice: a horizontal menu for desktop, and a vertical
one inside an offcanvas for mobile. Place the offcanvas outside the
`<nav>`:

```blade
<x-menu-root :menu="$menu" dropdown class="navbar-nav" />

<div class="offcanvas offcanvas-end" id="offcanvasNavbar">
    <div class="offcanvas-body">
        <x-menu-root :menu="$menu" vertical click class="navbar-nav" />
    </div>
</div>
```

Drop `dropdown` and add `vertical` in the offcanvas. Add `click` to open
submenus on click. Keep the menu to two or three levels there.
