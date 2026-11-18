---
layout: doc
---

# Server

The `server:start` command runs a local development server for your
application from the console. It wraps PHP's built-in web server by
default, and can switch to a Swoole engine for long-running processes.
You do not need to configure Apache or Nginx while developing.

## Starting a Server

Run `server:start` with the server name, using the `php:main` format.
The name points to an entry in the server registry.

```bash
php windwalker server:start
```

The command keeps running until you stop it.

## Server Registry

The `server` argument uses the `{engine:name}` format. Each entry maps an
engine and a name to a main file in `resources/registry/servers.php`.

```php
// resources/registry/servers.php
return [
    'swoole' => [
        'main' => __DIR__ . '/../../bin/swoole-main.php',
    ],
    'php' => [
        'main' => __DIR__ . '/../../www/index.php',
    ],
];
```

If the name is not registered, the command fails.

```text
// ERROR: Main file not found for engine: swoole - name: other
```

## Engines

The engine comes from the prefix of the `server` argument. The `--engine`
option is used only when the argument has no prefix. The argument defaults
to `php:main`, so `--engine` has no effect unless you pass a bare name.

- `php`: runs `php -S` with the document root or a main file. Use it for
  standard web requests.
- `swoole`: starts a Swoole server with a state file, workers, and an
  optional file watcher. See the [Swoole](../../cli-servers/swoole) page.

```bash
php windwalker server:start swoole:main
```

## Options

### Port and Host

The default host is `localhost`. If you omit `--port`, the command scans
from port 8000 upward and uses the first free port.

```bash
php windwalker server:start --host=0.0.0.0 --port=9000
```

### Document Root and Main File

For `php`, the document root defaults to the `www` directory of the
project. Use `--docroot` to change it. Use `--main` to route every request
through one file.

```bash
php windwalker server:start --docroot=public
php windwalker server:start --main=bin/router.php
```

### Swoole Options

These options apply only to the `swoole` engine.

```bash
php windwalker server:start swoole:main \
    --workers=4 \
    --task-workers=2 \
    --max-requests=500 \
    --watch
```

- `--workers`: number of worker processes.
- `--task-workers`: number of task worker processes.
- `--max-requests`: requests a worker handles before it restarts. The
  default is `500`.
- `--watch`: reloads the workers when a source file changes.

## Stopping a Server

Stop a `php` server by pressing `Ctrl+C` in the terminal.

The `server:stop` command stops a Swoole server that was started in the
background. It does not stop a `php` server.

```bash
php windwalker server:stop swoole:main
```

```text
// ERROR: Server is not running.
```

::: info
The `--engine` help text of `server:stop` lists `swoole` with a default
of `php`. The default is never used, because the `server` argument always
has a prefix. Pass the engine in the argument.
:::

## Signal Handling

On Linux and macOS, `server:start` listens for `SIGINT` and `SIGTERM`.
When the Swoole engine is running, the signal stops the server before the
command exits. Windows does not support these signals, so use `Ctrl+C`
or `server:stop` there.
