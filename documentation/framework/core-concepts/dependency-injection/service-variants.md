---
layout: doc
title: Service Variants
---

# Service Variants

## Introduction

Often one interface has several implementations, such as an AI model chosen
per request or an error handler chosen per error type. Callers depend on
the interface and pass a short tag, such as `'claude'`, to pick a variant.

Windwalker offers three ways to bind the variants:

- A closure in `bindings`, for a few variants in a few lines.
- A binding in a service provider, for larger logic or shared objects per tag.
- A `TaggingFactory`, for variants defined by settings and reused across
  packages.

## Choosing a Form

Pick the form that matches how reusable the code must be:

- **Simple Service Binding**: one object for an ID, with no tag. See
  [Simple Service Binding](#simple-service-binding).
- **Tagged Binding**: a closure in `bindings`, or `bindShared()` in a
  provider. The fastest way to add variants inside a project.
- **TaggingFactory**: variants declared as an array under `factories`. Use
  it in packages, or when a project must override entries.

## Configuration Keys

Each configuration section can contain DI keys: `bindings`, `providers`,
`aliases`, `extends`, and `attributes`. The `di` section, `etc/di.config.php`,
is processed last, so its keys win over package sections. See
[Configuration](/documentation/framework/getting-started/configuration) for how
sections load.

### Minimal Setup

A package section that provides a service through its own provider, plus
a binding and an alias, looks like this:

```php
// etc/packages/payment.config.php
use App\Payment\CheckoutService;
use App\Provider\PaymentProvider;
use Windwalker\Core\Attributes\ConfigModule;

return #[ConfigModule(name: 'payment', enabled: true)]
static fn() => [
    'currency' => 'USD',
    'providers' => [
        PaymentProvider::class,
    ],
    'bindings' => [
        CheckoutService::class,
    ],
    'aliases' => [
        'payment.checkout' => CheckoutService::class,
    ],
];
```

Keys are handled in this order: `attributes`, `bindings`, `providers`,
`aliases`, `extends`. The service can then be looked up by class name or alias:

```php
$checkout = $app->retrieve(CheckoutService::class);
$checkout = $app->retrieve('payment.checkout');
```

### Showcase: Overriding a Package in the Project

To replace a package's binding, the project sets the same ID in
`etc/di.config.php`:

```php
// etc/di.config.php, inside the returned array
'bindings' => [
    \App\Payment\PaymentGatewayInterface::class
        => \App\Payment\FakeGateway::class,
],
```

Because `di` is processed last, `CheckoutService` receives `FakeGateway`
without any change to the package.

### bindings

Each `bindings` key is an ID. The value decides how the object is created:

```php
'bindings' => [
    // A class name: shared, created once per container
    \App\Payment\CheckoutService::class,

    // An interface bound to a class: shared
    \App\Payment\PaymentGatewayInterface::class
        => \App\Payment\StripeGateway::class,

    // A closure: called on every lookup, not shared
    \App\Mail\Mailer::class => fn() => new \App\Mail\Mailer(),

    // share(): the closure runs once, and the result is shared
    \App\Log\Logger::class => \Windwalker\DI\share(
        fn() => new \App\Log\Logger(),
    ),

    // create(): named constructor arguments and configuration references
    \App\Mail\SmtpMailer::class => \Windwalker\DI\create(
        \App\Mail\SmtpMailer::class,
        host: \Windwalker\ref('mail.host'),
        port: 587,
    ),
],
```

An object value is stored as is, so every lookup returns the same instance:

```php
'bindings' => [
    \App\Support\Clock::class => new \App\Support\SystemClock(),
],
```

::: tip
Bind interfaces to classes in `bindings`, and bind classes that need
arguments with `create()`. Use a closure when the object needs logic
beyond a constructor call.
:::

::: warning
`ref()` reads a configuration value when the object is created, not when
the configuration is loaded. If the value is missing, the container passes
`null` to the constructor. A non-nullable parameter then fails with a
`TypeError`. Check that the referenced key exists before you use it.
:::

Each entry is stored as a definition. A later entry for the same ID
replaces the earlier one, unless the earlier definition is protected.
Replacing a protected definition throws a `DefinitionException`.

### providers

`providers` lists service provider classes, and the application registers
each one during boot. The provider is covered on the
[Service Providers](/documentation/framework/core-concepts/dependency-injection/dependency-injection#service-providers)
page.

```php
'providers' => [
    \App\Provider\PaymentProvider::class,
],
```

### aliases

`aliases` gives another name to an existing ID. The name is resolved to
the target, so both names return the same service:

```php
'aliases' => [
    'payment.checkout' => \App\Payment\CheckoutService::class,
],
```

### extends

`extends` runs a closure on an object after it is created. The closure
receives the object and the container, and it must return the object:

```php
'extends' => [
    \App\Payment\CheckoutService::class => function (
        \App\Payment\CheckoutService $checkout,
        \Windwalker\DI\Container $container,
    ) {
        // Configure $checkout here.
        return $checkout;
    },
],
```

Use `extends` to change a service that another package defines, without
replacing its binding.

### attributes

`attributes` registers attribute handler classes. The value says where the
attribute can be used, using the `AttributeType` constants:

```php
use Windwalker\DI\Attributes\AttributeType;

'attributes' => [
    \App\Attribute\Audit::class => AttributeType::CLASSES,
    \App\Attribute\Tenant::class
        => AttributeType::PROPERTIES | AttributeType::PARAMETERS,
],
```

The main types are `CLASSES`, `PROPERTIES`, `METHODS`, `PARAMETERS`, and
`CALLABLE`. Combine them with `|`. The attributes that Windwalker itself
provides, such as `#[Inject]` and `#[Autowire]`, are described on the
[DI attributes](/documentation/components/di/attributes) page.

### Configuration Reminders

- The `di` section wins over package sections.
- Existing objects keep the dependencies they received. Set bindings during
  boot, before the first lookup.
- `'enabled' => false` removes a section's providers and bindings, which can
  break sections that depend on them.

## Simple Service Binding

Many services have one configuration for the whole project and need no tag.
A binding without a tag is the simplest form.

For example, if we installed OpenAI's PHP package, we can bind the client in `etc/di.config.php`:

```php
// etc/di.config.php, inside the returned array
'bindings' => [
    OpenAI\Client::class => \Windwalker\DI\share(
        fn() => OpenAI::client(env('OPENAI_API_KEY')),
    ),
],
```

Now any service can receive the client by its class name, with no tag and no
factory:

```php
namespace App\Service;

use OpenAI\Client;

class SupportReplyService
{
    public function __construct(
        protected Client $openai,
    ) {}
}
```

Code outside the container can ask for it the same way:

```php
$client = $app->retrieve(OpenAI\Client::class);
```

The closure runs at the first lookup, so the environment is read then.
`share()` keeps one client per container.

::: info
A stateless client can be shared across requests in a long-running server.
Keep per-request data, such as a user's token, out of it. See
[Container Layers](/documentation/framework/core-concepts/applications/layers).
:::

## Tagged Bindings

The quickest form is a closure in `bindings` that receives the tag. This
example selects a chat model in `etc/di.config.php`:

```php
// etc/di.config.php, inside the returned array
'bindings' => [
    ChatModelInterface::class => function (
        Container $container,
        ?string $tag = null,
    ) {
        return match ($tag) {
            'claude' => $container->newInstance(ChatClaudeDriver::class),
            default => $container->newInstance(ChatGPTDriver::class),
        };
    },
],
```

Callers pass the tag when they look up the interface:

```php
$gpt = $app->retrieve(ChatModelInterface::class);
$claude = $app->retrieve(ChatModelInterface::class, tag: 'claude');
```

Two details matter here:

- A closure in `bindings` is not shared, so each lookup creates a new object.
  Use `share()` for one object per tag (see
  [Binding in a Provider](#binding-in-a-provider)).
- A tag the closure does not handle is its decision. Keep a `default` arm for
  missing tags.

::: tip
Use `?string $tag = null`. A lookup without a tag then reaches the `default`
arm.
:::

### Enum Tags

A string tag is easy to write, but a typo is only found at runtime. An enum
puts the valid tags into a type:

```php
namespace App\Chat;

enum ChatModelDriver: string
{
    case GPT = 'gpt';
    case Claude = 'claude';
    case Gemini = 'gemini';
}
```

Type the closure parameter with the enum, and match the cases:

```php
'bindings' => [
    ChatModelInterface::class => function (
        Container $container,
        ?ChatModelDriver $tag = null,
    ) {
        return match ($tag) {
            ChatModelDriver::Claude => $container->newInstance(
                ChatClaudeDriver::class,
            ),
            ChatModelDriver::Gemini => $container->newInstance(
                ChatGeminiDriver::class,
            ),
            default => $container->newInstance(ChatGPTDriver::class),
        };
    },
],
```

```php
$claude = $app->retrieve(
    ChatModelInterface::class,
    tag: ChatModelDriver::Claude,
);
```

A closure with an enum parameter, such as `?ChatModelDriver $tag`, rejects a
string tag with a `TypeError`. The rich enum fixes this. `EnumRichTrait` gives
the enum `wrap()`, which returns a case unchanged and converts a string with
`from()`:

```php
namespace App\Chat;

use Windwalker\Utilities\Enum\EnumRichInterface;
use Windwalker\Utilities\Enum\EnumRichTrait;

enum ChatModelDriver: string implements EnumRichInterface
{
    use EnumRichTrait;

    case GPT = 'gpt';
    case Claude = 'claude';
    case Gemini = 'gemini';
}
```

Type the parameter as `string|\UnitEnum|null` and call `wrap()`. A `null` tag
uses the default case:

```php
'bindings' => [
    ChatModelInterface::class => function (
        Container $container,
        string|\UnitEnum|null $tag = null,
    ) {
        $driver = $tag === null
            ? ChatModelDriver::GPT
            : ChatModelDriver::wrap($tag);

        return match ($driver) {
            ChatModelDriver::Claude => $container->newInstance(
                ChatClaudeDriver::class,
            ),
            ChatModelDriver::Gemini => $container->newInstance(
                ChatGeminiDriver::class,
            ),
            ChatModelDriver::GPT => $container->newInstance(
                ChatGPTDriver::class,
            ),
        };
    },
],
```

Both forms now work for the same lookup:

```php
$app->retrieve(ChatModelInterface::class, tag: 'claude');
$app->retrieve(ChatModelInterface::class, tag: ChatModelDriver::Claude);
```

See [Enum Metadata](/documentation/components/utilities/enum-metadata) for
titles, colors, and other rich-enum features.

::: warning
`wrap()` throws a `ValueError` for an unknown value. For untrusted input, use
`tryWrap()`, which returns `null` instead.
:::

### Binding in a Provider

When the logic grows, move the binding into a provider. Use `bindShared()`
to keep one object per tag:

```php
namespace App\Provider;

use App\Chat\ChatClaudeDriver;
use App\Chat\ChatGPTDriver;
use App\Chat\ChatModelDriver;
use App\Chat\ChatModelInterface;
use Windwalker\DI\Container;
use Windwalker\DI\ServiceProviderInterface;

class ChatProvider implements ServiceProviderInterface
{
    public function register(Container $container): void
    {
        $container->bindShared(
            ChatModelInterface::class,
            function (
                Container $container,
                string|\UnitEnum|null $tag = null,
            ) {
                $driver = $tag === null
                    ? ChatModelDriver::GPT
                    : ChatModelDriver::wrap($tag);

                return match ($driver) {
                    ChatModelDriver::Claude => $container->newInstance(
                        ChatClaudeDriver::class,
                    ),
                    ChatModelDriver::GPT => $container->newInstance(
                        ChatGPTDriver::class,
                    ),
                };
            },
        );
    }
}
```

Each tag has its own shared object. The provider is also the place for logic
that reads configuration values. See
[Service Providers](/documentation/framework/core-concepts/dependency-injection/dependency-injection#service-providers).

### Showcase: An AI Assistant Application

A chat feature lets each request pick a model, and a background job uses the
configured default. The case has four parts: the drivers, the configuration,
a controller, and a job.

#### The Interface and the Drivers

Each driver takes its API key in the constructor, so the container can
create it from configuration:

```php
// src/Chat/ChatModelInterface.php
namespace App\Chat;

interface ChatModelInterface
{
    public function complete(string $prompt): string;
}
```

```php
// src/Chat/ChatGPTDriver.php
namespace App\Chat;

class ChatGPTDriver implements ChatModelInterface
{
    public function __construct(
        protected string $apiKey,
    ) {}

    public function complete(string $prompt): string
    {
        // Call the OpenAI API with $this->apiKey here.
        return "gpt: $prompt";
    }
}
```

`ChatClaudeDriver` has the same shape, with its own API call.

#### The Configuration Section

A simple example, this shows how we binding services by tag and using `match()` to select the 
implementation. The API keys are read from the environment:

```php
// etc/packages/chat.config.php
use App\Chat\ChatClaudeDriver;
use App\Chat\ChatGPTDriver;
use App\Chat\ChatModelInterface;
use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\DI\Container;

return #[ConfigModule(name: 'chat', enabled: true)]
static fn() => [
    'bindings' => [
        ChatModelInterface::class => function (
            Container $container,
            ?string $tag = null,
        ) {
            return match ($tag) {
                'gpt' => $container->newInstance(
                    ChatGPTDriver::class,
                    ['apiKey' => env('OPENAI_API_KEY')],
                ),
                'claude' => $container->newInstance(
                    ChatClaudeDriver::class,
                    [
                        'apiKey' => env('ANTHROPIC_API_KEY'),
                    ],
                ),
            };
        },
    ],
];
```

Below is a more completed example, the `chat` section holds the default model and the API keys. The binding
reads them with `getParam()`:

```php
// etc/packages/chat.config.php
use App\Chat\ChatClaudeDriver;
use App\Chat\ChatGPTDriver;
use App\Chat\ChatModelDriver;
use App\Chat\ChatModelInterface;
use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\DI\Container;

return #[ConfigModule(name: 'chat', enabled: true)]
static fn() => [
    'default' => env('CHAT_MODEL', 'gpt'),
    'openai' => [
        'key' => env('OPENAI_API_KEY'),
    ],
    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
    ],
    'bindings' => [
        ChatModelInterface::class => function (
            Container $container,
            ?ChatModelDriver $tag = null,
        ) {
            $tag ??= ChatModelDriver::from(
                $container->getParam('chat.default'),
            );

            return match ($tag) {
                ChatModelDriver::GPT => $container->newInstance(
                    ChatGPTDriver::class,
                    ['apiKey' => $container->getParam('chat.openai.key')],
                ),
                ChatModelDriver::Claude => $container->newInstance(
                    ChatClaudeDriver::class,
                    [
                        'apiKey' => $container->getParam(
                            'chat.anthropic.key',
                        ),
                    ],
                ),
            };
        },
    ],
];
```

When a lookup has no tag, the closure uses the configured default. The
closure is not shared, so each lookup creates a new driver.

#### The Controller

The controller accepts the model name from the request. `tryFrom()` turns it
into an enum case, or returns `null` for an unknown name, so only the
supported models reach the container:

```php
namespace App\Controller;

use App\Chat\ChatModelDriver;
use App\Chat\ChatModelInterface;
use Windwalker\Core\Application\ApplicationInterface;

class AssistantController
{
    public function ask(
        ApplicationInterface $app, 
        string $model, 
        string $prompt,
    ): string {
        $driver = ChatModelDriver::tryFrom($model)
            ?? throw new \InvalidArgumentException(
                "Unsupported model: $model",
            );

        return $app
            ->retrieve(ChatModelInterface::class, tag: $driver)
            ->complete($prompt);
    }
}
```

#### The Background Job

A job that does not care about the model receives the interface without a
tag. The container uses the configured default:

```php
namespace App\Job;

use App\Chat\ChatModelInterface;

class SummaryJob
{
    public function __construct(
        protected string $text,
    ) {}
    
    #[JonEntry]
    public function run(ChatModelInterface $chat): string
    {
        return $chat->complete("Summarize: {$this->text}");
    }
}
```

With `CHAT_MODEL=claude` in the environment, `SummaryJob` uses the Claude
driver, and the controller still selects a model per request.

::: tip
Keep the tags that come from users behind `tryFrom()`. Only the cases of
the enum can then reach the binding, so the request never chooses a class
directly.
:::

## Quick Tagging Factory

A `TaggingFactory` reads implementations from configuration under
`factories.<id>.<tag>`. Use it for variants with their own options, which a
project can add or change without PHP code. Core uses it for error handlers.

The factory reads the entries under the configuration prefix that
`useConfig()` selects. `id()` selects the group, and `get()` returns the
object for the tag.

### Minimal Setup

Define the implementations in a configuration section. Each entry can be a
class name, a closure, or a `static fn() => create()` definition with named
arguments:

```php
// etc/packages/chat.config.php
use App\Chat\ChatClaudeDriver;
use App\Chat\ChatGPTDriver;
use App\Chat\ChatModelInterface;
use Windwalker\Core\Attributes\ConfigModule;

return #[ConfigModule(name: 'chat', enabled: true)]
static fn() => [
    'factories' => [
        ChatModelInterface::class => [
            'gpt' => static fn() => \Windwalker\DI\create(
                ChatGPTDriver::class,
                apiKey: env('OPENAI_API_KEY'),
            ),
            'claude' => static fn() => \Windwalker\DI\create(
                ChatClaudeDriver::class,
                apiKey: fn() => env('ANTHROPIC_API_KEY'),
            ),
        ],
    ],
];
```

Bind the interface to a closure that asks the factory for the tag:

```php
// etc/di.config.php, inside the returned array
'bindings' => [
    \App\Chat\ChatModelInterface::class => fn(
        \Windwalker\Core\DI\TaggingFactory $factory,
        ?string $tag,
    ) => $factory
        ->useConfig('chat')
        ->id(\App\Chat\ChatModelInterface::class)
        ->fallback('gpt')
        ->get($tag),
],
```

The lookup works the same way as the other forms:

```php
$app->retrieve(ChatModelInterface::class);            // gpt driver
$app->retrieve(ChatModelInterface::class, tag: 'claude');
```

A new implementation is added by adding an entry under the interface name in
`factories`. No provider and no binding change is needed.

### How the Factory Chooses

The factory resolves the tag as follows:

- `useConfig()` picks the prefix, and `id()` picks the group, so the entry is
  read from `chat.factories.<interface>.<tag>`.
- `fallback('gpt')` is used when the tag is `null`.
- The resolved name is passed to the entry as the `tag` argument.

### Assembling Dependencies with Tags

A shop often needs one service with several variants, each depending on
another service. The store checkout uses the gateway that the environment
selects. A donation page always uses PayPal and charges in euros.

The tagging factory models this with two levels:

- `PaymentGatewayInterface` (B): the gateways, tagged `stripe` and
  `paypal`. The store's gateway is chosen by `PAYMENT_GATEWAY`.
- `CheckoutInterface` (A): the variants, tagged `store` and `donation`.
  Each asks the container for a gateway by tag.

```php
// src/Payment/CheckoutService.php
namespace App\Payment;

class CheckoutService implements CheckoutInterface
{
    public function __construct(
        protected PaymentGatewayInterface $gateway,
        protected string $currency,
    ) {}

    public function checkout(int $amount): string
    {
        return $this->gateway->charge($amount, $this->currency);
    }
}
```

`StripeGateway` and `PaypalGateway` implement `PaymentGatewayInterface`
and take their own keys in the constructor. The configuration section
names the variants and wires them together:

```php
// etc/packages/shop_payment.config.php
use App\Payment\CheckoutInterface;
use App\Payment\CheckoutService;
use App\Payment\PaymentGatewayInterface;
use App\Payment\PaypalGateway;
use App\Payment\StripeGateway;
use Windwalker\Core\Attributes\ConfigModule;
use Windwalker\DI\Container;

use function Windwalker\DI\create;

return #[ConfigModule(name: 'shop_payment', enabled: true)]
static fn() => [
    'factories' => [
        PaymentGatewayInterface::class => [
            'stripe' => static fn() => create(
                StripeGateway::class,
                apiKey: env('STRIPE_SECRET_KEY'),
            ),
            'paypal' => static fn() => create(
                PaypalGateway::class,
                clientId: env('PAYPAL_CLIENT_ID'),
            ),
        ],
        CheckoutInterface::class => [
            'store' => static fn() => create(
                CheckoutService::class,
                gateway: fn(Container $container) => $container->get(
                    PaymentGatewayInterface::class,
                    tag: env('PAYMENT_GATEWAY', 'stripe'),
                ),
                currency: 'USD',
            ),
            'donation' => static fn() => create(
                CheckoutService::class,
                gateway: fn(Container $container) => $container->get(
                    PaymentGatewayInterface::class,
                    tag: 'paypal',
                ),
                currency: 'EUR',
            ),
        ],
    ],
];
```

Each `CheckoutInterface` variant gets a gateway by tag. The `store` variant
reads `PAYMENT_GATEWAY`, so one variable switches its gateway. The `donation`
variant is fixed to `paypal`. Bind both interfaces in `etc/di.config.php`:

```php
// etc/di.config.php, inside the returned array
'bindings' => [
    PaymentGatewayInterface::class => function (
        \Windwalker\Core\DI\TaggingFactory $factory,
        ?string $tag,
    ) {
        return $factory
            ->useConfig('shop_payment')
            ->id(PaymentGatewayInterface::class)
            ->fallback('stripe')
            ->get($tag);
    },
    CheckoutInterface::class => function (
        \Windwalker\Core\DI\TaggingFactory $factory,
        ?string $tag,
    ) {
        return $factory
            ->useConfig('shop_payment')
            ->id(CheckoutInterface::class)
            ->fallback('store')
            ->get($tag);
    },
],
```

A service that declares `CheckoutInterface` in its constructor receives the
default variant. A checkout controller for the shop is a typical case:

```php
namespace App\Controller;

use App\Payment\CheckoutInterface;

class CartController
{
    public function __construct(
        protected CheckoutInterface $checkout,
    ) {}

    public function pay(int $amount): string
    {
        return $this->checkout->checkout($amount);
    }
}
```

A donation page needs a different variant, so it asks the application for
it by tag:

```php
namespace App\Controller;

use App\Payment\CheckoutInterface;
use Windwalker\Core\Application\ApplicationInterface;

class DonationController
{
    public function __construct(
        protected ApplicationInterface $app,
    ) {}

    public function donate(int $amount): string
    {
        return $this->app
            ->retrieve(CheckoutInterface::class, tag: 'donation')
            ->checkout($amount);
    }
}
```

With `PAYMENT_GATEWAY=paypal`, store payments go through PayPal. The
donation variant always uses PayPal, whatever the variable says.

::: warning
`create()` resolves a closure argument once and keeps the result, so
`env()` is read at the first lookup. Later changes to the variable have no
effect in the same process. In a long-running server, the first gateway is
reused for every request. Set the environment before the server starts.
:::

#### Converting an Older Factories Entry

The mapping from the older configuration is direct:

- An entry under `factories.instances.<name>` becomes an entry under the
  variant interface, `factories.<CheckoutInterface>.<name>`.
- An entry under `factories.<something>.<name>` for a dependency becomes an
  entry under the dependency interface, `factories.<PaymentGatewayInterface>.<name>`.
- A `ref()` to such an entry becomes a closure that asks the container for
  the tagged dependency, as in the `gateway:` argument above.
- A lookup by name, such as `->get('donation')`, becomes a lookup by tag:

```php
$app->retrieve(CheckoutInterface::class, tag: 'donation');
```


The core application uses this pattern for error handlers. They are read from
`error.factories.handlers`:

```php
$container->bind(
    ErrorHandlerInterface::class,
    fn(TaggingFactory $factory, ?string $tag) => $factory
        ->useConfig('error')
        ->id('handlers')
        ->get($tag),
    new DIOptions(isolation: true),
);
```

::: warning
A tag that is not configured, and a missing name without a `fallback()`,
throw an `InvalidArgumentException` when the object is created. Always set a
`fallback()` when `null` can reach the factory.
:::

## Fixed Objects by Tag

You can also register ready-made objects under tags with `set()`. A lookup
with an unstored tag falls back to the untagged entry for the same ID:

```php
$container->set(ChatModelInterface::class, new ChatGPTDriver('sk-test'));
$container->set(
    ChatModelInterface::class,
    new ChatClaudeDriver('ck-test'),
    tag: 'claude',
);

$container->get(ChatModelInterface::class, tag: 'claude'); // Claude
$container->get(ChatModelInterface::class, tag: 'other');  // GPT
```

Without an untagged entry, an unknown tag throws a `DefinitionNotFoundException`.
Use this form for objects created in code, such as test doubles.

## Reminders

- Tags are matched exactly. `'SMS'` and `'sms'` are different tags.
- A closure binding in `bindings` is not shared. Use `share()` or a provider
  with `bindShared()` when each tag should keep one object.
- Convert tags from requests or configuration to an enum before you use them,
  so unknown values fail early and the closure's type matches.

## Further Reading

- [Tagged Services](/documentation/components/di/tagged-services): preset
  tags and factories in the DI component.
- [Attributes](/documentation/components/di/attributes): `#[Inject]`,
  `#[Service]`, and `#[Autowire]` options.
