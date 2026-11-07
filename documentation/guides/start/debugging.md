---
layout: doc
---

# Debugging

## Enter Debug Mode

If you need to enter debug mode, such as viewing DB Queries, complete error messages, or want to prevent CSS/JS caching, you can enter debug mode.

The simplest way is to add /dev.php at the end of the website URL.

For example:
- The URL: http://localhost/hello/www/sakura/list
- Change to: http://localhost/hello/www/dev.php/sakura/list.

In this case, we are using PHP server: `http://localhost:8000`, we can simply add `dev.php` after ths host: `http://localhost:8000/dev.php`

This will enter debug mode.

::: warning
`dev.php` is only accessible from local IPs (`127.0.0.1`, `::1`) by default, otherwise it returns `403 Forbidden`.
To allow other IPs, add them to `.env`, separated by commas. Use `all` to allow everyone (**never do this on production**):

```ini
DEV_ALLOW_IPS=192.168.1.10,192.168.1.11
```

If your server is behind a proxy, also set `PROXY_TRUSTED_IPS`.
:::

![debug console](https://github.com/lyrasoft/ww4tut/assets/1639206/13a93c09-eba2-4d65-80c1-944ccdcc6bf7)

When an error occurs, it can also display complete error messages.

![error page](https://github.com/lyrasoft/ww4tut/assets/1639206/3e89efcb-a6b1-4594-85b6-4107632d00ee)

### Force Debug Mode

`dev.php` simply sets `APP_ENV=dev` before booting the app. To always run in debug mode without `dev.php`, set these in `.env`:

```ini
APP_ENV=dev
APP_DEBUG=1
```

- `APP_DEBUG=1` shows complete error messages and enables error reporting for warnings, notices and deprecations.
- `APP_ENV=dev` loads `.env.dev` and enables the debugger package (profiler and debug console), which is only registered when the env is `dev`.

Setting `APP_DEBUG=1` alone will not load the Web Profiler.

## Error Verbosity

`APP_VERBOSITY` controls how much error information is exposed to users and written to logs. It is configured in `.env` and read by `app.verbosity` in `etc/conf/app.config.php`. The starter's `.env.base` sets it to `1` by default.

| Value | Name           | Behavior                                                                                                   |
|-------|----------------|------------------------------------------------------------------------------------------------------------|
| `0`   | `HIDDEN`       | Strict production. Always shows a fallback message (`Something went wrong`), never the real error message. |
| `1`   | `NORMAL`       | Normal production. Shows the original error message without details or backtraces, so users can report it. |
| `2`   | `VERBOSE`      | Shows full error messages with details, such as file, line, backtraces and SQL.                            |
| `3`   | `VERY_VERBOSE` | Shows even more information, such as extra debug data.                                                     |

```ini
APP_VERBOSITY=1
```

### How the Value is Resolved

- If `APP_VERBOSITY` is empty, the verbosity is `VERBOSE` in debug mode (`APP_DEBUG=1`), otherwise `NORMAL`.
- If `APP_VERBOSITY` is lower than `2` but debug mode is on, it is raised to `VERBOSE`. So `APP_DEBUG=1` can never be less verbose than `2`.
- An invalid value falls back to `NORMAL`.
- `dev.php` / `APP_ENV=dev` at boot also sets the runtime verbosity to `VERBOSE`.

### Checking Debug Mode in Code

There are two ways to check whether debug mode is on:

- `AppEnvironmentInterface::isDebug()`: reads `app.debug` from the config at runtime. Use it inside services and classes managed by the container.
- `WINDWALKER_DEBUG`: a constant defined in `etc/define.php` as `(bool) env('APP_DEBUG')`. It is available very early (before the container and config are ready), so use it in bootstrap-time files such as `etc/*.php` config files.

```php
// In a service
if ($this->env->isDebug()) {
    // ...
}

// In early-loaded config files, e.g. etc/conf/error.config.php
'error_reporting' => (string) (WINDWALKER_DEBUG ? E_ALL : $errorReporting),
```

Note that `WINDWALKER_DEBUG` is fixed once defined and only follows `APP_DEBUG`, while `isDebug()` follows the `app.debug` config.

### Where It Takes Effect

- **JSON API errors**: below `VERBOSE`, the response message is `displayMessage()` (fallback message at `0`, original message at `1`). At `VERBOSE` or above, the message includes the error code, file and line, and debug data is added to the response.
- **Logs**: the default log level follows the verbosity: `0` logs `error`, `1` logs `info`, `2`/`3` log `debug`.
- **Error log messages**: `ErrorService` and `ErrorLogHandler` use the verbosity to decide how detailed the logged message is.
- **Custom exceptions**: an exception implementing `Windwalker\Utilities\Exception\VerbosityExceptionInterface` can return different messages through `getMessageByVerbosity()`, e.g. a safe message at low levels and SQL details at high levels.

In your own code, inject `AppEnvironmentInterface` (default implementation: `AppEnvironment`) to read system info such as `isDebug()`, `getMode()`, `getName()`, `getVerbosity()`, `isVerbose()` and `isCli()`. Prefer it over injecting the whole `ApplicationInterface`, which is much heavier and makes services harder to test.

```php
use Windwalker\Core\Application\AppEnvironmentInterface;

class MyService
{
    public function __construct(protected AppEnvironmentInterface $env) {}

    public function handle(\Throwable $e): string
    {
        if ($this->env->isVerbose()) {
            // Show details
        }

        // Message safe for users, depends on the current level
        $message = $this->env->getVerbosity()->displayMessage($e);

        // Custom fallback
        return $this->env->getVerbosity()->displayMessage($e, 'Please try again later');
    }
}
```

::: tip
For high-security production sites use `APP_VERBOSITY=0`. Use `1` for ordinary production sites so users can report the message. Use `2` or `3` only on dev or staging environments.
:::

## Web Profiler

Click the debug console at the bottom of page. You will enter the Windwalker Debugger interface.

![system](https://github.com/lyrasoft/ww4tut/assets/1639206/d3d03b2b-17f6-4053-95a2-eb1531692ea3)

You can see many profiler data which is collected from Windwalker process, to help you debug or inspect system issues. If you want to see the data from previous actions, go to `Dashboard` and choose the page data you want.

![dashboard](https://github.com/lyrasoft/ww4tut/assets/1639206/d18f00cc-da6f-4a5d-b1b3-01800bf3dfac)

## Debugger Configuration

### The Core Debugger

Open `etc/packages/debugger.config.php` to configure debug system, this debug system is provided by `windwalker/core` package.

The file is declared with `#[ConfigModule(name: 'debugger', enabled: true, priority: 100, env: 'dev')]`, so it is only loaded when `APP_ENV` is `dev`.

#### `editor`

The editor used by the debugger to open files, default is `phpstorm`. Override it by `DEBUGGER_EDITOR` in `.env`.

#### `profiler_disabled`

Set to `true` to force disable debug profiler.

#### `cache.max_files`

To configure how many collected profiler data caches at this project, default is `100`.

### The Whoops

Windwalker use [flip/whoops](https://github.com/filp/whoops) package to render error page. You can configure whoops through `etc/conf/whoops.config.php`:

#### `editor`

To configure the editor/IDE software that can open file when you click the file path in error page, you can simply add `WHOOPS_EDITOR` to `.env` to override this config.

![editor](https://github.com/lyrasoft/ww4tut/assets/1639206/b3a91c40-2d4e-4874-b169-1ccdcf3c477a)

Default is `phpstorm`, you may change it to `vscode` or any editor which supports open by `{editor}://` URL scheme.

#### `hidden_list`

Whoops will display some sensitive data from your `$_SERVER` super global variables. This config provides a list to hide these sensitive data.

```php
    // ...

    'hidden_list' => [
        '_ENV' => array_keys($_ENV ?? []),
        '_SERVER' => array_merge(
            [
                'PATH',
                'SERVER_SOFTWARE',
                'DOCUMENT_ROOT',
                'CONTEXT_DOCUMENT_ROOT',
                'SERVER_ADMIN',
                'SCRIPT_FILENAME',
                'REMOTE_PORT',
                'DATABASE_DSN',
            ],
            array_keys($_ENV ?? [])
        )
    ],
```

## Error Reporting

`etc/conf/error-reporting.config.php` controls which PHP error levels are reported. By default they follow `APP_DEBUG`, and you can override each level by env, e.g. `ERROR_REPORT_WARNING`, `ERROR_REPORT_NOTICE`, `ERROR_REPORT_DEPRECATED`.

## Logs

Log files are written to the `logs/` directory, configured in `etc/conf/logs.config.php`.

