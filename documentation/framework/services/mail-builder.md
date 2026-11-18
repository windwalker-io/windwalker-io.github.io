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

Create the message with `$mailer->createMessage()`. A message made with
`new MailMessage()` has no body builder, so `buildBody()` will not work.

```php
use Windwalker\Core\Mailer\MailBuilder;

$message = $this->mailer->createMessage()
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

## Nested Content with Closures

`line()` and `table()` accept a closure. The closure receives a sub
builder in inline mode, so text, buttons, and line breaks can be mixed
inside one paragraph:

```php
use Windwalker\Core\Mailer\MailBuilder;

$mail->line(
    function (MailBuilder $sub) {
        $sub->text('Your order ');
        $sub->text('#1001');
        $sub->text(' is ready. ');
        $sub->linebreak();
        $sub->button('Track', 'https://example.com/track/1001');
    }
);
```

Use `addLine()` when you need the `<p>` element itself, for example to
add a class or an ID after it is created:

```php
$p = $mail->addLine('Order status', ['id' => 'status']);
$p->addClass('lead');
```

`addButton()` works the same way and returns the `<a>` element.

Build a table from a closure with the `Grid` object. Pass the table
attributes as the second argument:

```php
use Windwalker\Html\Grid\Grid;

$mail->table(
    function (Grid $grid) {
        $grid->setColumns(['Item', 'Qty']);
        $grid->addRow();
        $grid->setRowCell('Item', 'Book');
        $grid->setRowCell('Qty', '2');
    },
    ['class' => 'table'],
);
```

Pass an existing `Grid` instance to `table()` to reuse a table built
elsewhere.

`block()` converts Markdown to block-level HTML without wrapping it in a
paragraph. Use it for headings or lists that should not sit inside `<p>`:

```php
$mail->block("## Next steps\n\n- Confirm your address\n- Set a password");
```

Every block is stored in the public `$blocks` array. `(string) $mail`
joins them with a newline. Inspect `$mail->blocks` in tests if you need
to check the structure without rendering the whole body.

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

Markdown is converted to HTML first, and the result is escaped again if you
place it in a plain text field. The escaped HTML then shows as raw tags and
the styles are lost. Use `raw()` for HTML content, and keep Markdown for
plain text paragraphs.

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
- `addLine()`, `table()`, and `block()` throw a `LogicException` when the
  builder is in inline mode. Use `line()` in normal mode.
