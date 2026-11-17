---
layout: doc
---

# Helpers

Windwalker provides a set of global helper functions and static utility
classes. They cover common tasks such as dates, environment variables,
HTML escaping, filtering, and logging. The helper functions are declared
in `vendor/windwalker/core/src/functions.php` and loaded automatically.

Helpers are convenience wrappers. Each one maps to a class you can also
use directly, so pick whichever style fits your code. Each helper group
is documented in its own section on the
[Helpers component page](../../components/utilities/helpers.md).

## Global Functions

### Environment and Output

`env()` reads an environment variable. It checks `$_SERVER` first, then
`$_ENV`, and returns the default when neither is set. See
[Environment](../../components/utilities/helpers.md#environment).

```php
$appName = env('APP_NAME', 'Windwalker');
```

`html_escape()` escapes a value for HTML output. Use it in templates
whenever you print user data.

```php
<p><?= html_escape($comment, nl2br: true) ?></p>
```

::: tip
Escape output with `html_escape()` in every view. Do not rely on the
data being clean at the time it is saved.
:::

### Dates

The date helpers return Windwalker's date objects. They accept a string,
a timestamp, or a `DateTimeInterface`.

```php
use function Windwalker\chronos;
use function Windwalker\to_instant;
use function Windwalker\to_plain_date;

$now = chronos();                       // Current date and time
$tokyo = chronos('now', 'Asia/Tokyo');  // With a timezone
$instant = to_instant('2025-01-01 10:00:00');
$date = to_plain_date('2025-01-01');
```

Each conversion has a `try_*` variant that returns `null` instead of
throwing when the value is invalid.

```php
use function Windwalker\try_plain_date;

$date = try_plain_date($input);

if ($date === null) {
    // Invalid input, show a message
}
```

To compare two dates, use `date_compare()`. It returns a boolean when
you pass an operator.

```php
use function Windwalker\date_compare;

if (date_compare($startsAt, 'now', '<')) {
    // The event has already started
}
```

### Filtering

`filterWith()` applies a list of callbacks to a value, in order. An
associative array applies rules to the matching keys of an array.

```php
use function Windwalker\filterWith;

$name = filterWith($input, [
    fn ($v) => trim($v),
    fn ($v) => ucwords($v),
]);

$data = filterWith($request->getParsedBody(), [
    'name' => fn ($v) => trim($v),
    'email' => fn ($v) => strtolower(trim($v)),
]);
```

::: info
Keys that are not present in the input are skipped. Missing fields do
not create new keys.
:::

### Responses and Logging

`response()` creates a response. A string becomes the body, and any
other value is passed to the response as data.

```php
use function Windwalker\response;

return response('Created', 201, ['X-Id' => '42']);
```

`log_info()` and `log_debug()` write to a logger channel without
injecting `LoggerInterface`. The channel can be a string or an array.

```php
use function Windwalker\log_info;

log_info('app', 'User signed in', ['user_id' => 1]);
```

See [Logging](./logging.md) for channels and levels.

### Configuration Loading

`include_arrays()` loads a PHP file that returns an array, with an
optional context. `include_glob()` loads every file that matches a
pattern, and `merge: true` merges the arrays.

```php
use function Windwalker\include_arrays;
use function Windwalker\include_glob;

$logs = include_arrays(WINDWALKER_ROOT . '/etc/conf/logs.config.php');

$config = include_glob(
    WINDWALKER_ROOT . '/etc/conf/*.config.php',
    merge: true,
);
```

## Static Utility Classes

Windwalker's utility classes live in the `Windwalker\Utilities`
namespace. Their methods are static, so call them directly.

### Arr

`Arr::set()` sets a value on an array with a dot-separated key. It
creates the nested keys when they are missing.

```php
use Windwalker\Utilities\Arr;

$data = [];

Arr::set($data, 'database.host', 'localhost');
Arr::set($data, 'database.port', 3306);

// ['database' => ['host' => 'localhost', 'port' => 3306]]
```

### Str

`Str::truncate()` shortens a string to a maximum length and can add a
suffix. It breaks on a word boundary by default.

```php
use Windwalker\Utilities\Str;

$summary = Str::truncate($article->body, 120, '...');
```

### Env

`Env::get()` reads an environment variable. `Env::set()` writes both
`$_SERVER` and `$_ENV`.

```php
use Windwalker\Utilities\Env;

$debug = Env::get('APP_DEBUG', false);

Env::set('APP_LOCALE', 'en_US');
```

::: tip
Read environment variables once, in a config file, and pass the values
to your services. This keeps the rest of the code easy to test.
:::

### Path

`Windwalker\Filesystem\Path` provides path cleaning and checks. Use it
whenever you accept a file name from user input. See
[Filesystem](./filesystem.md) for the safety rules.

## Debug Helper: `ds()`

`ds()` dumps values to the Var Dumper server. Start the server, then
call `ds()` where you want to inspect a value. When no server is
running, `ds()` does nothing silently. The output is never printed to
the page or the console, so a forgotten call does not leak internal
data in production. See
[Debugging Output](../../components/utilities/helpers.md#debugging-output).

```php
use function Windwalker\ds;

ds($user, $request->getQueryParams());
```

::: warning
Silence only means no server is listening. Remove every `ds()` call
before you deploy, because a server reachable from your environment
still receives the values.
:::

## Deprecated Functions

The following functions still exist, but they are deprecated. Avoid
them in new code.

- `filter()` and `validate()`: use `filterWith()` and `validateWith()`.
- `with()` and `now()`: deprecated.
- `chronosOrNull()`: use `try_chronos()`.

## Topic pages

- [Filesystem](./filesystem.md): path safety and temporary files.
- [Logging](./logging.md): channels, levels, and log handlers.
- [Helpers component](../../components/utilities/helpers.md): the full
  helper reference.
