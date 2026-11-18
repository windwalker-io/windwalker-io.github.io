---
layout: doc
---

# REPL & Code Sandbox

The `exec` command runs PHP code inside the application. Use it to
inspect services, test a query, or try a snippet without writing a
command class.

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

