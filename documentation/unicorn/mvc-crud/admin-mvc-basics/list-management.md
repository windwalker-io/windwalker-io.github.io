---
layout: doc
title: List Management
description: Manage the admin grid list with search, filters, sorting, batch actions, and the controller routes behind them.
---

# List Management

The admin list page is a grid: a table of records with search, filters, sorting, pagination, and batch actions. Unicorn builds the query with `ListSelector` and handles the requests in `GridController`. The generator wires both, so you only adjust the columns, filters, and actions that your module needs.

## Generated Grid Features

The generated grid page provides these features:

- A search box that matches the ID, title, and alias columns.
- A state filter in the filter bar.
- Sortable headers for state, title, and ID.
- Row checkboxes and a batch modal, when the grid form has batch fields.
- A state dropdown and a delete button for each row.

## Toolbar Actions

The generated toolbar provides these actions:

- **New** links to the edit route with `new=1`.
- **Duplicate** posts the grid form. The checked IDs are in the form, so the list route runs `copy()` for them.
- **Change State** opens a dropdown of the transitions from `BasicStateWorkflow`. The workflow defines `publish` and `unpublish`, and the generated `batch()` method maps them to the `state` column.
- **Batch** opens the batch modal. The button appears only when the grid form has batch fields, and it checks that at least one row is selected first.

```blade
@if ($form?->countFields(null, 'batch'))
    <button type="button" class="btn btn-dark btn-sm uni-btn-batch"
        @click="grid.validateChecked(null, function () {
            (new bootstrap.Modal('#batch-modal')).show();
        })"
    >
        Batch
    </button>
@endif
```

## How a Request Reaches the Query

The grid form submits its values as `search[*]`, `filter[...]`, `batch[...]`, and `list_ordering`. The list view passes them to the list selector:

```php
// Simplified from the generated ProductListView::prepare()
$items = $this->repository->getListSelector()
    ->setFilters($filter)
    ->searchTextFor($search['*'] ?? '', $this->getSearchFields())
    ->ordering($ordering)
    ->page($page)
    ->limit($limit);
```

By default, the selector applies these rules:

- A filter matches its value exactly. An array matches with `IN`.
- An empty filter value is skipped.
- A search matches each search field with `LIKE %text%`, joined with `OR`.
- Sorting applies only to allowed fields.

## Allowing Fields

The selector accepts a filter, search, or sort key only when the key is allowed. A key is allowed when it is one of these:

- A column of the selector's query, such as `product.state`.
- A field added with `allowField()` or `addAllowFields()`.
- A key registered with `addFilterHandler()`, `addSearchHandler()`, or `addOrderingHandler()`.

Use `allowField()` to allow a field and give it a request name. The request name is resolved to the real field before the check:

```php
// The request key "state" maps to the product.state column.
$selector->allowField('product.state', 'state');

// Allow a column from a table that the query joins.
$selector->allowField('category.title');
```

::: warning
A key that is not allowed is removed without an error. A filter that never takes effect usually means the key is missing from the allow list. Server-side filters set with `addFilter()` follow the same rules.
:::

## Custom Search Rules

A search handler replaces the default `LIKE %text%` match for one field. Register it in the repository's `getListSelector()`:

```php
use Windwalker\Query\Query;

$selector->addSearchHandler(
    'product.alias',
    function (Query $query, string $field, mixed $value): void {
        $query->where('product.alias', 'LIKE', $value . '%');
    }
);
```

This handler matches aliases by prefix. The field is also added to the allow list.

## Custom Filter Rules: Date Range

A filter handler translates a filter value into a condition. The following example builds a date range from two virtual fields in the grid form:

```php
use Windwalker\Query\Query;

$selector->addFilterHandler(
    'start_date',
    function (Query $query, string $field, mixed $value): void {
        // The grid sends an empty string when the field is cleared.
        if ($value !== '') {
            $query->where('product.created', '>=', $value);
        }
    }
);

$selector->addFilterHandler(
    'end_date',
    function (Query $query, string $field, mixed $value): void {
        if ($value !== '') {
            $query->where('product.created', '<=', $value);
        }
    }
);
```

::: warning
A filter handler receives the value even when it is empty. Without the `!== ''` check, the condition `product.created >= ''` is added and the list shows no records.
:::

The virtual names `start_date` and `end_date` are not table columns. See [Advanced Grid Features](/documentation/guides/rad/advanced-grid) for the matching grid form fields.

## Manual Ordering

The ordering column can be edited in the list. Set the default order and render the sort header and the row controls:

```php
// In the list view
public function getDefaultOrdering(): string
{
    return 'product.ordering ASC';
}

public function reorderEnabled(string $ordering): bool
{
    return $ordering === 'product.ordering ASC';
}
```

```blade
<th>
    <x-order-sort field="product.ordering"
        :enabled="$vm->reorderEnabled($ordering)"
        asc="product.ordering ASC"
        desc="product.ordering DESC"
    ></x-order-sort>
</th>
<td>
    <x-order-control
        :enabled="$vm->reorderEnabled($ordering)"
        :row="$i"
        :id="$item->id"
        :value="$item->ordering"
    ></x-order-control>
</td>
```

The row control sends its move to the `batch` route with a `move` task, which calls `batchMove()`. The save button sends the `ordering[id]` values with a `reorder` task, which calls `batchReorder()`. The `field` attribute is required on `<x-order-sort>`, because the sort link uses it.

### New Records

New records can receive the next ordering value automatically. Call `newOrderLast()` inside the generated `configureSaveAction()` method:

```php
use Unicorn\Attributes\ConfigureAction;
use Unicorn\Repository\Actions\SaveAction;

#[ConfigureAction(SaveAction::class)]
protected function configureSaveAction(SaveAction $action): void
{
    $this->newOrderLast($action);
}
```

When the ordering field is empty on create, the record gets the maximum value plus one. Use `newOrderFirst()` instead to place a new record at the top. It sets the new record to `1` and reorders the others.

## Controller Methods and Routes

The generated list route maps each HTTP method to a controller method:

```php
$router->any('product_list', '/product/list')
    ->controller(
        ProductController::class,
        post: 'copy',
        put: 'filter',
        patch: 'batch',
    )
    ->view(ProductListView::class);
```

- `GET` renders the list view.
- `POST` calls `copy()` to duplicate the selected records.
- `PUT` calls `filter()` to store the search, filter, limit, and ordering in the state, and resets the page.
- `PATCH` calls `batch()` to run a task on the selected records.
- `DELETE` calls `delete()`, which the generated controller inherits from `CrudController`.

`GridController::batch()` reads the `task` input. If a method named `batch` followed by the task name exists, such as `batchMove()`, it runs that method. Otherwise it runs `batchUpdate()`.

Add a task by writing a method in the controller. The next example adds a feature toggle that sets the `featured` column:

```php
use App\Repository\ProductRepository;
use Unicorn\Controller\GridController;
use Windwalker\Core\Application\AppContext;
use Windwalker\DI\Attributes\Autowire;

public function batch(
    AppContext $app,
    #[Autowire] ProductRepository $repository,
    GridController $controller
): mixed {
    $data = match ($app->input('task')) {
        'feature' => ['featured' => 1],
        'unfeature' => ['featured' => 0],
        default => null,
    };

    return $app->call(
        [$controller, 'batch'],
        compact('repository', 'data')
    );
}
```

The button calls `updateItemByTask()`, which sends the task name and the selected ID:

```blade
<button type="button"
    @click="grid.updateItemByTask('feature', '{{ $item->id }}')">
    Feature
</button>
```

::: warning
When `$data` is `null`, `batchUpdate()` reads the request's `batch` input and writes every field the request sends. Always pass an explicit `$data` array for each task, and list only the fields that the task may change. The same applies to `copy()`.
:::

## Browser Behavior of the Grid Page

The grid page depends on Unicorn's `form.ts` and `grid.ts`. The grid store uses the same form element for submission. The generated template calls its methods from the toolbar, the rows, and the header:

```blade
<button type="button" @click="grid.batch('publish')">Publish</button>
<button type="button" @click="grid.deleteList()">Delete</button>
```

The main methods are these:

- `toggleAll(value)`: checks or unchecks every row. The header's `<x-toggle-all>` calls it.
- `checkRow(row, value)`, `getChecked()`, `hasChecked()`: read or change the row checkboxes.
- `batch(task)` and `updateListByTask(task)`: send the task for the checked rows with `PATCH`.
- `updateItemByTask(task, id)`: send a task for one row.
- `deleteList()` and `deleteItem(id)`: confirm, then send `DELETE`.
- `sortBy(ordering)`, `sendFilter()`, `clearFilters()`: update the sort and the filter bar.

The grid also dispatches a `unicorn:checked` event on the form when a row checkbox changes.

`useCheckboxesMultiSelect('#admin-form')` adds Shift-click range selection to the row checkboxes. The generated list script calls it, so a user can select a range of rows with one click. See [Checkbox MultiSelect](/documentation/unicorn/javascript-frontend/ui/checkbox-multiselect).

::: tip
Add `data-must-checked="#admin-form"` to a button that opens a batch modal. When no row is checked, the grid shows its message and keeps the modal closed.
:::

## Soft Delete

An entity that implements `SoftDeleteEntityInterface` is not removed from the table. `DeleteAction` sets its `is_deleted` flag instead. The generated list does not filter that flag, so deleted rows still appear. Use `createUndeletedListSelector()` from `SoftDeleteRepositoryTrait`:

```php
use Unicorn\Model\Traits\SoftDeleteRepositoryTrait;
use Unicorn\Selector\ListSelector;

class ProductRepository implements
    ManageRepositoryInterface,
    ListRepositoryInterface
{
    use ManageRepositoryTrait;
    use ListRepositoryTrait;
    use SoftDeleteRepositoryTrait;

    public function getListSelector(): ListSelector
    {
        $selector = $this->createUndeletedListSelector('product');
        $selector->from(Product::class);

        return $selector;
    }
}
```

::: warning
The generated repository does not filter deleted rows in `getItem()` either. A deleted record still opens on its edit page unless your code checks the flag.
:::

## Customizing the Base Query

`createSelector()` calls `configureSelector()` before any filter is applied. Override it to add a condition that every list of this subject must keep:

```php
use Windwalker\ORM\SelectorQuery;

protected function configureSelector(
    SelectorQuery $query,
    ListSelector $selector
): void {
    // Show only the products of site 1 in every list.
    $query->where('product.site_id', 1);
}
```

The condition is part of the query, so it also applies to `count()` and pagination.

## Batch Events

A repository method can listen to batch events with an attribute. The method runs for every batch action of this repository:

```php
use Unicorn\Repository\Event\AfterBatchEvent;

#[AfterBatchEvent]
public function logBatchChanges(AfterBatchEvent $event): void
{
    // $event->task is the task name, such as "publish".
    // $event->ids holds the affected IDs.
    // $event->data holds the values written to each record.
}
```

The attribute has the same effect as `$action->afterBatch()` in a `#[ConfigureAction(BatchAction::class)]` method. The `beforeBatch`, `beforeBatchItem`, and `afterBatchItem` events work the same way.

## Selecting Records in a Modal

Other pages can pick a record from a list through a modal. Add a `ModalField` that points to the list route:

```php
use Unicorn\Field\ModalField;

$form->add('product_id', ModalField::class)
    ->label('Product')
    ->route('product_list')
    ->titleField('title')
    ->keyField('id');
```

The field opens the list route with the `modal` layout and a `callback` query value. The generated modal template renders each row as a link:

```blade
@php($data = [
    'title' => $item->title,
    'value' => $item->id,
    'image' => $item->image,
])

<a href="javascript://"
    data-task="post-message"
    data-instance-id="{{ $callback }}"
    data-payload="@json($data)"
>
    {{ $item->title }}
</a>
```

When the user clicks a row, the script sends the instance ID and the payload to the parent window with `postMessage()`. The parent window then fills the field. The modal layout is the `modal` entry in the ListView's `layout` option, so a list page has the modal view without extra code.

## Scoped Routing & Filter State

Because the filter and search state is stored in the session, a controller that serves several scopes or a view with different types, must use a different state prefix for each scope in the repository. This keeps users in different scopes from interfering with each other's filters and searches.

For details, see [Scoped Routing](/documentation/unicorn/mvc-crud/scoped-routing).

## Related

- [Scoped Routing](/documentation/unicorn/mvc-crud/scoped-routing)
- [Admin Grid](/documentation/guides/rad/admin-grid)
- [Advanced Grid Features](/documentation/guides/rad/advanced-grid)
- [Edit Management](./edit-management)
- [Form Management](./form-management)
