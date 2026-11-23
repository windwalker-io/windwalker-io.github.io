---
layout: doc
title: FlatList
description: FlatList field page for Windwalker Unicorn.
---

# FlatList

Categories and menu items form a tree. A select list flattens that tree, so
users lose the parent of each item. `FlatListField` shows the whole tree at
once. Each item gets a radio button or a checkbox, and nested items are
indented under their parents.

## Enabling the Field

`FlatListField` reads the rows of `table()` and builds the tree from their
`parent_id` values.

```php
use Unicorn\Field\FlatListField;

$form->add('menu_items', FlatListField::class)
    ->label('Menu Items')
    ->table('menu_items');
```

The field needs `table()`. Without it, rendering throws:

```php
// ERROR: LogicException: No table provided for class:
// Unicorn\Field\FlatListField
$form->add('menu_items', FlatListField::class);
```

## Complete Example

For Luna categories, use `CategoryFlatListField`. It sets the table and
filters the rows by `categoryType()` and `maxLevel()`.

```php
use Unicorn\Field\CategoryFlatListField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('article')]
public function main(Form $form): void
{
    $form->add('categories', CategoryFlatListField::class)
        ->label('Categories')
        ->categoryType('article')
        ->maxLevel(3)
        ->multiple(true);
}
```

The field shows the article categories down to level 3, as checkboxes.
Each parent category appears above its children.

## Selection Mode

The default is radio buttons, which select one item. Call `multiple(true)` to
use checkboxes. `inputType()` changes the input type without changing the
mode.

```php
use Unicorn\Field\FlatListField;

// Radio buttons: one item.
$form->add('parent_menu', FlatListField::class)
    ->table('menu_items');

// Checkboxes: many items.
$form->add('menu_items', FlatListField::class)
    ->table('menu_items')
    ->multiple(true);

// Checkboxes with a single-item value.
$form->add('primary_item', FlatListField::class)
    ->table('menu_items')
    ->inputType('checkbox');
```

The inputs use the field name with `[]`, so the request value is an array in
both modes. A single selection arrives as an array with one item.

```php
// Two items checked.
$ids = ['1', '3'];

// Nothing checked: the empty marker becomes an empty array.
$ids = [];
```

::: tip
See [Empty Array Utilities](/documentation/unicorn/form-fields/form-utilities#empty-array-utilities)
for how the empty marker works.
:::

## Saved Values

The field checks the items that match the saved value. It accepts an array, a
JSON string, or a comma-separated string.

```php
use Unicorn\Field\FlatListField;

$field = $form->add('menu_items', FlatListField::class)
    ->table('menu_items')
    ->multiple(true);

// Each saved form checks the same items.
$field->setValue([1, 3]);
$field->setValue('[1,3]');
$field->setValue('1,3');
```

## Tree Structure

The tree is built with Luna's `TreeBuilder`. By default, the key is `id`, the
parent key is `parent_id`, and the root id is `1`. A row becomes a child of
the row whose `id` equals its `parent_id`. Top-level rows point to the root.

```php
// parent_id 1: a top-level row by default.
// parent_id 2: a child of the row with id 2.
// parent_id NULL or 0: the row is not shown.
```

::: warning
Rows with an empty parent are dropped without an error. Top-level rows must
use the root id, which is `1` by default.
:::

::: warning
A row whose parent is not in the query is dropped too. A filter that removes
parent rows can empty the list without an error:

```php
// Only level 3 rows. Their parents are not in the query,
// so the list stays empty. No error is raised.
$form->add('menu_items', FlatListField::class)
    ->table('menu_items')
    ->configureQuery(
        fn ($query) => $query->where('level', 3)
    );
```
:::

Use `treeBuilder()` when the parent column has another name. The closure
receives the rows as a `Collection`, and it must return a Luna tree node:

```php
use Lyrasoft\Luna\Tree\TreeBuilder;
use Unicorn\Field\FlatListField;
use Windwalker\Data\Collection;

$form->add('regions', FlatListField::class)
    ->table('regions')
    ->treeBuilder(
        fn (Collection $items) => TreeBuilder::create(
            $items,
            parentIdName: 'region_parent',
        )
    );
```

## Check All and Uncheck All

A branch with children shows links to check or uncheck all of its items.
The links above the list apply to every item.

## Options Reference

`FlatListField` provides the following methods for the list and its tree.

| Method | Description | Default |
| --- | --- | --- |
| `treeBuilder()` | Sets a closure that builds the tree from the items. | — |
| `getTreeBuilder()` | Returns the tree builder closure. | `TreeBuilder::create()` |
| `getTree()` | Builds and returns the tree from the items. | — |
| `inputType()` | Sets the input type of each item, such as `checkbox`. | — |
| `getInputType()` | Returns the input type set on the field. | — |

If `inputType()` is not set, items use `checkbox` when the field is
multiple and `radio` when it is not.

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

## Related

- [Cascade Select](./cascade-select)
- [Modal Field](./modal-field)
- [Empty Array Utilities](/documentation/unicorn/form-fields/form-utilities#empty-array-utilities)
