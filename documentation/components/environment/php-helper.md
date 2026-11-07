---
layout: doc
title: PHP Helper
component: environment
---

# PHP Helper

Some code must choose a path based on the PHP runtime itself: whether
it runs under a web server or the command line, whether an extension
is available, or how errors are reported. `PhpHelper` answers these
questions without reading `PHP_SAPI` or `extension_loaded()` at every
call site.

Most methods are static. `getVersion()` and `hasXdebug()` are instance
methods, so create an instance first:

```php
use Windwalker\Environment\PhpHelper;

$php = new PhpHelper();
```

## Assembly

`PhpHelper` has no configuration and no constructor arguments. Call its
static methods directly, or create an instance for the two instance
methods.

## Showcase

The following class collects the runtime capabilities that a service
needs to report, for example on a diagnostics page:

```php
use Windwalker\Environment\PhpHelper;

final class RuntimeCapabilities
{
    public function describe(): array
    {
        $php = new PhpHelper();

        return [
            'sapi' => PHP_SAPI,
            'version' => $php->getVersion(),
            'web' => PhpHelper::isWebServer(),
            'cli' => PhpHelper::isCli(),
            'xdebug' => $php->hasXdebug(),
            'openssl' => PhpHelper::hasOpenssl(),
            'curl' => PhpHelper::hasCurl(),
        ];
    }
}
```

## SAPI Detection

- `isCli()` is true for the `cli` and `cli-server` SAPIs. The built-in
  development server counts as CLI.
- `isWebServer()` is true for the `apache`, `cgi`, `fast-cgi`, and `srv`
  SAPIs.
- `isEmbed()` is true for the `embed` SAPI.
- `isPHP()` is true unless the runtime is HHVM, which `isHHVM()`
  detects through the `HHVM_VERSION` constant.

## Extension Checks

- `hasOpenssl()`, `hasCurl()`, `hasPcntl()`, and `hasMcrypt()` check
  whether the matching extension is available.
- `hasXdebug()` is an instance method. It returns true only when the
  runtime is PHP and the Xdebug extension is loaded.

Check the extension before you call a feature that needs it. Do not
assume that a common extension is always present in a container or on a
shared host.

## Error Reporting

- `setStrict()` calls `error_reporting(-1)`, which reports all errors.
- `setMuted()` calls `error_reporting(0)`, which reports none.

Both change the setting for the whole process. Save the previous value
with `error_reporting()` and restore it when the change is finished.

## Other Helpers

`getVersion()` returns `PHP_VERSION`, which is the version of the
running binary. It does not return the language level configured for a
project.

## Pitfalls

::: warning
**PHP-FPM is not a web SAPI here.** Under PHP-FPM, `PHP_SAPI` is
`fpm-fcgi`, which `isWebServer()` does not list. Use `PHP_SAPI` or your
own check when the code must detect PHP-FPM.
:::

::: warning
**Muting hides everything.** `setMuted()` also hides deprecation and
warning messages. Use it only around a narrow block of code, and restore
the previous level afterwards.
:::

**Tip:** **Removed extensions.** The `mcrypt` extension was removed from PHP 8.0,
so `hasMcrypt()` is false on current runtimes unless a legacy build is
used.
