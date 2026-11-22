---
layout: doc
title: CascadeSelect
description: Pick a value through linked select lists, one list per level.
---

# CascadeSelect

Large or nested data, such as a category tree, is hard to choose from a
single list. CascadeSelect renders one select per level. Choosing an item
in one level loads the options of the next level. The field submits the
id of the last selected item.

Use it in place of a modal field when users move down a hierarchy.

## Enabling the Field

Add `CascadeSelectField` to a form, and set the two required options:
`ajaxUrl()` loads the options of each level, and `pathHandler()` returns
the ids from the top level to the saved value.

```php
use Unicorn\Field\CascadeSelectField;

$form->add('category_id', CascadeSelectField::class)
    ->label('Category')
    ->ajaxUrl(
        $nav->to('category_ajax_list')->var('type', $type)
    )
    ->pathHandler(
        function (mixed $value) {
            if (!$value) {
                return [];
            }

            return $this->orm->mapper(Category::class)
                ->getPath($value)
                ->removeFirst() // Drop the root, which is not a choice.
                ->column('id')
                ->dump();
        }
    );
```

## Complete Example

The following form picks a category for an article. The endpoint returns
the children of the parent id that the client sends as `value`:

```php
use Windwalker\Core\Attributes\JsonApi;

#[JsonApi]
public function ajaxList(AppContext $app, ORM $orm): array
{
    $type = $app->input('type');
    $value = $app->input('value') ?? 1;

    if ($value <= 0) {
        $value = 1;
    }

    $query = $orm->from(Category::class)
        ->where('type', $type)
        ->where('parent_id', (int) $value)
        ->order('lft', 'ASC');

    $items = [];

    foreach ($query->getIterator(Category::class) as $item) {
        $items[] = [
            'title' => $item->getTitle(),
            'id' => $item->getId(),
        ];
    }

    return $items;
}
```

Register the endpoint as the `category_ajax_list` route. Each item needs an
`id` and a `title`, because these are the default value and text fields.

## Data Sources

CascadeSelect reads its options from one of two sources.

### AJAX

Set `ajaxUrl()`. The client calls the URL once for each level, and the
response must be an array in the `data` field of the JSON response. The
`#[JsonApi]` attribute provides this envelope.

### Static Tree

Use `source()` with a tree of data. A `Node` object from Luna's
`TreeBuilder` works directly. The field then finds the path to the value
by itself, so you do not need a `pathHandler()`:

```php
use Lyrasoft\Luna\Tree\TreeBuilder;

$tree = TreeBuilder::create(
    $this->orm->from(Category::class)
        ->where('type', $type)
        ->all()
);

$form->add('parent_id', CascadeSelectField::class)
    ->label('Parent')
    ->source($tree);
```

A plain array works too, but then you must provide a `pathHandler()`. Each
item needs a `value` object and a `children` array:

```php
[
    [
        'value' => ['id' => 1, 'title' => 'Books'],
        'children' => [
            [
                'value' => ['id' => 2, 'title' => 'Fiction'],
                'children' => [],
            ],
        ],
    ],
]
```

::: warning
Setting `ajaxUrl()` without `pathHandler()` throws an error when the field
renders a scalar value.

```php
// ERROR: LogicException: Please set pathHandler to get value path
```
:::

## The Value Path

The field needs the ids from the top level down to the saved value. It gets
them in one of three ways:

- If the value is already an array of ids, the field uses it as the path,
  and the `pathHandler()` is not called.
- If the value is a scalar, the field calls `pathHandler()`. The handler
  must return an array.
- If you use a `Node` source without a handler, the field searches the
  tree for the value.

```php
// The saved path is already known, so pass it as an array.
$form->add('category_id', CascadeSelectField::class)
    ->ajaxUrl($ajaxUrl)
    ->pathHandler(fn (mixed $value) => $pathIds);
```

::: tip
Store the path as an array when you save it. The field then skips the
lookup on every load.
:::

## Excluding an Item

Use `ignoreSelfWith()` when the field selects a parent for the item being
edited. The item itself must not be offered as its own parent. The value
you pass is sent to the endpoint as `self`:

```php
$form->add('parent_id', CascadeSelectField::class)
    ->ajaxUrl($ajaxUrl)
    ->ignoreSelfWith($id)
    ->pathHandler(fn (mixed $value) => $path);
```

The endpoint excludes that id from the list:

```php
$self = $app->input('self');

$query = $orm->from(Category::class)
    ->where('type', $type)
    ->where('parent_id', (int) $value)
    ->tapIf(
        (bool) $self,
        fn ($query) => $query->where('id', '!=', $self)
    )
    ->order('lft', 'ASC');
```

With a static tree, the field filters the item out on the client, so the
endpoint change is not needed.

## Labels and Placeholders

`labels()` sets a name for each level. A level without a label shows
`Level N`:

```php
->labels(['Region', 'Country', 'State', 'City'])
```

`placeholder()` sets the text of the empty first option in every level. The
default comes from the `unicorn.select.placeholder` translation key.
`placeholders()` sets a different text for each level, by index:

```php
->placeholder('- Choose -')

// Per-level text. Missing levels use placeholder().
->placeholders(['All regions', 'All countries'])
```

## Value and Text Fields

Each item needs a value and a text field. The defaults are `id` and
`title`:

```php
->valueField('code')
->textField('name')
```

For AJAX requests, the parent id is sent as the `value` parameter. Change
the name with `ajaxValueField()`:

```php
->ajaxValueField('parent')
```

## Layout

`labelWidth()` sets the CSS class of each label. The default is `col-md-3`.
Use `col-12` to stack the label above the select:

```php
->labelWidth('col-12 mb-1')
```

`horizontal(true)` places the levels side by side. Set the width of each
level with `horizontalColWidth()`:

```php
->horizontal(true)
->horizontalColWidth('col-md-4')
->labelWidth('col-12')
```

`fieldWidth()` sets the class of the column that holds each select. The
default is `col`.

## Events

The component dispatches three events. They are dispatched on the root
element, which has the `data-cascade-select` attribute.

```js
const root = document.querySelector('[data-cascade-select]');

// Initial value, dispatched during initialization.
root.addEventListener('value.init', (e) => {
  console.log(e.detail.value, e.detail.path);
});

// A level changed.
root.addEventListener('change', (e) => {
  console.log(e.detail.value, e.detail.path);
});

// One select was created. Use it to enhance the select.
root.addEventListener('select.init', (e) => {
  console.log(e.detail.el);
});
```

The `detail` object of each event contains `el`, `component`, and, for
`value.init` and `change`, `value` and `path`.

::: info
`value.init` fires after the options of the initial path have loaded, so
the selects are in the DOM when the event fires.
:::

To enhance each select on creation, pass a callback with
`cascadeSelectOptions()`. Wrap the code in `raw()` so the callback is
output as JavaScript:

```php
->cascadeSelectOptions([
    'onSelectInit' => raw(
        "(event) => setTimeout(() => {
            u.\$ui.tomSelect(event.detail.el);
        }, 0)"
    ),
    'onChange' => raw("(event) => console.log(event.target.value)"),
])
```

::: tip
Wait one tick with `setTimeout()` in `onSelectInit`. The select is not yet
in the page when the event fires.
:::

Use `onValueInit` to run code once the initial value is shown. It receives
the same `detail` as the `value.init` event:

```php
->cascadeSelectOptions([
    'onValueInit' => raw(
        "(event) => console.log(event.detail.value, event.detail.path)"
    ),
])
```

## Reading the Component

`module()` returns the component for a root element. Use it to read the
current path and value from script:

```js
import { module } from '@windwalker-io/unicorn-next';

const cascade = module(
  document.querySelector('[data-cascade-select]'),
  'cascade.select'
);

cascade.values;          // Selected ids, one per level.
cascade.getFinalValue(); // Last selected id, or '' when none.
cascade.getLevel();      // Number of levels currently shown.
```

## Related

- [Modal Field](./modal-field)
- [Unicorn Form Fields](../field-generation)
