---
layout: doc
---

# Advanced Grid Features

Unicorn's `ListSelector` supports custom search and filter handlers, allow-listed sorting, and batch actions.

## Customize Search

Define the product columns that should participate in the default search:

```php
return [
    'product.id',
    'product.title',
    'product.alias',
    'product.intro',
];
```

To use a different matching rule for one field, add a handler in `getListSelector()`:

```php
use Windwalker\Query\Query;

$selector->addSearchHandler(
    'product.alias',
    function (Query $query, string $field, mixed $value): void {
        $query->where('product.alias', 'LIKE', $value . '%');
    }
);
```

This handler matches aliases by prefix instead of using the default contains search.

## Add a Date Range Filter

Define `start_date` and `end_date` fields in the grid form. They are virtual filter names, not product table columns:

```php
use Unicorn\Field\CalendarField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('filter')]
public function dateRange(Form $form): void
{
    $form->add('start_date', CalendarField::class)
        ->label('Created from')
        ->enableTime(true)
        ->onchange('this.form.submit()');

    $form->add('end_date', CalendarField::class)
        ->label('Created through')
        ->enableTime(true)
        ->onchange('this.form.submit()');
}
```

Register handlers in the repository to translate those values into conditions on the real `product.created` column:

```php
use Windwalker\Query\Query;

$selector->addFilterHandler(
    'start_date',
    function (Query $query, string $field, mixed $value): void {
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

The selector registers handler fields as allowed fields. Keep custom handlers explicit so request parameters cannot become arbitrary SQL column names.

## Configure Sorting and Manual Ordering

Use `<x-sort>` to add sort controls for product columns:

```blade
<th>
    <x-sort field="product.title">Product</x-sort>
</th>
<th>
    <x-sort field="product.price">Price</x-sort>
</th>
```

Define a stable default order in the view model:

```php
public function getDefaultOrdering(): string
{
    return 'product.ordering ASC';
}
```

To enable manual ordering controls only when the ordering column is active, add a view-model predicate:

```php
public function reorderEnabled(string $ordering): bool
{
    return $ordering === 'product.ordering ASC';
}
```

The template can pair an order-sort header with an order control:

```blade
<th>
    <x-order-sort
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

The ordering field must be part of the list selector. Manual ordering controls are active only when the ascending order is selected.

## Add Batch Fields

Define writable entity fields under the form's `batch` namespace. Unlike grid filters, batch fields use entity property names rather than table aliases:

```php
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\ListField;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('batch')]
public function batch(Form $form): void
{
    $form->add('state', ListField::class)
        ->label('State')
        ->option('- No change -', '')
        ->option('Published', '1')
        ->option('Unpublished', '0');
}
```

The generated grid includes a batch form. An empty option represents “leave unchanged”; omit it when an empty string is a meaningful value.

## Add a Per-Row Action

For a one-click feature toggle, add a batch task to the generated product controller:

```php
use Windwalker\Core\Application\AppContext;
use App\Repository\ProductRepository;
use Unicorn\Controller\GridController;
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

    return $app->call([$controller, 'batch'], compact('repository', 'data'));
}
```

Use the grid store to submit the task for a record:

```blade
<button type="button"
    @click="grid.updateItemByTask('feature', '{{ $item->id }}')">
    Feature
</button>
```

`updateItemByTask()` submits the task name and selected ID to the grid controller. The controller maps the task to a fixed set of fields; do not accept arbitrary field names from the request.
