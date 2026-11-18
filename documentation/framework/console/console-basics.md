---
layout: doc
---

# Console Basics

Every Windwalker application ships with a command-line interface.
Use it to run migrations, clear caches, generate code, start workers,
and execute your own maintenance tasks without opening a browser.

The console is built on the Symfony Console component. Windwalker wraps
it in `ConsoleApplication`, which loads commands from the application
configuration, boots the same providers as the web runtime, and adds
Windwalker-specific behavior such as logging and custom scripts.

## Entry Point

Run commands through the `windwalker` script in the project root:

```bash
php windwalker
php windwalker list
php windwalker cache:clear
```

Running `php windwalker` without arguments prints the command list.
Add `--help` to any command to see its arguments and options:

```bash
php windwalker cache:purge --help
```

## Registering Commands

Commands are mapped by name in the `commands` configuration. In a
Windwalker host app, the mapping lives in
`resources/registry/commands.php` and is loaded by
`etc/app/console.config.php`:

```php
// resources/registry/commands.php
return [
    'hello' => \App\Command\HelloCommand::class,

    'cache:clear' => \Windwalker\Core\Command\CacheClearCommand::class,
    // ...
];
```

The name is the string you type after `php windwalker`. Use a colon
to group related commands, such as `mig:go` or `schedule:worker`.

::: tip
Keep your own commands under a namespace of their own, such as
`app:import`, so they never collide with a framework command when you
upgrade Windwalker.
:::

The framework's `ConsoleProvider` merges the registry file into the
`commands` configuration on boot. Commands are created through the
container, so their constructors can receive services and the
application instance. See [Command Development](./command-development)
for how to write one.

## Exit Codes

Each command returns an integer. The process exits with the same code,
so shell scripts and CI jobs can check the result.

- `0` (`CommandInterface::SUCCESS`): the command completed.
- `1` (`CommandInterface::FAILURE`): the command failed.
- `2` (`CommandInterface::INVALID`): the input was invalid.

A command that throws an exception prints `An error occurred: ...` and
the exception is rethrown, so the process still fails.

```bash
php windwalker site:up
echo $?
# 1 when the site was already online
```

## Command Logging

Each user command run through the console is logged to the
`system/console` logger tag. The `_completion` helper command is not
logged. Check the log when you need to know who ran a maintenance
command and when.

## Shell Completion

The `auto-complete` command installs tab completion for zsh and bash.
See [Basic Commands](./basic-commands#shell-completion) for the setup.

## Next Steps

- [Basic Commands](./basic-commands): built-in commands at a glance.
- [Command Development](./command-development): write your own commands.
- [Server](./commands/server): run the local development server.
- [Running Code](./commands/running-code): run PHP interactively and batch commands with scripts.
- [Maintenance](./commands/maintenance): maintenance mode and cache commands.
- [Code Generator](./commands/code-generator): scaffold classes and CRUD files.
