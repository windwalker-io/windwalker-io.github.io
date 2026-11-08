---
layout: doc
title: Record
part: Components
chapter: Data
menu: components/data
component: data
---

# Record

An array carries no type information. When a request body or a database
row is passed as an array, every consumer must check which keys exist and
which types they have. A `Record` is a class instead. It declares the
fields with types and default values, so the rest of the code can rely on
them. `Record` also fills itself from an array or an object, creates
changed copies, and controls how it is converted to JSON.

`Record` is built from the `RecordTrait` trait. You can use the trait in
your own base class if you already extend another class.

## Defining a Record

Extend `Record` and declare the fields as typed public properties. A
constructor is optional. When it exists, its parameter names are used to
pass values from the array when the object is wrapped:

```php
use Windwalker\Data\Record;

class Customer extends Record
{
    public string $name = '';

    public string $tier = 'basic';

    public array $tags = [];

    public function __construct(string $name = '')
    {
        $this->name = $name;
    }
}

$customer = Customer::wrap(['name' => 'Rose', 'tier' => 'gold']);
```

## Showcase

The example below creates a customer from a request array, creates a
changed copy for an upgrade, applies defaults, and encodes the result as
JSON. The `password` property is excluded from the JSON output:

```php
use Windwalker\Data\Record;
use Windwalker\ORM\Attributes\JsonNoSerialize;

class Customer extends Record
{
    public string $name = '';

    public string $tier = 'basic';

    public array $tags = [];

    #[JsonNoSerialize]
    public string $password = '';
}

$customer = Customer::wrap([
    'name' => 'Rose',
    'tier' => 'gold',
    'password' => 'secret',
]);

$upgraded = $customer->with(tier: 'platinum');

$customer = $customer->withDefaults(
    ['tier' => 'basic', 'tags' => ['new']],
    true
);

echo $customer->tier;    // gold
echo $upgraded->tier;    // platinum
echo json_encode($customer);
// {"name":"Rose","tier":"gold","tags":["new"]}
```

The JSON output does not contain `password`, because the attribute
`#[JsonNoSerialize]` removes it. The attribute comes from
`windwalker/orm`, so that package must be installed in the project. Use
`#[JsonSerializer]` with a callable to transform a value during
serialization instead of removing it.

## Wrapping Data

`wrap()` creates an instance from an array, an object, or `null`. When
the value is already an instance of the class, `wrap()` returns it
unchanged:

```php
$same = Customer::wrap($customer);     // same instance
$copy = Customer::wrap($customer, true); // cloned instance
```

Use `wrapWith()` when the arguments are written as named parameters. It
always returns a clone, so the original object is never changed:

```php
$rose = Customer::wrapWith(name: 'Rose', tier: 'gold');
```

`tryWrap()` and `tryWrapWith()` return `null` when the input is `null`,
which is useful for optional data.

## Changing a Record

A record has two styles of change:

- In-place methods, such as `fill()`, `merge()`, and `defaults()`, change
  the current object and return `$this`.
- Copy methods, such as `with()`, `withMerge()`, and `withDefaults()`,
  return a changed clone and keep the original object.

```php
$customer->merge(['name' => 'Sakura']);

$updated = $customer->withMerge(['tier' => 'silver']);
```

`merge()` assigns each value to a property with the same name. It skips
private, protected, and readonly properties. This protects a record from
mass assignment: a request array cannot overwrite an internal field such
as an account ID or a role, even when the array contains that key.

::: warning
Copy methods such as `with()` and `withMerge()` do not change the
original object. If you call them without using the result, nothing
happens. PHP marks these methods with `#[\NoDiscard]`, so a discarded
result triggers a warning:

```php
$customer->with(tier: 'platinum'); // no effect

$customer = $customer->with(tier: 'platinum'); // correct
```
:::

### Merging Recursively

Set the second argument to `true` to merge nested arrays and nested
records instead of replacing them. Set the third argument to `true` to
skip `null` values:

```php
$base = Customer::wrap(['tags' => ['vip' => true]]);

$merged = $base->withMerge(
    ['tags' => ['trial' => true], 'name' => null],
    true,
    true
);

// tags: ['vip' => true, 'trial' => true]
// name: unchanged, because null was skipped
```

### Defaults

`defaults()` and `withDefaults()` fill in values that are missing or
`null`. Existing non-null values always win. Pass `true` as the second
argument to merge arrays recursively, so an empty list receives the
default items:

```php
$customer = Customer::wrap(['tier' => 'gold']);

$customer->defaults(['tier' => 'basic', 'tags' => ['new']], true);

echo $customer->tier;                // gold
echo json_encode($customer->tags);   // ["new"]
```

## Converting Records

`dump()` returns an array of the properties. Pass `true` to convert nested
records as well. `as()` converts the record into another record class.
It calls that class's `wrap()` method:

```php
$array = $customer->dump();

$other = $customer->as(OtherCustomer::class);
```

::: info
`Record` assigns values directly to the properties. It does not call
setters or apply `#[Cast]` attributes. Assigning a value of the wrong
type throws a `TypeError`, because the trait is written with strict types:

```php
Customer::wrap(['tier' => 1]);
// TypeError: Cannot assign int to property Customer::$tier of type string
```

Convert the value before you wrap it, or use an ORM `#[Cast]` attribute
on an entity column when the data comes from the database.
:::

When an ORM entity column uses a `Record` class as its cast target, the
ORM calls `wrap()` on the stored value:

```php
use Windwalker\ORM\Attributes\Cast;
use Windwalker\ORM\Attributes\Column;
use Windwalker\ORM\Attributes\PK;
use Windwalker\ORM\Attributes\Table;

#[Table('flowers')]
class FlowerEntity
{
    #[Column('id'), PK]
    public ?int $id = null;

    #[Column('meta'), Cast(FlowerMeta::class)]
    public ?FlowerMeta $meta = null;
}
```

## Undeclared Keys

A key that has no matching property is a dynamic property. PHP 8.2 and
later report a deprecation for each one. Declare every field in the class
instead of relying on undeclared keys:

```php
#[\AllowDynamicProperties]
class LooseCustomer extends Record {}
```

## ValueObject

`ValueObject` is the older base class for data objects. It runs setters
and `#[Cast]` attributes when it hydrates. It is deprecated, so write new
code with `Record` and convert values in your own methods.
