---
layout: doc
title: Introduction
part: Components
component: environment
---

# Introduction

Windwalker Environment answers questions about the runtime: which
operating system the code runs on, whether PHP runs under a web server
or from the command line, where the entry script lives, and which server
parameters the current request carries.

Code that writes paths, builds shell commands, or generates URLs often
needs these answers. Reading `PHP_OS` and `$_SERVER` directly in each
place duplicates logic and makes it hard to test. This package gathers
the checks into a small set of classes that can be given fake data.

The package has two main parts:

- `Environment`: OS detection, server parameters, paths, and request
  metadata.
- `PhpHelper`: SAPI checks, PHP extension checks, and error reporting.

`PlatformHelper` is deprecated. Use `Environment` instead.

## Installation

Install the package with Composer:

```bash
composer require windwalker/environment ^4.0
```

Windwalker Environment 4.x requires PHP 8.4.6 or later.

## Use as Standalone Component

Most OS and SAPI checks are static methods and need no instance:

```php
use Windwalker\Environment\Environment;
use Windwalker\Environment\PhpHelper;

if (Environment::isWindows()) {
    // Windows-specific handling
}

if (PhpHelper::isCli()) {
    // Running from the command line
}
```

Server-dependent getters require an instance. The constructor reads
`$_SERVER` when no array is given:

```php
$env = new Environment();

$root = $env->getRoot();
$user = $env->getUserName();
```

## Use in Windwalker

Windwalker core registers `Environment` as a shared object in
`RuntimeProvider`. Do not create a new container. Obtain the instance
from the existing container, or declare it as a constructor dependency:

```php
use Windwalker\Environment\Environment;

class DeployService
{
    public function __construct(
        protected Environment $environment
    ) {
    }
}
```

```php
$env = $container->get(Environment::class);

$env = $app->retrieve(Environment::class);
```

Static helpers do not require the container at all.

## Core Concepts

**Static and instance methods.** OS and SAPI checks are static, because
they depend only on the PHP process. Methods that read request or
server data are instance methods, because they depend on the server
parameter array that the instance holds.

**Process-wide OS state.** The OS is derived from `PHP_OS` and reduced
to a three-letter code, such as `WIN`, `LIN`, or `DAR`. The result is
cached in a static property. `Environment::setOS()` and
`Environment::setUname()` change it for the whole process.

**Captured server parameters.** `new Environment()` copies `$_SERVER`
when it is constructed. Later changes to `$_SERVER` are not seen by that
instance. Pass an explicit array to use other data, for example in tests
or in long-running servers.

## Topic Pages

- [Server and Platform](/documentation/components/environment/server-and-platform):
  OS checks, paths, user information, and request metadata.
- [PHP Helper](/documentation/components/environment/php-helper):
  SAPI detection, extension checks, and error reporting.

## Common Pitfalls

::: warning
`setOS()`, `setUname()`, `PhpHelper::setStrict()`, and
`PhpHelper::setMuted()` change global state. Restore the previous
values after a temporary change, as the package's own tests do.
:::

::: warning
Values such as `HTTP_HOST` and `REQUEST_URI` come from the client.
Do not use them as the sole basis for security decisions.
:::

- **Tip:** `PlatformHelper` is deprecated and kept only for compatibility.
