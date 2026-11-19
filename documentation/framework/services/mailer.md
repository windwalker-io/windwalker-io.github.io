---
layout: doc
title: Mailer
description: Send email through one shared Mailer service that keeps SMTP or API transport settings and the default sender in configuration.
---

# Mailer

Applications send many kinds of email: password resets, order receipts,
and admin alerts. Each one needs the same SMTP or API settings, the same
default sender, and the same HTML layout. `Mailer` gives the framework one
shared service for all of them, so the transport and the defaults live in
configuration and not in each feature.

Windwalker's `Mailer` is built on [Symfony Mailer](https://symfony.com/doc/current/mailer.html).
It adds configuration, default sender fields, Edge template rendering,
CSS inlining, and a CLI test command.

## Installation

The core package depends on `symfony/mailer`, which must be installed in
the host application:

```bash
composer require symfony/mailer
```

Install a transport bridge only when you need one. For example, see
[SendGrid](#sendgrid) below.

## Configuration and Environment

The mail configuration lives in `etc/conf/mail.config.php`. It reads these
environment variables:

```dotenv
MAIL_ENABLED=1
MAIL_DSN_DEFAULT="smtp://USER:PASSWORD@smtp.example.com:587"
MAIL_FROM="Example <noreply@example.com>"
MAIL_REPLY_TO="support@example.com"
MAIL_CC=
MAIL_BCC=
```

- `MAIL_DSN_DEFAULT`: the transport DSN for the `default` mailer.
- `MAIL_FROM`: the default sender for every message.
- `MAIL_REPLY_TO`: the default reply-to address.
- `MAIL_CC` and `MAIL_BCC`: optional addresses added to every message.
- `MAIL_ENABLED`: the global switch. See [Disabling Mail](#disabling-mail).

::: warning
Keep `MAIL_DSN_DEFAULT` in `.env` only. The DSN contains the SMTP
or API credentials, so never commit it or print it to logs.
:::

## Injecting Mailer

`Mailer` is registered in the container and can be injected into a
controller or a service constructor. Use `MailerInterface` as the type hint.

Use `createMessage()` to build messages. A message created this way
knows its mailer, so it can call `renderBody()` and `send()` directly.

```php
use Windwalker\Core\Mailer\MailerInterface;

// Controller: inject the Mailer through the constructor.
class ContactController
{
    public function __construct(
        protected MailerInterface $mailer,
    ) {
    }

    public function send(): void
    {
        $message = $this->mailer->createMessage()
            ->to('admin@example.com')
            ->subject('New contact form submission')
            ->html('<p>A visitor sent a message.</p>');

        $this->mailer->send($message);
    }
}
```

The same injection works in a service class, for example a
`PasswordResetService` that receives `MailerInterface` in its constructor.

## Sending a Templated Email

A typical flow renders an Edge template into the message body, then sends
it. This example sends an order receipt.

The template lives in `views/mail/order-receipt.blade.php`:

```blade
@extends('mail.mail-layout')

@section('content')
    <h1>Thanks, {{ $name }}!</h1>
    <p>Your order {{ $orderNo }} is confirmed.</p>
@endsection
```

The controller renders it. The message must come from `createMessage()`,
because `renderBody()` needs a mailer that implements
`RenderableMailerInterface`. A message made with `new MailMessage()` has
no mailer, so it cannot render.

```php
class OrderService
{
    public function __construct(
        protected MailerInterface $mailer,
    ) {
    }

    public function sendReceipt(
        string $email,
        string $name,
        string $orderNo
    ): void {
        $this->mailer->createMessage()
            ->to($email)
            ->subject("Order {$orderNo} confirmed")
            ->renderBody(
                'mail.order-receipt',
                [
                    'name' => $name,
                    'orderNo' => $orderNo,
                ]
            )
            ->send();
    }
}
```

`renderBody()` renders the template into the HTML body. It also sets
`asset` in the template data so the template can reference assets.

## Chaining and Sending

A message created by `createMessage()` already holds its mailer, so
`send()` can be the last call in the chain. You do not need to store the
message in a variable or call `$this->mailer->send()`:

```php
$this->mailer->createMessage()
    ->to('user@example.com')
    ->subject('Welcome')
    ->renderBody('mail.welcome', ['name' => 'Jane'])
    ->send();
```

`MailMessage` uses `ChainingTrait`, so the chain also accepts `tap()`,
`tapIf()`, `pipe()`, and `pipeIf()`. Each callback receives the message
as its first argument. `tap()` and `tapIf()` return the message, so the
chain continues. `pipe()` and `pipeIf()` return whatever the callback
returns, so the callback must return the message to keep chaining.

Use `tapIf()` to add a value only when a condition holds:

```php
$this->mailer->createMessage()
    ->to($user->email)
    ->subject('Your order')
    ->tapIf(
        $order->isGift(),
        fn (MailMessage $message) => $message->subject('A gift for you'),
    )
    ->tap(
        fn (MailMessage $message) => $message->addCc($sender->email),
    )
    ->send();
```

`tapIf()` also takes a false callback as its third argument, so one
chain can branch without breaking the flow. Keep the callbacks short.
Anything longer belongs in a separate method.

## Basic Features

### What Windwalker Adds

Windwalker's `Mailer` extends Symfony Mailer in these ways:

- It fills default fields such as `from` and `replyTo` from configuration.
- It runs the CSS inliner on every message when it is installed.
- It converts HTML to a plain-text body when no text body is set.
- It renders Edge templates with `renderBody()` and `buildBody()`.
- It provides the `mail:test` CLI command.

### Automatically Filled Fields

When a message is sent, `Mailer` runs `prepareMessage()`:

- If the message has no sender, it uses `mail.from`.
- If the message has no reply-to address and `mail.reply_to` is set, it
  uses `mail.reply_to`.
- If the message has no text body, it creates one from the HTML body.

::: info
`MAIL_CC` and `MAIL_BCC` are added only when `Mailer::IGNORE_AUTO_CC` is
passed as a send flag. Without this flag, the auto CC and BCC lists are not
applied to the message.
:::

### Disabling Mail

`MAIL_ENABLED` controls whether messages reach the transport. It is read
from the environment at send time.

```dotenv
MAIL_ENABLED=0
```

When `MAIL_ENABLED` is falsy, `send()` returns a `SentMessage` without
calling the transport. No error is raised.

::: warning
When mail is disabled, `send()` silently drops every message. Enable mail
in production, and use `MailerInterface::FORCE_SEND` only for deliberate
tests.
:::

### Testing with the CLI

The `mail:test` command sends a test message through the configured mailer.
Run it from the host application root:

```bash
php windwalker mail:test admin@example.com
```

| Option | Description |
|---|---|
| `to` (argument) | Recipients. Defaults to `mail.from`. |
| `-m`, `--message` | Message body text. |
| `-s`, `--subject` | Subject suffix. |
| `-c`, `--connection` | Mailer connection name. |
| `-f`, `--force` | Send even when `MAIL_ENABLED` is off. |

The command uses `FORCE_SEND` only when you pass `--force`.

### Transports and Extra Packages {#sendgrid}

The DSN in `MAIL_DSN_DEFAULT` selects the transport. Symfony supports
SMTP, Sendmail, and several API providers. API providers need their own
bridge package.

For example, if you want to use SendGrid API, install the bridge:

```bash
composer require symfony/sendgrid-mailer
```

Then use the SendGrid DSN with a placeholder key:

```dotenv
MAIL_DSN_DEFAULT="sendgrid+api://SG.YOUR_API_KEY@default"
```

`Mailer` passes the DSN to Symfony's `Transport::fromDsn()`, which chooses
the bridge from the scheme. Common transports and the package each one
needs:

- `smtp://` or `smtps://`: built in, no extra package.
- `sendmail://`: built in, uses the local `sendmail` binary.
- `native://`: built in, uses PHP's `mail()` function.
- `sendgrid+api://`: `composer require symfony/sendgrid-mailer`
- `mailgun+api://`: `composer require symfony/mailgun-mailer`
- `postmark+api://`: `composer require symfony/postmark-mailer`
- `ses+api://`: `composer require symfony/amazon-mailer`

Check the Symfony Mailer documentation for other bridges and their DSNs.

## Advanced Features

### Attachments

Attach files with the Symfony `MailMessage` API. Use a path for files on
disk, or a PSR-7 stream with `attachPsr7()`.

```php
$message = (new MailMessage())
    ->to('user@example.com')
    ->subject('Your invoice')
    ->html('<p>Your invoice is attached.</p>')
    ->attachFromPath(
        '/path/to/invoices/1001.pdf',
        'invoice-1001.pdf',
        'application/pdf'
    );

$this->mailer->send($message);
```

### CSS Inliner

The `MailInlinerSubscriber` moves CSS from `<style>` blocks and linked
assets into inline `style` attributes before sending. Many mail clients
ignore `<style>` tags, so this matters for layouts.

Install the inliner package to enable it:

```bash
composer require tijsverkoyen/css-to-inline-styles
```

No extra subscriber setup is needed. `MailInlinerSubscriber` is registered
through the `#[EventSubscriber]` attribute and runs automatically before
each send.

::: info
Without the package, the subscriber throws a `LogicException` when it runs.
:::

The inliner also removes `<script>`, `<style>`, and `<link>` tags from the
final HTML.

### Rendering HTML Templates

`renderBody()` renders an Edge template. The bundled layout
`views/mail/mail-layout.blade.php` receives the body in the `content`
variable. Use `buildBody()` when you need to build the body in PHP.

```php
use Windwalker\Core\Mailer\MailBuilder;
use Windwalker\Core\Mailer\MailMessage;
use Windwalker\Core\Router\Navigator;

class WelcomeService
{
    public function __construct(
        protected MailerInterface $mailer,
        protected Navigator $nav,
    ) {
    }

    public function sendWelcome(string $email): void
    {
        $message = (new MailMessage())
            ->to($email)
            ->subject('Welcome')
            ->buildBody(
                function (MailBuilder $mail) {
                    $mail->line('Welcome to Example!')
                        ->primaryButton(
                            'Start',
                            $this->nav->to('dashboard')->full()
                        );
                }
            );

        $this->mailer->send($message);
    }
}
```

Links in email must be absolute, so build them with `->full()`. A relative
link does not work in most mail clients.

::: tip
`buildBody()` uses `mail.builder.layout` as the layout, which defaults to
`mail.mail-layout`. Pass `false` as the layout to get the raw body.
:::

See [MailBuilder](./mail-builder) for the full builder API.
