---
layout: doc
title: Attributes
component: utilities
---

# Attributes

PHP attributes attach metadata to classes, properties, methods, and
constants. Reading them with raw Reflection takes several steps: fetch
the list, filter by name, walk up the parent classes, and instantiate
each match. `AttributesAccessor` performs these steps in one call, and
it accepts a class name, an object, or a reflector. Routing tables,
validation rules, and framework components all use this pattern.

## Minimal Setup

Define an attribute class, apply it, and read it back. No configuration is
needed:

```php
use Windwalker\Utilities\Attributes\AttributesAccessor;

#[\Attribute(\Attribute::TARGET_CLASS)]
class Route
{
    public function __construct(public string $path) {}
}

#[Route('/users')]
class UserController {}

$route = AttributesAccessor::getFirstAttributeInstance(
    UserController::class,
    Route::class,
);

echo $route->path; // /users
```

`getFirstAttributeInstance()` returns the attribute as an object, or
`null` when the class has no matching attribute.

## Showcase: Building a Route Table

The following example stores a route on each controller method, then
builds a table from the methods and calls one of them:

```php
use Windwalker\Utilities\Attributes\AttributesAccessor;

#[\Attribute(\Attribute::TARGET_METHOD)]
class Get
{
    public function __construct(public string $path) {}
}

class PostController
{
    #[Get('/posts')]
    public function index(): string
    {
        return 'list';
    }

    #[Get('/posts/show')]
    public function show(): string
    {
        return 'one post';
    }
}

$table = [];

foreach (
    AttributesAccessor::getMembersWithAttribute(
        PostController::class,
        Get::class,
    ) as [$method, $attr]
) {
    $table[$attr->newInstance()->path] = $method->getName();
}

$controller = new PostController();

echo $controller->{$table['/posts']}(); // list
```

`getMembersWithAttribute()` yields each member that carries the
attribute, as a reflector and its `ReflectionAttribute`. Call
`newInstance()` on the `ReflectionAttribute` to read the attribute's
arguments.

## Reading Class Attributes

The lookup functions accept the same three inputs:

- A class name, such as `UserController::class`.
- An object, such as `new UserController()`.
- A reflector, such as `new ReflectionProperty(...)`.

`getFirstAttribute()` returns a `ReflectionAttribute`, and
`getFirstAttributeInstance()` returns the attribute object. Both return
`null` when nothing matches.

Class lookups include attributes from parent classes. Pass
`ReflectionAttribute::IS_INSTANCEOF` as the third argument to also match
subclasses of the attribute:

```php
AttributesAccessor::getAttributesFromAny(
    ChildController::class,
    Route::class,
    \ReflectionAttribute::IS_INSTANCEOF,
);
```

Attribute names are compared case-insensitively when you use
`runAttributeIfExists()`.

## Members of a Class

`getMembersWithAttribute()` scans constants, properties, and methods of a
class, and the cases of an enum. The generator yields an array, keyed by
the member's name:

```php
foreach (
    AttributesAccessor::getMembersWithAttribute(
        UserController::class,
        Route::class,
        0,
        \ReflectionMethod::class,
    ) as $name => [$method, $attr]
) {
    // Only methods are considered.
}
```

The fourth argument filters the members. It accepts a reflector class
name, such as `\ReflectionMethod::class`, or a closure that receives the
member and the attribute and returns `true` to keep the match.

`getFirstMemberWithAttribute()` takes the same arguments and returns the
first match as `[$member, $attribute]`, or `null`.

## Running a Handler

`runAttributeIfExists()` calls a handler for each matching attribute. The
handler receives the attribute object and the source value. The method
returns how many attributes matched:

```php
$count = AttributesAccessor::runAttributeIfExists(
    UserController::class,
    Route::class,
    function (Route $route, string $source): void {
        // Register $route for $source.
    },
);
```

This is useful when you want to act on every match, not only the first.

## Scanning a Directory

`scanDirAndRunAttributes()` reads all PHP files in a directory, loads
each class, and runs a handler for the classes that carry the attribute.
It returns the match count for each class name:

```php
$results = AttributesAccessor::scanDirAndRunAttributes(
    Route::class,
    __DIR__ . '/Controller',
    'App\\Controller',
    fn (Route $route, string $class, $file) => register($route, $class),
);
```

::: info
This method needs the `windwalker/filesystem` package. Without it, the
method throws a `DomainException`.
:::

## Trait Options

A trait often needs settings that differ for each class that uses it.
`TraitOptions` is a class-level attribute that stores those settings,
keyed by trait name. A trait reads them with `TraitOptions::getOption()`:

```php
use Windwalker\Utilities\Attributes\TraitOptions;

#[TraitOptions(['Cacheable' => ['ttl' => 300]])]
class ProductService
{
    // use Cacheable;
}

TraitOptions::getOption(ProductService::class, 'Cacheable', 'ttl');
// 300
```

`getOptions()` returns all options of one trait, and `getAllOptions()`
returns the options of every trait. Missing values return `null` or an
empty array.

::: info
The results are cached for each class in the current process, so the
attribute is read only once per class.
:::

## The Prop Attribute

`Prop` is a marker for properties. It has no methods and no arguments.
The Edge component reads it to recognize the properties of a component
class. Apply it to a property, and find marked properties with
`getMembersWithAttribute()`:

```php
#[Prop]
public string $title = '';
```

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `getFirstAttribute()` | `$value, $attributeClass, $flags = 0` | First matching `ReflectionAttribute`, or `null`. |
| `getFirstAttributeInstance()` | `$value, $attributeClass, $flags = 0` | First matching attribute object, or `null`. |
| `getAttributesFromAny()` | `$value, ?$name = null, $flags = 0` | All matching `ReflectionAttribute`s, including parents. |
| `runAttributeIfExists()` | `$valueOrAttrs, $attributeClass, $handler, $options = 0` | Runs a handler for each match and returns the count. |
| `getMembersWithAttribute()` | `$ref, $name, $flags = 0, $filter = null` | Generator of `[$member, $attribute]`, keyed by member name. |
| `getFirstMemberWithAttribute()` | `$ref, $name, $flags = 0, $filter = null` | First `[$member, $attribute]`, or `null`. |
| `scanDirAndRunAttributes()` | `$attributeClass, $dir, $namespace, $handler, $options = 0` | Scans a directory and returns match counts per class. |
| `TraitOptions::getOption()` | `$class, $traitName, $name` | One option of a trait, or `null`. |
| `TraitOptions::getOptions()` | `$class, $traitName` | All options of a trait. |
| `TraitOptions::getAllOptions()` | `$class` | Options of every trait, keyed by trait name. |
| `TraitOptions::findAttribute()` | `$class` | The `TraitOptions` instance of a class, or `null`. |

## Related

- [Dump Attributes](./dump-attributes): attributes that control which
  properties appear in object dumps.
- [Enum Attributes](./enum-attributes): attributes that add titles, icons,
  and colors to enum cases.
