---
layout: doc
description: How ErrorService turns PHP errors and uncaught exceptions into ErrorException objects handled by logging and error pages.
---

# Error Handling

Windwalker converts PHP errors and uncaught exceptions into a single
handling pipeline. The `ErrorService` registers the PHP handlers, turns
errors into `ErrorException` objects, and passes them to one or more
`ErrorHandler` classes. Those handlers log the error, render an error
page, or both.

## Configuration

The error settings live in `etc/conf/error.config.php`. The most
important keys are:

```php
// etc/conf/error.config.php
return [
    'ini' => [
        'display_errors' => 'on',
        'error_reporting' => $errorReporting,
    ],
    'report_level' => env('ERROR_REPORT_LEVEL') ?? $errorReporting,
    'restore' => false,
    'register_shutdown' => true,
    'log' => true,
    'log_channel' => 'error',
    'template' => 'layout.error.default',
    'handlers' => [
        // Handler definitions, see below
    ],
];
```

- `ini` writes PHP INI values during boot.
- `report_level` is the error mask that `ErrorService` converts.
- `log` and `log_channel` control whether errors are written to logs.
- `template` is the view used by the default error page.

::: tip
Set `ERROR_REPORT_LEVEL` in `.env` to change the reporting level
without editing the config file.
:::

## Default Error Logs

Errors are logged by default, even when debug mode is off, so you can
investigate them later. Each kind of error goes to its own log channel.

- Web errors go to the `system/error` channel.
- Console errors go to the `system/console-error` channel.
- Deprecation notices go to the `system/deprecations` channel.

These channels are set in the `factories` section of
`etc/conf/error.config.php`. Logging is controlled by `error.log`,
which is enabled by default, so errors are recorded in production as
well as in debug mode.

::: info
Deprecation logging uses the same `error.log` switch, and it has its own
channel. Keep the channels configured and rotated in production.
:::

## Default Reporting Levels

Without changes, `ErrorService::getReportLevel()` returns `E_ALL`
minus the low-severity levels: `E_WARNING`, `E_NOTICE`,
`E_DEPRECATED`, and the `E_USER_*` equivalents.

`etc/conf/error-reporting.config.php` gives each level a boolean.
Most of these default to `env('APP_DEBUG')`, so they are enabled only
in debug mode. Override a single level with its `ERROR_REPORT_*`
environment variable.

```php
// .env
ERROR_REPORT_NOTICE=1
```

## `ini.error_reporting` and `report_level`

These two keys are different:

- `ini.error_reporting` sets PHP's own `error_reporting()` level. PHP
  uses it to decide whether an error is raised at all.
- `report_level` sets which levels `ErrorService` registers and
  converts into exceptions.

If PHP suppresses an error at the INI level, the handler never sees it.

## Dev and Debug Mode

The `WINDWALKER_DEBUG` constant switches `ini.error_reporting` to
`E_ALL`, so every level reaches the handler. `APP_DEBUG` turns on the
Whoops page, described in the Whoops section below.

::: warning
Do not enable `APP_DEBUG` or `WINDWALKER_DEBUG` on a public production
server. Stack traces and environment details may be shown to visitors.
:::

## Changing Error Reporting in Code

Call PHP's `error_reporting()` or `ini_set()` at runtime to change
the level for a block of code.

```php
$old = error_reporting(E_ALL & ~E_DEPRECATED);

// Code that triggers known deprecations
legacyCall();

error_reporting($old);
```

## How Error Handling Works

### ErrorService and ErrorHandler

`ErrorService` is the entry point. It is registered by
`ErrorHandlingProvider` during boot. Each `ErrorHandler` receives an
`ErrorException` or an uncaught `Throwable`, and decides how to
handle it.

### Registering the Error Handler

`ErrorService::register()` calls `set_error_handler()` and
`set_exception_handler()`. When PHP raises an error that matches the
reporting level, `error()` throws an `ErrorException` with code 500.

```php
// ERROR: ErrorException: Undefined variable $name
echo $name;
```

Deprecation notices are routed to `handleDeprecation()`, so they can
be logged without stopping the request.

::: info
Handler registration happens only for web requests. The console
registers `ConsoleErrorEvent` instead, with `register(false, E_ALL,
true)`.
:::

### Registering the Exception Handler

When an exception reaches the top level, `exception()` runs every
configured handler, then calls `exit()`. The error status code is
normalized: only 2xx and 3xx values are kept, and anything else becomes
500.

### Adding More Handlers

Handlers are wired in three places in `etc/conf/error.config.php`:

- `handlers.<AppType>` lists the handlers for each app type.
- `factories.handlers` defines how each handler is built.
- `deprecation_handlers` lists handlers for deprecation notices.

```php
// etc/conf/error.config.php
'handlers' => [
    AppType::WEB->name => [
        'default' => ref('error.factories.handlers.default'),
        'log' => ref('error.factories.handlers.log'),
    ],
],
'factories' => [
    'handlers' => [
        'default' => static fn () => create(
            SimpleErrorPageHandler::class,
        ),
    ],
],
```

To add your own handler, define a factory and reference it.

## ErrorHandlers

Each handler is an invokable class that implements
`ErrorHandlerInterface`. Its `__invoke(Throwable $e)` method receives
the exception. The built-in handlers include:

- `SimpleErrorPageHandler`: renders the error page. Its `debug` flag
  comes from `system.debug`.
- `ErrorLogHandler`: writes the error to a log channel.
- `ErrorInlineHandler`: shows the error inline in the page.

### Writing Your Own Handler

Implement `ErrorHandlerInterface` and register the instance in
`handlers`. The example below sends the error to an external service.

```php
// App\Error\ReportErrorHandler.php
use Throwable;
use Windwalker\Core\Error\ErrorHandlerInterface;

class ReportErrorHandler implements ErrorHandlerInterface
{
    public function __invoke(Throwable $e): void
    {
        // Send $e to an external tracking service.
    }
}
```

::: tip
Keep handlers small and fast. A slow handler delays the response to
every failing request.
:::

## Error Rendering

The default `template` (`layout.error.default`) renders the error page.
Keep custom error views simple, so that a failure in the view does not
cause a second error.

::: tip
Pass plain values, such as a message and a status code, into the error
view instead of relying on request or routing state.
:::

## Whoops in Debug Mode

`WhoopsProvider` registers the Whoops handler only when `app.debug` is
true. It replaces the default handler, so you see a detailed error
page with a stack trace and code frame.

Whoops configuration is in `etc/conf/whoops.config.php`.

### Hiding Sensitive Values

The `hidden_list` key hides values from the environment and server
arrays. Add keys that contain secrets to this list.

```php
// etc/conf/whoops.config.php
'hidden_list' => [
    '_ENV' => array_keys($_ENV ?? []),
    '_SERVER' => array_merge(
        ['PATH', 'DOCUMENT_ROOT'],
        array_keys($_ENV ?? []),
    ),
],
```

::: warning
Whoops shows request data and server variables. Keep `app.debug` off
in production, and hide any key that could contain a credential.
:::

### IDE Integration

Set `editor` to the IDE that should open file links. The default is
`phpstorm`. Set `WHOOPS_EDITOR` in `.env` to change it.

```php
// .env
WHOOPS_EDITOR=vscode
```

Clicking a file link in the Whoops page then opens the failing line
in that editor.

## Topic pages

- [Logging](./logging.md): where errors are written and how the
  channels work.
- [Events](./events.md): the lifecycle events fired during error
  handling.
