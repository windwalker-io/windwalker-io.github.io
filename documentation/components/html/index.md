---
layout: doc
title: HTML
part: Components
chapter: HTML
menu: components/html
component: html
---

# HTML

Windwalker HTML is a small set of helpers for generating HTML markup in PHP. It is meant for code that produces repeated structures, such as admin tables, key-value summaries, and data passed to inline scripts. Writing these by hand with string concatenation is repetitive and easy to break.

The package has two main parts. `Grid` builds HTML tables row by row, and `KeyValueGrid` is a specialized grid for two-column key and value lists. `HTMLHelper` provides static utilities for repairing HTML fragments and converting PHP values into JavaScript object literals.

Grid works with HTML strings, not with a document tree. Cell content is written as-is. If you need escaped, tree-based element building, use the [DOM](../dom/) package instead.

## Installation

Install via composer

```bash
composer require windwalker/html ^4.0
```

The package requires PHP 8.4.6 or later.

## Use as Standalone Component

Create a grid, register its columns, then add rows. Each cell is placed in the column with the same name:

```php
use Windwalker\Html\Grid\Grid;

$grid = Grid::create(['class' => 'table'])
    ->setColumns(['name', 'email']);

$grid->addHeaderRow()
    ->setRowCell('name', 'Name')
    ->setRowCell('email', 'Email');

$grid->addRow()
    ->setRowCell('name', 'Ann')
    ->setRowCell('email', 'ann@example.com');

echo $grid;
```

`HTMLHelper` is called statically and needs no object:

```php
use Windwalker\Html\Helper\HTMLHelper;

$js = HTMLHelper::getJSObject(['page' => 2, 'sort' => 'name']);

// {page:2,sort:"name"}
```

## Use in Windwalker

The package does not register services in the DI container. Create grids where you need them, for example inside a service class:

```php
use Windwalker\Html\Grid\Grid;

class UserTableRenderer
{
    public function render(array $users): string
    {
        $grid = Grid::create(['class' => 'table'])
            ->setColumns(['name']);

        foreach ($users as $user) {
            $grid->addRow()
                ->setRowCell('name', htmlspecialchars($user['name']));
        }

        return (string) $grid;
    }
}
```

The example escapes the user name before it reaches the cell. See [Grid](./grid) for the reason.

## Topic Pages

- [Grid](./grid): Table building with `Grid` and the two-column
  `KeyValueGrid`.
- [Helpers](./helpers): `HTMLHelper` for JavaScript object literals and
  best-effort HTML repair.

## Related components

- [DOM](../dom/): Builds and parses HTML as an element tree, with escaped
  output.
