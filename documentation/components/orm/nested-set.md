---
layout: doc
title: Nested Sets
component: orm
---

# Nested Sets

A tree of categories, menu items, or permission nodes is usually stored with a
`parent_id` column. That is the adjacency list. Writing it is simple, but
reading a branch needs a recursive query, and finding every ancestor of a node
needs one query per level. A nested set stores the same tree with two extra
numbers per node, `lft` and `rgt`. Every descendant of a node has a value
between its `lft` and `rgt`. A whole branch, or the path to the root, is then
read with one range query and no recursion.

The price is on the write side. Inserting, moving, or deleting a node changes
the `lft` and `rgt` values of many other rows. A nested set therefore suits
trees that are read far more often than they change, such as navigation,
category listings, and permission trees.

`parent_id` is kept in the table. It is still the source of truth for the
direct parent of a node, and the mapper keeps it in step with the numbers.

```text
Root    lft 1, rgt 8
  News  lft 2, rgt 5
    Sport lft 3, rgt 4
  Blog  lft 6, rgt 7
```

Here the descendants of `News` are the rows with `lft` between 2 and 5, which
are `News` and `Sport`. A node is a leaf when `rgt - lft` is 1. `Sport`
qualifies, and `News` does not.

## Minimal Setup

Mark the entity with `#[NestedSet]`, and let it implement
`NestedPathableInterface`. The `NestedPathableTrait` adds the columns that the
mapper needs: `parent_id`, `lft`, `rgt`, `level`, `alias`, and `path`.

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

The `#[NestedSet]` attribute selects the `NestedSetMapper` for the entity.
Get the mapper with `$orm->mapper(Category::class)`, and call the tree
methods on it. The `NestedSet` attribute also accepts the names of the
relation properties, through its `options` argument. They default to
`children`, `ancestors`, and `tree`.

If the tree does not need paths, the entity can implement
`NestedEntityInterface` instead, and the `alias` and `path` columns are not
required.

## Showcase

The following example builds a small tree, reads it, and moves a node. Each
step uses the mapper, so the `lft` and `rgt` values stay consistent.

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

$blog = new Category();
$blog->setTitle('Blog');
$blog = $mapper->appendTo($blog, $root->getPrimaryKeyValue());

// Every node under Root, in tree order
$tree = $mapper->getTree($root->getPrimaryKeyValue());

// The path from Root down to Sport, including Sport
$path = $mapper->getPath($sport->getPrimaryKeyValue());

// Swap Blog with its previous sibling, News
$mapper->move($blog, Position::MOVE_UP);
```

After the move, `Blog` comes before `News`. The `move()` call returns the
moved node, or `false` when the node has no sibling in that direction.

## How the Values Are Stored

The mapper keeps four columns in step:

- `lft` and `rgt`: the left and right numbers of the node. A node contains
  every row whose `lft` lies between its own `lft` and `rgt`.
- `level`: the depth of the node. The root has level `0`.
- `parent_id`: the direct parent. The root has an empty parent, which is `NULL`
  or `0`, depending on the column definition.

For a pathable entity, `alias` is the segment of the node in its URL-like
path, and `path` is the full path from the root, such as `news/sport`. The
`createRoot()` method sets the root alias to `root`.

You do not set these columns yourself. Use the position methods, and the
mapper calculates them.

## Creating the Root

A tree has one root node. `createRoot()` inserts it with the data that you
pass.

```php
$root = $mapper->createRoot(['title' => 'Root']);
```

`createRootIfNotExist()` returns the root when one exists, and creates it
otherwise.

```php
$root = $mapper->createRootIfNotExist(['title' => 'Root']);
```

::: info
For a single tree, the lookup ignores the condition fields, so any existing
root is returned. The `$condFields` argument is used only by a multi-tree.
See [Multi-Tree](#multi-tree).
:::

Inserting a second root into a single tree raises a `NestedHandleException`
with the message `Root has already exists.`.

## Placing Nodes

Every insert and every move that names a reference places the node relative to
it. The mapper provides one method for each common position.

| Method | Position of the node | Use it to |
| --- | --- | --- |
| [prependTo](#prependto-and-appendto) | first child of the reference | add the first item of a group |
| [appendTo](#prependto-and-appendto) | last child of the reference | add an item at the end of a group |
| [putBefore](#putbefore-and-putafter) | sibling directly before the reference | insert between two siblings |
| [putAfter](#putbefore-and-putafter) | sibling directly after the reference | insert between two siblings |
| [moveByReference](#movebyreference) | any of the four, given as `NestedPosition` | place a node from a variable position |
| [move](#moving-nodes) | one sibling up or down | reorder siblings by one step |

### prependTo and appendTo

`prependTo()` places the node as the first child of the reference, and
`appendTo()` places it as the last child. Both take the node and the ID of the
reference. The `parent_id` of the node is set to the reference, and the level
becomes one more than the reference.

```php
$item = new Category();
$item->setTitle('Tech');

$item = $mapper->prependTo($item, $news->getPrimaryKeyValue());
```

For a node that is already saved, the same call moves it. The methods insert
a new node or move a saved one, depending on whether the node has a primary
key.

### putBefore and putAfter

`putBefore()` and `putAfter()` place the node next to the reference, as a
sibling with the same parent. The node takes the level of the reference.

```php
$item = $mapper->putAfter($item, $sport->getPrimaryKeyValue());

$item = $mapper->putBefore($item, $blog->getPrimaryKeyValue());
```

::: warning
The root has no siblings. `putBefore()` and `putAfter()` with the root as the
reference throw an `InvalidArgumentException`, with the message `Can not set
before a root node.` or `Can not set after a root node.`.
:::

### moveByReference

`moveByReference()` takes the position as a `NestedPosition` value. It is the
method behind the four helpers above, and it is useful when the position is
chosen at runtime.

```php
use Windwalker\ORM\Nested\Position;

$mapper->moveByReference(
    $item,
    $sport->getPrimaryKeyValue(),
    Position::LAST_CHILD,
);
```

The available values are `Position::BEFORE`, `Position::AFTER`,
`Position::FIRST_CHILD`, and `Position::LAST_CHILD`. Passing `null` as the
reference uses the last root node as the reference. The position is then
relative to that root node.

### Setting a Position Without Saving

The helpers above save the node at once. To set the position first and save
later, use the `setPosition()` family. These methods only record the reference
and the position on the entity.

```php
$mapper->setPositionAppendTo($item, $news->getPrimaryKeyValue());

$item->setTitle('Travel');

$mapper->saveOne($item);
```

The setters return the mapper, not the entity, so call them as statements.
The family is `setPosition()`, `setPositionAppendTo()`,
`setPositionPrependTo()`, `setPositionAfterOf()`, and
`setPositionBeforeOf()`. The position is applied only by `saveOne()` or
`saveMultiple()`. A save without a reference keeps the current position.

### Inserting Without a Reference

A new node saved without a reference is placed as the last child of its
`parent_id`. The `parent_id` must exist, as described in
[Safeguards](#safeguards).

## Moving Nodes

`move()` moves a node by one sibling. It takes the node and a direction, and it
looks only at the sign of the second argument.

- `Position::MOVE_UP` (`-1`) moves the node before its previous sibling.
- `Position::MOVE_DOWN` (`1`) moves the node after its next sibling.

```php
$mapper->move($news, Position::MOVE_DOWN);
```

The magnitude of the argument is ignored, so `move($news, 5)` is the same as
`move($news, 1)`. The value `0` throws an `InvalidArgumentException`. When the
node has no sibling in that direction, `move()` returns `false`. The optional
third argument limits the siblings that are considered.

To move a node to another parent, use `moveByReference()` or one of the
position helpers. `move()` only reorders siblings.

## Reading the Tree

The mapper provides these reads. Each returns the entities that the query
finds, and the entities are hydrated like any other.

- `getTree($pkOrEntity)` returns the node and all of its descendants, in
  tree order. The node itself is included.
- `getPath($pkOrEntity)` returns the path from the root down to the node. It
  includes the node itself.
- `getAncestors($pkOrEntity)` returns the ancestors of the node, from the root
  down. It does not include the node.
- `getRoot($conditions = [])` returns the root node, or `null`.
- `isLeaf($pkOrEntity)` tells whether the node has no children. It returns
  `false` when the node does not exist.

```php
$branch = $mapper->getTree($news->getPrimaryKeyValue());

$crumbs = $mapper->getPath($sport->getPrimaryKeyValue());

foreach ($crumbs as $crumb) {
    echo $crumb->getTitle(), ' / ';
}
```

The difference between `getPath()` and `getAncestors()` is the node itself.
Use `getPath()` for breadcrumbs, and `getAncestors()` when the node is not
needed.

### Children and Relations

A node loaded by a find method has three relation accessors. They are set up
when the node is hydrated, and each query runs only when it is read:

- `getChildren()` returns the direct children, found with `parent_id`, ordered
  by `lft`.
- `getAncestors()` returns the ancestors of the node.
- `getTree()` returns the node and its descendants.

```php
$category = $orm->mustFindOne(Category::class, $newsId);

foreach ($category->getChildren() as $child) {
    echo $child->getTitle();
}
```

The relations are not loaded with the node. A page that shows many nodes with
their children should read the tree once with `getTree()`, and group the rows
in PHP.

## Deleting Nodes

Deleting a node deletes its whole subtree. The `lft` and `rgt` values of the
remaining nodes are then shifted back, so the numbers stay without gaps.

```php
$orm->deleteBatch(Category::class, ['id' => $newsId]);
```

The mapper runs the deletion of the children through the delete events, one
row at a time, when a delete listener exists. Without a listener, it deletes
the subtree with one statement. Either way, the gap is closed once, after the
outermost delete.

::: warning
Use `deleteOne()` or `deleteBatch()` to delete a node. `deleteBulk()` runs one
`DELETE` statement and dispatches no events. The subtree and the gap handling
are driven by the delete events, so a bulk delete leaves the `lft` and `rgt`
values inconsistent. Run `rebuild()` after such a change.
:::

## Safeguards

The mapper checks the tree before it writes. The following conditions raise
an error, and nothing is changed:

| Condition | Exception |
| --- | --- |
| Reference ID is negative | `NestedHandleException` |
| Reference of an insert is not found | `NestedHandleException` |
| `parent_id` is empty or invalid | `NestedHandleException` |
| `parent_id` does not exist | `NestedHandleException` |
| Node becomes its own parent | `NestedHandleException` |
| Node becomes a child of its own subtree | `NestedHandleException` |
| Second root in a single tree | `NestedHandleException` |
| `putBefore()` or `putAfter()` on the root | `InvalidArgumentException` |
| `move()` with `0` | `InvalidArgumentException` |

The checks protect the structure, but they do not validate your data. A title
or an alias can still be duplicated, and the checks cannot catch that.

## Repairing the Tree

`rebuild()` recalculates `lft`, `rgt`, and `level` from the `parent_id` values.
It keeps the order of the siblings, which is the order of their `lft` values
before the rebuild.

```php
// The whole tree, from the root
$mapper->rebuild();

// One subtree, from the given node
$mapper->rebuild($news);
```

Call `rebuild()` after a change that bypasses the mapper, such as a raw SQL
update or a bulk write, and when the tree was copied from another database.

::: info
`rebuild()` recalculates the numbers from the structure, so it can repair the
tree, but it cannot tell which change was intended. Check the `parent_id`
values first.
:::

For a pathable tree, `rebuildPath()` recalculates the `path` values from the
`alias` values of the nodes.

```php
$mapper->rebuildPath($news);
```

## Multi-Tree

A table can hold several independent trees, each with its own root. Such an
entity implements `MultiTreeNestedEntityInterface`, and it has a `root_id`
column that identifies the tree. Each tree then has its own root, and the
safeguard against a second root applies to each tree separately.

The methods are the same. Most queries of the mapper are limited to one tree
through `root_id`, so each tree is read and written on its own.

## Writing Around the Mapper

The tree values are kept consistent only by the mapper. The following writes
break the structure:

- `updateBulk()` or a raw `UPDATE` that changes `parent_id`.
- A raw `INSERT` or `DELETE` on the table.

After any of these, run `rebuild()`. For changes to the other columns, such as
the title, the mapper's `updateOne()` or `saveOne()` is the safe choice.
