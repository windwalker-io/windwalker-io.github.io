---
layout: doc
---

# Logging

Logging records what your application does, so you can find problems
after they happen. Windwalker follows the PSR-3 `LoggerInterface`
standard and uses [Monolog](https://github.com/Seldaek/monolog) as the
logging engine. Each log entry goes to a named channel, and each
channel can write to its own files or services.

## PSR-3 and Monolog

Any service can type-hint `Psr\Log\LoggerInterface`. Windwalker binds
this interface to a logger that is built with Monolog. Monolog handles
the output: files, streams, or remote services.

```php
use Psr\Log\LoggerInterface;

class OrderService
{
    public function __construct(
        protected LoggerInterface $logger,
    ) {
    }

    public function place(int $orderId): void
    {
        $this->logger->info('Order placed', ['order_id' => $orderId]);
    }
}
```

## Minimal Setup

Logging is enabled by `LoggerProvider`, listed in
`etc/conf/logs.config.php`. The host app ships with it, so you only
need to adjust the file when you want different outputs.

```php
// etc/conf/logs.config.php
return [
    'default' => 'default',
    'channels' => [
        'none' => ref('logs.factories.loggers.none'),
        'default' => ref('logs.factories.loggers.default'),
    ],
    'max_files' => env('LOG_MAX_FILES'),
    'global_processors' => [
        PsrLogMessageProcessor::class,
    ],
    // ...
];
```

- `default` is the channel used when no channel name is given.
- `channels` maps a channel name to a logger factory.
- `max_files` limits how many rotated files are kept.
- `global_processors` run for every channel. `PsrLogMessageProcessor`
  replaces `{placeholders}` in the message with context values.

## Channels

A channel is a name for a log stream, such as `default`, `error`, or
`billing`. Each channel gets its own Monolog logger, so you can send
different channels to different files or services. The factories in
`factories.instances` build the loggers.

```php
// Logs to logs/billing.log only
$logger = $container->get(LoggerInterface::class, tag: 'billing');

$logger->info('Charge created', ['amount' => 2500]);
```

The `tag` value is passed to the logger factory, so the file name
follows the channel. The default `rotatingFileHandler()` writes to
`@logs/{tag}.log`.

## Getting a Logger

Inject `LoggerInterface` in your services, and pick the channel with a
tag when you need a specific one.

```php
use Psr\Log\LoggerInterface;
use Windwalker\Core\Service\LoggerService;

class PaymentService
{
    public function __construct(
        protected LoggerInterface $logger,
        protected LoggerService $loggerService,
    ) {
    }

    public function charge(int $amount): void
    {
        // Default channel
        $this->logger->info('Charging', ['amount' => $amount]);

        // Named channel
        $this->loggerService->error(
            'billing',
            'Charge failed',
            ['amount' => $amount],
        );
    }
}
```

`LoggerService` also has `log()` for logging to several channels at
once, and `getLogger($channel)` for a channel's `LoggerInterface`.
Passing a `Throwable` as the message moves the exception into
`context['exception']`.

### The `Logger` Static Facade

`Logger` is a static shortcut for quick debugging.

```php
use Windwalker\Core\Manager\Logger;

Logger::info('Quick debug message');
Logger::error('billing', 'Charge failed');
```

`Logger` is set during request boot, when `LoggerProvider` runs
`Logger::setInstance()`. It stores the logger service that exists at
that moment, so the object is not guaranteed to be the same instance
across all code paths. Use it for temporary debugging only.

::: warning
Do not use the `Logger` facade in shared services, such as a package
or a library class. Inject `LoggerInterface` in those services instead.
:::

## Log Levels

Windwalker uses the eight PSR-3 levels. Monolog uses the same names.

- `emergency`: the system is unusable.
- `alert`: action must be taken immediately.
- `critical`: a critical condition.
- `error`: a runtime error that does not need immediate action.
- `warning`: an exceptional occurrence that is not an error.
- `notice`: a normal but significant event.
- `info`: an interesting event.
- `debug`: detailed information for debugging.

The handlers of the default channel use the level from the app
verbosity. `AppVerbosity::toLogLevel()` maps it like this:

```php
// HIDDEN      => error
// NORMAL      => info
// VERBOSE     => debug
// VERY_VERBOSE => debug
```

So a normal request writes `info` and above, and a verbose request
also writes `debug`. Set a different level by passing `level` to the
handler factory.

```php
'rotating' => static fn () => LoggerFactory::rotatingFileHandler(
    level: 'warning',
),
```

::: info
A handler only writes records at or above its level. Lower levels are
dropped without an error.
:::

## Rotating File Handler

`LoggerFactory::rotatingFileHandler()` writes one file per day and keeps
a limited number of old files. The number is read from
`logs.max_files`, which defaults to 7.

```dotenv
# .env
LOG_MAX_FILES=14
```

Rotating files are easy to read and remove with standard tools. They
are not suited to very high write volume or multi-server setups,
because each server writes its own files. Send those logs to a
central service instead.

Channel and tag names can contain `/`. Under rotating-file mode, each
slash becomes a subdirectory, so the channel `system/error` writes to
`@logs/system/error.log`.

```php
$logger = $container->get(LoggerInterface::class, tag: 'system/error');
```

## Global Context

Global context is a set of values that Windwalker adds to the context of
every log record, across all channels. Use it for values that every
entry should carry, such as a request ID or the current tenant.

```php
use Windwalker\Core\Service\LoggerService;

$loggerService = $container->get(LoggerService::class);

$loggerService->addGlobalContext(['request_id' => $requestId]);
$loggerService->setGlobalContext(['app' => 'shop']);
$loggerService->resetGlobalContext();
```

- `addGlobalContext()` merges values into the current global context.
- `setGlobalContext()` replaces the whole global context.
- `resetGlobalContext()` clears it.

::: info
A key in a record's own context overrides the same key in the global
context.
:::

## Custom Channels and Handlers

Add a channel, and build it from one or more handlers.

```php
// etc/conf/logs.config.php
'channels' => [
    'default' => ref('logs.factories.loggers.default'),
    'billing' => ref('logs.factories.loggers.billing'),
],
'factories' => [
    'instances' => [
        'billing' => static fn (string $tag) => LoggerFactory::monolog(
            $tag,
            [
                ref('logs.factories.handlers.billing_file'),
            ],
        ),
    ],
    'handlers' => [
        'billing_file' => static fn () =>
            LoggerFactory::rotatingFileHandler(
                filename: WINDWALKER_ROOT . '/logs/billing-payments.log',
                level: 'info',
            ),
    ],
],
```

::: tip
Keep a separate channel for each domain, such as payments or
security. It is easier to search and to set retention for each one.
:::

## Custom Processors

A processor adds data to each record. Write it as an invokable class
that receives a Monolog `LogRecord`.

```php
use Monolog\LogRecord;

class RequestIdProcessor
{
    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(
            extra: array_merge(
                $record->extra,
                ['request_id' => $_SERVER['HTTP_X_REQUEST_ID'] ?? null],
            ),
        );
    }
}
```

Add it to a channel's `processors` argument of `LoggerFactory::monolog()`.

## Custom Formatters

A formatter controls how each record is written. Register a formatter
under `factories.formatters`, then select it by name.

```php
'formatters' => [
    'json_formatter' => static fn () => new JsonFormatter(),
],
```

```php
'billing' => static fn (string $tag) => LoggerFactory::monolog(
    $tag,
    [ref('logs.factories.handlers.billing_file')],
    formatter: 'json_formatter',
),
```

## Remote Handlers

Monolog ships handlers for external services, such as `SyslogHandler`,
`SlackWebhookHandler`, and `TelegramBotHandler`. Install the required
Monolog package, then add a factory for the handler.

```php
'slack' => static fn () => new SlackWebhookHandler(
    webhookUrl: env('SLACK_WEBHOOK_URL'),
    channel: '#alerts',
    level: 'error',
),
```

Add it to a channel's handler list, or to `global_handlers` to send
every channel to it.

::: warning
Remote handlers send log messages and context to a third party. Keep
secrets, card numbers, and personal data out of the context, and
check the handler's privacy terms.
:::

Error tracking services, such as Sentry, provide their own Monolog
handler. Use it the same way.

## Topic pages

- [Error Handling](./error-handling.md): how uncaught errors reach the
  logger.
- [Helpers](./helpers.md): utility functions that use the logger.
