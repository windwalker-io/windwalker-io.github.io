---
layout: doc
description: Pages in Luna CMF, their fields, PageBuilder pages, and static pages.
---

# Page

A page is standalone content for landing pages, campaigns, and similar
pages. Luna serves a page in one of two ways:

- PageBuilder: pages edited in the admin. The layout is stored as JSON in
  `content`, made of addons and templates.
- Static page: pages whose layout is a Blade file in your app or in the
  framework, served by path with no database row.

## Fields

The `Page` entity (`Lyrasoft\Luna\Entity\Page`) stores these fields:

- `id`, `title`, `alias`: identity and URL slug.
- `categoryId`: the owning category.
- `extends`: the Blade layout the page body is placed into. See
  [Page Extends](#page-extends).
- `image`: the cover image.
- `content`: the page-builder layout, stored as JSON.
- `css`: custom CSS for the page.
- `meta`: SEO meta data.
- `state`: the publish state.
- `ordering`: the sort order.
- `language`: the language code. `*` means all languages.
- `params`: JSON settings.

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

To change the front route, such as removing the `/page` prefix, copy the
routes with `--tag routes`. See [URL Prefix](#url-prefix).

## PageBuilder

The PageBuilder edits a page's `content` as a list of rows, columns, and
addons. The admin editor saves the layout as JSON, and the front end renders
it through `PageBuilder::renderFrontend()`. Use this section when you add
addons, change how they render, or ship starter templates.

### Page Extends

Every page has an `extends` column. It names the Blade layout that
the page body is placed into. The front page view renders:

```blade
{{-- Module/Front/Page/views/page.blade.php --}}
@extends($page->extends)

@section('content')
    {!! $builder->renderFrontend($page) !!}
@endsection
```

The default value is `global.body`, set in the admin edit form.
Luna's layouts are in the front module and admin module views.
To add a choice to the admin dropdown, extend `page_extends` in
`etc/pages.config.php`. The key is the layout name, and the value is
a language key:

```php
// etc/pages.config.php (your copy)
'page_extends' => [
    'global.body' => 'luna.page.extends.global.body',
    'landing.body' => 'app.page.extends.landing',
],
```

A numeric key means the value is the layout name itself:

```php
'page_extends' => [
    0 => 'landing.body',
],
```

Values are translated with `trans()`, so `app.page.extends.landing`
must exist in your language file. Layouts from the database
(distinct `extends` values already saved) are merged into the list.

::: info
`page_extends` only fills the dropdown. Any layout name stored in the
database is still rendered, so the layout file must exist.
:::

### Page Templates

A `PageTemplate` (`Lyrasoft\Luna\Entity\PageTemplate`) stores a reusable
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

The editor sends a `type` request parameter. Separate several types with
commas, and `PageController::getTemplates()` returns the templates whose
`type` matches one of them. For example, `type=page,row` returns
templates with type `page` or `row`.

Templates saved by users are stored in the `PageTemplate` table with
`can_delete = true`. Templates from `pages.templates` do not have this
flag, so the admin cannot delete them.

### Addons

A page's `content` is a list of addons. Each addon has a type and renders
with its own template. Luna registers five addon types under `addons` in
`etc/pages.config.php`:

- `text`: a text block, `TextAddon`.
- `image`: an image, `ImageAddon`.
- `button`: a button, `ButtonAddon`.
- `feature`: a feature block, `FeatureAddon`.
- `emptyspace`: vertical spacing, `EmptyspaceAddon`.

Each addon class extends `Lyrasoft\Luna\PageBuilder\AbstractAddon`. It
defines two static methods and one `prepareData()` method.

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

#### Labels and Icons

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

#### Styles and Element Attributes

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

#### Overriding Addon Templates

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

#### Editor Component

An addon can replace the default editor in the admin page builder by
implementing `AdminVueComponentInterface`. The interface has three
methods:

- `getVueComponentName(): string`: the name of the Vue component.
- `loadVueComponent(AppContext $app): ?string`: the URL of the component
  module, or `null` to keep the default editor.
- `getVueComponentTemplate(CompositeRenderer $renderer, array $data): string`:
  the template that mounts the component.

`TextAddon`, `ButtonAddon`, `ImageAddon`, `EmptyspaceAddon`, and
`FeatureAddon` all return `null` from `loadVueComponent()`, so they use
Luna's built-in editor.

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

The module default-exports a function that receives the Vue `app` and
returns the component. The component receives `modelValue` and uses
`defineModel`, the same as Luna's `addon-text.vue`:

```vue
<script lang="ts" setup>
import { type AddonProps, useAddonDefaults } from '~luna/composables';

defineProps<AddonProps>();

const options = defineModel<Record<string, any>>({ required: true });

useAddonDefaults(options, {
  content: 'Quote text',
});
</script>

<template>
  <blockquote>{{ options.content }}</blockquote>
</template>
```

::: info
The Vue component URL in the example is a placeholder. Use the path of
the module your own build emits.
:::

## Static Page

A static page is a Blade layout file that Luna serves by path, without a
database row. Use it for pages whose markup is fixed in code, such as a
theme landing page. For pages edited in the admin, see
[PageBuilder](#pagebuilder).

### Template Path Lookup

When a visitor opens a page, `PageView` finds its layout by the page path.
The path comes from the `path` input or the matched route. For a path such
as `campaign/spring`, the lookup order is:

1. `views/front/page/campaign/spring.blade.php` in your app.
2. `Module/Front/Page/views/campaign/spring.blade.php` in the framework.
3. `views/campaign/spring.blade.php` beside the `PageView` class.

The first file found is rendered. Put a custom layout at step 1 to override
a page without editing Luna:

```blade
{{-- views/front/page/campaign/spring.blade.php --}}
@extends('global.body')

@section('content')
    <h1>Spring Campaign</h1>
@endsection
```

If none of the files exist, `PageView` falls back to the database page
with the same alias.

### URL Prefix

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

So a page with the path `campaign/spring` is served at
`/page/campaign/spring`. The route name is `page`. Menus and
`$nav->to('page', ...)` build their URLs from that name, so they follow
any change to the path.

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

### Per-Page Routes

The default route `/page/{path:.+}` serves every page. To serve one page
at a different URL, add a route and set the `path` extra. `PageView`
reads that extra value to find the layout file:

```php
// routes/front/page.route.php (your copy)
$router->get('about-us', '/about-us')
    ->view(PageView::class)
    ->extra('path', 'about');
```

Use `extra()`, not `var()`. `var()` sets a route variable, and
`PageView` reads the extra value from `getExtraValue('path')`.

### Protecting Pages

`PageView` refuses to render any layout that matches an entry in
`pages.protects`. Protection only applies when the app is not in debug
mode. The default config is:

```php
// etc/pages.config.php
'protects' => [
    '/page/theme/**/*',
],
```

Two rules are used:

- A leading `/` is a route. It matches exactly, or as a glob when it
  contains `*`. A match throws `RouteNotFoundException` (404).
- Any other value is a layout prefix, for example `theme/`. It is
  compared with the layout name, not the URL.

```php
// etc/pages.config.php (your copy)
'protects' => [
    '/page/theme/**/*',
    '/page/internal',
    'admin/',
],
```

::: warning
Protection checks the request route and the layout name, not the database
row. A static layout is blocked only if it matches a `protects` entry, so
list every internal layout there.
:::
