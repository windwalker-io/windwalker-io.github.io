---
layout: doc
title: Grid
part: Components
chapter: HTML
menu: components/html
component: html
---

# Grid

Admin screens often render tables whose columns are known only at runtime. A
column list may come from configuration, from user permissions, or from a
form. Building those tables with nested loops and string concatenation mixes
the table structure with the cell content. `Grid` separates the two. You
declare the columns once, then add rows and set cells by column name. The
grid takes care of the table, header, footer, and row order.

## Minimal Setup

A grid is created with the attributes of the `<table>` tag. Columns are
registered with `setColumns()` or `addColumn()`:

```php
use Windwalker\Html\Grid\Grid;

$grid = Grid::create(['class' => 'table'])
    ->addColumn('id')
    ->addColumn('name');
```

Column order is the order in which they are registered. Use `setColumns()`
to replace the whole list, which is useful for reordering.

## Showcase

The following example renders a user list with a header, a footer, and an
escaped name column:

```php
use Windwalker\Html\Grid\Grid;

$users = [
    ['id' => 1, 'name' => 'Ann <admin>', 'role' => 'editor'],
    ['id' => 2, 'name' => 'Tom', 'role' => 'viewer'],
];

$esc = fn(string $s) => htmlspecialchars(
    $s,
    ENT_QUOTES | ENT_HTML5,
    'UTF-8'
);

$grid = Grid::create(['class' => 'table', 'id' => 'users'])
    ->setColumns(['id', 'name', 'role']);

$grid->addHeaderRow()
    ->setRowCell('id', 'ID')
    ->setRowCell('name', 'Name')
    ->setRowCell('role', 'Role');

foreach ($users as $user) {
    $grid->addRow(['data-id' => $user['id']])
        ->setRowCell('id', (string) $user['id'])
        ->setRowCell('name', $esc($user['name']))
        ->setRowCell('role', $esc($user['role']), ['class' => 'role']);
}

$grid->addFooterRow()
    ->setRowCell('id', 'Total: 2', ['colspan' => 3]);

echo $grid;
```

The output contains a `<thead>`, a `<tbody>`, and a `<tfoot>`. Each
`addRow()` call makes the new row the active row, and `setRowCell()` writes
into the active row. Header and footer rows are kept in their own areas, so
they are rendered outside the body regardless of when they were added.

```html
<table class="table" id="users"><thead>
	<tr>
		<th>ID</th>
		<th>Name</th>
		<th>Role</th>
	</tr>
</thead><tbody>
	<tr data-id="1">
		<td>1</td>
		<td>Ann &lt;admin&gt;</td>
		<td class="role">editor</td>
	</tr>
	...
```

::: warning
Cell content is written into the markup without escaping. The `$esc()`
helper in the showcase is required when a value comes from user input,
a database, or an API. Without it, `<script>` or event attributes in the
data are rendered as live HTML.
:::

## Rows and Areas

Rows belong to one of three areas: the body, the header (`<thead>`), or the
footer (`<tfoot>`). Use the following methods to add them:

- `addRow()`: adds a body row.
- `addHeaderRow()`: adds a row to the header area.
- `addFooterRow()`: adds a row to the footer area.

Each method accepts the row attributes as an array. `addRow()` also accepts
a row type as its second argument, which is what the header and footer
helpers use internally.

Rows can be read and changed by ID. `getRows()` returns the IDs of body rows,
or of header and footer rows when you pass `Grid::ROW_HEAD` or
`Grid::ROW_FOOT`. `setActiveRow()` selects an existing row, and `deleteRow()`
removes one:

```php
$id = $grid->getActiveRow();

$grid->setActiveRow($id)
    ->setRowAttributes(['class' => 'active']);

$grid->deleteRow($id);
```

## Cells

`setRowCell()` writes a cell in the active row. The third argument holds
the attributes for the `<td>` or `<th>` element:

```php
$grid->setRowCell('role', 'Editor', ['class' => 'role']);
```

The fourth argument controls how repeated calls behave. By default
(`true`), the cell content is replaced. Pass `false` to append to the
existing content instead:

```php
$grid->setRowCell('name', 'Ann');
$grid->setRowCell('name', ' (admin)', [], false);

// Cell content: "Ann (admin)"
```

Cell attributes are replaced on each call, even when the content is
appended.

Use `setDirectlyRowCell()` to write into a row that is not the active row.
Its first argument is the row ID:

```php
$grid->setDirectlyRowCell(
    $headerRowId,
    'name',
    'Full name'
);
```

::: info
Only the registered columns are rendered, in the order they were
registered. A cell whose name is not a column is stored but not output.
:::

## Attributes

The attributes passed to `create()`, `addRow()`, and `setRowCell()` are
written as HTML attributes. Use `setTableAttributes()` to replace or merge
the table attributes, and `setRowAttributes()` for the active row.

```php
$grid->setTableAttributes(['class' => 'table-sm'], false);
```

The second argument merges the new attributes into the existing ones when
it is `false`, and replaces them when it is `true`.

::: warning
Attribute values are also written without escaping. A value that contains
a double quote breaks the markup, and a value from user input can add new
attributes. Escape such values with `htmlspecialchars()` before using them
in an attribute array.
:::

## KeyValueGrid

`KeyValueGrid` extends `Grid` with two fixed columns, `key` and `value`. It
suits settings pages, detail panels, and summaries:

```php
use Windwalker\Html\Grid\KeyValueGrid;

$grid = KeyValueGrid::create(['class' => 'table'])
    ->addHeader('Setting', 'Value')
    ->addItem('Debug', 'off')
    ->addItems(['Cache' => 'on', 'Timeout' => '30'])
    ->addTitle('Advanced')
    ->addItem('Locked', false);

echo $grid;
```

`addItems()` takes an associative array and adds one row per entry. `addTitle()` adds a single row that spans both columns. Passing
`false` as the value of `addItem()` renders a row with the key only, which
is how `addTitle()` builds its row.

Values are inserted like cell content, so the same escaping rule applies.
An array or object value is converted with `print_r()` before it is
written. Convert values to strings yourself when you need a specific
format:

```php
$grid->addItem('Tags', implode(', ', $tags));
```

::: warning
`KeyValueGrid` writes values without escaping, the same as `Grid`. Escape
values from user input before passing them to `addItem()`.
:::

The `Grid` and `KeyValueGrid` classes in the `Windwalker\Html\Grid`
namespace list the complete method signatures.
