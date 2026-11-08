---
layout: doc
title: Nested Sets
component: orm
---

# Nested Sets

A nested set stores a tree in an ordinary table. Each node keeps a left and a
right value, and the subtree of a node is every row whose values lie between
its own. Reading a whole branch is then one range query, and no recursive
query is needed. Categories, menus, and organization charts are typical
uses. The price is that inserting or moving a node updates the values of
many rows, so trees that change often cost more to write.

`#[NestedSet]` marks an entity as a tree node and selects the
`NestedSetMapper`, which provides the tree operations.

## Minimal Setup

The entity implements `NestedPathableInterface` and uses
`NestedPathableTrait`. The trait adds the `lft`, `rgt`, `level`, `parent_id`,
`alias`, and `path` columns.

```php
use Windwalker\ORM\Attributes\AutoIncrement;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\NestedSet;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Nested\NestedPathableInterface;
use Windwalker\ORM\Nested\NestedPathableTrait;

#[NestedSet('categories')]
class Category implements NestedPathableInterface
{
    use NestedPathableTrait;

    #[Column('id'), PK, AutoIncrement]
    protected ?int $id = null;

    #[Column('title')]
    protected string $title = '';

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }
}
```

Get the mapper with `$orm->mapper(Category::class)`. The mapper returned
for a `#[NestedSet]` entity is a `NestedSetMapper`, so the tree methods
are available on it.

## Showcase

The following example builds a small tree and reads it back:

```php
use Windwalker\ORM\Nested\Position;

$mapper = $orm->mapper(Category::class);

$root = $mapper->createRootIfNotExist(['title' => 'Root']);

$news = new Category();
$news->setTitle('News');
$news = $mapper->appendTo($news, $root->getPrimaryKeyValue());

$sport = new Category();
$sport->setTitle('Sport');
$sport = $mapper->appendTo($sport, $news->getPrimaryKeyValue());

// Every node under Root, in tree order
$tree = $mapper->getTree($root->getPrimaryKeyValue());

// The ancestors of Sport, from the top down
$path = $mapper->getPath($sport->getPrimaryKeyValue());

// Move News one position up among its siblings
$mapper->move($news, Position::MOVE_UP);
```

`createRootIfNotExist()` creates the root node only when no node matches
the condition fields. Its default is `['title']`, so calling it again with
the same title returns the existing root.

## Placing Nodes

A node is placed relative to a reference node. The placement methods take
the node to save and the ID of the reference.

- `appendTo()` adds the node as the last child of the reference.
- `prependTo()` adds the node as the first child of the reference.
- `putBefore()` places the node before the reference, as a sibling.
- `putAfter()` places the node after the reference, as a sibling.

```php
$mapper->prependTo($item, $news->getPrimaryKeyValue());

$mapper->putAfter($item, $sport->getPrimaryKeyValue());
```

`move()` shifts a node among its siblings. Pass `Position::MOVE_UP` or
`Position::MOVE_DOWN` as the delta, and it returns the node, or `false` when
the move is not possible.

## Reading the Tree

- `getTree()` returns the node and all of its descendants.
- `getPath()` returns the ancestors that form the path to a node.
- `getAncestors()` returns the ancestors of a node.
- `getRoot()` returns the root node.
- `isLeaf()` tells whether a node has no children.

The entity offers the same information through `getChildren()`,
`getAncestors()`, and `getTree()`, which return relation collections.

## Repairing the Tree

`rebuild()` recalculates the tree values (`lft`, `rgt`, and `level`).
For pathable trees, `rebuildPath()` recalculates the `path` values as well.

```php
$mapper->rebuild();
```

::: warning
The values are maintained by the operations of the mapper. A change that
bypasses it, such as an `UPDATE` in raw SQL, leaves the values inconsistent.
After such a change, call `rebuild()`.
:::

::: info
A table that holds several independent trees uses
`MultiTreeNestedEntityInterface` instead of `NestedPathableInterface`.
:::
