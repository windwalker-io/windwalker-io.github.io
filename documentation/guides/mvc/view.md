---
layout: doc
---

# Create Views

Next we create views to print the data in the database.

## Create a List View

Run:

```bash
php windwalker g view Front/Article/ArticleListView
```

This creates the `ArticleListView` class.

- If you enter the short name `Front/Article`, it generates `Front\Article\ArticleView`.
- If you enter the full name `Front/Article/ArticleListView`, it generates `Front\Article\ArticleListView`.

Since we want several views in the same module folder, we use the full name here.

We use the ORM query builder to fetch articles:

```php
<?php // src/Module/Front/Article/ArticleListView.php

class ArticleListView
{
    public function __construct(
        // Inject ORM
        protected ORM $orm
    ) {
        //
    }

    #[ViewPrepare]
    public function prepare(AppContext $app, View $view): array
    {
        $items = $this->orm->from(Article::class)
            // Only fetch state = 1
            ->where('state', 1)
            // Limit to 15 items
            ->limit(15)
            // Use an iterator instead of returning everything at once,
            // nothing is fetched until the foreach.
            // Article::class converts each row into an entity.
            ->getIterator(Article::class);

        return compact('items');
    }
}
```

In the Blade template, we print the articles with `foreach`, wrapped in Bootstrap cards.

Declare the type of `$items` at the top of the template so values are read through the entity (`@var $items \App\Entity\Article[]`) rather than untyped array keys.

```php
<?php // src/Module/Front/Article/views/article-list.blade.php
// ...

/**
 * Declare the type of $items in a comment
 * @var $items \App\Entity\Article[]
 */
?>

@extends('global.body')

@section('content')
    <div class="container">
        <div class="row">
            <div class="col-lg-7">

                @foreach ($items as $item)
                    <div class="card mb-4">
                        <div class="card-body">
                            <h2 class="card-title">
                                {{ $item->title }}
                            </h2>

                            <div class="mb-2 small text-muted">
                                {{-- Convert the DB UTC time to the local timezone --}}
                                {{ $chronos->toLocalFormat($item->created, 'Y/m/d H:i:s') }}
                            </div>

                            <div>
                                {{-- Truncate the content as a summary --}}
                                {!! \Windwalker\str($item->content)->stripHtmlTags()->truncate(100, '...') !!}
                            </div>
                        </div>
                    </div>
                @endforeach

            </div>
        </div>
    </div>
@stop
```

Next, create the route:

```bash
php windwalker g route front/article
```

Edit the generated file and add `article_list`:

```php
<?php // routes/front/article.route.php

use App\Module\Front\Article\ArticleListView;
// ...

$router->group('article')
    ->register(function (RouteCreator $router) {

        // Add This
        $router->any('article_list', '/article/list')
            ->view(ArticleListView::class);
    });
```

Now open `http://{site}/article/list` to see the article list. Each article is displayed as a Bootstrap card.

## ORM and Query Builder

The Windwalker ORM follows the DataMapper pattern, closer to Symfony Doctrine than to the ActiveRecord pattern of Laravel or Ruby on Rails. Entities hold no logic or database operations, an entity is just an anemic object.

All operations go through the ORM / EntityMapper. See the [ORM](/documentation/components/orm/) and [Query Builder](/documentation/components/query/) documentation for details.

## Pagination

Pagination needs three numbers:

| Number                 | Purpose                                      | Description                                                                                                                                                                              |
|------------------------|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **page** or **offset** | The current page or the current start offset | `page` is the current page number, usually taken from the URL. <br/> `(page - 1) x limit` is the offset.                                                                                 |
| **limit**              | How many items per page                      | `limit` is set directly in code, and can also be controlled from the URL if needed.                                                                                                      |
| **total**              | The maximum count of the current query       | `total` is used to calculate the page count. <br/> It is optional, without it there is always a next page and the total page count is unknown. <br/> It is usually counted by the DB. |

Modify the code like this:

```php
use Windwalker\Core\Pagination\PaginationFactory;

use function Windwalker\filter;

// ...

class ArticleListView
{
    public function __construct(
        protected ORM $orm,
        protected PaginationFactory $paginationFactory
    ) {
        //
    }

    #[ViewPrepare]
    public function prepare(
        AppContext $app,
        View $view,
    ): array {
        $page = (int) $app->input('page');
        $limit = 5;

        // Page must be at least 1
        $page = filter($page, 'int|range(min=1)');

        $query = $this->orm->from(Article::class)
            // Only fetch state = 1
            ->where('state', 1)
            // Calculate the offset
            ->offset(($page - 1) * $limit)
            ->limit($limit);

        // Create the pagination object
        $pagination = $this->paginationFactory->create($page, $limit)
            // Calculate total with ORM::countWith()
            ->total(fn () => $this->orm->countWith($query));

        // Use an iterator instead of returning everything at once
        $items = $query->getIterator(Article::class);

        return compact('items', 'pagination');
    }
}
```

Then print the pagination below the `foreach` in the template:

```diff
// src/Module/Front/Article/views/article-list.blade.php

      ...

        </div>
      @endforeach

+      <div class="my-4">
+          <x-pagination :pagination="$pagination" />
+      </div>
```

Result: the list shows 5 articles per page, with page links below. Use `?page=2` to open the second page.

For the syntax supported by `filter()`, see the constants and examples in
[FilterService](https://github.com/windwalker-io/core/blob/master/src/Core/Service/FilterService.php#L14-L42).

### Changing How Input Is Read

We currently read the parameter with `$app->input('page')` and convert and limit it with `filter()`.

Let's inject the input more directly by declaring a `page` parameter in `prepare()`:

```diff
+ use Windwalker\Core\Attributes\Request\Input;

// ...

    #[ViewPrepare]
    public function prepare(
        AppContext $app,
        View $view,
+       #[Input] ?string $page = null,
    ): array {
-       $page = (int) $app->input('page');

        // Page must be at least 1
        $page = filter($page, 'int|range(min=1)');
```

The `#[Input]` attribute injects a request input as a variable. If the parameter name differs from the input name, specify it manually: `#[Input('param_name')]`.

::: warning
Values from the URL are always strings, even if they look like numbers. Use a `string` type (nullable if the value may be missing), or apply a filter to convert it.
:::

We can also move the filter into an attribute. Since the filter converts the value to int, the type can be `?int`:

```diff
use Windwalker\Core\Attributes\Request\Input;
+ use Windwalker\Core\Attributes\Filter;

// ...

    #[ViewPrepare]
    public function prepare(
        AppContext $app,
        View $view,
-       #[Input]
+       #[Input, Filter('int|range(min: 1)')]
-       ?string $page = null,
+       ?int $page = null,
    ): array {
        $limit = 5;

-        // Page must be at least 1
-        $page = filter($page, 'int|range(min=1)');
```

Now suppose we want to fail with an error when `page` is less than 1. Use the `#[Assert]` attribute. Move the `range` rule from the filter into `Assert` and keep only `int` in the filter (the order of the two does not matter).

The default of `page` can also be `1` instead of `null`:

```diff
use Windwalker\Core\Attributes\Request\Input;
use Windwalker\Core\Attributes\Filter;
+ use Windwalker\Core\Attributes\Assert;

// ...

    #[ViewPrepare]
    public function prepare(
        AppContext $app,
        View $view,
-       #[Input, Filter('int|range(min: 1)')]
-       ?int $page = null,
+       #[Input, Filter('int'), Assert('range(min: 1)')]
+       int $page = 1,
    ): array {

        // ...
```

Now try `page=0`, and you get a `400 Bad Request` error page.

## Create an Item View

Run the command the same way:

```bash
php windwalker g view Front/Article/ArticleItemView
```

This creates `ArticleItemView`. Write the code like this:

```php
// src/Module/Front/Article/ArticleItemView.php

// ...

class ArticleItemView
{
    public function __construct(
        protected ORM $orm
    ) {
        //
    }

    #[ViewPrepare]
    public function prepare(AppContext $app, View $view, #[Input] string $id): array
    {
        $item = $this->orm->findOne(Article::class, $id);

        if (!$item) {
            throw new RouteNotFoundException();
        }

        return compact('item');
    }
}
```

Then write the template:

```php
// src/Module/Front/Article/views/article-item.blade.php

/**
 * @var $item \App\Entity\Article
 */
?>

@extends('global.body')

@section('content')
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-8 col-md-10">
                <article class="c-article">
                    <header>
                        <h2>{{ $item->title }}</h2>
                    </header>

                    <div class="my-2 text-muted">
                        {{ $chronos->toLocalFormat($item->created, 'Y/m/d H:i:s') }}
                    </div>

                    <div class="c-article__content">
                        {!! $item->content !!}
                    </div>
                </article>
            </div>
        </div>
    </div>
@stop
```

Add this view to the routes:

```php
// routes/front/article.route.php

$router->group('article')
    ->register(function (RouteCreator $router) {
        $router->any('article_list', '/article/list')
            ->view(ArticleListView::class);

        // Add this
        $router->any('article_item', '/article/{id}')
            ->view(ArticleItemView::class);
    });
```

Finally, go back to `article-list.blade.php` and add a link to `article_item` in each card:

```php
@foreach ($items as $item)
    <div class="card mb-4">
        <div class="card-body">
            ...

            {{-- Add this --}}
            <div class="mt-2">
                <a class="btn btn-primary"
                    href="{{ $nav->to('article_item', ['id' => $item->id]) }}">
                    Read More
                </a>
            </div>
        </div>
    </div>
@endforeach
```

The final result: each card in the list now has a "Read more" link to its article, and the item page shows the title, creation time and full content.

## Add a Back Button

The `Navigator` object has a handy `back()` method to return to the previous page.

Add the following button to the article item page:

```php
@extends('global.body')

@section('content')
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-8 col-md-10">

                {{-- Add here --}}
                <aside class="my-2">
                    <a class="btn btn-sm btn-outline-secondary"
                        href="{{ $nav->back() ?? $nav->to('article_list') }}">
                        Back
                    </a>
                </aside>


                <article class="c-article">
                ...
```

If no history can be found, it falls back to the article list.

::: tip
Most templates have `$nav` injected by default, so you can use it directly.
:::

The item page now has a back button that returns to the previous page.

## Add the Browser Title

Go back to `ArticleListView` and `ArticleItemView` and add the titles respectively:

```php
// src/Module/Front/Article/ArticleListView.php

    // ...
    $view->setTitle('Articles');

    return compact('items', 'pagination');
```

and

```php
// src/Module/Front/Article/ArticleItemView.php

    // ...
    $view->setTitle($item->title);

    return compact('item');
```

The browser tab now shows the title you set.

## Add Other Metadata

To add other metadata, use `HtmlFrame`:

```php
// src/Module/Front/Article/ArticleItemView.php

use function Windwalker\str;

    // ...

    $view->setTitle($item->title);

    $htmlFrame = $view->getHtmlFrame();
    $htmlFrame->addMetadata(
        'description',
        str($item->content)->stripHtmlTags()->truncate(100, '...'),
        true // TRUE overrides the previous metadata
    );
    $htmlFrame->addOpenGraph(
        'og:image',
        $item->image,
        true
    );

    return compact('item');
```

There are also shortcuts:

```php
    // Same as the description metadata
    $htmlFrame->setDescriptionIfNotEmpty(
        (string) str($item->content)->stripHtmlTags()->truncate(100, '...'),
    );

    // Same as og:image
    $htmlFrame->setCoverImages($item->image);
```

See the [HtmlFrame](/documentation/framework/html-frame) documentation for the full metadata API.
