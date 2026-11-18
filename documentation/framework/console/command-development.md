---
layout: doc
---

# Command Development

A custom command is a class that implements `CommandInterface`. The
class declares its name and description with the `CommandWrapper`
attribute, defines its arguments and options in `configure()`, and
does the work in `execute()`. Windwalker passes an `IOInterface`
object to `execute()`, so you can read input and write output through
one API.

Use a command when a task must run from the terminal, such as an
import, a nightly cleanup, or a data repair. For a sequence of existing
commands, use a [script](./script-runner) instead.

## Minimal Command

Register a class with a name, then add arguments and options:

```php
// src/Command/HelloCommand.php
namespace App\Command;

use Symfony\Component\Console\Command\Command;
use Windwalker\Console\CommandInterface;
use Windwalker\Console\CommandWrapper;
use Windwalker\Console\IOInterface;
use Windwalker\Console\Input\InputArgument;
use Windwalker\Console\Input\InputOption;

#[CommandWrapper(description: 'Greet someone.')]
class HelloCommand implements CommandInterface
{
    public function configure(Command $command): void
    {
        $command->addArgument(
            'name',
            InputArgument::OPTIONAL,
            'The name to greet.',
            'world'
        );

        $command->addOption(
            'shout',
            's',
            InputOption::VALUE_NONE,
            'Print in upper case.'
        );
    }

    public function execute(IOInterface $io): int
    {
        $message = 'Hello, ' . $io->getArgument('name') . '!';

        if ($io->getOption('shout')) {
            $message = strtoupper($message);
        }

        $io->writeln($message);

        return self::SUCCESS;
    }
}
```

Register it in `resources/registry/commands.php`:

```php
'hello' => \App\Command\HelloCommand::class,
```

Then run it:

```bash
php windwalker hello Simon --shout
# HELLO, SIMON!
```

## Constructor Injection

The command is created by the container. Type-hint the services it
needs in the constructor, and they are injected automatically:

```php
use Windwalker\Core\Application\ApplicationInterface;

class CacheReportCommand implements CommandInterface
{
    public function __construct(
        protected ApplicationInterface $app,
    ) {}

    // ...
}
```

The built-in commands follow the same pattern. For example,
`CachePurgeCommand` receives `ApplicationInterface` and resolves cache
pools from it.

## Reading Input

Read values from `IOInterface` by the names used in `configure()`:

```php
$io->getArgument('name');   // string, or an array for IS_ARRAY
$io->getOption('shout');    // true when the flag is given
```

Set an array argument with `InputArgument::IS_ARRAY`. Set an option
that takes a value with `InputOption::VALUE_REQUIRED`, and an array of
values with `VALUE_IS_ARRAY | VALUE_REQUIRED`:

```php
$command->addArgument(
    'profiles',
    InputArgument::IS_ARRAY,
    'Profiles to clear.'
);

$command->addOption(
    'tag',
    't',
    InputOption::VALUE_IS_ARRAY | InputOption::VALUE_REQUIRED,
    'Tags to invalidate.'
);

// php windwalker my:cmd a b --tag x --tag y
$io->getArgument('profiles'); // ['a', 'b']
$io->getOption('tag');        // ['x', 'y']
```

## Writing Output

`IOInterface` extends Symfony's input and output interfaces. Use the
output helpers for plain lines and styled tables, and the `style()`
helper for titles, notes, and progress messages:

```php
$io->writeln('Plain line.');
$io->writeln('<info>Green text.</info>');
$io->writeln('<error>Red text on stderr.</error>');
$io->newLine();

$io->style()->title('Import Report');
$io->style()->success('Imported 120 rows.');
$io->style()->warning('Two rows were rejected.');
```

Use `style()` for human-readable summaries, and `writeln()` for lines
that other programs may parse.

## Asking Questions

Prompt the user with the helpers on `IOInterface`:

```php
$name = $io->ask('Project name?', 'my-app');

if (!$io->askConfirmation('Continue?', false)) {
    return self::SUCCESS;
}

$env = $io->askChoice('Environment?', ['dev', 'prod'], 'dev');

$secret = $io->askAndHideAnswer('API token?');
```

`askAndValidate()` repeats the question until a callback accepts the
answer. Use `askAndHideAnswer()` for passwords and tokens so the
characters are not echoed.

::: warning
Interactive prompts block forever when there is no terminal, such as in
a cron job or a CI pipeline. Check `$io->getInput()->isInteractive()`
before asking, or require the answer as an argument and pass
`-n` (`--no-interaction`) in automated runs.
:::

## Exit Codes

Return the status the command reached. Use the constants on
`CommandInterface`:

```php
if (!$this->hasWork()) {
    $io->writeln('Nothing to do.');

    return self::SUCCESS;
}

if (!$this->isConfigured()) {
    $io->writeln('<error>Missing API key.</error>');

    return self::FAILURE;
}

if ($io->getArgument('file') === null) {
    return self::INVALID;
}
```

Exceptions are also handled. The command prints `An error occurred:`
followed by the message, and the process exits with a non-zero code.
Throw an exception when a failure should stop the run, and return
`self::FAILURE` when you want to report the problem and exit cleanly.

## Tab Completion

A command can suggest values for its arguments and options. Implement
`CompletionHandlerInterface` and return the candidate list:

```php
use Windwalker\Console\CompletionContext;
use Windwalker\Console\CompletionHandlerInterface;

class CacheReportCommand implements
    CommandInterface,
    CompletionHandlerInterface
{
    public function handleCompletions(
        CompletionContext $context
    ): ?array {
        if ($context->isArgument()) {
            return ['default', 'session'];
        }

        return null;
    }

    // ...
}
```

Return `null` for anything you do not handle, so the shell falls back
to its default behavior. Completion is active after you install the
shell hook from [Basic Commands](./basic-commands#shell-completion).

## Callable Commands

A `CommandWrapper` handler can also be a callable. Windwalker calls it
with the `io:` named argument, so a closure can read input and write
output the same way as a class:

```php
$command = static function (IOInterface $io): int {
    $io->writeln('Done.');

    return 0;
};
```

Prefer a class for anything with more than a few lines. Classes are
easier to test, can receive constructor injection, and can implement
completion.

## Organizing Commands

Keep related commands together in one namespace, such as
`App\Command\Import`. Group names with colons, such as `import:users`
and `import:orders`, to keep the command list easy to scan.

::: tip
Put the business logic in a service and keep the command thin: it
should parse input, call the service, and report the result. Then the
same logic can run from a web action or a queue job.
:::
