---
layout: doc
title: Pagination
description: Calculate the offset and limit for a page of database rows from the page number, rows per page, and total row count.
---

# Pagination

Listing pages of records needs four values: the current page number, the
number of rows per page, the total number of rows, and the offset of the
first row on the page. The offset is calculated from the first two values:

```text
offset = (current - 1) * limit
```

With plain SQL, a list of 20 published articles on page 3 needs two
queries. The first one reads the rows, and the second one counts all matching
rows so the page links can be built:

```sql
-- Rows of page 3, 20 per page
SELECT *
FROM articles
WHERE state = 1
ORDER BY id DESC
LIMIT 20 OFFSET 40;

-- Total rows, to calculate the number of pages
SELECT COUNT(*) FROM articles WHERE state = 1;
```

Windwalker provides a pagination service in `Windwalker\Core\Pagination`.
It keeps the page math, builds the links for each page, and exposes the
result to your views or APIs. It works with any query that can take a
`LIMIT` and an `OFFSET`, including the Query Builder of the Database
service.

## Creating a Pagination

Inject `PaginationFactory` and call `create()`. The arguments are the
current page, the number of items per page, and the number of neighbouring
page links on each side of the current page (default `4`):

```php
use Windwalker\Core\Pagination\PaginationFactory;

class ArticleController
{
    public function __construct(
        protected PaginationFactory $paginationFactory,
    ) {
    }

    public function index(int $page = 1): void
    {
        // Current page 3, 20 items per page, 2 neighbours
        $pagination = $this->paginationFactory->create(
            current: $page,
            limit: 20,
            neighbours: 2,
        );

        // Total rows, resolved only when the links are needed
        $pagination->total(fn () => $this->countArticles());

        $result = $pagination->compile();
    }

    protected function countArticles(): int
    {
        return 0; // See "Using with Query Builder" below
    }
}
```

If you don't need neighbours, you can call `create(1, 20)` and rely on the
default. Use `total()` on the object returned by `create()` before
calling `compile()`.

`compile()` returns a `PaginationResult`. It has the following content:

- The named page items: `getFirst()`, `getLess()`, `getPrevious()`,
  `getLowers()`, `getCurrent()`, `getHighers()`, `getNext()`,
  `getMore()`, and `getLast()`.
- `getPages()`, the list of page items between the first and last links.
- `getAll()`, every visible item in page order.
- `navs()` and `navLinks()`, the first, previous, next, and last items,
  with `navLinks()` returning their URLs as strings.
- `JsonSerializable` and `IteratorAggregate` support, so the result can be
  returned in an API response or looped over directly.

Each item is a `Windwalker\Core\Pagination\PageItem` with the public
properties `name`, `page`, and `route`. Casting an item to a string returns
its URL.

::: info
`PaginationResult` is empty when there are no rows, when `limit` is `0`, or
when there is only one page. Check `getPages()` in the view before rendering
the navigation.
:::

### Using with Query Builder

The pagination service does not run the query. Use the result's current
page and limit to build the `LIMIT` and `OFFSET`, and count the rows with a
separate query:

```php
use Windwalker\Core\Pagination\PaginationFactory;
use Windwalker\Database\DatabaseAdapter;

function listArticles(
    DatabaseAdapter $db,
    PaginationFactory $paginationFactory,
    int $page,
): array {
    $query = $db->createQuery()
        ->select('*')
        ->from('articles')
        ->where('state', 1)
        ->order('id', 'DESC')
        ->limit($pagination->getLimit())
        ->offset($pagination->getOffset());
        
    $items = $query->all();

    $pagination = $paginationFactory->create($page, 20);

    $total = $pagination->total(
        fn () => (int) $db->countWith($query),
    )->getTotal();

    return [
        'items' => $items,
        'result' => $pagination->compile(),
    ];
}
```

::: tip
Apply the same `where()` conditions to the count query and the list query.
Otherwise the page links will not match the rows.
:::

### Rendering in Blade

Pass the `Pagination` object to the view. The view calls `compile()` and
loops over the page items. The current page gets the `active` class:

```blade
@php
    $result = $pagination->compile();
@endphp

@if ($pagination->getPages() > 1)
    <nav aria-label="navigation">
        <ul class="pagination">
            @foreach ($result->getAll() as $item)
                <li @class([
                    'page-item',
                    'active' => $item->name === 'current',
                ])>


                    <a class="page-link" href="{{ $item }}">
                        {{ $item->page }}
                    </a>
                </li>
            @endforeach
        </ul>
    </nav>
@endif
```

Use `navLinks()` for simple "Previous" and "Next" buttons:

```blade
@if ($result->getPrevious())
    <a href="{{ $result->navLinks()['previous'] ?? '#' }}">Previous</a>
@endif
```

### Item Names

Each `PageItem` has a `name` that tells the view its role in the navigation.
The items appear in this order, from left to right:

- `first`: the first page. It appears when it is outside the neighbour range.
- `less`: a jump link that stands for the skipped pages after `first`.
- `previous`: the page before the current page.
- `lower`: the neighbour pages before the current page, read through `getLowers()`.
- `current`: the page being displayed.
- `higher`: the neighbour pages after the current page, read through `getHighers()`.
- `next`: the page after the current page.
- `more`: a jump link that stands for the skipped pages before `last`.
- `last`: the last page. It appears when it is outside the neighbour range.

`less` and `more` are gaps, not extra pages. Use `getAll()` to loop over the
items in order, and check each item's `name` to add styles or markers.

### Layouts and Routing

Each `Pagination` renders with a template. `PaginationFactory` applies a
default template to every object it creates. Set it once in the factory,
or override it on a single object:

```php
// Set the default for every pagination
$this->paginationFactory->setDefaultTemplate('pagination::default');

// Override the template for one pagination
$pagination->template('pagination::bootstrap');

$html = $pagination->render($result);
```

The page links use the current route with a `page` query variable. To build
the links with a different route or path, pass a `RouteUri`. Inject
`Windwalker\Core\Router\Navigator` to create one:

```php
use Windwalker\Core\Router\Navigator;

$pagination->route(
    $navigator->self()->withVar('section', 'news'),
);
```

Use `allowQuery()` to keep other query parameters in the page links, such as
a search filter. Pass the names to keep in the array:

```php
// Keep the "q" and "sort" parameters in the links
$pagination->allowQuery(['q', 'sort']);
```

::: tip
Keep an explicit list in `allowQuery()` instead of `true`, so only the
parameters you expect are copied into the page links.
:::
## Simple Pagination

A full pagination counts every matching row to know the last page. On a
large table, that `COUNT(*)` can cost more than the page query itself, and
it runs on every request.

Simple mode skips the total. It only tells the view whether a next page
exists, so it renders previous and next links without page numbers:

- Pros: no count query, and the cost does not grow with the table size.
- Cons: the view cannot show the page count or the last page link.

Call `simple()` before `compile()`. The result has no total, so `getTotal()`
returns `-1`. Fetch one extra row to find out whether a next page exists:

```php
use Windwalker\Core\Pagination\PaginationFactory;
use Windwalker\Database\DatabaseAdapter;

function listSimple(
    DatabaseAdapter $db,
    PaginationFactory $paginationFactory,
    int $page,
): array {
    $limit = 20;

    $pagination = $paginationFactory->create($page, $limit)
        ->simple(true);

    // Fetch one extra row to know whether a next page exists
    $rows = $db->createQuery()
        ->select('*')
        ->from('articles')
        ->where('state', 1)
        ->order('id', 'DESC')
        ->limit($limit + 1)
        ->offset($pagination->getOffset())
        ->all()
        ->dump();

    $hasNext = count($rows) > $limit;

    return [
        'items' => array_slice($rows, 0, $limit),
        'hasNext' => $hasNext,
        'result' => $pagination->compile(),
    ];
}
```

::: tip
The extra-row method is a suggested approach. The `simple()` mode only
changes the links, so the query must apply the limit itself.
:::

Blade shows only the previous and next links:

```blade
@php
    $result = $pagination->compile();
    $links = $result->navLinks();
@endphp

<nav>
    @if ($result->getPrevious())
        <a href="{{ $links['previous'] }}">Previous</a>
    @endif

    @if ($result->getNext())
        <a href="{{ $links['next'] }}">Next</a>
    @endif
</nav>
```

## Cursor Pagination

Cursor pagination uses the values of the last row on the page instead of an
offset. The database does not scan the skipped rows, so deep pages stay fast.
Rows added while a visitor browses also do not shift the pages.

- Pros: stable results and fast deep pages on large tables.
- Cons: no page numbers, no jump to an arbitrary page, and the ordering
  columns must be unique together.

The Query Builder creates a cursor definition with the static method
`Query::cursorPaginate()`. Pass the page length and the columns to order by.
The first page has no cursor values, and `withCursor()` returns a cloned
query with the matching rows:

```php
use Windwalker\Query\Query;

$paginate = Query::cursorPaginate(20, 'id');

// First page
$rows = $db->createQuery()
    ->select('*')
    ->from('articles')
    ->where('state', 1)
    ->withCursor($paginate)
    ->all();

// Next page, after the id of the last row shown
$rows = $db->createQuery()
    ->select('*')
    ->from('articles')
    ->where('state', 1)
    ->withCursor($paginate, ['id' => $afterId])
    ->all();
```

The input is the last-seen value of each cursor column. Read it from the
query string of the previous page link, for example `?after=120`. Pass an
array to `cursorPaginate()` when the order needs more than one column. See
[Cursor Pagination](/documentation/components/query/cursor-pagination) for
the complete rules and the column types.

Build the next link from the last row of the current page:

```blade
@foreach ($rows as $row)
    <article>{{ $row->title }}</article>
@endforeach

@if (count($rows) > 0)
    @php
        $last = end($rows);
    @endphp

    <a href="{{ $navigator->self()->withVar('after', $last->id) }}">
        Next
    </a>
@endif
```

::: warning
Cursor columns must be unique together, and must not be nullable. Otherwise
rows can be skipped or repeated across pages.
:::

## AJAX and API

The `PaginationResult` implements `JsonSerializable`, so the result can go
straight into a JSON response. Keep the rows in the body, and send the
navigation links with them:

```php
function apiArticles(
    PaginationFactory $paginationFactory,
    int $page,
): array {
    $pagination = $paginationFactory->create($page, 20)
        ->total(fn () => 100); // Replace with your count query

    return [
        'data' => [],
        'pagination' => $pagination->compile(),
    ];
}
```

To put the paging information in headers instead, read the values from the
`Pagination` object and set them on the response:

```php
$response = $response
    ->withHeader('X-Total-Count', (string) $pagination->getTotal())
    ->withHeader('X-Page-Count', (string) $pagination->getPages());
```

For cursor pagination, return the last-seen value in the JSON body, so the
client can request the next page:

```php
$last = end($rows);

return [
    'data' => $rows,
    'next' => [
        'after' => $last?->id,
    ],
];
```

::: info
`navLinks()` returns URL strings, so an API client can follow them directly.
:::

## Extra Features

- `neighbours()` changes the number of page links on each side.
- `template()` and `setDefaultTemplate()` pick the view that renders the
  navigation.
- `route()` and `allowQuery()` control how the page links are built.
