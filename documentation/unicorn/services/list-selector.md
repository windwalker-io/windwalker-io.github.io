---
layout: doc
title: List Selector
description: Build filtered, searchable, sortable, and paginated lists with Unicorn's ListSelector.
---

# List Selector

Admin grids and front-end lists repeat the same steps: apply filters from the request, search several columns, sort by a column the user picked, and split the result into pages. `ListSelector` runs these steps on one query. It also checks every request key against an allow list, so user input never becomes an arbitrary column name.

Consider a product grid. The user types a search word, chooses a state, sorts by title, and opens page 3. The selector turns these values into one SQL query and reports the total count for the pager.

## Obtaining a Selector

A repository that uses `ListRepositoryTrait` provides `createSelector()`. Define `getListSelector()` in the repository to set the base table and joins once. Every caller then starts from the same query.

```php
<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Category;
use App\Entity\Product;
use Unicorn\Attributes\Repository;
use Unicorn\Repository\ListRepositoryInterface;
use Unicorn\Repository\ListRepositoryTrait;
use Unicorn\Repository\ManageRepositoryInterface;
use Unicorn\Repository\ManageRepositoryTrait;
use Unicorn\Selector\ListSelector;

#[Repository(entityClass: Product::class)]
class ProductRepository implements
    ManageRepositoryInterface,
    ListRepositoryInterface
{
    use ManageRepositoryTrait;
    use ListRepositoryTrait;

    public function getListSelector(): ListSelector
    {
        $selector = $this->createSelector();

        $selector->from(Product::class)
            ->leftJoin(Category::class);

        return $selector;
    }
}
```

Inject the repository into a controller or service. `ListRepositoryTrait` injects the pagination factory into each selector, which `getPagination()` needs.

### Query Proxy

`ListSelector` is a proxy for the Windwalker `Query` object. Every Query method can be called on the selector. The call goes to the base query, and the selector is returned, so chaining continues.

The advanced features, such as filters, search, ordering, and pagination, are applied later. They run when `all()`, `get()`, `count()`, or `compileQuery()` builds a temporary query from the base query. The base query itself stays unchanged.

```php
use Unicorn\Selector\ListSelector;
use Windwalker\Query\Query;

// Query methods go to the base query and return the selector.
$selector->where('product.shop_id', 5);

// The callback of a Query method returns the Query object.
$selector->where(function (Query $query) {
    return $query->where('product.state', 1)
        ->orWhere('product.featured', 1);
});

// Chaining methods such as tap() pass the selector to the callback.
$selector->tap(function (ListSelector $selector): void {
    $selector->limit(20);
});

// pipe() returns the callback result, so return the selector.
$selector = $selector->pipe(
    function (ListSelector $selector): ListSelector {
        return $selector->defaultOrdering('product.id DESC');
    }
);
```

### Advanced Features

`ListSelector` wraps the [ORM](/documentation/components/orm/index) and the [query builder](/documentation/components/query/index). It converts UI parameters, such as search text, filters, ordering, and page numbers, into SQL. The same selector serves server-rendered pages and [API endpoints](/documentation/framework/core-concepts/api-systems).

The selector takes its parameters from the URL or the request and passes them to filters and ordering. It builds the allow list from the columns of every table the query joins. A filter can only name a column that the query really has, which prevents SQL injection through request keys.

When it compiles the query, the selector also uses the ORM's `autoSelections()` and `groupByJoins()`. These group the columns of all joined tables, so an unqualified column does not cause an ambiguous column name error.

## A Complete Example

The following ViewModel builds a product grid page from request values. It follows the [ViewModel](/documentation/framework/core-concepts/views/views#viewmodel) structure: the constructor receives only the repository, and the `#[ViewPrepare]` method reads the request and returns the template data.

```php
<?php

declare(strict_types=1);

namespace App\View\Product;

use App\Repository\ProductRepository;
use Windwalker\Core\Attributes\Request\Input;
use Windwalker\Core\Attributes\ViewModel;
use Windwalker\Core\Attributes\ViewPrepare;

#[ViewModel(layout: 'product-list')]
class ProductListViewModel
{
    public function __construct(
        protected ProductRepository $repository,
    ) {
    }

    #[ViewPrepare]
    public function prepare(
        #[Input('filter')] ?array $filter = null,
        #[Input('search')] string $search = '',
        #[Input('state')] ?int $state = null,
        #[Input('ordering')] ?string $ordering = null,
        #[Input('page')] int $page = 1,
    ): array {
        // A null state adds no condition.
        $selector = $this->repository->getListSelector()
            // Add filters from the request. Empty values are skipped.
            ->addFilters($filter)
            // Single filter value
            ->addFilter('product.state', $state)
            ->searchTextFor($search, ['product.title', 'product.alias'])
            ->defaultOrdering('product.ordering ASC')
            ->ordering($ordering)
            ->limit(20)
            ->page($page);

        return [
            'title' => 'Products',
            'items' => $selector->all(),
            'total' => $selector->count(),
            'pagination' => $selector->getPagination(),
        ];
    }
}
```

An empty search text, an empty state, or a `null` ordering adds no condition. Each step is optional, so the same ViewModel serves the first visit and a filtered request.

## Filters

Filters are exact-match conditions. A scalar value becomes `=`, and an array becomes `IN`. Empty values are skipped.

```php
// Add or replace one filter.
$selector->addFilter('product.state', 1);

// Replace all filters.
$selector->setFilters(['product.featured' => 1]);

// Merge filters. Named arguments work for plain keys.
$selector->addFilters(state: 1);
$selector->addFilters(['product.category_id' => [3, 4]]);

// Read the state of a filter.
$selector->hasFilter('product.state'); // false for '' or []
$selector->getFilter('product.state');
```

Use `where()` for fixed conditions that do not come from the request, such as "only products in this shop". Put them in `getListSelector()`:

```php
$selector->where('product.shop_id', 5);
```

::: warning
Never pass request input to `where()` as column name. It does not use the allow list,
so a request value can select any column. Send request values through
`setFilters()`, `addFilter()`, or `searchTextFor()` instead.
:::

A filter key that is not allowed is removed without an error. A filter
that seems to have no effect usually means the key is missing from the
allow list. See [Allowed Fields and Aliases](#allowed-fields-and-aliases).

### Custom Filter Handlers

A handler replaces the default condition for one key. It receives the raw value, including empty values.

```php
use Windwalker\Query\Query;

// Map a request key to a custom condition.
$selector->addFilterHandler(
    'published_only',
    function (Query $query, string $field, mixed $value): void {
        if ($value) {
            $query->where('product.state', '>', 0);
        }
    }
);

// Pass false to skip a key that has no SQL of its own.
$selector->addFilterHandler('view', false);
```

Adding a handler also allows the key. Guard the value inside the handler, because it arrives even when it is empty.

#### Scalar Values

Use a scalar guard for a filter that accepts one value:

```php
use Windwalker\Query\Query;

$selector->addFilterHandler(
    'category_id',
    function (Query $query, string $field, mixed $value): void {
        if ((string) $value !== '') {
            $query->where('product.category_id', '=', $value);
        }
    }
);
```

The guard assumes a scalar value. `(string)` on an array triggers a PHP warning, so use the array branch below when the filter accepts several values.

#### Arrays

To accept arrays on purpose, branch on `is_array()` before the scalar check:

```php
$selector->addFilterHandler(
    'category_id',
    function (Query $query, string $field, mixed $value): void {
        if (is_array($value)) {
            if ($value !== []) {
                $query->where('product.category_id', 'in', $value);
            }

            return;
        }

        if ((string) $value !== '') {
            $query->where('product.category_id', '=', $value);
        }
    }
);
```

#### Date Range

A date range uses two virtual fields in the grid form and two handlers. The grid sends an empty string when a field is cleared:

```php
use Windwalker\Query\Query;

$selector->addFilterHandler(
    'start_date',
    function (Query $query, string $field, mixed $value): void {
        if ((string) $value !== '') {
            $query->where('product.created', '>=', $value);
        }
    }
);

$selector->addFilterHandler(
    'end_date',
    function (Query $query, string $field, mixed $value): void {
        if ((string) $value !== '') {
            $query->where('product.created', '<=', $value);
        }
    }
);
```

::: warning
Without the guard, the condition `product.created >= ''` is added, and
the list shows no records.
:::

The names `start_date` and `end_date` are not table columns. See [Advanced Grid Features](/documentation/guides/rad/advanced-grid) for the matching grid form fields.

## Search

Search compares text with `LIKE %text%`. Several fields match each other with `OR`, so a row matches when any field contains the text.

```php
// One text, matched against each field with OR.
$selector->searchTextFor('tart', ['product.title', 'product.alias']);

// Split the text at spaces. Every word must match at least one field.
$selector->fuzzySearchTextFor('green tea', ['product.title']);

// An array makes each text a separate group. Each group must match.
$selector->searchTextFor(
    ['cherry', '2'],
    ['product.title', 'product.ordering']
);

// Search one field with its own text.
$selector->addSearch('product.title', 'Apple');
```

Use `addSearchHandler()` to change how one field matches. It receives the same arguments as a filter handler:

```php
use Windwalker\Query\Query;

// Prefix match on the alias instead of the default contains match.
$selector->addSearchHandler(
    'product.alias',
    function (Query $query, string $field, mixed $value): void {
        $query->where('product.alias', 'LIKE', $value . '%');
    }
);
```

The handler replaces the default `LIKE %text%` match for that field only. The field is also added to the allow list. Without a handler, the field matches with `LIKE %text%`.

## Ordering

`ordering()` accepts a string, an array, or a direction enum. Commas separate several columns, and each column may end with `ASC` or `DESC`.

```php
// Column with a direction in the string.
$selector->ordering('product.title DESC');

// Direction as an enum.
$selector->ordering('product.id', \SortDirection::Descending);

// Several columns in one string.
$selector->ordering('product.featured DESC, product.id ASC');

// Order used when no ordering was set.
$selector->defaultOrdering('product.ordering ASC');
```

Only allowed fields can be sorted. An unknown field is ignored.

::: warning
Validate the direction before you call `ordering()`. A direction other than
`ASC` or `DESC` throws an exception, which turns a bad URL into an error page.

```php
// ERROR: InvalidArgumentException: Invalid sort direction: FOO
$selector->ordering('product.title FOO');
```
:::

Use `addOrderingHandler()` to sort by a request name that does not match a column:

```php
use Windwalker\Query\Query;

// Sort the "name" key by the title column.
$selector->addOrderingHandler(
    'name',
    function (Query $query, string $field, mixed $dir): void {
        $query->order('product.title', $dir);
    }
);

// OR

$selector->addOrderingHandler(
    'rand',
    function (Query $query, string $field, mixed $dir): void {
        $query->orderByRandom();
    }
);
```

## Allowed Fields and Aliases

A key is allowed when it is a column of the selector's query, such as `product.state`, or when it was added by `allowField()`, `addAllowFields()`, or one of the `add*Handler()` methods. `allowField()` gives a field a short request name:

Every request key must be in the allow list. A key that is not allowed is ignored, and it never reaches the query. This is the main defense against SQL injection in the request.

Aliases map a request name to a real field or expression. A request key `rand` can map to `RAND()`, so the client can ask for a random order without the function name appearing in the query:

```php
// The request key "rand" sorts by RAND().
$selector->allowField('rand', as: 'RAND()');

$selector->ordering('rand');
```

::: info
Two request keys that resolve to the same field overwrite each other in the
filter list. Give each filter its own column or virtual key.
:::

```php
// The request key "state" maps to product.state.
$selector->allowField('product.state', as: 'state');

// Allow a value that is not a table column.
$selector->addAllowFields('computed_total');

// Replace the custom allow list. Query columns stay allowed.
$selector->setAllowFields(['computed_total']);

// Resolve an alias for filters, searches, and sorting.
$selector->fieldAlias('published', 'product.state');
```

::: warning
The selector ignores a filter, search, or sort key that is not allowed.
It does not raise an error, so the list shows rows as if the key were
absent.
:::

## Page Fix

The selector includes a page fix. When the page number is beyond the last page, it may return no rows and shows empty list to user. 
PageFix function make the selector moves to the last page. A user who types or bookmarks a page that no longer exists sees the last rows instead of an empty page.

```php
// Page 99 of 3 pages shows page 3.
$selector->limit(2)->page(99)->getOffset(); // 4 with 5 rows

// Turn the fix off: an out-of-range page returns no rows.
$selector->disablePageFix()->limit(2)->page(99)->all();
```

The fix is on by default. `disableCountTotals()` and `getSimplePagination()` turn it off, because the fix needs the total count to find the last page.

## Pagination and Counting

`limit()` and `page()` slice the result. The count reflects the filters, but not the page.

```php
$selector = $repository->getListSelector()
    ->ordering('product.id DESC')
    ->limit(20)
    ->page(3);

$selector->getOffset(); // 40
$selector->getPage();   // 3
$selector->count();     // All rows that match the filters
```

A page beyond the last one shows the last page. With 5 rows and a limit of 2, `page(99)` returns the rows of page 3, and `getOffset()` returns `4`.

::: info
`getSimplePagination()` skips the total count. Use it for "previous" and "next" links on large tables, where a full `COUNT` is costly.
:::

`defaultLimit()` sets the limit when the caller does not call `limit()`. Use `setCountCallback()` to provide a cheaper total, for example from a [cache](/documentation/components/cache/index):

```php
use Windwalker\Query\Query;

$selector->setCountCallback(
    fn(Query $query): int => (int) $cache->get('products.total'),
);
```

The count callback replaces the `COUNT` query, so the number may not match the filters. Keep it in sync yourself.

`getPagination()` returns a `Pagination` object, which the template renders. The [Pagination](/documentation/guides/mvc/view#pagination) section of the MVC view guide covers the template and the route options.

### Simple Pagination

Simple pagination works with the same selector. For a table with a very large number of pages, a full count is slow, and users wait for the pager. Simple pagination skips the total count, so the pager shows only the nearby page links. The trade-off is that the total number of pages is unknown, so users can only move forward and backward one page at a time. The following ViewModel method renders a simple pager for a product list:

```php
$selector = $this->repository->getListSelector()
    ->addFilter('product.state', 1)
    ->ordering('product.id DESC')
    ->limit(20)
    ->page($page);

// No total count is queried. getTotal() returns -1.
$pagination = $selector->getSimplePagination();
```

The template renders the [pager](/documentation/unicorn/services/components#pagination) with `<x-pagination :pagination="$pagination" />`.

## Reading Results

Read the result with the methods of the selector. Each one compiles the query with the current filters, searches, and ordering.

```php
// All rows as a Collection.
$rows = $selector->all();

// Map rows to a class.
$products = $selector->all(Product::class);

// The first row, or null when nothing matches.
$row = $selector->get();

// Process 500 rows at a time without loading the whole list.
foreach ($selector->iterateChunks(500, Product::class) as $chunk) {
    // Work with $chunk.
}
```

For the full set of iterator methods and their memory trade-offs, see [Iteration](/documentation/components/query/iteration).

## Cloning and Reuse

Each setter clears the cached count, so you can change a selector after you read it. A clone has its own query and helpers, which makes it safe to derive variants from one base selector:

```php
$base = $repository->getListSelector()
    ->addFilter('product.shop_id', 5);

$published = (clone $base)->addFilter('product.state', 1);
$drafts = (clone $base)->addFilter('product.state', 0);

$published->count(); // Published products of shop 5.
$drafts->count();    // Draft products of shop 5.
$base->count();      // Products of shop 5, unchanged by the clones.
```

## Related

- [Views](/documentation/framework/core-concepts/views/views)
- [List Management](/documentation/unicorn/mvc-crud/mvc-admin/list-management)
- [Advanced Grid Features](/documentation/guides/rad/advanced-grid)
- [Repository](./repository)
