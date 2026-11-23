---
layout: doc
title: Core Concepts
description: Learn the layers Unicorn uses for admin CRUD and how they fit together.
---

# Core Concepts

Admin CRUD follows the same pattern for every entity: store it, list it, edit it, and delete it. Unicorn splits that pattern into fixed layers, so each layer has one job and the generator can produce all of them. You replace only the parts that carry your business rules.

## The Layers

A request passes through these layers, from the outside in:

```text
Route -> Controller -> Repository -> Entity -> Database
            |
            +-> View (list grid, edit form)
```

- Route: maps a URL to a controller action and a view.
- Controller: runs the action, such as save, delete, filter, or batch.
- Repository: loads and stores entities, and owns the actions that change them.
- Entity: maps a PHP object to a database table with ORM attributes.
- View: renders a list grid or an edit form.

## Enabling the Layers

The generator writes one file per layer. The essential pieces of a `Product` feature look like this:

```php
namespace App\Entity;

use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Attributes\Table;

#[Table('products', 'product')]
class Product
{
    #[Column('id')]
    #[PK(primary: true)]
    public ?int $id = null;

    #[Column('title')]
    public string $title = '';
}
```

The entity is a plain class with ORM attributes. The generated entity also
implements `EntityInterface` and uses `EntityTrait`; the example omits them.

## Repositories

A repository links an entity to its database operations. Declare the entity with the `#[Repository]` attribute:

```php
namespace App\Repository;

use App\Entity\Product;
use Unicorn\Attributes\Repository;
use Unicorn\Repository\ManageRepositoryInterface;
use Unicorn\Repository\ManageRepositoryTrait;

#[Repository(entityClass: Product::class)]
class ProductRepository implements ManageRepositoryInterface
{
    use ManageRepositoryTrait;
}
```

`ManageRepositoryTrait` adds the save, reorder, and batch actions. The
generated repository also adds `ListRepositoryTrait`, which provides
`createSelector()` for list queries. Use `#[ConfigureAction]` to customize an
action, as the generated repository does for `SaveAction` and `DeleteAction`.

Use the repository directly in code. `CrudRepositoryTrait` provides the basic methods:

```php
// Save a new entity; the returned object has its generated ID.
$product = new Product();
$product->title = 'Coffee';
$product = $repository->save($product);

// getItem() returns null when nothing matches.
$found = $repository->getItem($product->id);

// mustGetItem() throws RouteNotFoundException instead of returning null.
$found = $repository->mustGetItem($product->id);

// Delete by conditions.
$repository->delete(['id' => $product->id]);
```

::: info
Deleting an entity that implements `SoftDeleteEntityInterface` does not remove the row. The repository sets `is_deleted` to `1` and keeps the row. Query the table with that condition in mind.
:::

## Controllers

Generated controllers inject two Unicorn base controllers and an
`#[Autowire]` repository. `CrudController` handles writes:

```php
use Unicorn\Controller\CrudController;
use Windwalker\Core\Application\AppContext;
use Windwalker\DI\Attributes\Autowire;

public function save(
    AppContext $app,
    CrudController $controller,
    #[Autowire] ProductRepository $repository,
): mixed {
    $form = $app->make(ProductEditForm::class);

    // Hooks run around the save; the closure bodies are your logic.
    $controller->beforeSave(function ($event) {
        // Adjust the data before it is stored.
    });

    return $app->call(
        $controller->saveWithNamespace(...),
        compact('repository', 'form')
    );
}
```

`GridController` handles list actions. The generated controller calls its
`filter()` and `batch()` methods from the list route:

```php
use Unicorn\Controller\GridController;

public function filter(
    AppContext $app,
    #[Autowire] ProductRepository $repository,
    GridController $controller,
): mixed {
    return $app->call(
        $controller->filter(...),
        compact('repository')
    );
}
```

Other hooks are `prepareSave()`, `afterSave()`, `beforeDelete()`, and
`afterDelete()`. Each accepts a callable and returns the controller, so you
can chain them.

::: tip
By default, `save()` reads the form data from the `item` input namespace. Call `setFormNamespace()` on the controller if your form uses another name.
:::

Call `setMuted(true)` on the controller to suppress the default success
message after a save.

## Forms and Views

The edit view renders a form built from a form class, such as
`ProductEditForm`. Unicorn registers two macros on every form field: `showon()`
for conditional display and `tooltip()` for hover help. For example:

```php
use Windwalker\Form\Field\AbstractField;

// Macros are registered by UnicornPackage::boot().
$field->tooltip('Shown when the user hovers over the field.');
```

The list and edit views are Windwalker view classes. `CrudController::index()`
renders a view by class name:

```php
public function index(string $view, AppContext $app): mixed
{
    $vm = $app->make($view);

    return $vm->render();
}
```

See [Conditional Display](../form-fields/form-utilities#conditional-display)
for `showon()` usage.

## Generator

Each layer has a generator command. Run `php windwalker g` to list them:

- `unicorn:mvc-admin`: all layers for an admin CRUD.
- `unicorn:mvc-simple`: list and item views with a simple route.
- `unicorn:model`: entity and repository.
- `unicorn:controller`: controller.
- `unicorn:view-grid`: list view and grid form.
- `unicorn:view-edit`: edit view and edit form.
- `unicorn:route`: routes.
- `unicorn:workflow`: workflow class.

See [Getting Started](./getting-started) for an end-to-end run.

## Related

- [Repository service](../services/repository)
- [List Selector](../services/list-selector)

