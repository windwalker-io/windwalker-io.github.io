---
layout: doc
description: Run PHP code with the exec command in a shell, file, or inline mode, and bundle several commands into named scripts with the run command.
---

# Running Code

The `exec` command runs PHP code inside the application. Use it to
inspect services, test a query, or try a snippet without writing a
command class. The `run` command executes named scripts, which bundle
several commands under one name.

`exec` is available only when the console runs in CLI mode and
debug mode is on. It is disabled in production.

## Interactive Shell

Run `exec` without arguments to open an interactive PHP shell
(`\Psy\Shell`). It requires a real terminal.

```bash
php windwalker exec
```

::: tip
Use `dump()` in the shell to print values with their types. Each
result that is not `null` is printed after the line runs.
:::

## Running Code

Pass PHP code with `-c` or `--code`:

```bash
php windwalker exec -c 'echo count(app()->getConfig()->get("scripts"));'
```

Run a PHP file with the `file` argument. The file must be inside the
project root:

```bash
php windwalker exec scripts/check-users.php
```

```php
// scripts/check-users.php
$count = $app->make(\App\Repository\UserRepository::class)->count();

echo "Users: {$count}\n";
```

The code runs in an isolated scope. The variables `$io` (the
`IOInterface`) and `$app` (the application) are available. Standard
output is printed as it happens, and a non-null return value is
dumped.

```bash
php windwalker exec -c 'return $app->getName();'
# "my-app"
```

::: warning
Code run with `exec` can read and change any data the application can
reach, including the production database if it is configured. Never run
it against data that must be preserved, and never expose it over HTTP.
:::

## Restrictions

- `exec` is not available outside CLI.
- `exec` is not available when debug mode is off.
- `file` must point to a `.php` file inside the project root. Paths
  outside the root are rejected.
- The interactive shell needs an interactive terminal. In CI or cron,
  use `-c` or `file` instead.

## Scripts

The `run` command executes named scripts. A script is a list of steps,
such as shell commands and PHP callbacks, and `run` executes them in
order. Use it to bundle a long setup or release process under one name.

### Defining Scripts

Scripts are defined in the `scripts` configuration. In the host app,
the file is `resources/registry/scripts.php`:

```php
// resources/registry/scripts.php
return [
    'prepare' => [
        'yarn install',
        'yarn build',
    ],

    'update' => [
        'php windwalker mig:go',
        'php windwalker cache:clear',
    ],
];
```

Each entry is an array of steps. A string step runs as a shell
process. A closure step runs through the container, so it can receive
services by type:

```php
'report' => [
    fn (\App\Service\ReportService $report) => $report->build(),
],
```

### Listing and Running

```bash
php windwalker run --list
php windwalker run prepare
php windwalker run prepare update
```

`--list` (`-l`) prints the available scripts. Pass several names to run
them one after another.

### Error Handling

By default, a failed shell step stops the script and throws
`ProcessFailedException`. Each step is wrapped with an `ignoreError`
flag, so a step can be marked to continue after its failure.

::: info
The `-e, --ignore-error` option is defined on `run`. Check the source
before relying on it, because the behavior depends on the step flag.
:::

An unknown script name throws `CommandNotFoundException` and runs
nothing.

### Built-in Shortcut

A script name also works without `run`. `php windwalker prepare` is
the same as `php windwalker run prepare`, because the console falls back
to `run` for names it does not recognize.

::: warning
The host app's `preparedev` script runs `mig:reset --seed -f`. This
drops and rebuilds the database. Run it only against disposable local
data, never against data that must be preserved.
:::

