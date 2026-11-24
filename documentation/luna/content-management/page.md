---
layout: doc
description: Pages in Luna CMF, their fields, and how to extend or override them.
---

# Page

Pages are standalone content built with the page builder, such as landing pages
or campaign pages. Unlike articles, a page's layout is stored as JSON, not as
HTML text.

## Fields

The `Page` entity (`Lyrasoft\Luna\Entity\Page`) stores these fields:

- `id`, `title`, `alias`: identity and URL slug.
- `categoryId`: the owning category.
- `extends`: the base template the page inherits from.
- `image`: the cover image.
- `content`: the page-builder layout, stored as JSON.
- `css`: custom CSS for the page.
- `meta`: SEO meta data.
- `state`: the publish state.
- `ordering`: the sort order.
- `language`: the language code. `*` means all languages.
- `params`: JSON settings.

## Page Templates

A `PageTemplate` (`Lyrasoft\Luna\Entity\PageTemplate`) stores a reusable page
layout with `title`, `type`, `description`, `image`, `content`, and `params`.

Starter templates are listed under `templates` in `etc/pages.config.php`.
Each entry is a closure that returns an array. The closure can take
services as arguments, such as `AssetService`:

```php
// etc/pages.config.php (your copy)
'templates' => [
    function (AssetService $asset) {
        return [
            'title' => 'Landing',
            'type' => 'page',
            'description' => 'Full-width landing page',
            'image' => $asset->handleUri(
                '@luna/images/admin/page/templates/tmpl-a.jpg'
            ),
            'file' => LunaPackage::path('resources/pages/tmpl-a.json'),
        ];
    },
],
```

The keys are:

- `title`: the name shown in the template picker.
- `type`: where the template can be used. The editor requests templates
  by type, and `PageController::getTemplates()` returns only matches.
- `description`: a short text in the picker.
- `image`: the preview image.
- `file`: a JSON file with the layout. Used when `content` is not set.
- `content`: the layout content, used as-is when set. It takes priority
  over `file`.

Templates from the database have a `can_delete` flag set to `true`.
Templates from `pages.templates` do not have this flag, so they cannot be
deleted from the admin list.

The editor sends a `type` request parameter. Separate several types with
commas, and `PageController::getTemplates()` returns the templates whose
`type` matches one of them. For example, `type=page,section` returns
templates with type `page` or `section`.

## Addons

A page's `content` is a list of addons. Each addon has a type and renders
with its own template. Luna registers five addon types under `addons` in
`etc/pages.config.php`:

- `text`: a text block, `TextAddon`.
- `image`: an image, `ImageAddon`.
- `button`: a button, `ButtonAddon`.
- `feature`: a feature block, `FeatureAddon`.
- `emptyspace`: vertical spacing, `EmptyspaceAddon`.

Each addon class extends `Lyrasoft\Luna\PageBuilder\AbstractAddon`. It
defines three static methods and one `prepareData()` method.

```php
namespace App\PageBuilder\Addon\Quote;

use Lyrasoft\Luna\PageBuilder\AbstractAddon;
use Windwalker\Data\Collection;

class QuoteAddon extends AbstractAddon
{
    public static function getType(): string
    {
        return 'quote';
    }

    public static function getIcon(): string
    {
        return 'fa fa-quote-left';
    }

    protected function prepareData(Collection $data): void
    {
        // Keys set here are passed to the template as variables.
        $data->set('author', $data->get('author') ?? '');
    }
}
```

The template goes in `views/quote.blade.php` next to the class. It uses
the keys from `$data`:

```blade
<blockquote>
    {{ $text }}
    <footer>{{ $author }}</footer>
</blockquote>
```

To register the addon, copy the config and add the type to `addons`.
Keep the built-in entries in the list:

```shell
php windwalker pkg:install lyrasoft/luna --tag config
```

```php
// config/pages.config.php (your copy)
'addons' => [
    'text' => TextAddon::class,
    'image' => ImageAddon::class,
    'button' => ButtonAddon::class,
    'feature' => FeatureAddon::class,
    'emptyspace' => EmptyspaceAddon::class,
    'quote' => QuoteAddon::class,
],
```

::: tip
Use `prepareData()` to set defaults or to build values the template needs.
Keep rendering logic in the template.
:::

### Labels and Icons

`getName()` and `getDescription()` take a `LanguageInterface`, so the
label can be translated. If the class does not set `$name` or
`$description`, Luna falls back to `luna.addon.<type>.name` and
`luna.addon.<type>.desc`. `getIcon()` is abstract and static, and returns
the icon class, such as `fa fa-font` for `TextAddon`.

```php
use Windwalker\Language\LanguageInterface;

public static function getName(LanguageInterface $lang): string
{
    return $lang->trans('app.addon.quote.name');
}

public static function getDescription(LanguageInterface $lang): string
{
    return 'A quote with an author.';
}
```

### Editor Component

An addon can replace the default editor in the admin page builder by
implementing `AdminVueComponentInterface`. The interface has three
methods:

- `getVueComponentName(): string`: the name of the Vue component.
- `loadVueComponent(AppContext $app): ?string`: the URL of the component
  module, or `null` to keep the default editor.
- `getVueComponentTemplate(CompositeRenderer $renderer, array $data): string`:
  the template that mounts the component.

All built-in addons (`text`, `image`, `button`, `feature`, `emptyspace`)
return `null` from `loadVueComponent()`.

```php
use Lyrasoft\Luna\PageBuilder\AdminVueComponentInterface;
use Windwalker\Core\Application\AppContext;

class QuoteAddon extends AbstractAddon implements
    AdminVueComponentInterface
{
    public static function getVueComponentName(): string
    {
        return 'quote-editor';
    }

    public static function loadVueComponent(AppContext $app): ?string
    {
        // Return the URL of your compiled Vue component module.
        return null;
    }

    // getVueComponentTemplate() renders the mount point for the editor.
}
```

### Styles and Element Attributes

An addon that outputs styles or classes implements `HasOwnStyleInterface`.
The page renderer calls both methods, which receive the addon's options:

- `prepareCSS(Collection $options, StyleContainer $styles)`: add CSS
  rules for the addon through `$styles`.
- `prepareElement(Collection $options, array &$classes, array &$attrs)`:
  add classes and HTML attributes to the wrapper element.

```php
use Lyrasoft\Luna\PageBuilder\AbstractAddon;
use Lyrasoft\Luna\PageBuilder\HasOwnStyleInterface;
use Lyrasoft\Luna\PageBuilder\Renderer\Style\StyleContainer;
use Windwalker\Data\Collection;

class QuoteAddon extends AbstractAddon implements HasOwnStyleInterface
{
    public function prepareCSS(
        Collection $options,
        StyleContainer $styles
    ): void {
        // Add CSS rules for this addon through $styles.
    }

    public function prepareElement(
        Collection $options,
        array &$classes,
        array &$attrs
    ): void {
        $classes[] = 'quote-addon';
    }
}
```

The built-in `TextAddon` uses both methods. The other built-in addons
leave `prepareElement()` empty.

## Overriding Addon Templates

Luna looks for an addon template in four places, in this order:

1. `views/addons/<type>/<type>.blade.php` in your app.
2. `views/` of the addon class.
3. `Module/Front/Page/views/` in the framework.
4. `views/` of the Luna package.

To change how the `text` addon renders, create this file in your app:

```text
views/addons/text/text.blade.php
```

The first match wins, so the file in your app replaces the built-in one
without editing the package.

## Template Path Lookup

When a visitor opens a page, `PageView` finds its layout by the page path.
The path comes from the `path` input or the matched route. For a path such
as `campaign/spring`, the lookup order is:

1. `views/front/page/campaign/spring.blade.php` in your app.
2. `Module/Front/Page/views/campaign/spring.blade.php` in the framework.
3. `views/campaign/spring.blade.php` beside the `PageView` class.

Put a custom layout at step 1 to override a page without editing Luna.


## URL Prefix

The front page route is defined in `routes/front/page.route.php`:

```php
$router->group('page')
    ->register(
        function (RouteCreator $router) {
            $router->any('page', '/page/{path:.+}')
                ->view(PageView::class);
        }
    );
```

So a page with the path `campaign/spring` is served at `/page/campaign/spring`.
The route name is `page`. Menus and `$nav->to('page', ...)` build their URLs
from that name, so they follow any change to the path.

To remove the `/page` prefix, copy the route file to your app with
`pkg:install` and edit the copy in `routes/packages/`:

```shell
php windwalker pkg:install lyrasoft/luna --tag routes
```

```php
// routes/packages/front/page.route.php (your copy)
$router->group('page')
    ->register(
        function (RouteCreator $router) {
            $router->any('page', '/{path:.+}')
                ->view(PageView::class);
        }
    );
```

::: warning
`/{path:.+}` matches every URL. Put it after your other front routes, or
those routes will never run.
:::

## Overriding with pkg:install

The page module installs its admin, front, and model parts. Each part
has its own tag, so you can copy one part and leave the rest alone:

```shell
php windwalker pkg:install lyrasoft/luna --tag page_admin
php windwalker pkg:install lyrasoft/luna --tag page_front
php windwalker pkg:install lyrasoft/luna --tag page_model
```

To change the addon list or templates, copy the config first:

```shell
php windwalker pkg:install lyrasoft/luna --tag config
```
