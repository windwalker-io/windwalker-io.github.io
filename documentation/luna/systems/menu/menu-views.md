---
layout: doc
description: Create custom menu views, params and templates for database menus in Luna CMF.
---

# Menu Views

A menu view decides what a database menu item links to, which form
fields the admin sees, and when the item is active. Luna ships several
views, and you can add your own.

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

This section builds a `QuoteMenuView` that links to a quote page.

Extend `AbstractMenuView` and implement these members:

- `static getName()`: the view's unique name, stored on each item.
- `static getTitle()`: the label in the admin view list. The default
  is `luna.menu.view.<name>.title`, so override it to use plain text.
- `static getDescription()`: the description. The default is
  `luna.menu.view.<name>.desc`.
- `static getGroup()`: the group in the view list. The default is
  `core`.
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

## Preparing Variables

Each menu view has two hooks for its `variables`:

- `prepareVariablesForm(array &$variables)`: runs when the edit form is
  built, so you can set defaults for the form.
- `prepareVariablesStore(array &$variables)`: runs before the variables
  are saved by `MenuController`.

Use `prepareVariablesStore()` to store a value that the route needs.
The built-in `ArticleMenuView` saves the article's alias, and it
injects the ORM to look it up:

```php
public function __construct(protected ORM $orm) {}

public function prepareVariablesStore(array &$variables): void
{
    $variables['alias'] = (string) $this->orm
        ->findOne(Article::class, $variables['id'])
        ?->alias;
}
```

`PageMenuView` does the same for `alias`, and throws
[`ValidateFailException`](/documentation/framework/core-concepts/error-handling) when both `id` and `path` are empty.

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
The event carries the `Form` and the menu view that is being defined,
available with `getForm()` and `getMenu()`.
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
        $event->getForm()->ns(
            'params',
            function (Form $form) {
                $form->add('icon', TextField::class)
                    ->label('Icon');
            }
        );
    }
}
```

Register the subscriber in the `listeners` of `etc/app/main.config.php`.
The menu view emits the event on the application context:

```php
'listeners' => [
    \Windwalker\Core\Application\AppContext::class => [
        \App\Listener\MenuParamsListener::class,
    ],
],
```

The fields appear on every menu view's edit form.

## Menu Template Path

Each menu item renders with a layout. The layout is a dot-separated name,
such as `link.link`. Luna resolves it under the `@menu` namespace, which
points to `views/menu/bootstrap5/` in the package:

- `link.link` → `@menu::link.link` →
  `views/menu/bootstrap5/link/link.blade.php`
- `placeholder.placeholder` →
  `@menu::placeholder.placeholder` →
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

A view that renders its own markup implements `SelfRenderMenuInterface`
(which extends `LayoutRenderedMenuInterface`) and adds
`render(DbMenuNode $menu, array $variables, array $params): string`.
`SelfRenderMenuTrait` implements it by rendering `getLayout()` with
`variables`, `params`, `menu` and `viewInstance`.
