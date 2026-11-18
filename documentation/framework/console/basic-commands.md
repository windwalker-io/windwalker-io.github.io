---
layout: doc
---

# Basic Commands

Windwalker Core ships a set of commands for common operations. This
page lists them by area. Each area has its own page with the full
options.

## Common Commands

- `php windwalker list`: show all commands.
- `php windwalker run`: run named scripts, see [Script Runner](./script-runner).
- `php windwalker exec`: run PHP code, see [REPL and Code Sandbox](./repl-and-code-sandbox).
- `php windwalker cache:clear`, `cache:purge`: see [Cache](./cache).
- `php windwalker g` (`generate:make`), `generate:revise`: see [Code Generator](./code-generator).
- `php windwalker site:down`, `site:up`: see [Maintenance](./maintenance).

## Server Dumper

`server:dumper` starts a server that receives `dump()` output from
other processes. It needs `symfony/var-dumper`.

```bash
php windwalker server:dumper
php windwalker server:dumper tcp://127.0.0.1:9912 -f html
```

The host argument defaults to the `app.dump_server.host` config
value, or `tcp://127.0.0.1:9912` when that is not set. The default format is `cli`.

## Shell Completion

`auto-complete` installs tab completion for zsh and bash.

```bash
php windwalker auto-complete
php windwalker auto-complete -s zsh -f
```

The command writes `~/.windwalker_completion_<shell>` and adds a
`source` line to your shell profile (`~/.zshrc`, or `~/.bashrc` or
`~/.bash_profile`). Open a new terminal, or run the `source` line
yourself, to activate it.

- `-s, --shell-type`: `zsh` or `bash`. Defaults to the name of `$SHELL`.
- `-f, --force`: overwrite an existing completion file.

::: info
Completion for command names is always available. Completion for
argument and option values appears only for commands that implement
`CompletionHandlerInterface`, such as `cache:clear` and `cache:purge`.
:::

## Mail Testing

`mail:test` sends a test message through the configured mail
transport, which helps check the mail settings.

```bash
php windwalker mail:test
```

## Language Merging

`lang:merge` merges language files. See `php windwalker lang:merge --help`
for its arguments.

```bash
php windwalker lang:merge
```

## Other Commands

- `crypt:secret`: generate a crypt secret.
- `asset:sync`, `asset:version`: sync assets and manage asset versions.
- `build:entity`, `build:enum`: build entity and enum classes.
- `pkg:*`: manage packages.
- `mig:*`, `db:*`, `seed:*`: database migrations, tools, and seeders.
- `schedule:*`, `queue:*`, `task:run`: scheduled tasks, queued jobs, and signed tasks.
- `server:start`, `server:stop`: local development server. See [Server](./server).

Run `php windwalker <command> --help` for the arguments of any command.

