---
layout: doc
description: Menus in Luna CMF, their fields, and how to add custom menu views.
---

# Menu

Menus are navigation trees for the front end. Each menu item points to a
destination and uses a menu view to build its URL. Menu items are nested, so
they form dropdowns and submenus.

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

## Built-in Menu Views

The built-in views are registered in `etc/menu.config.php`:

- `AliasMenuView`: links to another menu item.
- `LinkMenuView` (`link`): links to a fixed URL.
- `PlaceholderMenuView` (`placeholder`): a label with no link.
- `RouteMenuView` (`route`): links to a registered route.
- `ArticleCategoryMenuView` (`article_category`): lists the articles of a category.
- `ArticleMenuView` (`article`): links to one article.
- `PageMenuView` (`page`): links to one page.

## Adding a Menu View

A menu view decides what a menu item links to and when it is active.
This tutorial builds a `QuoteMenuView` that links to a quote page.

Extend `AbstractMenuView` and implement these members:

- `static getName()`: the view's unique name, stored on each item.
- `static getTitle()`: the label in the admin view list. The default
  is `luna.menu.view.<name>.title`, so override it to use plain text.
- `defineVariablesForm()`: fields that identify the target.
- `route()`: the URI the item links to.
- `isActive()`: whether the item is active on the current page.

```php
namespace App\Menu\View;

use Lyrasoft\Luna\Menu\AbstractMenuView;
use Psr\Http\Message\UriInterface;
use Windwalker\Core\Router\Navigator;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;
use Windwalker\Utilities\Contract\LanguageInterface;

class QuoteMenuView extends AbstractMenuView
{
    public static function getName(): string
    {
        return 'quote';
    }

    public static function getTitle(LanguageInterface $lang): string
    {
        return 'Quote';
    }

    protected function defineVariablesForm(Form $form): void
    {
        $form->add('quote_id', TextField::class)
            ->label('Quote ID')
            ->required(true);
    }

    protected function defineParamsForm(Form $form): void
    {
        // Covered in "Menu Params" below.
    }

    public function route(
        Navigator $nav,
        array $variables,
        array $params
    ): UriInterface {
        return $nav->to('quote_item', ['id' => $variables['quote_id']]);
    }

    public function isActive(array $variables, array $params): bool
    {
        return $this->menuHelper->is(
            'quote_item',
            ['id' => $variables['quote_id']]
        );
    }
}
```

`$this->menuHelper` is injected by `AbstractMenuView`. `route()` and
`isActive()` use the same route name, which keeps the link and the
active check in sync.

`prepareVariablesStore()` changes the variables before they are saved.
Use it to store a value that the route needs. The built-in
`ArticleMenuView` saves the article's alias, and it injects the ORM to
look it up:

```php
public function __construct(protected ORM $orm) {}

public function prepareVariablesStore(array &$variables): void
{
    $variables['alias'] = (string) $this->orm
        ->findOne(Article::class, $variables['id'])
        ?->alias;
}
```

Register the class in the `views` list of your copy of
`etc/menu.config.php`. Keep the built-in entries in the list.

```php
// etc/menu.config.php
return [
    'views' => [
        // Keep the built-in entries here, then add:
        \App\Menu\View\QuoteMenuView::class,
    ],
];
```

## Menu Params

Params are extra settings stored on each menu item, separate from the
variables that choose the target. Define them in `defineParamsForm()`
with `tab()`. A tab groups fields under a heading in the edit form:

```php
protected function defineParamsForm(Form $form): void
{
    $this->tab(
        'appearance',
        'Appearance',
        function (Form $form) {
            $form->add('highlight', SwitcherField::class)
                ->label('Highlight');
        }
    );
}
```

Read a param through the menu item's value. A params array is saved on
the `Menu` entity as `params`:

```php
$value = $node->getValue();

if ($value->params['highlight'] ?? false) {
    // Add a CSS class to the item.
}
```

::: tip
Read params from `$node->getValue()->params`. The `Menu` entity has
the property `params`, not a `getParams()` method.
:::

## Shared Params

To add a param to every menu view, listen for `MenuFieldDefineEvent`.
The event carries the `Form` and the menu view that is being defined.
Add fields to the `params` namespace so they save with each view:

```php
namespace App\Listener;

use Lyrasoft\Luna\Menu\MenuFieldDefineEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Form;

#[EventSubscriber]
class MenuParamsListener
{
    #[ListenTo(MenuFieldDefineEvent::class)]
    public function addIconParam(MenuFieldDefineEvent $event): void
    {
        $event->form->ns(
            'params',
            function (Form $form) {
                $form->add('icon', TextField::class)
                    ->label('Icon');
            }
        );
    }
}
```

Register the subscriber with your app's event setup, the same way as
other `#[EventSubscriber]` classes in your project.

## Menu Template Path

Each menu item renders with a layout. The layout is a dot-separated name,
such as `link.link`. Luna resolves it under the `@menu` namespace, which
points to `views/menu/bootstrap5/` in the package:

- `link.link` → `@menu::link.link` →
  `views/menu/bootstrap5/link/link.blade.php`
- `placeholder.placeholder` →
  `views/menu/bootstrap5/placeholder/placeholder.blade.php`

`PlaceholderMenuView` sets its own layout by implementing
`LayoutRenderedMenuInterface` and returning it from `getLayout()`. A custom
view can do the same to use its own template.

```php
use Lyrasoft\Luna\Menu\AbstractMenuView;
use Lyrasoft\Luna\Menu\LayoutRenderedMenuInterface;

class ExternalMenuView extends AbstractMenuView implements
    LayoutRenderedMenuInterface
{
    // ...

    public function getLayout(): string
    {
        return '@menu::external.external';
    }
}
```

## Menu Component

Luna registers the `<x-menu-root>` Edge component. It renders a whole menu
tree as a `<ul>` with the `c-luna-menu nav` classes. It is the simplest way
to place a menu in a Blade template:

```blade
{{-- Render the "mainmenu" type by name --}}
<x-menu-root menu="mainmenu" class="navbar-nav" />

{{-- Render a tree you built in PHP, as a vertical list --}}
<x-menu-root :menu="$tree" :vertical="true" />

{{-- Use a custom tag and wrap the items with extra markup --}}
<x-menu-root menu="footer" tag="div">
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

A string `menu` is loaded with `MenuService::getMenusTree()`. The
component renders `@menu::menu-items` unless you pass a slot, so a slot
replaces the default items.

The component is defined in `views/menu/bootstrap5/menu-root.blade.php`.
Copy it to your app's `views/menu/bootstrap5/` directory to change it.

## Building a Menu in Code

Inject `MenuBuilder` into your class and call `createTree()` with the menu
name. It sets the root of the tree. Chain the item methods and finish with
`getTree()`:

```php
use Lyrasoft\Luna\Menu\MenuBuilder;

class SidebarProvider
{
    public function __construct(protected MenuBuilder $menu)
    {
    }

    public function build(): mixed
    {
        return $this->menu->createTree('sidebar')
            ->header('Content')
            ->link('Articles', '/admin/article')
            ->link('Categories', '/admin/category')
            ->divider()
            ->link('Settings', '/admin/setting')
            ->getTree();
    }
}
```

The item methods are:

- `add(string $title, mixed $uri = null)`: adds an item and makes it
  the current node. A `Closure` URI is called through `app->call()`,
  so its parameters are resolved from the container.
- `link(string $title, mixed $uri = null)`: an alias of `add()`.
- `header(string $title)`: a section title.
- `divider()`: a separator line.
- `text(string $text)`: plain text with no link.
- `load(array|string $path)`: adds items from an array, or from a PHP file.
- `registerChildren(callable $callback)`: adds children to the last item.
- `registerChildrenFor(MenuNodeInterface $node, callable $callback)`:
  adds children to a given item.
- `getLast()`: returns the last item added.
- `getTree()`: returns the finished tree.

A `Closure` as the URI is called through the container, so it can use
type-hinted services:

```php
$this->menu->createTree('sidebar')
    ->link(
        'Settings',
        fn (Navigator $nav) => $nav->to('setting')
    )
    ->getTree();
```

Nested items go inside a callback. Build a parent, then add its children:

```php
$this->menu->createTree('sidebar')
    ->link('Content', '/admin/article')
    ->registerChildren(function (MenuBuilder $menu) {
        $menu->link('Articles', '/admin/article')
            ->link('Tags', '/admin/tag');
    })
    ->getTree();
```

`header()`, `divider()`, and `text()` are for submenus. Place them
inside a parent's children. At the top level, they do not render as a
section title or a separator.

Load PHP files to keep a large menu out of the provider. Paths can be
globs. Each file receives `$menu`, `$app`, `$nav`, and `$lang`:

```php
$this->menu->createTree('sidebar')
    ->load(__DIR__ . '/menu/*.php')
    ->getTree();
```

::: info
`MenuBuilder` builds a tree in code. It is separate from the database
menus that `MenuService::getMenusTree()` returns.
:::

## Rendering a Menu Manually

`<x-menu-root>` covers most layouts. For a custom layout, walk the
tree yourself. Each node exposes its title, link, active state, and
children:

```blade
<ul class="my-menu">
    @foreach ($menu->getChildren() as $item)
        <li class="{{ $item->isActive(true) ? 'active' : '' }}">
            <a href="{{ $item->getLink() }}">
                {{ $item->getTitle() }}
            </a>

            @if (count($item->getChildren()) > 0)
                <ul>
                    @foreach ($item->getChildren() as $child)
                        <li>
                            <a href="{{ $child->getLink() }}">
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
<ul class="dropdown-hover c-luna-menu nav navbar-nav" data-level="1">
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

Each type is a separate tree. Render a type by its name:

```blade
<x-menu-root menu="footmenu" class="navbar-nav" />
```

## Querying Menu Trees

`MenuService::getMenusTree()` returns the database menu tree for a menu
type. It takes the type, whether to include only available items, and an
optional parent:

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

## Active Menu

The menu marks the item that matches the current route. Use these
helpers to control which item is active:

```php
// Return the active menu node, optionally by menu type.
$active = $menuService->getActiveMenu('mainmenu');

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

## Preparing Variables

Each menu view has two hooks for its `variables`:

- `prepareVariablesForm(array &$variables)`: runs when the edit form is
  built, so you can set defaults for the form.
- `prepareVariablesStore(array &$variables)`: runs before the variables
  are saved by `MenuController`.

`PageMenuView` uses `prepareVariablesStore()` to resolve `alias` from
`id`, and throws `ValidateFailException` when both `id` and `path` are
empty.

```php
use Lyrasoft\Luna\Menu\AbstractMenuView;

class QuoteMenuView extends AbstractMenuView
{
    public function prepareVariablesStore(array &$variables): void
    {
        // Change the stored variables here.
    }
}
```

## Overriding with pkg:install

Copy the config first with `--tag config`, then edit your copy.
Menu modules use the `menu` group:

```shell
php windwalker pkg:install lyrasoft/luna --tag config
php windwalker pkg:install lyrasoft/luna --tag menu_admin
php windwalker pkg:install lyrasoft/luna --tag menu_model
```
