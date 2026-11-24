---
layout: doc
title: Tree Node
description: Build and walk in-memory trees from flat parent/child rows with Luna's Node and TreeBuilder.
---

# Tree Node

Hierarchical data is stored flat. A category table, a role table, or a menu table keeps one row per item with a `parent_id` column, but a template needs a nested structure to render a breadcrumb, a sidebar, or an indented `<select>`. Luna's tree package turns those flat rows into a tree of `Node` objects that you can walk, filter, and inspect without writing recursive loops by hand.

Luna uses the same tree internally. The ACL role tree and the database menu tree are both built with `TreeBuilder`.

## Building a Tree

`TreeBuilder::create()` takes flat rows and returns the root `Node`. Each node wraps one row in its `value`, and the root wraps nothing unless you pass a root item.

```php
use Lyrasoft\Luna\Tree\TreeBuilder;

$items = [
    (object) ['id' => 2, 'parent_id' => 1, 'title' => 'News'],
    (object) ['id' => 3, 'parent_id' => 1, 'title' => 'Blog'],
    (object) ['id' => 4, 'parent_id' => 2, 'title' => 'Sports'],
];

$root = TreeBuilder::create($items);

$root->getValue(); // null, the virtual root
$root->getChild(0)->getValue()->title; // 'News'
$root->getChild(0)->getChild(0)->getValue()->title; // 'Sports'
```

The default `root` is `1`: rows whose `parent_id` is `1` become the root's direct children. Items must be objects or arrays, and the key and parent columns default to `id` and `parent_id`.

## Complete Example

This example renders a nested `<ul>` from category rows, then prints a breadcrumb for one of them.

```php
use Lyrasoft\Luna\Tree\Node;
use Lyrasoft\Luna\Tree\TreeBuilder;

$categories = [
    (object) ['id' => 2, 'parent_id' => 1, 'title' => 'News'],
    (object) ['id' => 3, 'parent_id' => 1, 'title' => 'Blog'],
    (object) ['id' => 4, 'parent_id' => 2, 'title' => 'Sports'],
    (object) ['id' => 5, 'parent_id' => 4, 'title' => 'Football'],
];

$root = TreeBuilder::create($categories);

function renderList(Node $node): string
{
    if ($node->isLeaf()) {
        return '';
    }

    $html = '<ul>';

    foreach ($node->getChildren() as $child) {
        $html .= '<li>' . $child->getValue()->title;
        $html .= renderList($child);
        $html .= '</li>';
    }

    return $html . '</ul>';
}

echo renderList($root);

// Breadcrumb: News > Sports > Football
$football = $root->getChild(0)->getChild(0)->getChild(0);

// Drop the virtual root, whose value is null.
$path = array_slice($football->getAncestorsAndSelf(), 1);

echo implode(' > ', array_map(
    static fn(Node $node) => $node->getValue()->title,
    $path
));
```

The first ancestor is always the root node. Its value is `null` unless you passed a root row, so skip it when you print a breadcrumb.

## Customizing the Builder

Use named arguments to change how rows are matched. A string names a property or array key, and a closure receives the row and returns the value.

```php
use Lyrasoft\Luna\Tree\TreeBuilder;

// Different column names.
$root = TreeBuilder::create($items, 'category_id', 'up_id');

// Closures, for example with entity objects or computed keys.
$root = TreeBuilder::create(
    $roles,
    static fn(UserRole $role) => $role->id,
    static fn(UserRole $role) => $role->parentId,
);

// Use a different root id.
$root = TreeBuilder::create($items, root: 10);

// Use a row as the root. Its value becomes the root node value.
$root = TreeBuilder::create($items, root: $rootRow);

// Use a custom Node subclass for every node.
$root = TreeBuilder::create($items, nodeClass: MyNode::class);
```

Rows are skipped silently, not reported, in these cases:

- The key is `null`.
- The parent is `null` or an empty string.
- The row is its own parent.
- The parent is neither another row nor the root id.

::: warning
When the table contains its own root row, for example a nested-set root, do not pass it in `$items` with `root: <id>`. The row would become a child and the real children would attach to it. Remove the root row from the items, or pass the row itself as `root`, as `MenuService::createTree()` does.
:::

## Working with Nodes

`Node` is the tree object. These are the members you normally use.

```php
use Lyrasoft\Luna\Tree\Node;

// Create a tree by hand. Raw values are wrapped in Node objects.
$root = new Node('root', [
    new Node('a', [new Node('a1'), new Node('a2')]),
    'b',
]);

$a = $root->getChild(0);       // Children are indexed from 0.
$root->getChild(9);            // null when the index is missing.

// Modify children. A node keeps its parent in sync.
$root->addChild('c');
$root->removeChild($a);        // Resets the child's parent to null.
$root->setChildren([new Node('x')]); // Detaches the old children.
$root->removeAllChildren();

// Read values.
$root->getValue();             // 'root', or the $root->value property
$root->getChildValues();       // Values of direct children only.
$root->childValues;            // Same, as a property.

// Position in the tree.
$leaf->getParent();
$leaf->getRoot();              // Topmost ancestor, or itself.
$leaf->getAncestors();         // Root first, excludes the node.
$leaf->getAncestorsAndSelf();  // Root first, includes the node.
$leaf->getNeighbors();         // Siblings, without the node.
$leaf->getNeighborsAndSelf();  // Siblings, with the node.

// Questions about the node.
$leaf->isRoot();
$leaf->isLeaf();               // No children.
$leaf->hasChildren();          // The opposite of isLeaf().
$leaf->getDepth();             // Edges to the root. Root is 0.
$root->getHeight();            // Longest path below the node.
$root->getSize();              // The node plus all descendants.
```

`value`, `parent`, and `children` are public read-only properties. Change them through the methods above so parent links stay consistent.

::: warning
`getNeighbors()` and `getNeighborsAndSelf()` read the parent's children, so calling them on a root node throws an error. Check `isRoot()` first.
:::

### Reading Values Through the Node

A node forwards unknown property access and method calls to its value. This lets a template treat a node like the row it wraps.

```php
$node = $root->getChild(0);

echo $node->title;       // Reads $node->getValue()->title
$node->title = 'Latest'; // Writes to the value
isset($node->title);
$node->getUrl();         // Calls the same method on the value
```

This works only when the value is an object. With a scalar or array value, use `getValue()` instead.

## Iterating a Tree

A node is iterable. Iteration walks every descendant depth-first, parent before children, and does not include the node itself.

```php
foreach ($root->iterate() as $node) {
    echo str_repeat('— ', $node->getDepth() - 1);
    echo $node->getValue()->title . "\n";
}

// foreach ($root as $node) works the same way.
```

Use `getDepth()` to indent a flat list, for example in a `<select>` that shows categories as a tree. The depth of a first-level item is `1`, because the virtual root is depth `0`.

### Filtering

`filterChildren()` removes every descendant for which the callback returns false, together with its subtree.

```php
// Keep only published items.
$root->filterChildren(
    static fn(Node $node) => $node->getValue()->state === 1
);
```

::: info
A filter checks each node separately. A published child below an unpublished parent is removed with that parent.
:::

## Exporting

`dump()` returns the node as an array, including `value`, `children`, and `parent`. `Node` also implements `JsonSerializable`, and `json_encode()` uses the same dump with the parent removed.

```php
$array = $root->dump();             // Recursive, with parent links.
$array = $root->dump(true, true);   // Recursive, without parents.
$array = $root->dump(false);        // Only this node's data.

echo json_encode($root);            // No parent, so no recursion.
```

::: warning
Every child holds a reference to its parent. Passing a node with parent links to `var_dump()`, `print_r()` of a dump, or a serializer without cycle handling can recurse without end. Use `dump(true, true)` or `json_encode()`.
:::

## Related

- [Roles and Actions](./acl/roles-and-actions.md)
- [Database Menus](./menu/database-menus.md)
