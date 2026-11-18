---
layout: doc
---

# Basic Commands

Windwalker Core ships a set of commands for common operations. This
page lists them by area. Each area has its own page with the full
options.

## Common Commands

- `php windwalker list`: show all commands.
- `php windwalker run`, `exec`: run scripts and PHP code, see [Running Code](./commands/running-code).
- `php windwalker g` (`generate:make`), `generate:revise`: see [Code Generator](./commands/code-generator).
- `php windwalker site:down`, `site:up`, `cache:clear`, `cache:purge`: see [Maintenance](./commands/maintenance).

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

- `crypt:secret`: generate the app secret. See [App Secret](/documentation/framework/core-concepts/security/app-secret).
- `asset:version`: create the asset version file. See [Asset Management](/documentation/framework/core-concepts/views/asset-management).
- `build:entity`: build entity classes. See [Entities](/documentation/framework/services/database/entities).
- `build:enum`: build enum classes. See [Code Generator](./commands/code-generator).
- `mig:*`: migrations. See [Migrations](/documentation/framework/services/database/migrations).
- `db:export`: export the database. See [Backup and Export](/documentation/framework/services/database/backup-and-export).
- `seed:*`: seeders. See [Seeders](/documentation/framework/services/database/seeders).
- `schedule:*`: scheduled tasks. See [Scheduler](/documentation/framework/services/scheduler).
- `queue:*`: queue workers and failed jobs. See [Queue Guide](/documentation/framework/services/queue), [Failed Jobs](/documentation/framework/services/queue/retry-and-failed-jobs#failed-jobs), and [Database Driver](/documentation/framework/services/queue/drivers#database-driver).
- `task:run`: run signed tasks. See [Concurrency](/documentation/framework/services/concurrency).
- `mail:test`: send a test mail. See [Mailer](/documentation/framework/services/mailer).
- `server:start`, `server:stop`: local development server. See [Server](./commands/server).

`pkg:*` (package installation) and `lang:merge` have no full page yet.
Run `php windwalker <command> --help` for their options.

Run `php windwalker <command> --help` for the arguments of any command.

