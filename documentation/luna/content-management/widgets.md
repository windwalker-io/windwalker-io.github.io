---
layout: doc
description: Widgets in Luna CMF, their fields, positions, and how to add custom widget types.
---

# Widgets

Widgets are small content blocks placed at named positions on a page, such as
a footer banner or a sidebar box. Each widget has a **type** that decides how
it renders, and a **position** that decides where it appears. Widgets are
managed in the admin panel and rendered on the front end.

## Widget Entity

The `Widget` entity (`Lyrasoft\Luna\Entity\Widget`, table `widgets`) stores:

- `id`, `title`: identity and display name.
- `type`: the widget type key, such as `custom_html`.
- `position`: the position key where the widget renders.
- `content`: the content, used by the built-in HTML type.
- `params`: a JSON array of type-specific settings.
- `state`: the publish state. Only published widgets are loaded.
- `ordering`: the sort order inside a position.
- `language`: the language code. `*` means all languages.
- `note`: an admin-only note. It is stored and never rendered.
- `created`, `createdBy`, `modified`, `modifiedBy`: audit fields.

::: info
`language` defaults to `*` when the widget is saved without a value.
:::

## Types and Positions

Types and positions are registered in the `widget` config module. The
package default is `etc/widget.config.php`:

```php
// vendor/lyrasoft/luna/etc/widget.config.php
return #[
    ConfigModule(
        name: 'widget',
        enabled: true,
        priority: 100,
        belongsTo: LunaPackage::class,
    )
]
static fn() => [
    'types' => [
        'custom_html' => CustomHtmlWidget::class,
    ],
    'positions' => [
        'demo' => 'Demo',
    ],
];
```

- `types`: maps a type key to a class that extends `AbstractWidget`.
  Classes that do not extend `AbstractWidget` are ignored.
- `positions`: maps a position key to a label. Positions that exist only
  in the database are also listed in the admin.

To change these values, copy the file into the host app's
`etc/packages/` directory and edit the copy. The host app already uses
this location, for example `etc/packages/widget.config.php`.

```php
// etc/packages/widget.config.php
return #[
    ConfigModule(
        name: 'widget',
        enabled: true,
        priority: 100,
        belongsTo: LunaPackage::class,
    )
]
static fn() => [
    'types' => [
        'custom_html' => CustomHtmlWidget::class,
        'promo_banner' => \App\Widget\PromoBannerWidget::class,
    ],
    'positions' => [
        'header' => 'Header',
        'sidebar' => 'Sidebar',
    ],
];
```

::: tip
In the admin, the position field accepts new values. Typing a new name
creates a new position, so the `positions` config is optional.
:::

## Displaying Widgets on the Front End

Load the widgets for a position with `WidgetService`, then render each one
with the `<x-widget>` component.

```php
use Lyrasoft\Luna\Widget\WidgetService;

$widgetService = $app->retrieve(WidgetService::class);

$widgets = $widgetService->loadWidgets('sidebar');
```

```blade
@if ($widgetService->hasWidgets('sidebar'))
    <aside class="sidebar">
        @foreach ($widgets as $widget)
            <x-widget :widget="$widget" :data="[]" />
        @endforeach
    </aside>
@endif
```

- `loadWidgets(string $position, string $stage = 'front')` returns published
  widgets in `ordering` order. When locale is enabled, it returns widgets
  whose `language` is `*` or the current language.
- `hasWidgets(...$positions)` returns `true` if any of the positions has
  at least one published widget. Use it to skip empty wrappers.
- `<x-widget>` sets `data-widget-id` on the wrapper, creates a `View` for
  the widget, and renders its layout. Pass extra variables through `:data`.

::: info
`loadWidgets()` results are cached for the request. Calling it again for
the same position does not query the database again.
:::

## Creating a Custom Widget Type

Extend `AbstractWidget` and implement these methods:

- `getTypeIcon()`: a static icon class, such as `fa fa-bullhorn`.
- `getTypeTitle(LangService $lang)`: the type name shown in the admin.
- `getTypeDescription(LangService $lang)`: a short description for the admin.
- `getLayout()`: the layout name that `render()` uses.

Two more methods complete the type:

- `define(Form $form)`: adds fields to the admin edit form. It comes from
  `FieldDefinitionInterface`. For rich text, use
  [TinymceEditorField](/documentation/unicorn/form-fields/field-types/tinymce-editor).
- `prepare(AppContext $app, View $view)`: returns the variables passed to
  the layout. Windwalker calls it because the widget is the view model.
  Without it, rendering throws a `LogicException`.

`CustomHtmlWidget` in `src/Widget/Custom/` is the built-in reference.

```php
namespace App\Widget;

use Lyrasoft\Luna\Widget\AbstractWidget;
use Unicorn\Field\TinymceEditorField;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Language\LangService;
use Windwalker\Core\View\View;
use Windwalker\Form\Form;

class PromoBannerWidget extends AbstractWidget
{
    public static function getTypeIcon(): string
    {
        return 'fa fa-bullhorn';
    }

    public static function getTypeTitle(LangService $lang): string
    {
        return 'Promo Banner';
    }

    public static function getTypeDescription(LangService $lang): string
    {
        return 'A short promotional banner.';
    }

    public function define(Form $form): void
    {
        $form->add('content', TinymceEditorField::class)
            ->label('Content');
    }

    public function prepare(AppContext $app, View $view): mixed
    {
        return [
            'html' => $this->getData()->content,
            'params' => $this->getParam(),
        ];
    }

    public function getLayout(): string
    {
        return 'promo-banner';
    }
}
```

Keys returned by `prepare()` become variables in the layout, so the layout
can use `$html` and `$params` directly.

::: warning
`prepare()` output is rendered as HTML by the layout. Escape or sanitize
any user-supplied text that you do not intend to be raw HTML.
:::

## Building the Admin Form

`define()` receives the admin edit form. Put the type-specific settings in
a `params` group, so `getParam()` returns them as an array. Use
`fieldset()` to split the fields into tabs. The form API is described in
the [Form service](/documentation/framework/services/form).

```php
namespace App\Widget;

use Lyrasoft\Luna\Field\ArticleModalField;
use Lyrasoft\Luna\Widget\AbstractWidget;
use Unicorn\Field\TinymceEditorField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Field\TextareaField;
use Windwalker\Form\Form;

class PromoBannerWidget extends AbstractWidget
{
    // Type methods from the previous example.

    public function define(Form $form): void
    {
        $form->group(
            'params',
            function (Form $form) {
                $form->fieldset(
                    'basic',
                    function (Form $form) {
                        $form->add('heading', TextField::class)
                            ->label('Heading')
                            ->required(true);

                        $form->add('subheading', TextareaField::class)
                            ->label('Subheading');

                        $form->add('link', TextField::class)
                            ->label('Link URL');
                    }
                )
                    ->title('Basic');

                $form->fieldset(
                    'featured',
                    function (Form $form) {
                        $form->add('article_id', ArticleModalField::class)
                            ->label('Featured Article');
                    }
                )
                    ->title('Featured');
            }
        );

        $form->fieldset(
            'text',
            function (Form $form) {
                $form->add('content', TinymceEditorField::class)
                    ->label('Content');
            }
        )
            ->title('Text');
    }
}
```

::: info
The values are stored in the widget's `params` column. `getParam()` returns
them with the field names as keys, such as `heading`.
:::

## Querying the Database in prepare()

Inject the repository through the constructor with `#[Autowire]`. The
widget is created with `app->make()`, so the container resolves it.
Load the rows in `prepare()`, then return them to the layout.

```php
namespace App\Widget;

use Lyrasoft\Luna\Entity\Article;
use Lyrasoft\Luna\Repository\ArticleRepository;
use Lyrasoft\Luna\Widget\AbstractWidget;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\View\View;
use Windwalker\DI\Attributes\Autowire;

class FeaturedArticlesWidget extends AbstractWidget
{
    public function __construct(
        #[Autowire]
        protected ArticleRepository $repository,
    ) {
        //
    }

    public function prepare(AppContext $app, View $view): array
    {
        $ids = (array) ($this->getParam()['article_ids'] ?? []);

        if ($ids === []) {
            return ['items' => []];
        }

        $items = $this->repository->getAvailableListSelector()
            ->addFilter('article.state', 1)
            ->where('article.id', $ids)
            ->getIterator(Article::class);

        return ['items' => $items];
    }

    // getTypeIcon(), getTypeTitle(), getTypeDescription(),
    // and getLayout() are implemented as in the previous example.
}
```

::: warning
Load all rows in one query, as above. Do not call the repository inside a
`foreach` in the layout, because each widget then adds one query per item.
:::

::: info
`getAvailableListSelector()` applies the locale filter, so widgets in
other languages are skipped when locale is enabled.
:::

### Accessing Data

`AbstractWidget` provides these helpers:

```php
$this->getData();          // The Widget entity.
$this->getParam();         // The params array.
$this->getTitle();         // Forwarded to the entity.
$this->getPosition();      // Forwarded to the entity.
```

`AbstractWidget::__call()` forwards any method that the widget does not
define to the entity. The `@method` docblock lists the common ones.

### Registering the Type

Register the class under a type key in your config:

```php
// etc/packages/widget.config.php
'types' => [
    'custom_html' => CustomHtmlWidget::class,
    'promo_banner' => \App\Widget\PromoBannerWidget::class,
],
```

### Writing the Layout

`render()` calls `setLayoutMap($this->getLayout())` and then renders the
layout with the `View`. Windwalker looks for the layout in a `views/`
folder next to the widget class, so the layout is found without extra
configuration.

```text
app/
└── Widget/
    ├── PromoBannerWidget.php
    └── views/
        └── promo-banner.blade.php
```

```blade
{{-- app/Widget/views/promo-banner.blade.php --}}
<div class="promo-banner">
    {!! $html !!}
</div>
```

The built-in `custom-html` layout is in
`vendor/lyrasoft/luna/src/Widget/Custom/views/custom-html.blade.php`.

::: info
The `getLayout()` value is a layout name, not the type key. In this example,
the type key is `promo_banner` and the layout name is `promo-banner`.
:::

::: info
The `params` group in the form is a convention, not a requirement. The
built-in `CustomHtmlWidget` does not use a `params` group.
:::

## Overriding in a Host App

To change the config, copy the package file into `etc/packages/` as shown
in the Types and Positions section. Do not edit files under `vendor/`,
because `composer update` overwrites them.

::: warning
Changing a type key after widgets are saved breaks those widgets. Their
`type` column still holds the old key, so `createWidgetInstance()` returns
`null` for them.
:::
