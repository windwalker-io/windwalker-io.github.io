---
layout: doc
---

# Edit Forms and Saving

Unicorn's edit-view generator provides the controller and view flow for creating and updating a product. Its reusable fields include lists, dates, switches, and editors.

## Generate the Edit View

Generate the edit view for the existing product module:

```bash
php windwalker g unicorn:view-edit Admin/Product
```

Use the generated edit form as the starting point. Define the form fields with fieldsets and the `item` namespace:

```php
<?php

declare(strict_types=1);

namespace App\Module\Admin\Product;

use Unicorn\Field\CalendarField;
use Unicorn\Field\SwitcherField;
use Unicorn\Field\TinymceEditorField;
use Windwalker\Form\Attributes\Fieldset;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\HiddenField;
use Windwalker\Form\Field\NumberField;
use Windwalker\Form\Field\TextField;
use Windwalker\Form\Field\TextareaField;
use Windwalker\Form\Form;

class ProductEditForm
{
    #[FormDefine]
    #[Fieldset('basic')]
    #[NS('item')]
    public function basic(Form $form): void
    {
        $form->add('id', HiddenField::class);

        $form->add('title', TextField::class)
            ->label('Title')
            ->addFilter('trim')
            ->required(true);

        $form->add('alias', TextField::class)
            ->label('Alias')
            ->addFilter('trim');

        $form->add('intro', TextareaField::class)
            ->label('Introduction')
            ->rows(5);

        $form->add('description', TinymceEditorField::class)
            ->label('Description')
            ->editorOptions(['height' => 550]);
    }

    #[FormDefine]
    #[Fieldset('meta')]
    #[NS('item')]
    public function meta(Form $form): void
    {
        $form->add('price', NumberField::class)
            ->label('Price');

        $form->add('inventory', NumberField::class)
            ->label('Inventory');

        $form->add('state', SwitcherField::class)
            ->label('Published')
            ->circle(true)
            ->color('success');

        $form->add('featured', SwitcherField::class)
            ->label('Featured')
            ->circle(true)
            ->color('warning');

        $form->add('created', CalendarField::class)
            ->label('Created');
    }
}
```

This form submits text and scalar values, so it does not require a multipart request or an upload route.

## Render the Form

The generated edit view loads an existing entity when an ID is present and fills the form from it:

```blade
<form id="admin-form" action="{{ $nav->to('product_edit') }}" method="post">
    <div class="row">
        <div class="col-lg-8">
            <x-fieldset name="basic" :form="$form"></x-fieldset>
        </div>
        <div class="col-lg-4">
            <x-fieldset name="meta" :form="$form"></x-fieldset>
        </div>
    </div>

    <x-csrf />
</form>
```

The generated toolbar supplies save actions. Keep the route name and form action consistent with the generated edit route.

## Extend the Save Lifecycle

The generated controller delegates persistence to Unicorn's `CrudController`. Use `prepareSave` to normalize form data before it is processed:

```php
use App\Repository\ProductRepository;
use Unicorn\Controller\CrudController;
use Unicorn\Repository\Event\PrepareSaveEvent;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Router\Navigator;
use Windwalker\DI\Attributes\Autowire;

public function save(
    AppContext $app,
    CrudController $controller,
    Navigator $nav,
    #[Autowire] ProductRepository $repository
): mixed {
    $form = $app->make(ProductEditForm::class);

    $controller->prepareSave(
        function (PrepareSaveEvent $event): void {
            $event->data['featured'] = (int) ($event->data['featured'] ?? 0);
        }
    );

    $uri = $app->call([$controller, 'save'], compact('repository', 'form'));

    switch ($app->input('task')) {
        case 'save2close':
            return $nav->to('product_list');

        case 'save2new':
            return $nav->to('product_edit')->var('new', 1);

        case 'save2copy':
            $controller->rememberForClone($app, $repository);

            return $nav->self($nav::WITHOUT_VARS)->var('new', 1);

        default:
            return $uri;
    }
}
```

`prepareSave` runs before form processing and can add or normalize input; its event is `Unicorn\Repository\Event\PrepareSaveEvent`. `beforeSave` can validate or adjust data before persistence, and `afterSave` is appropriate for work that requires the saved entity ID. Their event classes are `Windwalker\ORM\Event\BeforeSaveEvent` and `Windwalker\ORM\Event\AfterSaveEvent`.
