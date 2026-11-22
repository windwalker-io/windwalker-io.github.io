---
layout: doc
title: Ordering
description: Add manual ordering to an admin list, including composite sort keys, grouped reordering, new-record positions, and per-category order in a mapping table.
---

# Ordering

Many lists need a manual order, such as a set of featured products or the items of one category. Unicorn stores the order in an `ordering` column, lets the admin change it with buttons in the grid, and renumbers the records when the order changes. The generator does not enable this by default, so the list view, the template, and the repository need a few additions.

## Enabling Manual Ordering

Manual ordering needs three parts. The list view sets the default order and decides when the order controls are active. The template shows the sort header and the row controls. The repository does the reordering when the admin saves a change.

The list view sets the default order and the activation rule:

```php
// Default order when the request does not set one.
public function getDefaultOrdering(): string
{
    return 'product.ordering ASC';
}

// The controls are active only for this exact sort string.
public function reorderEnabled(string $ordering): bool
{
    return $ordering === 'product.ordering ASC';
}
```

The template adds a sort header and a row control:

```blade
<th style="width: 10%" class="text-nowrap">
    <x-order-sort field="product.ordering"
        :enabled="$vm->reorderEnabled($ordering)"
        asc="product.ordering ASC"
        desc="product.ordering DESC"
    ></x-order-sort>
</th>

<td class="text-end">
    <x-order-control
        :enabled="$vm->reorderEnabled($ordering)"
        :row="$i"
        :id="$item->id"
        :value="$item->ordering"
    ></x-order-control>
</td>
```

The `<x-order-sort>` component renders a sort link for the `field`. It also renders the save button when the controls are active. The `field` attribute is required, because the sort link builds its sort string from it.

::: info
The controls appear only after the admin sorts by the ordering column in ascending order. The check compares the active sort string with the value that `reorderEnabled()` receives.
:::

## How Reordering Works

The row controls and the save button send two different requests:

- The up and down buttons call `grid.moveUp()` or `grid.moveDown()`. The request has the `move` task and a `delta` of `-1` or `1`, and `GridController::batchMove()` swaps the record with its neighbor.
- The save button sends the `ordering[id]` inputs with the `reorder` task. `GridController::batchReorder()` writes the new numbers and renumbers the group from `1`.

Both operations work inside a group. A group is the set of records that share the values of the reorder group fields, as described in the next section.

## Composite Ordering

Sometimes the order has two levels, such as type first and position second. Sort by both fields, then reorder only inside each group.

Set the composite sort string in the list view. The check and the header use the same string:

```php
public function getDefaultOrdering(): string
{
    return 'product.type, product.ordering ASC';
}

public function reorderEnabled(string $ordering): bool
{
    return $ordering === 'product.type, product.ordering ASC';
}
```

Use the two fields in the header. The `field` attribute builds the ascending and descending strings:

```blade
<x-order-sort field="product.type, product.ordering"
    :enabled="$vm->reorderEnabled($ordering)"
></x-order-sort>
```

Then define the reorder group in the repository. The reorder action uses the group to decide which records to renumber:

```php
use Unicorn\Attributes\ConfigureAction;
use Unicorn\Repository\Actions\ReorderAction;

#[ConfigureAction(ReorderAction::class)]
protected function configureReorderAction(ReorderAction $action): void
{
    $action->setReorderGroupHandler(['type']);
}
```

An array lists the fields that must match. A closure receives the query and the entity, for conditions that are not simple equality:

```php
use Windwalker\Query\Query;

$action->setReorderGroupHandler(
    function (Query $query, Product $entity): void {
        $query->where('type', $entity->type);
        $query->where('site_id', $entity->siteId);
    }
);
```

::: warning
Without a group handler, the reorder treats all records as one list. Reordering one type then renumbers the records of every other type too.
:::

## New Record Position

A new record gets the next ordering value only when a save action knows where to put it. Add the `NewOrdering` attribute to the entity to choose the position:

```php
use Unicorn\Attributes\NewOrdering;
use Windwalker\ORM\Attributes\Table;

#[Table('products', 'product')]
#[NewOrdering(NewOrdering::LAST)]
class Product
{
    // ...
}
```

`NewOrdering::LAST` sets a new record to the maximum ordering plus one. `NewOrdering::FIRST` sets it to `1` and moves the other records down by one. The repository reads the attribute when it creates the save action, so the generated controller applies it without extra code.

::: info
You can also call `newOrderLast()` or `newOrderFirst()` inside the repository's `configureSaveAction()` method. Use one approach or the other. Applying both changes the ordering twice.
:::

## Ordering in a Many-to-Many Mapping Table

A product can belong to several categories, and each category may need its own order for that product. In this case, the ordering column cannot live on the product. Store it in the mapping table instead.

The mapping table needs its own primary key and an `ordering` column. The reorder operations find each row by its primary key, so the key must exist.

Point the reorder action at the mapping entity, and group the rows by category:

```php
#[ConfigureAction(ReorderAction::class)]
protected function configureReorderAction(ReorderAction $action): void
{
    $action->setEntityClass(ProductCategoryMap::class);
    $action->setReorderGroupHandler(['category_id']);
}
```

When a category filter is active, the list view joins the mapping table and orders by its `ordering` column. The join conditions are passed as three-value groups:

```php
use Unicorn\Selector\ListSelector;
use function Windwalker\Query\val;

$categoryId = $filter['product_category_map.category_id'] ?? null;
$hasCategoryFilter = $categoryId !== null && $categoryId !== '';

$items = $this->repository->getListSelector()
    ->setFilters($filter)
    ->tapIf(
        $hasCategoryFilter,
        fn (ListSelector $selector) => $selector->leftJoin(
            'product_category_map',
            'product_category_map',
            'product_category_map.product_id',
            '=',
            'product.id',
            'product_category_map.category_id',
            '=',
            val($categoryId),
        )
    )
    ->ordering($ordering)
    ->page($page)
    ->limit($limit);
```

The generated list view calls `getDefaultOrdering()` without arguments. Pass the flag in `prepare()`, and return the mapping order when the filter is active:

```php
public function resolveOrdering(bool $hasCategoryFilter): string
{
    if (!$hasCategoryFilter) {
        return 'product.id DESC';
    }

    return 'product_category_map.ordering ASC';
}

public function reorderEnabled(string $ordering): bool
{
    return $ordering === 'product_category_map.ordering ASC';
}
```

The row control must send the ID and the ordering of the mapping row, not of the product. Select those two columns in the list query, and pass them to `<x-order-control>` instead of the product's `id` and `ordering`.

::: info
Moving a product inside one category does not change its position in the other categories. Each category keeps its own order in the mapping table.
:::

## Multi-Category Example

A shop lists each product in several categories. A running shoe can appear in "Running", "Sale", and "Gift Ideas". The shop wants the shoe at the top of "Sale" but in the middle of "Running", so the position depends on the category. Each row of `product_category_map` links one product to one category and stores the position there.

The mapping table has a primary key, the two foreign keys, and the position:

```php
use Windwalker\Database\Schema\Schema;

$this->createTable(
    ProductCategoryMap::class,
    function (Schema $schema) {
        $schema->primary('id');
        $schema->integer('product_id');
        $schema->integer('category_id');
        $schema->integer('ordering');

        $schema->addIndex('product_id');
        $schema->addIndex('category_id');
    }
);
```

The entity maps the table, so the reorder action can read and write its rows:

```php
namespace App\Entity;

use Windwalker\ORM\Attributes\AutoIncrement;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Attributes\Table;
use Windwalker\ORM\EntityInterface;
use Windwalker\ORM\EntityTrait;

#[Table('product_category_map', 'product_category_map')]
class ProductCategoryMap implements EntityInterface
{
    use EntityTrait;

    #[Column('id')]
    #[PK(primary: true)]
    #[AutoIncrement]
    public ?int $id = null;

    #[Column('product_id')]
    public int $productId = 0;

    #[Column('category_id')]
    public int $categoryId = 0;

    #[Column('ordering')]
    public int $ordering = 0;
}
```

The product repository reorders the mapping rows, and groups them by category. A category's positions are renumbered without touching the other categories:

```php
#[ConfigureAction(ReorderAction::class)]
protected function configureReorderAction(ReorderAction $action): void
{
    $action->setEntityClass(ProductCategoryMap::class);
    $action->setReorderGroupHandler(['category_id']);
}
```

Add a category filter to the grid form, as described in [List Management](./list-management). The filter key is `product_category_map.category_id`, so the list selector applies it to the mapping table.

In the list view, the join and the selected columns are added only when the filter is active. The selected mapping columns are aliased, so the template can read them without clashing with the product's own `id` and `ordering`:

```php
$categoryId = $filter['product_category_map.category_id'] ?? null;
$hasCategoryFilter = $categoryId !== null && $categoryId !== '';

$items = $this->repository->getListSelector()
    ->setFilters($filter)
    ->tapIf(
        $hasCategoryFilter,
        fn (ListSelector $selector) => $selector
            ->leftJoin(
                'product_category_map',
                'product_category_map',
                'product_category_map.product_id',
                '=',
                'product.id',
                'product_category_map.category_id',
                '=',
                val($categoryId),
            )
            ->select(
                'product_category_map.id AS map_id',
                'product_category_map.ordering AS map_ordering',
            )
    )
    ->ordering($this->resolveOrdering($hasCategoryFilter))
    ->page($page)
    ->limit($limit);
```

The template shows the order control only in a filtered category. It sends the mapping row's ID and position, so each category keeps its own sequence:

```blade
@if ($hasCategoryFilter)
    <td class="text-end">
        <x-order-control
            :enabled="$vm->reorderEnabled($ordering)"
            :row="$i"
            :id="$item->map_id"
            :value="$item->map_ordering"
        ></x-order-control>
    </td>
@endif
```

When the admin saves the order, `batchReorder()` receives the mapping IDs. The reorder action finds each mapping row and renumbers only the rows in the same category.

## Related

- [List Management](./list-management)
- [Advanced Grid Features](/documentation/guides/rad/advanced-grid)
- [Nested Set MVC](./nested-set-mvc)
