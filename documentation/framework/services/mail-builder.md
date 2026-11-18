---
layout: doc
title: MailBuilder
---

# MailBuilder

Most transactional emails share a structure: a heading, a few paragraphs,
a call-to-action button, and a footer. Writing that HTML by hand for every
message repeats markup and invites escaping mistakes. `MailBuilder` lets
you describe the content in PHP, and the layout adds the surrounding HTML.

`MailBuilder` is the body builder used by
[`MailMessage::buildBody()`](./mailer#rendering-html-templates). It is
a standalone class, so you can also use it to build a body string
yourself.

## Obtaining a MailBuilder

Inside `buildBody()`, the callback receives a `MailBuilder` instance:

> !review
> 確認一下，是否要用 createMessage() 來建立 MailMessage，才有能力產生 MailBuilder

```php
use Windwalker\Core\Mailer\MailBuilder;
use Windwalker\Core\Mailer\MailMessage;

$message = (new MailMessage())
    ->to('user@example.com')
    ->subject('Your account')
    ->buildBody(
        function (MailBuilder $mail) {
            $mail->line('Your account is ready.');
        }
    );
```

To build a body directly, create the instance yourself:

```php
use Windwalker\Core\Mailer\MailBuilder;

$mail = new MailBuilder();
$mail->line('Your account is ready.');

$html = (string) $mail;
```

Both constructor arguments are optional:

- `markdown`: parse text as Markdown. Default is `false`.
- `inline`: build inline content only, for use inside a line. Default is `false`.

## Main Methods

The following example shows the methods used most often. Each method
returns the builder, so calls can be chained.

```php
use Windwalker\Core\Mailer\MailBuilder;

$mail = new MailBuilder();

// Plain paragraph. Text is HTML-escaped.
$mail->line('Hello, Jane.');

// Paragraph with HTML attributes.
$mail->line('Centered text.', ['style' => 'text-align:center']);

// Centered and right-aligned lines.
$mail->lineAlignCenter('Welcome aboard');
$mail->lineAlignEnd('Signed by the team');

// Spacing.
$mail->emptyLine(1);
$mail->linebreak(2);

// Buttons: primary, secondary, danger, or a custom button.
$mail->primaryButton('View order', 'https://example.com/orders/1');
$mail->secondaryButton('Help', 'https://example.com/help');
$mail->dangerButton('Cancel', 'https://example.com/cancel');
$mail->button('Open', 'https://example.com/open');

// Table from an array of rows.
$mail->table([
    ['Item', 'Price'],
    ['Book', '$20'],
]);

// Text is escaped. Use raw() only for trusted HTML.
$mail->text('Escaped <b>text</b>');
$mail->raw('<hr>');

// Build the body string.
$html = (string) $mail;
```

## Markdown Mode

Enable Markdown to write text with Markdown syntax:

```php
use Windwalker\Core\Mailer\MailBuilder;

$mail = new MailBuilder(markdown: true);
$mail->text('**Important:** your plan renews on *May 1*.');

// Or switch it on later.
$mail = (new MailBuilder())->useMarkdown();
$mail->text('- First item' . "\n" . '- Second item');
```

Markdown needs the `league/commonmark` package. Install it in the host
application if it is not already present.

> !review
> 這裡講清楚一點是因為 HTML 會被重複跳脫，Markdown 會被轉成 HTML，然後再被跳脫一次，導致 HTML 樣式失效。

::: info
Markdown is parsed by CommonMark with `html_input` set to escape and
unsafe links disabled. Do not rely on Markdown to render HTML.
:::

## Combining with Templates

`buildBody()` passes the builder to the layout as `builder`, and the
rendered body as `content`. The default layout is `mail.mail-layout`, set
by `mail.builder.layout`. It wraps the builder output with the mail header
and footer.

```php
use Windwalker\Core\Mailer\MailBuilder;
use Windwalker\Core\Mailer\MailMessage;

$message = (new MailMessage())
    ->to('user@example.com')
    ->subject('Reset your password')
    ->buildBody(
        function (MailBuilder $mail) use ($resetUrl) {
            $mail->line('Click the button to reset your password.');
            $mail->primaryButton('Reset password', $resetUrl);
            $mail->line('This link expires in one hour.');
        }
    );
```

Pass `false` as the second argument to `buildBody()` to skip the layout
and keep only the builder output:

```php
$message->buildBody(
    function (MailBuilder $mail) {
        $mail->line('Plain body.');
    },
    false
);
```

## Attachments and Sending

`MailBuilder` builds only the body. Attachments and recipients belong to
`MailMessage`, so add them after `buildBody()`:

```php
use Windwalker\Core\Mailer\MailBuilder;
use Windwalker\Core\Mailer\MailMessage;

$message = (new MailMessage())
    ->to('user@example.com')
    ->subject('Your invoice')
    ->buildBody(
        function (MailBuilder $mail) {
            $mail->line('Your invoice is attached.');
        }
    )
    ->attachFromPath('/path/to/invoices/1001.pdf');

$this->mailer->send($message);
```

Send the message with `MailerInterface::send()`, as described in
[Mailer](./mailer#sending-a-templated-email).

## Reminders

`text()` escapes its input, so user-supplied content is safe there.

::: warning
`raw()` does not escape its input. Passing user input to `raw()` allows
HTML and script injection into the email.
:::

- Build links with `->full()` from `Navigator`. Relative URLs do not work
  in email clients.
- `addLine()` and `table()` throw a `LogicException` when the builder is
  in inline mode. Use `line()` in normal mode.
