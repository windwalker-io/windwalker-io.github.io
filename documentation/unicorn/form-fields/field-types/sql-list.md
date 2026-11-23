---
layout: doc
title: SqlList
description: SqlList field page for Windwalker Unicorn.
---

# SqlList

Many selects list records from a database table, such as categories, tags,
or countries. Hard-coding those options means editing code whenever the data
changes. `SqlListField` reads the rows of a table and builds one option for
each row, so the select always shows the current data.

The field is a standard list field. It supports `multiple()`, `size()`, and
the other options of Windwalker's list fields.

## Enabling the Field

Add the field with `SqlListField::class`, then name the table with
`table()`. The field reads the `title` column as the text and the `id`
column as the value. Use `textField()` and `valueField()` to change them.

```php
use Unicorn\Field\SqlListField;

$form->add('category_id', SqlListField::class)
    ->label('Category')
    ->table('categories')
    ->textField('title')
    ->valueField('id');
```

::: warning
`table()` is required. Without it, the select renders with no options and
no error.
:::

## Complete Example

The following form selects an article category. It lists only published
categories of the `article` type, in tree order, and indents the children.
A blank first option lets the user leave the field empty:

```php
use Unicorn\Field\SqlListField;

// $form is the form of the current page.
$form->add('category_id', SqlListField::class)
    ->label('Category')
    ->required(true)
    ->table('categories')
    ->textField('title')
    ->valueField('id')
    ->indentByField('level')
    ->configureQuery(
        fn ($query) => $query
            ->where('type', 'article')
            ->where('state', 1)
            ->order('lft', 'ASC')
    )
    ->addOptions([SqlListField::createOption('- Choose -', '')]);
```

The submitted value is the `id` of the selected row.

## Tree Indentation

`indentByField()` names the column that stores the depth of each row. The
default is `level`. A row at level 1 is a root and has no prefix. Each
deeper level adds `- ` before the text:

```php
$form->add('category_id', SqlListField::class)
    ->table('categories')
    ->indentByField('level');

// Rendered option text for rows at level 1, 2, and 3:
//   Books
//   - Fiction
//   - - Science fiction
```

::: info
A row with an empty or zero depth value renders without a prefix.
:::

## Grouping Options

`setGroupBy()` takes a closure that returns the group label of each row. The
closure receives the row and the field. Rows that return an empty value stay
outside any group:

```php
use Unicorn\Field\SqlListField;

$form->add('product_id', SqlListField::class)
    ->label('Product')
    ->table('products')
    ->setGroupBy(
        fn (object $item, SqlListField $field) => $item->region
    );
```

The rows with the same label are placed in one `<optgroup>`:

```html
<optgroup label="Europe">
  <option value="1">Berlin</option>
</optgroup>
```

## Multiple Selection

Call `multiple(true)` to select several rows. The submitted name becomes
`tag_ids[]`:

```php
$form->add('tag_ids', SqlListField::class)
    ->label('Tags')
    ->table('tags')
    ->multiple(true)
    ->size(8);
```

The saved value can be an array, a JSON string, or a comma-separated
string. The field normalizes all three when it renders the selection.

## Filtering the Query

`configureQuery()` receives the ORM query and the field. Return the query
with your conditions added. Returning `null` keeps the current query:

```php
$form->add('category_id', SqlListField::class)
    ->table('categories')
    ->configureQuery(
        fn ($query) => $query->where('state', 1)
    );
```

For filters that always apply, subclass the field and override
`prepareQuery()`. The field calls it on a clone of the query each time it
builds the options:

```php
use Unicorn\Field\SqlListField;
use Windwalker\Query\Query;

class ActiveCategoryField extends SqlListField
{
    protected function prepareQuery(Query $query): void
    {
        $query->where('state', 1);
    }
}
```

Use the subclass like the base field:

```php
$form->add('category_id', ActiveCategoryField::class)
    ->table('categories');
```

::: tip
A select renders every row it loads into the page. For large tables, use
[ModalField](./modal-field) or [CascadeSelect](./cascade-select) instead.
:::

## Options and Attributes

`addOptions()` adds fixed options before the rows from the table. Use
`createOption()` to build an option with a custom value:

```php
$form->add('category_id', SqlListField::class)
    ->table('categories')
    ->addOptions([
        SqlListField::createOption('All categories', ''),
        SqlListField::createOption('Uncategorized', 0),
    ]);
```

`optionAttrs()` sets attributes on every option that comes from the table:

```php
$form->add('category_id', SqlListField::class)
    ->table('categories')
    ->optionAttrs(['data-type' => 'article']);
```

## Options Reference

`SqlListField` adds the following methods to build its option list from a
database table. Each setter returns the field for chaining.

| Method | Description | Default |
|--------|-------------|---------|
| `textField()` | Sets the column used as the option text. | `title` |
| `getTextField()` | Returns the column used as the option text. | `title` |
| `valueField()` | Sets the column used as the option value. | `id` |
| `getValueField()` | Returns the column used as the option value. | `id` |
| `optionAttrs()` | Sets extra HTML attributes applied to each option. | — |
| `getOptionAttrs()` | Returns the extra HTML attributes for each option. | — |
| `table()` | Sets the database table to query. | `null` |
| `getTable()` | Returns the database table to query. | `null` |
| `indentByField()` | Sets the column used to calculate tree indentation. | `level` |
| `getIndentByField()` | Returns the column used to calculate tree indentation. | `level` |
| `setGroupBy()` | Sets a closure that returns the option group of each item. | `null` |
| `getGroupBy()` | Returns the closure that returns the option group. | `null` |
| `configureQuery()` | Sets a callback that modifies the query. | — |
| `autoSelection()` | Sets how columns are selected automatically in the query. | `.` |
| `getAutoSelections()` | Returns the automatic column selection setting. | `.` |
| `getItems()` | Returns the query rows used to build the options. | — |

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

## Related

- [FlatList](./flat-list)
- [StateList](./state-list)
- [ModalField](./modal-field)
- [CascadeSelect](./cascade-select)
- [Unicorn Form Fields](../field-generation)
