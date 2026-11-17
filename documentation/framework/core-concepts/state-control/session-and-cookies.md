---
layout: doc
---

# Session & Cookies

Windwalker manages sessions itself. It does not use PHP's native
`session_start()` by default. The session is created by the
`Session` object, which stores its data through a handler and reads
and writes it through a bridge. Cookies are handled by a separate
`CookiesInterface`.

## Session Configuration

Session settings live in `etc/packages/session.config.php`:

```php
return #[
    ConfigModule(
        name: 'session',
        enabled: true,
        priority: 100,
        belongsTo: SessionPackage::class,
    )
]
static fn() => [
    'default' => env('SESSION_DEFAULT') ?: 'filesystem',

    'cookie_params' => [
        'expires' => '+150minutes',
        'path' => '/',
        'domain' => null,
        'secure' => false,
        'httponly' => true,
        'samesite' => CookiesInterface::SAMESITE_LAX,
    ],

    'session_options' => [
        'name' => 'WINDWALKER_SESSID',
        'use_cookies' => '0',
        'gc_divisor' => '1000',
        'gc_probability' => env('SESSION_GC_PROBABILITY', '1'),
    ],

    'ini' => [
        'use_cookies' => '0',
        'gc_divisor' => '1000',
        'gc_probability' => env('SESSION_GC_PROBABILITY', '1'),
    ],
];
```

- `default`: the profile to use. The built-in profiles are
  `filesystem`, `native`, `database` and `null`, defined under
  `factories.instances`.
- `cookie_params`: expiry, path, domain, secure, httponly and samesite
  of the session cookie. `expires` accepts a relative time such as
  `+150minutes`.
- `session_options`: the session name and PHP session options.
- `ini`: PHP ini values applied to the session.

## Handlers and Bridges

A **handler** decides where session data is stored. The built-in
handlers are:

- `array`
- `null`
- `native`
- `database`
- `filesystem`
- `redis`

A **bridge** decides how the session is connected to the request. The
bridges are `php` (`PhpBridge`, the Windwalker implementation) and
`native`.

Each profile in `factories.instances` builds a session from a bridge,
a handler and a cookies driver. To switch handler, change the profile
name in `default`, or edit the profile:

```php
'instances' => [
    'database' => static fn () => SessionFactory::createSession(
        'php',
        'database',
        'request',
        [
            SessionInterface::OPTION_AUTO_COMMIT => true,
        ]
    ),
],
```

The handler class for each name is set under `factories.handlers`:

```php
'handlers' => [
    'database' => static fn() => create(
        DatabaseHandler::class,
        options: [
            'table' => 'sessions',
        ]
    ),
],
```

::: tip
`DatabaseHandler` uses the table `windwalker_sessions` by default. The
config above sets it to `sessions`. Create that table with a migration.
:::

### Database Handler

Use the database handler when sessions must be shared across several
servers. Keep the table in the same database as the application data.

### Redis Handler

Use the redis handler for fast shared sessions. The default key prefix
is `ww_sess_`. The config maps it with `RedisHandler::class`:

```php
'handlers' => [
    'redis' => RedisHandler::class,
],
```

## Using the Session

Inject `Session` into a constructor, or get it from the container:

```php
use Windwalker\Session\Session;

class CheckoutController
{
    public function __construct(
        protected Session $session,
    ) {
    }

    public function save(): void
    {
        $this->session->start();

        $this->session->set('cart_id', 'c-1001');
        $cartId = $this->session->get('cart_id');

        $id = $this->session->getId();
    }
}
```

Use `start()` and `stop()` to open and close the session. The session
stops automatically when the response is sent.

Call `stop()` yourself when you need the data saved before the response
ends, for example before a long task. `stop()` writes the data to the
handler and closes the session:

```php
$session->set('cart_id', 'c-1001');

// Save now, while the rest of the request keeps running
$session->stop();

$this->sendConfirmationMail();
```

::: tip
Changes made after `stop()` are not saved. Call `start()` again to keep
using the session.
:::

### Flash Messages

Flash messages are kept until the next request reads them:

```php
// Add a message in the current request
$app->addMessage('Saved successfully.', 'success');

// Read messages of one type
$messages = $app->getMessages('success');
```

`AppContext::addMessage()` and `getMessages()` wrap the flash storage.
Pass `true` as the `$peek` argument of `getMessages()` to read without
clearing the messages.

::: warning
Call `getMessages()` after the session has started. Before `start()`,
the session is empty, so the call returns nothing.
:::

```php
$session->start();

// Read without clearing, so the message stays for the next request
$messages = $app->getMessages('success', true);
```

### Robots

Bots and crawlers do not need a session. The web application registers a
shared `BrowserNext` object, built from the request headers. Its
`isRobot()` method returns `true` for bot and robot devices.
`SessionRobotSubscriber` listens to `BeforeRequestEvent`. When the visitor
is a robot and a `Session` exists, it sets `session.default` to the `null`
profile, so the session writes nothing to storage.

Your code does not need to check the robot. Inject `Session` as usual:

```php
use Windwalker\Session\Session;

class ProductController
{
    public function show(Session $session): void
    {
        // A robot's request writes to the null profile and is discarded
        $session->set('last_viewed', 'p-100');
    }
}
```

To branch on the visitor, inject `BrowserNext` and call `isRobot()`:

```php
use Windwalker\Core\Http\BrowserNext;

class SitemapController
{
    public function index(BrowserNext $browser): string
    {
        if ($browser->isRobot()) {
            return $this->renderPlainSitemap();
        }

        return $this->renderInteractiveSitemap();
    }
}
```

::: info
The robot switch only runs when the `BrowserNext` service exists. Without
it, every visitor gets a session.
:::

### Destroy, Regenerate and Fork

- `regenerate()` changes the session ID and sends a new cookie. Call it
  after login to prevent session fixation.
- `destroy()` clears the session data and the cookie.
- `fork($newId)` copies the current session to a new ID. It needs an
  active session, and it throws `LogicException` with the native bridge.

```php
// After successful login
$session->regenerate();

// Log out
$session->destroy();
```

### Switching to a Known Session ID

`setId()` sets the ID the session uses. Use `fork()` to copy the current
session data into a new ID instead.

Call `setId()` before `start()`. If the session is already running, call
`stop()` first, then `setId()`, then `start()`. Otherwise the new ID has
no effect.

```php
$session->stop();
$session->setId($newId);
$session->start();
```

::: warning
Accepting a session ID from the request lets an attacker choose a
victim's session. Only call `setId()` with an ID that your application
created and stored itself.
:::

## Cookies

Cookies use the `CookiesInterface`. Two implementations are available:

- `request`: reads the cookies of the request. Writes are added to the
  response.
- `native`: uses PHP's cookie functions.

Inject `CookiesInterface` to use it:

```php
use Windwalker\Session\Cookie\CookiesInterface;

class PreferenceController
{
    public function __construct(
        protected CookiesInterface $cookies,
    ) {
    }

    public function save(): void
    {
        $this->cookies->set('theme', 'dark');

        $theme = $this->cookies->get('theme');

        $this->cookies->remove('theme');
    }
}
```

Cookie options come from `CookiesOptions`: path, domain, secure,
httpOnly and sameSite. `CookiesAutoSecureSubscriber` sets `secure` to
`true` on HTTPS requests when `COOKIES_AUTO_SECURE` is enabled.

### Cookies and Session Together

The session ID is sent in a cookie. The session data stays on the
server. Do not store a session's secret data in a cookie.

::: tip
Store only small, non-sensitive values in cookies, such as a locale or a
UI preference. Store user identity and private data in the session.
:::

::: warning
Cookies can be edited by the user. Never trust a value read from a
cookie without validating it.
:::
