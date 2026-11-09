---
layout: doc
title: Accessing Members
part: Components
component: test
---

# Accessing Members

Some classes keep state in private or protected properties, and some
behavior lives in private methods. Testing only through the public API is
the preferred approach, but a unit test sometimes needs to set up a state
or check an internal value that the public API does not expose. The
`TestAccessorTrait` provides `getValue()`, `setValue()`, and `invoke()` for
these cases. They delegate to `ReflectAccessor` in `windwalker/utilities`,
which reads the member through reflection and ignores its visibility.

## Minimal Setup

Add the trait to a test case, then call the methods on the test instance:

```php
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\TestAccessorTrait;

class CounterTest extends TestCase
{
    use TestAccessorTrait;
}
```

## Showcase: Setting Up a Private State

The following test prepares a private counter, runs a private method, and
checks the result. The `Counter` class is the code under test:

```php
use App\Counter;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\TestAccessorTrait;

class CounterTest extends TestCase
{
    use TestAccessorTrait;

    #[Test]
    public function incrementAddsToPrivateCount(): void
    {
        $counter = new Counter();

        $this->setValue($counter, 'count', 10);
        $this->invoke($counter, 'increment', 5);

        self::assertEquals(15, $this->getValue($counter, 'count'));
    }
}
```

## Reading and Writing Properties

- `getValue(object $obj, string $name)` returns the value of a property,
  whatever its visibility.
- `setValue(object $obj, string $name, mixed $value)` assigns a value to a
  property.

```php
$this->setValue($cache, 'driver', $driverStub);

$items = $this->getValue($cache, 'items');
```

The methods declare `ReflectionException` in their docblocks, so a missing
property or method fails the test with that exception.

## Calling Methods

`invoke(object $obj, string $method, ...$args)` calls a method, including a
private one, and returns its result:

```php
$key = $this->invoke($router, 'normalizePath', '/Users/');

self::assertEquals('/users', $key);
```

## Notes on Use

::: warning
Reflection bypasses visibility, so a test that changes private state can pass
while the public behavior is broken. Use these helpers to set up a state that
the public API cannot reach, and assert the public behavior whenever you can.
:::

The class `TestHelper` in this package is deprecated. It extends
`ReflectAccessor`, so new tests should use the trait or call
`Windwalker\Utilities\Reflection\ReflectAccessor` directly.
