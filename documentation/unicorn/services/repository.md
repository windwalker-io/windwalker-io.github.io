---
layout: doc
title: Repository
description: Organize data access for a subject with Unicorn's repository traits, actions, and events.
---

# Repository

A repository is the data layer for one subject, such as `Product`. It owns the [entity](/documentation/components/orm/entities), the table, the database connection, and the rules for saving, deleting, reordering, and batch updates. The [admin grid](/documentation/unicorn/mvc-crud/mvc-admin/list-management), the [edit form](/documentation/unicorn/mvc-crud/mvc-admin/edit-management), and a front-end list all need the same rules. Keeping them in one repository prevents each controller from building its own SQL. For example, a new product can always go to the end of its category, no matter which screen created it.

A repository is optional. Windwalker's architecture is already well layered, and direct database access in a service is often enough. Unicorn repositories add the admin features: CRUD, batch, and reorder actions, plus [list selectors](/documentation/unicorn/services/list-selector). They can also serve as a switchable data source.

A Unicorn repository can define its own methods, such as `findEnabledById()`. It can also use the built-in `save()`, `delete()`, and `createSelector()` methods, or combine traits for the features it needs.

## Creating a Repository

Mark the class with `#[Repository]` and name the entity. Then use the traits that match what the subject needs:

- `ManageRepositoryTrait`: save, get, delete, reorder, and batch actions. It includes `CrudRepositoryTrait` and `DatabaseRepositoryTrait`.
- `ListRepositoryTrait`: `createSelector()` for list pages. See [List Selector](./list-selector).

```php
<?php

declare(strict_types=1);

namespace App\Repository;

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
        return $this->createSelector()->from(Product::class);
    }
}
```

The interfaces let controllers such as `GridController` accept any repository of this kind. A repository for a read-only subject needs only the traits it uses.

## A Complete Example

The example below saves, reads, reorders, and deletes products. The `Product` entity declares its new-item position with `#[NewOrdering]`:

```php
<?php

declare(strict_types=1);

namespace App\Entity;

use Unicorn\Attributes\NewOrdering;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Attributes\Table;
use Windwalker\ORM\EntityInterface;
use Windwalker\ORM\EntityTrait;

#[Table('products', 'product')]
#[NewOrdering(NewOrdering::LAST)]
class Product implements EntityInterface
{
    use EntityTrait;

    #[Column('id')]
    #[PK(primary: true)]
    public ?int $id = null;

    #[Column('title')]
    public string $title = '';

    #[Column('alias')]
    public string $alias = '';

    #[Column('category_id')]
    public ?int $categoryId = null;

    #[Column('ordering')]
    public int $ordering = 0;
}
```

Use the repository in a service or controller:

```php
use App\Entity\Product;
use App\Repository\ProductRepository;
use Unicorn\Repository\Actions\ReorderAction;

// Create. The product gets the next ordering in the list.
$product = new Product();
$product->title = 'Green tea';
$product->categoryId = 3;

$product = $repository->save($product);

// Read by ID or by conditions. Both return null when nothing matches.
$item = $repository->getItem($product->id);
$item = $repository->getItem(['alias' => 'green-tea']);

// Move the product one position up within its category.
$repository->createReorderAction()->move([$product->id], -1);

// Delete one product.
$repository->delete(['id' => $product->id]);
```

The repository is the only place that knows the rules. Callers stay short, and the same rules apply everywhere the subject is saved.

## Reading Items

`getItem()` returns the entity or `null`. `mustGetItem()` throws `RouteNotFoundException` instead, which suits a request that must find a record:

```php
$item = $repository->getItem(9999); // null

// ERROR: RouteNotFoundException
$item = $repository->mustGetItem(9999);
```

Use `getEntityMapper()` for entity-level operations and `getORM()` for queries that do not fit the repository methods.

The `connection` argument of `#[Repository]` selects the database. It names the tag that the container uses to resolve the `DatabaseAdapter`:

```php
#[Repository(entityClass: Product::class, connection: 'archive')]
class ArchivedProductRepository implements ManageRepositoryInterface
{
    use ManageRepositoryTrait;
}
```

## Actions

Each write operation in the repository is wrapped by an action class. `save()` uses `SaveAction`, and `delete()` uses `DeleteAction`. Reads go through the entity mapper, and list queries go through `ListSelector`. This pattern is similar to the Command Query Responsibility Segregation (CQRS) principle. Actions can have listeners, and you can create an action yourself to register them:

```php
use Unicorn\Repository\Actions\SaveAction;
use Windwalker\ORM\Event\BeforeSaveEvent;

$repository->save($product);                    // SaveAction
$repository->processDataAndSave($data, $form);  // SaveAction
$repository->delete(['id' => 3]);               // DeleteAction
$repository->createReorderAction();             // ReorderAction
$repository->createBatchAction();               // BatchAction
$repository->createSelector();                  // ListSelector

// Get the action yourself to register listeners or to control it.
$action = $repository->createSaveAction();

$action->beforeSave(function (BeforeSaveEvent $event): void {
    $event->data['alias'] = strtolower($event->data['alias'] ?? '');
});

$action->save($product);
```

[Nested sets](/documentation/components/orm/nested-set) use `NestedSaveAction` and `NestedReorderAction` in place of the default actions.

## List Selector

A list page starts from the list selector. The repository provides `createSelector()`, and `getListSelector()` builds the base query. Use it for filters, search, ordering, and pagination. See [List Selector](./list-selector) for the details.

`createPublishedListSelector()` comes from `PublishingRepositoryTrait`, and you can add your own strategies. Name each strategy for the rule it applies:

```php
use App\Entity\Product;
use Unicorn\Selector\ListSelector;

class ProductRepository implements ListRepositoryInterface
{
    use ListRepositoryTrait;
    
    // ...

    public function createActiveListSelector(?int $orgId = null): ListSelector
    {
        return $this->createSelector()
            ->from(Product::class)
            ->tapIf(
                $orgId !== null,
                fn (ListSelector $selector) => $selector->where('product.org_id', $orgId)
            )
            ->where('product.state', 1);
    }
```

## Saving and Processing Input

`save()` writes an object or an array as it is. It does not validate or filter the data:

```php
$product = $repository->save($product);

// Pass an array with the column names as keys.
$product = $repository->save(['title' => 'Green tea']);
```

::: warning
`save()` does not check the input. Do not pass request data to it directly.
Use `processDataAndSave()` with a form, so that [filters and validation](/documentation/framework/core-concepts/http-routing/validation-and-filter)
run first:

```php
// ERROR: ValidateFailException when the form rejects the data.
$product = $repository->processDataAndSave($data, $form);
```
:::

`processDataAndSave()` runs the form's filters and validation, then saves. The [Edit Forms and Saving](/documentation/guides/rad/edit-forms) guide shows the full form flow.

### Save Events

Add listeners to a repository method with an [event attribute](/documentation/components/orm/events). The method runs for every save of this repository:

```php
use Windwalker\ORM\Event\AfterSaveEvent;
use Windwalker\ORM\Event\BeforeSaveEvent;

#[BeforeSaveEvent]
public function normalizeProduct(BeforeSaveEvent $event): void
{
    $event->data['alias'] = strtolower(
        trim((string) ($event->data['alias'] ?? ''))
    );
}

#[AfterSaveEvent]
public function logProduct(AfterSaveEvent $event): void
{
    if ($event->isCreate()) {
        // $event->entity holds the saved object with its new ID.
    }
}
```

`BeforeSaveEvent` changes the data before it is written. `AfterSaveEvent` runs after the write, so the entity has its ID. For a single save, use `createSaveAction()` and register a listener on the action. `prepareSave()` receives the data before form processing.

## Ordering with Manage Actions

`#[NewOrdering]` on the entity tells the repository where a new item goes:

- `NewOrdering::LAST`: the new item gets the next number after the highest one.
- `NewOrdering::FIRST`: the new item moves to the top of the list.

The action also has `move()`, which swaps an item with its neighbor in the same reorder group. A group limits the swap to items that share a value, such as a category:

```php
use Unicorn\Attributes\ConfigureAction;
use Unicorn\Repository\Actions\ReorderAction;
use Windwalker\Query\Query;

#[ConfigureAction(ReorderAction::class)]
protected function configureReorder(ReorderAction $action): void
{
    $action->setReorderGroupHandler(
        function (Query $query, Product $product): void {
            $query->where('category_id', $product->categoryId);
        }
    );
}
```

`move()` swaps the item with its neighbor in the group. A delta of `-1` moves up, and `1` moves down.

The action also has `move()`, which swaps an item with its neighbor in the same reorder group. A group limits the swap to items that share a value, such as a category. For the grid's ordering controls, see [Manual Ordering](/documentation/unicorn/mvc-crud/mvc-admin/ordering).

### Batch Updates

`createBatchAction()` updates many rows with one set of values:

```php
use Windwalker\Utilities\Symbol;

$batch = $repository->createBatchAction();

// Empty strings are dropped, so those columns keep their values.
$batch->update([3, 7, 9], ['state' => 0, 'category_id' => '']);

// Symbol::empty() writes an empty value into the column.
$batch->update([3], ['alias' => Symbol::empty()]);

// copy() duplicates the rows, then applies the data to the copies.
$batch->copy([3], ['state' => 0]);
```

::: warning
An update with no values after cleaning throws a validation exception, so
nothing is written. A batch of only empty strings is therefore an error,
not a no-op.
:::

For a tree of items, use the nested variant. See [Nested Set MVC](/documentation/unicorn/mvc-crud/mvc-admin/nested-set-mvc).

## Deleting

Pass conditions that identify the rows to delete:

```php
$repository->delete(['id' => 3]);
```

Entities that implement `SoftDeleteEntityInterface` are marked as deleted instead, and their row stays in the table.

Lists of a soft-deleted subject should start from `createUndeletedListSelector()`. Add `SoftDeleteRepositoryTrait` to the repository to get it:

```php
use Unicorn\Model\Traits\SoftDeleteRepositoryTrait;

class ProductRepository
{
    use SoftDeleteRepositoryTrait;

    public function getListSelector(): ListSelector
    {
        return $this->createUndeletedListSelector('product');
    }
}
```

## Publishing Helpers

`PublishingRepositoryTrait` adds list selectors for the publishing states of a `state` column:

```php
use Unicorn\Model\Traits\PublishingRepositoryTrait;

// Only rows in the published state.
$selector = $this->createPublishedListSelector('product');

// Rows that are not trashed, including archived ones.
$selector = $this->createUnTrashedListSelector('product');
```

Pass an alias such as `product` to qualify the column. Without an alias, the column name is `state`.

## State

Each repository provides `getState()`. It returns the application state under a prefix derived from the repository name, such as `Product` for `ProductRepository`.

## Related

- [List Selector](./list-selector)
- [MVC Concepts](/documentation/unicorn/mvc-crud/mvc-concepts)
- [List Management](/documentation/unicorn/mvc-crud/mvc-admin/list-management)
- [Edit Forms and Saving](/documentation/guides/rad/edit-forms)
