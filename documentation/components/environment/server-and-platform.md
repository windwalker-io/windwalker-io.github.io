---
layout: doc
title: Server and Platform
component: environment
---

# Server and Platform

Code that writes files, builds shell commands, or generates absolute
URLs needs to know the operating system, the entry script, or the
current host. `Environment` centralizes these checks in one class. The
server data is held in an array, so the same code can run against a
real request or against fake data in tests.

## Assembly

`Environment` takes an optional array of server parameters. When the
argument is omitted, the constructor copies `$_SERVER`:

```php
use Windwalker\Environment\Environment;

$env = new Environment();

$fake = new Environment([
    'HTTP_HOST' => 'example.com',
    'REQUEST_SCHEME' => 'https',
]);
```

OS checks do not need an instance:

```php
if (Environment::isWindows()) {
    // ...
}
```

## Showcase

The following service builds a base URL from the request and chooses
the separator for a `PATH`-like list. It is written so that a test can
pass a fixed array of server parameters:

```php
use Windwalker\Environment\Environment;

final class DeployCommand
{
    public function __construct(
        protected Environment $env,
    ) {
    }

    public function baseUrl(): string
    {
        $scheme = $this->env->isSSL() ? 'https' : 'http';

        return $scheme . '://' . $this->env->getHost();
    }

    public function pathSeparator(): string
    {
        return Environment::isWindows() ? ';' : ':';
    }
}

$command = new DeployCommand(
    new Environment([
        'HTTP_HOST' => 'example.com',
        'REQUEST_SCHEME' => 'https',
    ])
);

echo $command->baseUrl(); // https://example.com
```

## Operating System

`getOS()` returns a three-letter code derived from `PHP_OS`, for
example `WIN` on Windows, `LIN` on Linux, and `DAR` on macOS. The code
is cached in a static property.

- `isWindows()` is true only for the `WIN` code.
- `isLinux()` is true only for the `LIN` code.
- `isUnix()` is true for a list of Unix-like codes, including `CYG`
  (Cygwin) and `DAR` (macOS).

Use `setOS()` or `setUname()` to override detection, for example in a
test. Both change the value for the whole process.

## Paths

- `getWorkingDirectory()` returns the current working directory.
- `getEntry()` returns the path of the entry script. It reads
  `SCRIPT_FILENAME`, or `SCRIPT_NAME` when `$full` is `false`.
- `getRoot()` returns the directory that contains the entry script.
- `getServerPublicRoot()` returns `DOCUMENT_ROOT`.
- `getTempDir()` returns `sys_get_temp_dir()`.

`getEntry()` removes the working directory from the start of the path.
In CLI, the working directory is added back when the full path is
requested. Outside CLI, a path under the working directory is returned
without that prefix, so it can be relative. Check the result before you
use it as an absolute path.

## User and Device

- `getUserName()` returns `USER`, or `USERNAME` when `USER` is missing.
  It returns `null` when neither is set.
- `getUserHomeDir()` returns `HOME`, or `HOMEDRIVE` and `HOMEPATH`
  combined. It returns an empty string, not `null`, when none of these
  is set.
- `getDeviceName()` returns `USERDOMAIN`, or `null`.

## Request Metadata

- `getRequestUri(bool $withParams = true)` returns `REQUEST_URI`. With
  `$withParams` set to `false`, it returns `PHP_SELF`.
- `getHost()` returns `HTTP_HOST`.
- `getPort()` returns `SERVER_PORT`.
- `getScheme()` returns `REQUEST_SCHEME`.
- `isSSL()` is true when the scheme is `https`.

`getServerParams()` returns the full array. `setServerParams()`
replaces it and returns the instance, so calls can be chained.

## Pitfalls

**Missing keys in CLI.** Several getters are typed `string` but return
`null` when the key is absent, for example `getHost()`, `getPort()`,
`getScheme()`, `getRequestUri()`, and `getServerPublicRoot()`. Under
`strict_types`, this throws a `TypeError`. CLI processes usually have
no `HTTP_HOST`, so guard these calls or pass the parameters you need.

**Client-supplied values.** `HTTP_HOST` and `REQUEST_URI` are set by the
client. Do not use `getHost()` alone to build redirects, password reset
links, or other security-sensitive URLs. Compare the value with a list
of trusted hosts first.

**Scheme detection.** `isSSL()` relies only on `REQUEST_SCHEME`. Its
value depends on how the web server or proxy is configured. Behind a
reverse proxy, it may report `http` for an HTTPS request.

**Snapshot of server data.** The constructor copies the array. For a
long-running server, create the instance per request, or pass the
request's parameters explicitly.

**Cygwin.** `isUnix()` is true on Cygwin, although the system is
Windows-based. Use `isWindows()` when you need to detect native Windows.
