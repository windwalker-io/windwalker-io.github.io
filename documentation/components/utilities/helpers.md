---
layout: doc
title: Helpers
component: utilities
---

# Helpers

The utilities package provides a set of global functions in the `Windwalker`
namespace, loaded by Composer. They are short shortcuts for operations that
appear throughout the framework: debugging output, wrapping values for
wrapper-aware APIs, generating IDs, and checking attributes or traits. The
`Env` class joins them here because it is a process-level helper of the same
kind. Each section below groups related functions and explains when to use
them.

Import a function with `use function`, or call it with its full name:

```php
use function Windwalker\uid;

$id = uid('order_');

$id = \Windwalker\uid('order_');
```

The `show()` function is in the global namespace, so it needs no import.

## Debugging Output

`show()` prints values in a print_r-like format, so you can read the
structure of arrays and objects while debugging. It is a global function, so
it needs no import, and it returns nothing. In the CLI the output goes to
standard output, and in a web request it goes to the output buffer.

```php
show($user);
```

```text
Array
(
    [id] => 1
    [name] => Alice
    [roles] => Array
        (
            [0] => admin
            [1] => editor
        )

)
```

### Labeling Values

Pass a named argument to label a value. The name is printed in brackets
above the value, which helps when several values are shown at once:

```php
show(user: $user, account: $account);
```

```text
[user]
Array
(
    [id] => 1
    ...
)

[account]
Account Object
(
    [email] => a@example.com
    ...
)
```

Unnamed values in a call with several arguments are labeled `[Value 1]`,
`[Value 2]`, and so on. A single unnamed value has no label.

### Limiting the Depth

Large structures can fill the screen with nested arrays. `show()` stops
expanding nested containers after a number of levels, and prints
`*MAX LEVEL*` in place of the deeper content. The default is 5. Pass a
`depth()` wrapper as an argument to choose another limit:

```php
show(depth(1), ['a' => ['b' => ['c' => 1]]]);
```

```text
Array
(
    [a] => Array
        (
            *MAX LEVEL*
        )

)
```

The depth counts expanded containers. The top-level array counts as the
first level, so `depth(2)` expands one nested level below it. `depth(0)`
expands no containers at all, so only `*MAX LEVEL*` is printed for the
top-level value's children.

::: info
The depth limit applies to nesting, not to the number of items. A flat array
with thousands of items is printed in full, so avoid showing very large lists.
:::

### Objects and Visibility

Protected and private properties are printed with their visibility after the
name, such as `[role:protected]` and `[id:private]`. This makes it easy to see
internal state without changing the class.

`is_stringable()` tells you whether a value can be turned into a string.
It returns `true` for scalars and for objects with `__toString()`, and
`false` for arrays and resources:

```php
is_stringable('abc');   // true
is_stringable([1]);     // false
```

`is_json()` returns `true` only for a string that holds valid JSON. A value
that is not a string returns `false` without parsing:

```php
is_json('{"a":1}'); // true
is_json('{a:1}');   // false
```

`is_scalar_or_null()` returns `true` for scalar values and `null`.

`count()` counts a value and never fails on `null`. `null` counts as `0`,
and a `Traversable` is counted by iterating it:

```php
count(null);                     // 0
count(new ArrayIterator([1, 2])); // 2
```

## Pipelines

`tap()` runs a callback for its side effect, and returns the original value.
Use it to log or inspect a value in the middle of an expression:

```php
$user = tap(loadUser($id), fn ($u) => logger()->debug('loaded', [$u]));
```

`pipe()` passes a value through a callback and returns the callback's
result. It is useful when a series of steps reads better than nested calls:

```php
$slug = pipe(
    $title,
    fn (string $t) => strtolower($t),
);
```

`piping()` returns a `Piping` object for a longer chain. Call `pipe()` and
`tap()` on it, and read the result from its `value` property or by invoking
the object:

```php
$result = piping(3)
    ->pipe(fn ($v) => $v + 1)
    ->pipe(fn ($v) => $v * 2);

$result->value; // 8
```

## Values and Wrappers

Some APIs accept a wrapper in place of a plain value, so that the value is
resolved only when it is needed. The functions in this section create those
wrappers, and resolve them.

`value()` resolves a value. A closure is called with the extra arguments, a
backed or unit enum gives its value or name, and a weak reference gives the
object it still refers to. Any other value is returned unchanged:

```php
value(fn ($n) => $n + 1, 1); // 2
value('text');               // 'text'
```

`unwrap()` resolves only wrappers, and returns any other value unchanged.
`unwrap_enum()` converts an enum to its value or name. Use `unwrap()` when
the input may contain a wrapper, and `value()` when it may also be a closure.

`raw()` wraps a value that should pass through unchanged, and `ref()`
creates a reference to a key path, which is read from the data when it is
resolved:

```php
value(ref('a.b'), ['a' => ['b' => 7]]); // 7
```

`depth()` wraps a nesting depth, for APIs that accept a depth as a wrapper.

`disposable()` wraps a callback that runs only once. After its first run,
`value()` returns `null`:

```php
$once = disposable(fn () => 'first');

value($once); // 'first'
value($once); // null
```

`cachable()` wraps a callback and stores its first result. Later calls return
the stored value without running the callback again:

```php
$expensive = cachable(fn () => loadRates());
```

`nope()` returns a closure that returns its first argument unchanged. It is a
placeholder for an optional callback:

```php
$transform = $transform ?? nope();
```

## Identifiers

`uid()` generates a random unique ID with an optional prefix. Pass `true` as
the second argument to build the ID from the current time instead. `tid()`
is the time-based form with a prefix:

```php
uid('user_');  // user_ followed by 24 hexadecimal characters
tid('log_');   // log_ followed by a time-based string
```

`serial()` returns the next number of a named or object sequence. It is the
function form of `Serial::get()`, which is described in
[Identifiers](./identifiers).

## Iteration and Comparison

`iterator_keys()` returns the keys of a `Traversable` as an array:

```php
iterator_keys(new ArrayIterator(['a' => 1, 'b' => 2])); // ['a', 'b']
```

`where()` creates a condition for `Arr::query()`. The condition compares the
value of a field with a value, using an operator such as `>`:

```php
Arr::query($rows, [where('p', '>', 0)]);
```

`value_compare()` compares two values. With an operator it returns a boolean,
and without one it returns a three-way result: `-1`, `0`, or `1`.

## Attributes and Traits

`has_attributes()` checks whether a class, an object, or a reflector has an
attribute. Pass `true` as the third argument to match subclasses of the
attribute. See [Attributes](./attributes) for the attribute readers.

`trait_uses()` returns the traits a class uses, including the traits used by
those traits. `has_used_trait()` checks for one trait:

```php
trait_uses(Article::class);           // ['Timestamps', 'Slugs']
has_used_trait($article, 'Slugs');    // true
```

`get_object_dump_values()` and `get_object_dump_props()` return the values
or the reflection properties that an object dump should show. They read the
`Expose`, `Invisible`, and `Transient` attributes, as described in
[Attributes](./attributes#dump-attributes).

## Environment

`Env` reads and sets environment values through the request arrays,
`$_SERVER` and `$_ENV`. Configuration often comes from these values, such as
database credentials or the application mode. Reading them directly from the
superglobals works, but each caller must repeat the same fallback logic.
`Env::get()` centralizes that logic, and `Env::set()` keeps the arrays and
the process environment in step.

### Env Minimal Setup

`Env` needs no setup. Read a value with an optional default:

```php
use Windwalker\Utilities\Env;

$mode = Env::get('APP_ENV', 'production');
```

If `APP_ENV` is not defined, the method returns `'production'`.

### Showcase: Configuring a Database Connection

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

### Reading and Writing

`get()` looks in `$_SERVER` first, then in `$_ENV`, and returns the default
when neither has the name. It does not call `getenv()`.

`set()` writes the value to `$_SERVER` and `$_ENV`, and also calls
`putenv()`. A value set with `set()` is therefore visible to `get()`, to
child processes, and to code that calls `getenv()`.

::: warning
Values read from the environment are strings, and `set()` accepts only
strings. Convert a value yourself before using it as a number or a boolean.
:::

### Env Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `get()` | `string $name, mixed $default = null` | Returns the value from `$_SERVER` or `$_ENV`, or the default. |
| `set()` | `string $name, string $value` | Writes the value to `$_SERVER`, `$_ENV`, and the process environment. |

## Related

- [Type Cast](./type-cast): converts the string values from `Env::get()`.
- [Object Helpers](./object-helpers): the lazy object functions, and the
  cache and reflection helpers.
