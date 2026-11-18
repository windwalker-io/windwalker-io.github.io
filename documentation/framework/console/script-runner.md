---
layout: doc
---

# Script Runner

The `run` command executes named scripts. A script is a list of steps,
such as shell commands and PHP callbacks, and `run` executes them in
order. Use it to bundle a long setup or release process under one name.

## Defining Scripts

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

## Listing and Running

```bash
php windwalker run --list
php windwalker run prepare
php windwalker run prepare update
```

`--list` (`-l`) prints the available scripts. Pass several names to run
them one after another.

## Error Handling

By default, a failed shell step stops the script and throws
`ProcessFailedException`. Each step is wrapped with an `ignoreError`
flag, so a step can be marked to continue after its failure.

::: info
The `-e, --ignore-error` option is defined on `run`. Check the source
before relying on it, because the behavior depends on the step flag.
:::

An unknown script name throws `CommandNotFoundException` and runs
nothing.

## Built-in Shortcut

A script name also works without `run`. `php windwalker prepare` is
the same as `php windwalker run prepare`, because the console falls back
to `run` for names it does not recognize.

::: warning
The host app's `preparedev` script runs `mig:reset --seed -f`. This
drops and rebuilds the database. Run it only against disposable local
data, never against data that must be preserved.
:::

