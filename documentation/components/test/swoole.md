---
layout: doc
title: Swoole Tests
part: Components
component: test
---

# Swoole Tests

Some Windwalker code runs asynchronously on the Swoole event loop, such as
async promises and reactor-based operations. A plain test cannot observe the
result of a callback that runs later on that loop. The `SwooleTestTrait`
adds helpers that run the loop once and skip the test when Swoole is not
available. This is an optional add-on: you only need it for tests that use
Swoole, and the other traits do not depend on it.

## Minimal Setup

Add the trait to a test case. Call `skipIfSwooleNotInstalled()` at the start
of each test that needs Swoole:

```php
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\Reactor\SwooleTestTrait;

class AsyncTest extends TestCase
{
    use SwooleTestTrait;
}
```

## Showcase: Waiting for a Coroutine

The following test starts a coroutine, lets the event loop run once, and then
checks the value that the coroutine set:

```php
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Windwalker\Test\Traits\Reactor\SwooleTestTrait;

class AsyncTest extends TestCase
{
    use SwooleTestTrait;

    #[Test]
    public function coroutineSetsValueBeforeAssertion(): void
    {
        static::skipIfSwooleNotInstalled();

        $result = null;

        go(
            function () use (&$result) {
                $result = 'Sakura';
            }
        );

        $this->nextTick();

        self::assertEquals('Sakura', $result);
    }
}
```

## Helpers

- `nextTick()` runs `Swoole\Event::wait()` when the Swoole extension is
  loaded. Call it after you start asynchronous work and before you assert
  its result.
- `swooleEnabled()` returns `true` when the `swoole` extension is loaded.
- `skipIfSwooleNotInstalled()` skips the test unless the environment
  variable `SWOOLE_ENABLED` is set, and unless Swoole 6.0.0 or later is
  installed.

The environment variable is a switch for the test run, so set it in
`phpunit.xml` for the suites that need Swoole:

```xml
<php>
    <env name="SWOOLE_ENABLED" value="1" />
</php>
```

::: warning
`Event::wait()` returns only when the event loop has no pending events. A
timer that never stops keeps `nextTick()` from returning, and the test run
hangs. Stop timers before the call, or avoid them in tests.
:::
