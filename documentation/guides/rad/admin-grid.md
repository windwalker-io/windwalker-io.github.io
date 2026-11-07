---
layout: doc
---

# Admin Grid

Unicorn's grid generator provides a working admin list with search, filters, sorting, pagination, row selection and CRUD actions. This chapter adds product-specific fields and search.

## Generate the Grid

Generate a controller, grid, and route for the product module:

```bash
php windwalker g unicorn:controller Admin/Product --model
php windwalker g unicorn:view-grid Admin/Product
php windwalker g unicorn:route admin/product
```

The route is available at `/admin/product/list`. The generated list template renders the records in a table and includes the grid controls.

## Configure Search Fields

In `ProductListView`, define the searchable columns. The default search form submits its text under `search[*]`:

```php
public function getSearchFields(): array
{
    return [
        'product.id',
        'product.title',
        'product.alias',
        'product.intro',
        'product.description',
    ];
}
```

The selector searches the configured fields with the entered text. Only include columns that belong to the product grid query.

## Add a State Filter

The generated grid form can define filters for product fields. Fields in the `filter` namespace are submitted to the list selector:

```php
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Field\ListField;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('filter')]
public function filter(Form $form): void
{
    $form->add('product.state', ListField::class)
        ->label('State')
        ->option('- Select state -', '')
        ->option('Published', '1')
        ->option('Unpublished', '0')
        ->onchange('this.form.submit()');

    $form->add('product.featured', ListField::class)
        ->label('Featured')
        ->option('- Select value -', '')
        ->option('Featured', '1')
        ->option('Not featured', '0')
        ->onchange('this.form.submit()');
}
```

A filter selection submits the form and updates the list.

Within the admin route namespace, the `product_list` route resolves to the generated product list. The grid can display product title, state, and featured status alongside pagination and the generated row actions.
