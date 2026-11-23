---
layout: doc
title: Nested Set MVC
description: Manage hierarchical records such as categories and departments with a nested set table, reorderable lists, and parent selectors.
---

# Nested Set MVC

Some data forms a tree, such as categories, departments, or menu items. A [nested set](/documentation/components/orm/nested-set) stores the tree in a single table, so Unicorn can read a whole branch with one query and keep the siblings in a fixed order. This page shows how to turn a table into a nested set and how the admin pages handle it. The concept is described in [Nested set model](https://en.wikipedia.org/wiki/Nested_set_model).

## Table Columns

A nested table needs these columns:

- `parent_id`: the ID of the parent record.
- `lft` and `rgt`: the left and right positions that describe the tree.
- `level`: the depth of the record. The root has level `0`.

Add `path` and `alias` if the records need a URL path. The root has `parent_id` set to `NULL`.

## Entity

Change the `Table` attribute to `NestedSet`, and implement `NestedEntityInterface` with the `NestedEntityTrait`:

```php
use Windwalker\ORM\Attributes\NestedSet;
use Windwalker\ORM\Nested\NestedEntityInterface;
use Windwalker\ORM\Nested\NestedEntityTrait;

#[NestedSet('categories', 'category')]
class Category implements NestedEntityInterface
{
    use NestedEntityTrait;

    // ...

    public function getPrimaryKeyValue(): ?int
    {
        return $this->getId();
    }
}
```

If the records need a path and an alias, implement `NestedPathableInterface` and use `NestedPathableTrait` instead.

Remove the properties and methods that the traits already provide, such as `parentId`, `lft`, and `level`. Your IDE shows these as duplicates.

Use the `NestedSetMapper` type when you call the mapper, so that the IDE knows its tree methods:

```php
/** @var NestedSetMapper $mapper */
$mapper = $orm->mapper(Category::class);
```

## Migration

The [migration](/documentation/framework/services/database/migrations) must create the root record, because the tree needs one:

```php
$mig->up(
    static function (ORM $orm) use ($mig) {
        $mig->createTable(
            Category::class,
            function (Schema $schema) {
                // Columns, including parent_id, lft, rgt, and level.
            }
        );

        /** @var NestedSetMapper $mapper */
        $mapper = $orm->mapper(Category::class);

        $mapper->createRootIfNotExist();
    }
);
```

If a required column has no default value, the insert fails. Pass the values in the data array:

```php
$mapper->createRootIfNotExist(
    [
        'title' => 'Root',
        'status' => Status::ROOT(),
    ]
);
```

## Repository

Use `NestedManageRepositoryTrait` in place of `ManageRepositoryTrait`. The trait adds the nested save and reorder actions:

```php
#[Repository(entityClass: Category::class)]
class CategoryRepository implements
    ManageRepositoryInterface,
    ListRepositoryInterface
{
    use NestedManageRepositoryTrait;
    use ListRepositoryTrait;

    // ...
}
```

The list must not show the root. Exclude it by level, because the root's `parent_id` is `NULL` and does not match a `!=` comparison:

```php
public function getListSelector(): ListSelector
{
    $selector = $this->createSelector();

    $selector->from(Category::class);

    $selector->where('category.level', '>=', 1);

    return $selector;
}
```

## List View

Sort the list by the `lft` column, which keeps each branch together:

```php
public function getDefaultOrdering(): string
{
    return 'category.lft ASC';
}

public function reorderEnabled(string $ordering): bool
{
    return $ordering === 'category.lft ASC';
}
```

The ordering controls number the siblings under each parent. Keep a counter for every parent while the template renders the rows:

```blade
@php($orders = [])

@foreach ($items as $i => $item)
    @php($entity = $vm->prepareItem($item))

    @php($orders[$entity->getParentId()][] = $entity->getId())
    @php($order = count($orders[$entity->getParentId()]))

    <td class="text-end">
        <x-order-control
            :enabled="$vm->reorderEnabled($ordering)"
            :row="$i"
            :id="$item->id"
            :value="$order"
        ></x-order-control>
    </td>
@endforeach
```

Show the depth in the title by repeating a dash for each level below the first:

```blade
<div class="d-flex gap-2">
    @if ($item->level > 1)
        <div>{{ str_repeat('—', $item->level - 1) }}</div>
    @endif

    <div>{{ $item->title }}</div>
</div>
```

The `prepareItem()` method is your view model's helper that returns the entity for a row.

## Choosing a Parent

The edit form needs a parent field. `SqlListField` shows the options with their depth. It indents each option by the `level` column, so a flat option list keeps the tree shape. Extend it to load the records and to skip the root:

```php
use Unicorn\Field\SqlListField;
use Windwalker\Query\Query;

class CategoryListField extends SqlListField
{
    protected ?string $table = Category::class;

    protected function prepareQuery(Query $query): void
    {
        parent::prepareQuery($query);

        $query->select('category.id', 'category.title');
        $query->order('category.lft', 'ASC');
        $query->where('category.level', '>=', 1);
    }
}
```

For a large tree, a `ModalField` is easier to use than a long list. For a tree of several levels, a [cascade select](/documentation/unicorn/form-fields/field-types/cascade-select) lets the user choose one level at a time.

## Saving Nodes

The admin form saves through the [repository](/documentation/unicorn/services/repository), and the repository uses `NestedSaveAction`. The action places the record by its `parent_id`:

- A new record becomes the last child of its parent.
- A saved record whose `parent_id` changes moves to the last child of the new parent.
- A saved record with the same `parent_id` keeps its position.

```php
$category = $repository->mustGetItem($id);
$category->setParentId($newParentId);

$repository->save($category);
```

The mapper offers the same placement without the repository. Its helpers save at once, and each takes the node and the ID of a reference:

```php
$mapper = $orm->mapper(Category::class);

// The first child of the reference.
$mapper->prependTo($category, $newsId);

// The last child of the reference.
$mapper->appendTo($category, $newsId);
```

To set a position and save later, use the `setPosition` family. The position is applied by `saveOne()`:

```php
$mapper->setPositionAppendTo($category, $newsId);

$category->setTitle('Travel');

$mapper->saveOne($category);
```

## Changing the Position

Use the helper that matches the position you want:

- `prependTo()`: first child of the reference.
- `appendTo()`: last child of the reference.
- `putBefore()`: sibling directly before the reference.
- `putAfter()`: sibling directly after the reference.

```php
$mapper->putAfter($category, $sportId);
```

When the position is chosen at runtime, call `moveByReference()` with a `NestedPosition` value:

```php
use Windwalker\ORM\Nested\Position;

$mapper->moveByReference(
    $category,
    $sportId,
    Position::LAST_CHILD,
);
```

Passing `null` as the reference places the node under the last root node.

::: warning
The root has no siblings. `putBefore()` and `putAfter()` with the root as the reference throw an `InvalidArgumentException`.
:::

::: warning
A node cannot become its own parent, or a child of its own subtree. The mapper throws a `NestedHandleException` in both cases, and nothing is changed.
:::

## Moving Among Siblings

`move()` moves a node by one sibling. The sign of the second argument chooses the direction, and its size is ignored:

- `Position::MOVE_UP` (`-1`) moves the node before its previous sibling.
- `Position::MOVE_DOWN` (`1`) moves the node after its next sibling.

```php
use Windwalker\ORM\Nested\Position;

$mapper->move($category, Position::MOVE_DOWN);
```

When the node has no sibling in that direction, `move()` returns `false`. The optional third argument limits the siblings that are considered, for example to the nodes of one type.

The admin list uses this mechanism for its up and down buttons. `NestedReorderAction::move()` passes the reorder group conditions to `move()`, so only the siblings in the same group are swapped. Set the group in the repository:

```php
#[ConfigureAction(ReorderAction::class)]
protected function configureReorderAction(ReorderAction $action): void
{
    $action->setReorderGroupHandler(['type']);
}
```

The drag-and-save path works differently. `batchReorder()` writes the numbers from the form to `lft`, and the action then calls `rebuild()`. The rebuild sorts the children of each parent by `lft`, so the numbers decide the order of the siblings.

## Reading the Tree

Choose the query by what the page shows. The mapper provides these reads:

- `getTree($id)` returns the node and all of its descendants, in tree order, with one query.
- `getPath($id)` returns the node and its ancestors, from the root down. Use it for breadcrumbs.
- `getAncestors($id)` returns the ancestors without the node itself.
- `getRoot()` returns the root node.
- `isLeaf($id)` tells whether a node has no children. It returns `false` when the node does not exist.

The strategies below suit the common pages:

- **Whole tree on one page**: call `getTree()` on the root once, and group the rows in PHP by `parent_id`. Exclude the root with `level >= 1` when the root should not show.
- **Flat admin list**: query the table ordered by `lft` and filtered by `level`, and indent each row by its `level`. The admin list on this page uses this query.
- **One branch**: call `getTree()` on the branch node, for example to show the items of one category.
- **Breadcrumbs**: call `getPath()` on the current node.
- **Children on demand**: `getChildren()` returns the direct children of a loaded node, ordered by `lft`. The query runs only when the method is called.

::: warning
`getChildren()` runs one query for each node it is called on. Calling it inside a loop over many nodes sends one query per node. Read the tree once with `getTree()` for pages that show many levels.
:::

## Repairing the Tree

`rebuild()` recalculates `lft`, `rgt`, and `level` from the `parent_id` values, and it keeps the order of the siblings. Call it after a change that bypasses the mapper, such as a raw SQL update or a bulk delete:

```php
// The whole tree.
$mapper->rebuild();

// One subtree.
$mapper->rebuild($category);
```

`NestedSetController::rebuild()` runs the same repair for the whole tree and shows a success message. Route it to an admin action of your module to repair the tree from the admin pages.

::: warning
Do not write `lft`, `rgt`, or `level` directly, and do not use `deleteBulk()` to delete a node. `deleteBulk()` runs one `DELETE` statement without the delete events, so the gap in the numbers is not closed. Use `deleteOne()` or `deleteBatch()`, and run `rebuild()` after a bulk change.
:::

## Related

- [List Management](./list-management)
- [Ordering](./ordering)
- [Form Management](./form-management)
- [Nested Sets](/documentation/components/orm/nested-set)
