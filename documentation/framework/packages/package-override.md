---
layout: doc
title: Package Override
description: Override a Windwalker package's MVC source, view paths, layouts, DI classes, entities and language strings from your project without editing vendor code.
---

# Package Override

You can customize a package in two areas: its MVC source and its
language strings. Your changes stay in your project, so they are kept
when you update the package in `vendor/`.

## MVC Override

### Copying the Source

The recommended method is to copy the package source with
`pkg:install`, then change the route so it points to the copied class.
Every request that uses the route then runs your copy:

```php
// Your copy of the route file
use App\Module\Front\Article\ArticleListView;

$router->get('article_category', '/articles[/{path:.+}]')
    ->view(ArticleListView::class);
```

Because the copy lives in your project, a package update does not
overwrite your changes. The methods below are for smaller changes.

### Adding a View Path

Use these methods when you replace a package's view model class but
still want the package's layout templates. Add the package's `views/`
folder to the view path, so the templates are found without copying
them.

```php
namespace App\Module\Front\Article;

use Lyrasoft\Luna\Module\Front\Article\ArticleListView as BaseView;

class ArticleListView extends BaseView
{
    // Your overrides of the view model here.
}
```

Your view class calls `addParentViewPath()` to add the `views/` folder
of the package's view model:

```php
use Windwalker\Core\View\View;
use Windwalker\Utilities\Iterator\PriorityQueue;

class ArticleListHtmlView extends View
{
    public function prepare(): void
    {
        // Reads the views/ folder of the package's view model.
        $this->addParentViewPath();
    }
}
```

Use `addViewPath()` when your view model does not extend a package
class. Pass the class name or an object, and it reads the `views/`
folder beside that class file.

Both methods take an optional priority and namespace:

```php
use Windwalker\Utilities\Iterator\PriorityQueue;

$this->addViewPath(
    ArticleListView::class,
    PriorityQueue::HIGH,
    'main',
);
```

### Overriding Layouts

Use `layoutPaths()` to add folders that are searched for layout files
before the defaults:

```php
$this->layoutPaths(
    __DIR__ . '/layouts/article',
);
```

Each path is a folder that contains layout files.

### Overriding Classes with DI Aliases

Add an `aliases` entry to `etc/di.php` to replace a class that the
container creates. The alias maps the package class to your class:

```php
// etc/di.php
return [
    'aliases' => [
        \Lyrasoft\Luna\Services\ArticleService::class
            => \App\Services\ArticleService::class,
    ],
];
```

::: warning
Aliases apply only to objects that the container creates. Objects
created with `new` still use the original class. Use `$container->get()`,
`app->retrieve()`, or constructor injection to get the replacement.
:::

### Overriding Entities with class_alias

Use PHP's `class_alias()` to make the package class name resolve to your
copy of the entity. Put the call in `src/bootstrap.php`:

```php
// src/bootstrap.php
class_alias(
    \App\Entity\Article::class,
    \Lyrasoft\Luna\Entity\Article::class,
);
```

::: info
Copy the entity into your project with `pkg:install` first, so that
`App\Entity\Article` exists.
:::

## Language Override

Packages ship translation strings in `resources/languages/`, organized
by locale. Copy a language file into your project and load it to
override the package's text.

### Loading Package Language Files

`LangService` reads a package's language files from its `vendor/`
folder. Load one file by name with `loadFileFromVendor()`:

```php
use Windwalker\Core\Language\LangService;

$lang = $container->get(LangService::class);

$lang->loadFileFromVendor('lyrasoft/luna', 'article', 'ini');
```

The call above loads `resources/languages/{locale}/article.ini` from
`lyrasoft/luna`. The fallback locale is loaded too.

To load every language file of a package, use `loadAllFromVendor()`:

```php
$lang->loadAllFromVendor('lyrasoft/luna', 'ini');
```

### Overriding Strings

Copy the language file into your project with `pkg:install`, or create
it yourself. Then load it with `loadFile()`:

```php
$lang->loadFile('article', 'ini');
```

### Loading from a Custom Path

Use `loadFileFromPath()` or `loadAllFromPath()` when your language files
are in a folder outside the default language paths:

```php
$lang->loadFileFromPath(
    '@root/resources/languages',
    'article',
    'ini',
    'en-US',
);
```

## Next Steps

- [Package Installation](./package-installation): copy the resources
  you want to override.
