---
layout: doc
title: Listeners and Subscribers
component: event
---

# Listeners and Subscribers

A listener is a callable that runs when a given event is emitted. Event
objects identify events by their class, so a listener is registered for an
event class. Registering listeners is how components react to each other
without direct calls. The publisher of an event needs no reference to the
code that handles it, which keeps modules independent and makes it easy to
add behavior later.

A subscriber is an object that groups several listeners. It is useful when
one class reacts to several events, such as a mailer that sends messages
for users, orders, and invoices. Subscribers can declare their listeners
with attributes, so the wiring lives next to the code it serves.

## Minimal Usage

Register a closure for an event class with `on()`, then emit an instance of
that class:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventEmitter;

class CacheClearedEvent extends BaseEvent
{
    public function __construct(
        public string $by,
    ) {
    }
}

$emitter = new EventEmitter();

$emitter->on(
    CacheClearedEvent::class,
    function (CacheClearedEvent $event) {
        echo 'Cache was cleared by ' . $event->by;
    }
);

$emitter->emit(new CacheClearedEvent(by: 'admin'));
```

## Showcase: A Subscriber Class

A subscriber marked with `#[EventSubscriber]` declares its listeners with
`#[ListenTo]` on each method. The attribute takes the event class. Pass an
instance to `subscribe()`. The examples assume the typed event classes
`UserCreatedEvent` and `OrderPaidEvent`, declared as in
[Event Objects](/documentation/components/event/events):

```php
use Windwalker\Event\Attributes\EventSubscriber;
use Windwalker\Event\Attributes\ListenTo;
use Windwalker\Event\EventEmitter;
use Windwalker\Event\Listener\ListenerPriority;

#[EventSubscriber]
class MailSubscriber
{
    #[ListenTo(UserCreatedEvent::class, priority: ListenerPriority::HIGH)]
    public function sendWelcome(UserCreatedEvent $event): void
    {
        // Send a welcome email to $event->username.
    }

    #[ListenTo(UserCreatedEvent::class, once: true)]
    public function trackFirstSignup(UserCreatedEvent $event): void
    {
        // Runs for the first matching event only.
    }

    #[ListenTo(OrderPaidEvent::class)]
    public function sendReceipt(OrderPaidEvent $event): void
    {
        // ...
    }
}

$emitter = new EventEmitter();
$emitter->subscribe(new MailSubscriber());

$emitter->emit(new UserCreatedEvent(username: 'alice'));
```

Subscribers are registered once, in the same way as closures. Each
`#[ListenTo]` attribute becomes a listener for its event class. A method can
carry several `#[ListenTo]` attributes, because the attribute is repeatable.
Each listener parameter is typed with the event class, so the editor knows
the arguments of every listener.

## Listener Forms

`on()` accepts any PHP callable. Closures, array callables, first-class
callables, and invokable objects all work:

```php
class Mailer
{
    public function sendWelcome(UserCreatedEvent $event): void
    {
        echo 'Welcome ' . $event->username;
    }
}

class AuditListener
{
    public function __invoke(UserCreatedEvent $event): void
    {
        // Write an audit record.
    }
}

$mailer = new Mailer();

$emitter->on(UserCreatedEvent::class, [$mailer, 'sendWelcome']);
$emitter->on(UserCreatedEvent::class, $mailer->sendWelcome(...));
$emitter->on(UserCreatedEvent::class, new AuditListener());
```

## Priorities

Listeners for the same event run from the highest priority to the lowest.
`ListenerPriority` provides named values from `MIN` (-300) to `MAX` (300),
with `NORMAL` (0) as the default. You can also pass any integer:

```php
$emitter->on(
    UserCreatedEvent::class,
    fn () => print("normal\n")
);

$emitter->on(
    UserCreatedEvent::class,
    fn () => print("high\n"),
    ListenerPriority::HIGH
);

$emitter->on(
    UserCreatedEvent::class,
    fn () => print("low\n"),
    ListenerPriority::LOW
);

$emitter->emit(new UserCreatedEvent(username: 'alice'));
// high, normal, low
```

Listeners with the same priority have no guaranteed order. If the order
matters, assign different priorities rather than relying on registration
order.

## One-Time Listeners

`once()` registers a listener that is removed after its first call. A
subscriber method can do the same with `#[ListenTo(once: true)]`:

```php
$emitter->once(
    AppInstalledEvent::class,
    function () {
        echo 'Installed';
    }
);

$emitter->emit(new AppInstalledEvent()); // prints "Installed"
$emitter->emit(new AppInstalledEvent()); // prints nothing
```

## Removing Listeners

`off()` removes listeners for one event class. Pass the listener, the
subscriber, or nothing:

```php
// Remove one listener. Keep a reference to it.
$listener = fn (UserCreatedEvent $event) => null;

$emitter->on(UserCreatedEvent::class, $listener);
$emitter->off(UserCreatedEvent::class, $listener);

// Remove every listener of a subscriber for this event.
$emitter->off(UserCreatedEvent::class, $subscriber);

// Remove all listeners for this event.
$emitter->off(UserCreatedEvent::class);

// Remove a listener or subscriber from every event it was added to.
$emitter->remove($subscriber);
```

Listeners are compared by identity. Each closure written inline is a new
object, so `off()` cannot remove it. The following call removes nothing, and
the listener keeps running:

```php
$emitter->on(UserCreatedEvent::class, fn ($event) => null);

// Does not match the listener above: this is a different closure object.
$emitter->off(UserCreatedEvent::class, fn ($event) => null);
```

Store the closure in a variable when you may need to remove it later.

## Subscriber Rules

A subscriber marked with `#[EventSubscriber]` registers only the methods that
carry `#[ListenTo]`. Other methods are ignored, so helper methods should not
have that attribute:

```php
#[EventSubscriber]
class MailSubscriber
{
    #[ListenTo(UserCreatedEvent::class)]
    public function sendWelcome(UserCreatedEvent $event): void
    {
        // ...
    }

    // Not a listener: no attribute.
    protected function buildMessage(UserCreatedEvent $event): string
    {
        return 'Welcome ' . $event->username;
    }
}
```

A subscriber without `#[EventSubscriber]` works differently. Each public
method is registered for the event whose name matches the method name. The
following method listens to `UserCreatedEvent`:

```php
class PlainSubscriber
{
    public function userCreatedEvent(UserCreatedEvent $event): void
    {
        // ...
    }
}

$emitter->subscribe(new PlainSubscriber());
```

This implicit matching is easy to miss. Prefer `#[EventSubscriber]` with
`#[ListenTo]`, so the event class is written next to the method.

## Framework-Injected Usage

In Windwalker, you normally declare listeners in the `listeners` key of a
configuration file. The core reads that key for the application and for
each package, and registers the listeners when the application boots:

```php
// etc/packages/user.config.php

return #[ConfigModule(name: 'user', enabled: true, priority: 100)]
static fn() => [
    'listeners' => [
        // Event class => callable: passed to on().
        UserLogoutEvent::class => static fn($event) => null,

        // Numeric key => subscriber class: resolved from the container
        // and passed to subscribe().
        MailSubscriber::class,

        // Owner class => subscribers: attached to the emitter of an
        // object that implements EventAwareInterface.
        UserService::class => [
            UserAuthSubscriber::class,
        ],
    ],
];
```

Subscriber classes are resolved through the container, so their
constructors can receive dependencies. A `null` or `false` value in the
configuration skips that entry, which is a convenient way to disable a
listener from an environment file:

```php
'listeners' => [
    UserLogoutEvent::class => $auditEnabled ? $listener : null,
],
```

