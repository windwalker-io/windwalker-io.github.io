---
layout: doc
description: Add a captcha to a Luna form with CaptchaField, choose a profile per field, and validate the answer automatically.
---

# Captcha Fields

A form that accepts public input needs a captcha to block bots. `CaptchaField` places a captcha inside a form, and validates the visitor's answer when the form is submitted. The field delegates rendering and checking to a captcha driver, so you choose the service in the config and the form stays the same.

The drivers, their settings, and how to use them without a form are described in [Captcha](../../utilities/captcha.md).

## Declare the Field

Add `CaptchaField` to a form. Without any option, the field uses the `default` profile from the captcha config.

```php
use Lyrasoft\Luna\Field\CaptchaField;
use Windwalker\Form\Form;

$form->add('captcha', CaptchaField::class)
    ->label('Captcha');
```

`CaptchaField` extends `TextField`, so the name, label, and other text field options work as usual.

## Complete Example

This example uses a contact form with the Google reCAPTCHA profile. The field renders the widget, and the form validates it on submit.

```php
use Lyrasoft\Luna\Field\CaptchaField;
use Windwalker\Form\Form;

class ContactForm
{
    public function define(Form $form): void
    {
        $form->add('name', TextField::class)
            ->label('Name')
            ->required(true);

        $form->add('message', TextareaField::class)
            ->label('Message')
            ->required(true);

        $form->add('captcha', CaptchaField::class)
            ->label('Are you human?')
            ->profile('google')
            ->jsVerify(true);
    }
}
```

When the visitor submits the form, the field calls the driver's `verify()` with the submitted value. If the check fails, validation stops with the message from the `luna.field.captcha.message.verify.fail` translation key.

::: info
`CaptchaField` always removes the `required` rule. The driver decides whether an answer is present, so a required check on the field would reject valid submissions.
:::

## Choose a Profile

The `profile()` option selects a captcha profile by name. Each name must exist in `factories.instances` of the captcha config.

```php
// Use the Cloudflare Turnstile profile for this field.
$form->add('captcha', CaptchaField::class)
    ->profile('cloudflare');

// Use the image captcha for a login form.
$form->add('captcha', CaptchaField::class)
    ->profile('image');
```

Omit `profile()` to use the `default` profile, which is set by `CAPTCHA_DEFAULT`.

::: tip
Use a stricter profile for login or account forms, and a lighter one for newsletter or comment forms.
:::

## Options

The field reads its behavior from these options.

- `profile()` sets the driver profile. A profile set on the field wins over any profile passed at render time.
- `autoValidate()` runs the driver's `verify()` during validation. It is on by default.
- `jsVerify()` asks the driver's front-end script to verify the answer before the form is posted.
- `captchaOptions()` passes extra options to the driver's `input()` and `verify()` methods.
- `imageRoute()` sets a callback that builds the URL of the image captcha. It is used by the `image` profile.

```php
$form->add('captcha', CaptchaField::class)
    ->profile('image')
    ->autoValidate(false);
```

::: warning
Setting `autoValidate(false)` skips the server check. Call the driver's `verify()` yourself in the controller, or bots can submit the form without solving the captcha.
:::

## Related

- [Captcha](../../utilities/captcha.md)
- [Localization Fields](localization-fields.md)
- [Content Selection Fields](content-selection-fields.md)
