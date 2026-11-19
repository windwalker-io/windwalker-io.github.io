---
layout: doc
description: How full-page MVC views bind to routes and combine a ViewModel, Edge templates, and assets kept together in one folder.
---

# Views

A Windwalker view is a full-page MVC view bound to a route. It renders
a layout and receives its data from a ViewModel. For a layout or widget
rendered inside another page, use the [Renderer](./renderer) instead.

## Structure

A page view is made of three parts:

- **ViewModel**: a class that prepares the data for the page.
- **Templates**: Edge files that render the page. See
  [Edge Templates](./edge-templates).
- **Assets**: TypeScript and SCSS files, placed in an `assets`
  folder beside the templates. See
  [Asset Management](./asset-management).

Keep these files in the same folder so the view stays self-contained.

### MVC Directory Layout

A view keeps its templates in a lowercase `views` folder, and its
assets in a lowercase `assets` folder, both beside the view class:

```text
src/
  Module/
    Blog/
      Views/
        Post/
          PostListView.php
          views/
            post-list.blade.php
          assets/
            post-list.ts
            post-common.scss
```

Windwalker reads templates from the `views` folder next to the view
class. A copy under the application's `@views/` path overrides them.
Keep each view's files together.

## ViewModel

A ViewModel is a plain PHP class that prepares the data for one page.
The `#[ViewModel]` attribute on the class declares the template and
assets. A method marked with `#[ViewPrepare]` returns the data passed
to the templates.

Use it when a route renders a full page. The minimal form needs only
the class and one prepare method:

```php
use Windwalker\Core\Attributes\ViewModel;
use Windwalker\Core\Attributes\ViewPrepare;

#[ViewModel(layout: 'post-list')]
class PostListViewModel
{
    #[ViewPrepare]
    public function prepare(): array
    {
        return [
            'title' => 'Posts',
        ];
    }
}
```

The complete example below adds constructor injection, an input
parameter, metadata, and assets:

```php
namespace App\View\Post;

use Windwalker\Core\Attributes\Request\Input;
use Windwalker\Core\Attributes\ViewMetadata;
use Windwalker\Core\Attributes\ViewModel;
use Windwalker\Core\Attributes\ViewPrepare;
use Windwalker\Core\Html\HtmlFrame;
use App\Service\PostService;

#[ViewModel(
    layout: 'post-list',
    css: ['post-list.scss'],
    js: ['post-list.ts'],
)]
class PostListViewModel
{
    public function __construct(
        protected PostService $postService,
    ) {
    }

    #[ViewPrepare]
    public function prepare(
        #[Input('page')] int $page = 1,
    ): array {
        return [
            'title' => 'Posts',
            'page' => $page,
            'posts' => $this->postService->getPosts($page),
        ];
    }

    #[ViewMetadata]
    public function prepareMetadata(HtmlFrame $htmlFrame): void
    {
        $htmlFrame->setTitle('Posts');
    }
}
```

The template for the `post-list` layout renders the `posts` and `page`
values. See [Edge Templates](./edge-templates).

::: info
When the prepare method returns an array, the ViewModel is also
available in the template as `$vm`.
:::

### How a ViewModel Is Resolved

A route calls the `DefaultController`, which asks the container for the
view class and renders it:

```php
$app->make($view)->render();
```

The container builds the ViewModel and its constructor dependencies.
The `#[ViewModel]` attribute then wraps the ViewModel in a `View`
object, which handles preparation, metadata, and rendering. The
`View` is the object returned to the controller, not the ViewModel.

Keep the constructor limited to services. Do not read request input in
the constructor; read it in the `#[ViewPrepare]` method instead.

### Injecting Prepare Parameters

The `#[ViewPrepare]` method receives its parameters from the container.
Each parameter is resolved by its type, or by its name when it has no
class type.

The following types are available in every prepare method:

- `AppContext`: the application context.
- `View`: the view object that is rendering the page.
- Any service registered in the container.

Use `#[Input]` on a parameter to read a value from the request:

```php
#[ViewPrepare]
public function prepare(
    #[Input('keyword')] ?string $keyword = null,
): array {
    return ['keyword' => $keyword];
}
```

The `name` argument selects the request key. Without it, the parameter
name is used. The `default` argument sets the value when the request
has none.

::: info
A non-nullable parameter without a default throws an error with code
400 when the request has no value for it. Declare a default or make the
type nullable for optional input.
:::

### Calling Metadata Methods

A method marked with `#[ViewMetadata]` runs after the prepare method.
It runs only for a page view. Views rendered as children of another
view do not run metadata methods.

The metadata parameters are resolved the same way as prepare parameters.
In addition, the `View` object is passed, and each value set with
`$view->set()` is available by its name:

```php
#[ViewMetadata]
public function prepareMetadata(
    HtmlFrame $htmlFrame,
    View $view,
    string $title,
): void {
    $htmlFrame->setTitle($title);
}
```

Set `$title` before the metadata runs, for example with
`$view->set('title', 'Posts')` in the prepare method. The value
returned from the prepare method is passed to the templates only.

`View` implements `ArrayAccess`, so `$view['name'] = ...` is the same
as `$view->set('name', ...)`. This is handy for passing an entity
loaded by the ORM to a metadata method:

```php
#[ViewPrepare]
public function prepare(
    AppContext $app,
    View $view,
    #[Input('id')] int $id,
): array {
    $post = $this->postRepository->getItem($id);

    $view['item'] = $post;

    return ['post' => $post];
}

#[ViewMetadata]
public function prepareMetadata(
    HtmlFrame $htmlFrame,
    Post $item,
): void {
    $htmlFrame->setTitle($item->getTitle());
}
```

The metadata method receives `$item` by name, because the parameter
name matches the key used in `$view['item']`.



See [HtmlFrame](./html-frame) for the methods available on the frame.

### Choosing the Layout

The `layout` option selects the template. When it is a string, that
template is always rendered. When it is an array, Windwalker picks the
template by the `layout` input. The `default` key is used when the
input is missing:

```php
#[ViewModel(layout: [
    'default' => 'post-list',
    'grid' => 'post-grid',
])]
```

The input name is set by the `layout_var_name` option, which defaults
to `layout`. Requesting `?layout=grid` renders `post-grid`.

### Setting the Layout in Prepare

When the template depends on the data, choose the layout inside the
`#[ViewPrepare]` method with `$view->setLayout()`. Inject the `View`
object and call the method before you return:

```php
use Windwalker\Core\View\View;

#[ViewPrepare]
public function prepare(
    View $view,
    #[Input('id')] ?int $id = null,
): array {
    $post = $id === null
        ? null
        : $this->postRepository->getItem($id);

    $layout = match (true) {
        $id === null => 'post-list',
        $post === null => 'post-not-found',
        default => 'post-detail',
    };

    $view->setLayout($layout);

    if ($post !== null) {
        $view['item'] = $post;
    }

    return match ($layout) {
        'post-list' => [
            'posts' => $this->postService->getPosts(),
        ],
        'post-detail' => [
            'post' => $post,
        ],
        default => [],
    };
}
```

The layout you set here replaces the `layout` option and the layout
map, because the template is chosen after the prepare method runs.
Assets keyed by layout name follow the same choice. For example, a
`css` entry under `post-detail` loads only when that layout is set:

```php
#[ViewModel(
    layout: 'post-list',
    css: [
        'post-detail' => ['post-detail.scss'],
    ],
)]
```

::: warning
Do not pass request input straight into `setLayout()`, for example
`$view->setLayout($input->getString('layout'))`. Any template name
could then be rendered. Map each allowed value to a layout with a
`match` expression, as above, so only the layouts you list can render.
:::

::: tip
Use `$view->setLayout()` for branching that depends on data. Use the
`layout` map for branching on the request input alone.
:::

### Using Assets

The `css` and `js` options attach assets to the view. Paths resolve
under the view's folder. A numeric key applies the asset to every
layout. A layout name as the key applies it only to that layout:

```php
#[ViewModel(
    layout: [
        'default' => 'post-list',
        'grid' => 'post-grid',
    ],
    css: [
        0 => 'post-common.scss',
        'grid' => 'post-grid.scss',
    ],
)]
```

Assets are attached only for the layout being rendered. See
[Asset Management](./asset-management) for the asset pipeline.

### Body Classes

Windwalker adds classes to `<body>` for the main view, so you can find
the current page and target it in CSS. The classes are:

- `module-*`: the module name.
- `view-*`: the view name, without the `View` suffix.
- `layout-*`: the layout name.
- `stage-*`: namespace levels below the module, when present.

```blade
<body class="module-blog view-post-list layout-grid">
```

Add your own classes with `addBodyClass()`. See
[HtmlFrame](./html-frame#body-and-html-classes).

### Keeping Assets Beside the View

Put the TypeScript file in the view's `assets` folder, next to the
PHP view class and its templates. This keeps the PHP, Edge, and TS code
for one page in one place.

```php
#[ViewModel(
    layout: 'post-list',
    js: ['post-list.ts'],
)]
class PostListView
{
}
```

::: info
The `js` option loads the TypeScript file. Windwalker does not load a
file only because it has the same name as the view. List every script
in `js`.
:::

## Related

- [Renderer](./renderer): render layouts outside a route.
- [Edge Templates](./edge-templates): syntax and layout inheritance.
- [View Components](./view-components): reusable template components.
