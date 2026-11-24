---
layout: doc
title: Captcha
description: Use Luna's captcha drivers directly to render a challenge and verify the answer, with Google reCAPTCHA, reCAPTCHA Enterprise, Cloudflare Turnstile, image captcha, and a null driver.
---

# Captcha

A public form, such as a sign-up, contact, or comment form, is a target for bots. A captcha asks the visitor to prove they are human before the server accepts the submission. Luna wraps several captcha services behind one small interface, so the page that renders the challenge and the code that verifies it do not change when you switch from one service to another.

This page shows how to use the drivers directly. To place a captcha inside a form, see [Captcha Fields](../systems/form-fields/captcha-fields.md).

## Concepts

Every driver implements `Lyrasoft\Luna\Captcha\CaptchaDriverInterface`, which has two methods:

- `input()` returns the HTML of the challenge.
- `verify()` checks the visitor's answer and returns a `bool`.

Drivers are registered by name in `etc/packages/captcha.config.php`. A name is called a profile, and `default` decides which profile is used when none is requested.

## Obtain a Driver

Resolve `CaptchaDriverInterface` from the container. Without a tag, the `default` profile is used. Pass a tag to select a profile by name.

```php
use Lyrasoft\Luna\Captcha\CaptchaDriverInterface;
use Windwalker\Core\Application\AppContext;

class ContactController
{
    public function submit(AppContext $app): void
    {
        // The default profile
        $captcha = $app->retrieve(CaptchaDriverInterface::class);

        // A named profile
        $google = $app->retrieve(
            CaptchaDriverInterface::class,
            tag: 'google',
        );
    }
}
```

The same works through `$container->get()` and constructor injection.

## Complete Example

Render the challenge inside the form, then verify it when the form is submitted.

```php
use Lyrasoft\Luna\Captcha\CaptchaDriverInterface;
use Windwalker\Core\Application\AppContext;

class ContactController
{
    public function form(AppContext $app): string
    {
        $captcha = $app->retrieve(CaptchaDriverInterface::class);

        return '<form method="post">'
            . $captcha->input(['id' => 'contact-captcha'])
            . '<button type="submit">Send</button>'
            . '</form>';
    }

    public function submit(AppContext $app): void
    {
        $captcha = $app->retrieve(CaptchaDriverInterface::class);

        $answer = $app->input('captcha');

        if (!$captcha->verify($answer)) {
            throw new \RuntimeException('Captcha failed.');
        }

        // Handle the submission.
    }
}
```

`input()` also loads the required front-end script through `LunaScript::captcha()`. Pass HTML attributes as the first argument, and driver options as the second.

::: warning
Always call `verify()` on the server. The widget only collects the answer. If `verify()` is skipped, a bot can post the form without ever loading the challenge.
:::

## Configuration

The config file declares the available profiles. Each entry in `factories.instances` is built with a `CaptchaFactory` helper.

```php
use Lyrasoft\Luna\Captcha\CaptchaFactory;
use Lyrasoft\Luna\Captcha\NullCaptchaDriver;

return [
    'default' => env('CAPTCHA_DEFAULT') ?? 'none',

    'factories' => [
        'instances' => [
            'google' => static fn() => CaptchaFactory::recaptcha(
                (string) env('RECAPTCHA_KEY'),
                (string) env('RECAPTCHA_SECRET'),
                (string) env('RECAPTCHA_TYPE', 'checkbox'),
            ),
            'google_enterprise' => static fn() =>
                CaptchaFactory::recaptchaEnterprise(
                    (string) env('RECAPTCHA_ENTERPRISE_KEY'),
                    (string) env('RECAPTCHA_ENTERPRISE_PROJECT_ID'),
                    (string) env('RECAPTCHA_ENTERPRISE_API_KEY'),
                    (string) env('RECAPTCHA_ENTERPRISE_TYPE', 'checkbox'),
                    [
                        'min_score' => (float) env(
                            'RECAPTCHA_ENTERPRISE_MIN_SCORE',
                            0.5,
                        ),
                    ],
                ),
            'cloudflare' => static fn() => CaptchaFactory::cloudflare(
                (string) env('CLOUDFLARE_TURNSTILE_KEY'),
                (string) env('CLOUDFLARE_TURNSTILE_SECRET'),
                [
                    'theme' => env('CLOUDFLARE_TURNSTILE_THEME', 'auto'),
                    'size' => env('CLOUDFLARE_TURNSTILE_SIZE', 'normal'),
                    'type' => env('CLOUDFLARE_TURNSTILE_TYPE', 'checkbox'),
                ],
            ),
            'image' => static fn() => CaptchaFactory::gregwar(),
            'none' => static fn() => new NullCaptchaDriver(),
        ],
    ],
];
```

Set `CAPTCHA_DEFAULT` in `.env` to switch the whole site to another profile. You can add more profiles, for example a stricter `login` profile, and request them by tag.

## Drivers

### Google reCAPTCHA

`RecaptchaDriver` uses Google reCAPTCHA. It requires the `google/recaptcha` package, otherwise the constructor throws a `DomainException`. Its widget type, `checkbox` or `invisible`, comes from the `RECAPTCHA_TYPE` setting in the config.

```php
use Lyrasoft\Luna\Captcha\CaptchaDriverInterface;

$captcha = $app->retrieve(
    CaptchaDriverInterface::class,
    tag: 'google',
);

// Render the widget.
$html = $captcha->input(['class' => 'my-captcha']);

// Ask the front-end script to verify before submit.
$html = $captcha->input([], ['js_verify' => true]);

// Verify. Reads "g-recaptcha-response" from the POST data.
$ok = $captcha->verify(null);

// Use another server array, for example behind a proxy.
$ok = $captcha->verify(null, [
    'server' => ['REMOTE_ADDR' => $clientIp],
]);
```

The `invisible` type has no checkbox. The challenge runs when the form is submitted.

Environment variables used by the `google` profile:

```shell
RECAPTCHA_KEY=your-site-key
RECAPTCHA_SECRET=your-secret-key
RECAPTCHA_TYPE=checkbox # invisible
```

### Google reCAPTCHA Enterprise

`RecaptchaEnterpriseDriver` uses the reCAPTCHA Enterprise `CreateAssessment` API. The widget uses the site key, and the server sends the token to Google with your project ID and API key. It needs no extra package, and sends the request with the Windwalker `HttpClient`.

```php
use Lyrasoft\Luna\Captcha\CaptchaDriverInterface;

$captcha = $app->retrieve(
    CaptchaDriverInterface::class,
    tag: 'google_enterprise',
);

// Render the widget with the site key.
$html = $captcha->input(['class' => 'my-captcha']);

// Verify. Reads "g-recaptcha-response" from the POST data.
$ok = $captcha->verify(null);

// Also require an expected action name and a higher score.
$ok = $captcha->verify(null, [
    'action' => 'contact',
    'min_score' => 0.7,
]);
```

The token passes only when Google marks it as valid, the action matches if `action` is given, and the risk score is at least `min_score`. The score ranges from `0.0` (likely a bot) to `1.0` (likely a human). The default `min_score` is `0.5`.

Environment variables used by the `google_enterprise` profile:

```shell
RECAPTCHA_ENTERPRISE_KEY=your-site-key
RECAPTCHA_ENTERPRISE_PROJECT_ID=your-project-id
RECAPTCHA_ENTERPRISE_API_KEY=your-api-key
RECAPTCHA_ENTERPRISE_TYPE=checkbox # invisible
RECAPTCHA_ENTERPRISE_MIN_SCORE=0.5
```

::: warning
`RECAPTCHA_ENTERPRISE_API_KEY` is used only on the server. Never print it into the page or commit it to the repository.
:::

### Cloudflare Turnstile

`CloudflareDriver` uses Cloudflare Turnstile. It needs no extra package, and sends the verification request with the Windwalker `HttpClient`. The `theme`, `size`, and `type` widget options come from the env variables below. Pass other widget options, such as `language`, to `input()`.

```php
use Lyrasoft\Luna\Captcha\CaptchaDriverInterface;

$captcha = $app->retrieve(
    CaptchaDriverInterface::class,
    tag: 'cloudflare',
);

// Options passed to input() override the config options.
$html = $captcha->input([], ['theme' => 'light']);

// Verify with the token from "cf-turnstile-response".
$ok = $captcha->verify(null);

// Or pass the token yourself.
$ok = $captcha->verify($app->input('token'));
```

An empty token, an unreachable service, or a response without `success: true` all return `false`.

Environment variables used by the `cloudflare` profile:

```shell
CLOUDFLARE_TURNSTILE_KEY=your-site-key
CLOUDFLARE_TURNSTILE_SECRET=your-secret-key
CLOUDFLARE_TURNSTILE_THEME=auto
CLOUDFLARE_TURNSTILE_SIZE=normal
CLOUDFLARE_TURNSTILE_TYPE=checkbox # invisible
```

### Image Captcha

`GregwarDriver` draws an image with `gregwar/captcha`, and asks the visitor to type the text. It needs no external service, but it requires the `gregwar/captcha` package, otherwise the constructor throws a `DomainException`. The `quality`, `lifetime`, and `session_key` options can be passed as the array argument of `CaptchaFactory::gregwar()` in the config. The profile reads no env variables.

```php
use Lyrasoft\Luna\Captcha\CaptchaDriverInterface;

$captcha = $app->retrieve(
    CaptchaDriverInterface::class,
    tag: 'image',
);
```

The driver also implements `CaptchaImageInterface`, so it can produce the image itself. Each call generates a new phrase and stores it, with a timestamp, in the session state.

```php
use Lyrasoft\Luna\Captcha\CaptchaImageInterface;

if ($captcha instanceof CaptchaImageInterface) {
    $binary = $captcha->image();     // JPEG bytes
    $dataUri = $captcha->base64();   // data: URI for <img src>
    $type = $captcha->contentType(); // image/jpeg
    $captcha->output();              // Send header and image
}
```

```php
// Render the input, image, and refresh button.
$html = $captcha->input(
    ['id' => 'contact-captcha'],
    ['profile' => 'image'],
);

// Compare the typed text. Case is ignored.
$ok = $captcha->verify($app->input('captcha'));
```

The rendered image loads from the `_captcha_image` route, handled by `CaptchaController::image()`. The `profile` option tells that route which profile to use, so it must match the tag of the driver. Pass a `route` option to use a custom image URL.

::: info
The phrase is replaced every time an image is generated. If the visitor opens the form in two tabs, only the answer to the most recent image is valid.
:::

### Null Driver

`NullCaptchaDriver` renders nothing and always passes. It is the default profile, so a fresh installation works without any captcha keys. It reads no env variables; `CAPTCHA_DEFAULT=none` selects it.

```php
use Lyrasoft\Luna\Captcha\NullCaptchaDriver;

$captcha = new NullCaptchaDriver();

$captcha->input();      // ''
$captcha->verify(null); // true
```

::: warning
Do not leave `CAPTCHA_DEFAULT` as `none` on a production site that is exposed to bots. Every submission passes verification.
:::

## Custom Drivers

Implement `CaptchaDriverInterface` and register it as a profile. Add `CaptchaImageInterface` when the driver can produce an image.

```php
use Lyrasoft\Luna\Captcha\CaptchaDriverInterface;

class MathCaptchaDriver implements CaptchaDriverInterface
{
    public function input(array $attrs = [], array $options = []): string
    {
        return '<input name="captcha" placeholder="1 + 1 = ?">';
    }

    public function verify(mixed $value, array $options = []): bool
    {
        return (int) $value === 2;
    }
}
```

```php
'instances' => [
    'math' => static fn() => new MathCaptchaDriver(),
],
```

## Related

- [Captcha Fields](../systems/form-fields/captcha-fields.md)
