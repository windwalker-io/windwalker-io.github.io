---
layout: doc
description: Field Generation page for Windwalker Unicorn.
---

# Field Generation

An edit form needs one field for each column that the record stores. Writing
these fields by hand is repetitive, because each one needs a type, a label,
and a translation key. The `build:form` command reads the columns of a
database table and writes the matching fields into an existing form class.
It chooses each field type from the column type, and it builds the labels
from a [translation key](/documentation/components/language/translation) prefix that you pass in.

The command works on the form class, not on the view. Generate the edit view
first, so the form class exists, and then run the command once to fill the
form. You can edit the generated fields like any hand-written field.

## Generating Fields from a Table

The command needs two things: a form class and a table. The form class is
created by `unicorn:view-edit` or `unicorn:mvc-admin`, such as
`ProductEditForm`. The table is created by a [migration](/documentation/framework/services/database/migrations). For the migration
and the module steps, see [Code Generation](/documentation/unicorn/mvc-crud/code-generation).

Pass the class name relative to the module namespace, and the table name as
the second argument:

```bash
php windwalker build:form Admin/Product/ProductEditForm products
```

- `class`: the form class under the module namespace, such as
  `Admin/Product/ProductEditForm`.
- `table`: the table name, such as `products`. Pass the table, not the entity
  class.
- `--connection` (`-c`): the database connection. Without it, the default
  connection is used.
- `--pkg` (`-p`): the package with composer name (`foo/bar`) whose `Module` namespace holds the class.
- `--ns`: the base namespace, used when `--pkg` is not given. The default is
  `App\Module`.

## How Field Types Are Chosen

The command maps each column to a field by its database type. Use this list
to predict the result:

- Auto-increment columns become `HiddenField`.
- `state` columns and `tinyint` columns of length 1 become `SwitcherField`.
- `datetime` and `timestamp` columns become `CalendarField`.
- Other `tinyint`, `int`, `bigint`, and `integer` columns become
  `NumberField`.
- `float` and `decimal` columns become `NumberField`. The `step()` value
  follows the column scale, so a scale of 2 gives `0.01`.
- `text`, `mediumtext`, and `longtext` columns become `TextareaField` with
  seven rows.
- Other columns become `TextField`.
- The `title` and `name` columns are also required and trimmed.
- JSON columns are skipped. Add their fields by hand.

## Complete Example

Assume a `product` table with a title, an alias, a `state`, a description, a
price, a creation date, a hit counter, and a SKU. Generate the admin module,
then run the command with a translation prefix:

```bash
php windwalker g unicorn:mvc-admin Admin/Product
php windwalker build:form Admin/Product/ProductEditForm product \
    --use-lang app.product.field
```

The `title` and `alias` fields already exist in the generated form, so the
command skips them. It adds the other columns to the `basic()` method,
which is the last `#[FormDefine]` method of the class:

> !review
> 補充，產生器會將 fields 放置到第一個偵測到的 `#[FormDefine]` 方法中，若沒有偵測到，另外可以補充找不到時的行為。

```php
// ProductEditForm.php, after build:form
#[FormDefine]
#[Fieldset('basic')]
#[NS('item')]
public function basic(Form $form): void
{
    $form->add('state', SwitcherField::class)
        ->label($this->trans('unicorn.field.published'))
        ->circle(true)
        ->color('success')
        ->defaultValue('1');

    $form->add('description', TextareaField::class)
        ->label($this->trans('unicorn.field.description'))
        ->rows(7);

    $form->add('price', NumberField::class)
        ->label($this->trans('app.product.field.price'))
        ->step('0.01');

    $form->add('created', CalendarField::class)
        ->label($this->trans('unicorn.field.created'));

    $form->add('hits', NumberField::class)
        ->label($this->trans('app.product.field.hits'));

    $form->add('sku', TextField::class)
        ->label($this->trans('app.product.field.sku'));
}
```

The command also adds the `use` statements for the field classes and for
`TranslatorTrait`, so the class needs no manual imports.

Some columns get no generated field:

- Columns that the class already defines. The `title` field above is kept.
- JSON columns. Add their fields by hand.
- Columns whose subscriber sets `code` to an empty string.

```php
// Existing field: the command leaves it unchanged.
$form->add('title', TextField::class)
    ->label($this->trans('unicorn.field.title'));

// JSON column: add the field by hand.
$form->add('options', TextareaField::class)
    ->label($this->trans('app.product.field.options'));

// Subscriber: skip the sku column completely.
$event->code = '';
```

## Field Labels and Translations

Each label comes from the first rule that matches:

- Unicorn keys: `id`, `title`, `alias`, `description`, `ordering`,
  `parent`, `delete`, `created`, `modified`, `modified_by`, `image`,
  `images`, and `type` use `unicorn.field.{column}`.
- Published state: `state` and `published` use `unicorn.field.published`.
  `created_by` uses `unicorn.field.author`.
- Prefix: other columns use `{prefix}.{column}`, when `--use-lang` is given.
- Column comment: without a prefix, the comment becomes the label.
- Column name: without a prefix or comment, the column name becomes title
  words, such as `Sku`.

```php
// Without --use-lang, the comment of the sku column becomes the label.
$form->add('sku', TextField::class)
    ->label('Stock Keeping Unit');
```

A comment that contains an `enum:` directive is not used as a label.

Pass `--use-lang` without a value to be prompted for the prefix:

```text
$ php windwalker build:form Admin/Product/ProductEditForm product \
    --use-lang
Language prefix: app.product.field
```

::: tip
Use a prefix that names the feature, such as `app.product.field`. The
keys then stay grouped in one language file section.
:::

## Re-running the Command

The command skips every column that already has a field in the class.
Existing fields are kept, so you can run the command again after you add a
column to the table. It then adds only the new field:

```text
$ php windwalker build:form Admin/Product/ProductEditForm product
Updated App\Module\Admin\Product\ProductEditForm to add fields:
  - stock
```

When no column is new, the command reports `No changes for ...` and writes
nothing new.

::: info
The command adds fields to the last method that has `#[FormDefine]` or is
named `define`. In a generated edit form, that is `basic()`, so the new
fields inherit its `#[Fieldset('basic')]` attribute. Move a field into
another method if it belongs elsewhere. A class without such a method gets
a new `define(Form $form)` method at the end.
:::

## Dry Run and Rewriting the File

The command rewrites the whole form class file. Add `--dry-run` (`-d`) to
print the same summary without writing the file:

```bash
php windwalker build:form Admin/Product/ProductEditForm product --dry-run
```

::: warning
The command rewrites the form class in place, and it prints the file again
from its syntax tree. Formatting and blank lines can change. Commit the
class first, and review the diff after you run the command.
:::

## Customizing a Field with an Event

The command emits a `BuildFormFieldEvent` for each column before it writes
the code. A [subscriber](/documentation/components/event/listeners) can change the label, or replace the generated code
for one column by setting `$event->code`. The replacement must be one
complete statement, with the indentation of the generated code:

```php
// app/Generator/SkuFormFieldSubscriber.php
namespace App\Generator;

use Unicorn\Form\Event\BuildFormFieldEvent;
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;
use Windwalker\Form\Field\TextField;

#[EventSubscriber]
class SkuFormFieldSubscriber
{
    #[ListenTo(BuildFormFieldEvent::class)]
    public function buildField(BuildFormFieldEvent $event): void
    {
        if ($event->column->getColumnName() !== 'sku') {
            return;
        }

        $event->formFieldsBuilder->addUse(TextField::class);

        $event->code = <<<PHP
        \$form->add('sku', TextField::class)
            ->label({$event->label})
            ->addFilter('trim')
            ->required(true);
PHP;
    }
}
```

The `label` property holds the quoted label expression, so insert it as
is. `addUse()` adds the import to the generated class.

## Related

- [Form Management](/documentation/unicorn/mvc-crud/mvc-admin/form-management)
- [Code Generation](/documentation/unicorn/mvc-crud/code-generation)
