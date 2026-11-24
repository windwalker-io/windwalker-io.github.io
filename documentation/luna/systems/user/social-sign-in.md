---
layout: doc
description: How to set up social sign-in with Hybridauth in Luna.
---

# Social Sign-in

Social sign-in lets visitors log in with an account from an external provider, such as Google or Facebook. Luna runs the OAuth flow through Hybridauth, matches the returned profile to a user, and logs that user in.

Social sign-in is optional. It needs the `hybridauth/hybridauth` package (`^3.0`), which Luna lists as a suggested dependency, not a required one.

```bash
composer require hybridauth/hybridauth:^3.0
```

## How the Pieces Fit Together

Four parts work together:

- **Provider config**: `social_providers` lists each provider, its keys, scope, and profile handler.
- **Login route**: `social_auth` at `/social/auth/{provider}` starts the OAuth flow and receives the callback.
- **Profile handler**: converts the provider's profile into the user data Luna stores.
- **`SocialAuthService`**: finds or creates the user and links the social account.

## Enable a Provider

Luna ships `social_login.config.php` in its `etc/` directory. It defines `social_providers` with `Facebook` and `Google`, both disabled by default:

```php
// Luna package: etc/social_login.config.php
use Lyrasoft\Luna\Auth\Profile\FacebookProfileHandler;
use Lyrasoft\Luna\Auth\Profile\GoogleProfileHandler;

return [
    'social_providers' => [
        'Facebook' => [
            'enabled' => false,
            'keys' => [
                'id' => env('FACEBOOK_SOCIAL_ID'),
                'secret' => env('FACEBOOK_SOCIAL_SECRET'),
            ],
            'scope' => 'email, public_profile',
            'profile_handler' => FacebookProfileHandler::class,
        ],
        'Google' => [
            'enabled' => false,
            'keys' => [
                'id' => env('GOOGLE_SOCIAL_ID'),
                'secret' => env('GOOGLE_SOCIAL_SECRET'),
            ],
            'scope' => 'email profile',
            'profile_handler' => GoogleProfileHandler::class,
        ],
    ],
];
```

To enable a provider, copy this file into your application's `etc/` directory with the same name, keep the top-level `social_providers` key, and set `enabled` to `true`. Put the secrets in `.env`:

```ini
GOOGLE_SOCIAL_ID=your-client-id
GOOGLE_SOCIAL_SECRET=your-client-secret
```

::: warning
Do not commit client secrets to the repository. Store them in `.env` only.
:::

## Register the Callback URL

Each provider needs the exact callback URL in its developer console. The URL is the `social_auth` route with the provider name:

```text
https://example.com/social/auth/Google
https://example.com/social/auth/Facebook
```

The provider name in the URL must match the key in `social_providers`, including capitalization.

::: tip
Use a separate OAuth app for local development. Its callback URL can point to `http://localhost:8000/social/auth/Google`.
:::

## Add a Login Button

The button is a link that opens the `social_auth` route with a `provider` value. Build the URL with the Navigator:

```php
use Windwalker\Core\Router\Navigator;

// $nav is a Navigator instance, injected or retrieved from the app
$url = $nav->to('social_auth')
    ->var('provider', 'Google')
    ->full();
```

```html
<a href="{{ url }}" class="btn btn-google">
    Sign in with Google
</a>
```

If you prefer a form, use a `POST` form with the same action. The `social_auth` route accepts any HTTP method, so both work:

```html
<form action="{{ url }}" method="post">
    <button type="submit" class="btn btn-google">
        Sign in with Google
    </button>
</form>
```

## What Happens After the Callback

`AuthController::socialAuth` calls `SocialAuthService::auth()`. The service does this:

- It reads the provider's config from `social_login.social_providers`.
- It creates a Hybridauth adapter with the provider's keys and scope.
- It runs the profile handler to build the user data.
- It looks for a `UserSocial` row with the same provider and identifier.
- If no row exists, it looks for a user with the same email.
- If no user exists, it creates one. The new user is enabled and verified.

After that, the controller calls [`UserService::login()`](./login-and-logout), updates `last_login`, and redirects to the home page.

::: info
If the provider's email matches an existing user, Luna links the social account to that user. It does not ask for confirmation.
:::

## Profile Handlers

A profile handler converts the provider profile into user data. It implements `ProfileHandlerInterface`:

- `handle(AdapterInterface $adapter): array` returns the data to save.
- `getLoginName(): string` returns the field used to find an existing user.

Luna ships these handlers:

- `FacebookProfileHandler`
- `GoogleProfileHandler`
- `DefaultProfileHandler`, used when `profile_handler` is missing

Write your own handler when a provider returns data in a different shape:

```php
use Hybridauth\Adapter\AdapterInterface;
use Lyrasoft\Luna\Auth\Profile\ProfileHandlerInterface;

class MyGoogleProfileHandler implements ProfileHandlerInterface
{
    public function handle(AdapterInterface $adapter): array
    {
        $profile = $adapter->getUserProfile();

        return [
            'email' => $profile->email,
            'name' => $profile->displayName,
        ];
    }

    public function getLoginName(): string
    {
        return 'email';
    }
}
```

Set the class in the provider config:

```php
use App\Auth\MyGoogleProfileHandler;

'Google' => [
    'enabled' => true,
    'profile_handler' => MyGoogleProfileHandler::class,
    // ...
],
```

## Add a Custom Provider

Add an entry to `social_providers`. The key is the name used in the URL, and `keys`, `scope`, and `profile_handler` follow the same shape as the built-in providers.

Hybridauth has no built-in LINE provider, but Luna ships one: `Lyrasoft\Luna\Auth\Provider\LineSocialProvider`. It is an `OAuth2` adapter that reads the profile from the `id_token` in the token response. Point the `adapter` key at it:

```php
use Lyrasoft\Luna\Auth\Profile\DefaultProfileHandler;
use Lyrasoft\Luna\Auth\Provider\LineSocialProvider;

// etc/packages/social_login.config.php
return [
    'social_providers' => [
        'LINE' => [
            'enabled' => true,
            'adapter' => LineSocialProvider::class,
            'keys' => [
                'id' => env('LINE_SOCIAL_ID'),
                'secret' => env('LINE_SOCIAL_SECRET'),
            ],
            'scope' => 'profile openid email',
            'profile_handler' => DefaultProfileHandler::class,
        ],
    ],
];
```

The provider config is passed to Hybridauth unchanged, so Hybridauth creates the adapter from the `adapter` key. The callback URL is `https://example.com/social/auth/LINE`.

LINE setup:

- Create a provider in the LINE Developers console, then create a LINE Login channel.
- Apply for the email permission in the channel settings. LINE requires a screenshot showing how you use the email, and you must agree to two checkboxes.
- Add the callback URL. Include both the `www` and non-`www` domains, and `localhost` for local testing.

## Change the Saved Data

`SocialAuthService::prepareUserData()` is a protected hook. It runs only when a new user is created through social login, and the array it returns is what gets saved:

```php
use Hybridauth\Adapter\AdapterInterface;
use Lyrasoft\Luna\Auth\SocialAuthService;

class MySocialAuthService extends SocialAuthService
{
    protected function prepareUserData(
        AdapterInterface $adapter,
        array $user
    ): array {
        $user['role'] = 'member';

        return $user;
    }
}
```

Bind your subclass in your application's container so Luna uses it. The exact binding depends on your app setup; follow your [framework's DI documentation](/documentation/framework/index).

::: info
`prepareUserData()` is not called when an existing user is found. It only affects new accounts.
:::

## Related Topics

- [Authentication](./authentication) explains the login flow that social sign-in joins after the callback.
- [Users](./users) explains how users are loaded and stored.
