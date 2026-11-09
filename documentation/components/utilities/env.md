---
layout: doc
title: Env
component: utilities
---

# Env

`Env` reads and sets environment values through the request arrays,
`$_SERVER` and `$_ENV`. Configuration often comes from these values, such
as database credentials or the application mode. Reading them directly
from the superglobals works, but each caller must repeat the same fallback
logic. `Env::get()` centralizes that logic, and `Env::set()` keeps the
arrays and the process environment in step.

## Minimal Setup

`Env` needs no setup. Read a value with an optional default:

```php
use Windwalker\Utilities\Env;

$mode = Env::get('APP_ENV', 'production');
```

If `APP_ENV` is not defined, the method returns `'production'`.

## Showcase: Configuring a Database Connection

The following example reads database settings with defaults, and then
applies a value at runtime, as a test might do:

```php
use Windwalker\Utilities\Env;

$connection = [
    'host' => Env::get('DB_HOST', '127.0.0.1'),
    'port' => (int) Env::get('DB_PORT', '3306'),
    'name' => Env::get('DB_NAME', 'app'),
];

Env::set('DB_NAME', 'app_test');

Env::get('DB_NAME'); // 'app_test'
```

`get()` returns strings, so cast the value when you need a number, as the
port does above.

## Reading and Writing

`get()` looks in `$_SERVER` first, then in `$_ENV`, and returns the default
when neither has the name. It does not call `getenv()`.

`set()` writes the value to `$_SERVER` and `$_ENV`, and also calls
`putenv()`. A value set with `set()` is therefore visible to `get()`, to
child processes, and to code that calls `getenv()`.

::: warning
Values read from the environment are strings, and `set()` accepts only
strings. Convert a value yourself before using it as a number or a boolean.
:::

## Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `get()` | `string $name, mixed $default = null` | Returns the value from `$_SERVER` or `$_ENV`, or the default. |
| `set()` | `string $name, string $value` | Writes the value to `$_SERVER`, `$_ENV`, and the process environment. |

## Related

- [Type Cast](./type-cast): converts the string values from `Env::get()`.
