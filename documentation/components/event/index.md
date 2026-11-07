---
layout: doc
title: Introduction
component: event
---

# Introduction

Windwalker Event is a PSR-14 compatible event system. It lets one part of
your code announce that something happened, such as a user being created,
while other parts react to it without the announcing code knowing who is
listening. Adding a new reaction means adding a listener, not changing the
code that produced the event.

The package is built from a few cooperating parts:

- **Event objects** carry the event name and its data. Use typed event
  classes that extend `BaseEvent`. They give you the best type hints and
  work with named arguments.
- **EventEmitter** is the main entry point. It registers listeners, emits
  events, and forwards them to dealers.
- **Listener providers** decide which listeners apply to an event. The
  emitter combines a subscribable provider with any extra providers you add.
- **Subscribers** are classes that group several listeners, optionally
  declared with the `#[EventSubscriber]` and `#[ListenTo]` attributes.

## Installation

```bash
composer require windwalker/event ^4.0
```

Windwalker Event 4.x requires PHP 8.4.6 or later.

## Use as Standalone Component

The recommended way to use Windwalker Event is with an event object. Declare
a class that extends `BaseEvent`, and give it a constructor with the data
the event carries. Listeners receive the same class, so your IDE knows the
exact types of every argument, and callers can pass arguments by name:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventEmitter;

class UserCreatedEvent extends BaseEvent
{
    public function __construct(
        public string $username,
        public bool $sendWelcome = true,
    ) {
    }
}

$emitter = new EventEmitter();

$emitter->on(
    UserCreatedEvent::class,
    function (UserCreatedEvent $event) {
        echo 'Welcome, ' . $event->username;
    }
);

$emitter->emit(new UserCreatedEvent(username: 'alice'));
```

Because the listener type is `UserCreatedEvent`, the editor can complete
`$event->username`, and it flags an unknown argument name at the call site.
The name of an event object defaults to its class name, so
`UserCreatedEvent::class` and `emit()` always refer to the same event.

### Named Event Strings

For a quick, local notification, you can also emit a plain string name with
an array of arguments. This is a convenience for temporary use:

```php
use Windwalker\Event\Event;

$emitter->on(
    'cache.cleared',
    function (Event $event) {
        echo 'Cache was cleared by ' . $event['by'];
    }
);

$emitter->emit('cache.cleared', ['by' => 'admin']);
```

String events are created as the generic `Event` class. Their arguments are
not typed, and listeners get no type hints for them. Prefer event objects
for any event that more than one part of your code uses.

A string that names an existing class does not create a string event. Instead,
`emit()` instantiates that class, so a name such as `order.paid` is safe, but
a name that matches a class name changes behavior:

```php
// Instantiates PingEvent, because the string is a class name.
$emitter->emit(PingEvent::class);
```


## Use in Windwalker

Windwalker Core registers `EventEmitter` in the DI container through its
`EventProvider`. The same instance is also bound as `EventDispatcher` and
`EventDispatcherInterface`. Use the existing container or application; do
not create a new emitter.

Inject the emitter as a constructor dependency, and emit a typed event:

```php
use App\Event\UserCreatedEvent;
use Windwalker\Event\EventEmitter;

class UserService
{
    public function __construct(
        protected EventEmitter $emitter
    ) {
    }

    public function create(string $username): void
    {
        // Save the user, then announce it.
        $this->emitter->emit(
            new UserCreatedEvent(username: $username),
        );
    }
}
```


The application itself is event-aware. It implements `EventAwareInterface`,
so you can also call `$app->on()`, `$app->emit()`, and `$app->subscribe()`
directly, or retrieve the emitter with `$app->retrieve(EventEmitter::class)`.

Listeners for an application or package are declared in the `listeners`
configuration key. See [Listeners and Subscribers](/documentation/components/event/listeners) for the
details.

## Topic Pages

- [Event Objects](/documentation/components/event/events): the `BaseEvent` and `Event` classes, event
  names, arguments, and propagation control.
- [Listeners and Subscribers](/documentation/components/event/listeners): registering listeners,
  priorities, one-time listeners, `#[ListenTo]`, and removing listeners.
- [Listener Providers](/documentation/components/event/providers): how listeners are stored and looked
  up, and how to combine providers.
- [Dealers](/documentation/components/event/dealers): forwarding an emitted event to other emitters.
- [Observable](/documentation/components/event/observable): the optional RxPHP integration.

## Security Note

Every listener receives the full event object, including all of its
arguments. Keep sensitive values, such as passwords or tokens, out of event
arguments unless every listener should see them. Avoid logging whole event
objects for the same reason.
