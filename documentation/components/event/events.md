---
layout: doc
title: Event Objects
component: event
---

# Event Objects

An event object is the message that travels through the system. It has a
name and a set of arguments, and it is passed to every listener in turn.
Listeners read the arguments, may change them, and may stop the event from
reaching the remaining listeners.

Use a typed event class for events that your code emits and listens to. The
class extends `BaseEvent`, and declares its arguments as constructor-promoted
properties. Pass the arguments by name when you create the event. The IDE
then knows the type of every argument, and PHP rejects unknown argument
names when the object is created.

## Minimal Usage

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

Listeners are registered with the event class name, and `emit()` receives
the object itself. There is no separate name to keep in sync.

## Showcase: Changing Event State Across Listeners

Listeners share the same object, so a change made by one listener is visible
to the next. The caller gets the same object back from `emit()` and can read
the final state. The following example stops propagation for free orders, so
the second listener does not run for them:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventEmitter;
use Windwalker\Event\Listener\ListenerPriority;

class OrderPaidEvent extends BaseEvent
{
    public function __construct(
        public int $orderId,
        public int $amount,
        public bool $notify = true,
    ) {
    }
}

$emitter = new EventEmitter();

$emitter->on(
    OrderPaidEvent::class,
    function (OrderPaidEvent $event) {
        if ($event->amount === 0) {
            $event->notify = false;
            $event->stopPropagation();
        }
    },
    ListenerPriority::HIGH
);

$emitter->on(
    OrderPaidEvent::class,
    function (OrderPaidEvent $event) {
        echo "Order {$event->orderId} paid\n";
    }
);

$event = $emitter->emit(
    new OrderPaidEvent(orderId: 42, amount: 0)
);

echo $event->notify ? 'notify' : 'silent';
```

The high-priority listener runs first. Because it stops propagation, the
second listener is skipped, and the caller sees `notify` set to `false`.
Listeners can also change any argument, so validate values before relying
on them.

## Event Names

An event object's name defaults to its class name, and `getName()` returns
it. The default listener provider looks listeners up by this name in
lower case, so `User.Created` and `user.created` address the same listeners.

```php
$event = new UserCreatedEvent(username: 'alice');

echo $event->getName(); // UserCreatedEvent
```

`setName()` changes the name. Listeners registered for the class no longer
receive the event after a rename, so avoid it for typed events.

## Event Arguments

The arguments of a typed event are its public properties. `getArguments()`
returns them as an array, `merge()` assigns values by name, `setArguments()`
replaces them, and `fill()` accepts named arguments as an alternative to
`merge()`:

```php
$event = new UserCreatedEvent(username: 'alice');

$event->fill(username: 'dan');
$event->merge(['sendWelcome' => false]);

print_r($event->getArguments());
// ['username' => 'dan', 'sendWelcome' => false]
```

Assigning a key the class does not declare creates a dynamic property. PHP
8.2 and later emit a deprecation notice for it. Declare every argument in the
constructor, and use `Event` only when the set of arguments is open-ended:

```php
$event->merge(['role' => 'admin']); // Deprecated: dynamic property
```

`clear()` restores the default values of declared properties only.
Properties promoted through the constructor have no default value, so they
keep their current value:

```php
$event = new UserCreatedEvent(username: 'alice');

$event->clear();

echo $event->username; // alice
```

To start over, create a new instance instead.

## Creating and Mirroring Events

`create()` and `wrap()` build an event from an argument array. They
instantiate the class without arguments, so they work only for classes whose
constructor needs none:

```php
class PingEvent extends BaseEvent
{
    public bool $ok = true;
}

$ping = PingEvent::create(['ok' => false]);

// ArgumentCountError: the constructor requires $username.
UserCreatedEvent::create(['username' => 'alice']);
```

`mirror()` creates a new event with a new name and a copy of the current
arguments. It accepts two forms. A name creates a generic `Event`:

```php
$shipped = $paid->mirror('order.shipped');
```

A class name creates that class without arguments, and then copies the
arguments of the current event into it. Declare those arguments in the target
class, or PHP reports dynamic properties:

```php
class OrderShippedEvent extends BaseEvent
{
    public int $orderId = 0;

    public int $amount = 0;

    public bool $notify = true;
}

$shipped = $paid->mirror(OrderShippedEvent::class);
```

## Named Event Strings

For a temporary, local notification, you can emit a plain string name with
an array of arguments. This creates a generic `Event` instance, which has no
property types. Use it for quick, short-lived events, and prefer typed event
classes for anything shared across your code:

```php
use Windwalker\Event\Event;
use Windwalker\Event\EventEmitter;

$emitter = new EventEmitter();

$emitter->on(
    'order.paid',
    function (Event $event) {
        echo 'Paid order ' . $event['orderId'];
    }
);

$emitter->emit('order.paid', ['orderId' => 42]);
```

`Event` stores arguments in an array-like container. Read them with array
access (`$event['orderId']`), or through magic accessors such as
`$event->getOrderId()` and `$event->setOrderId(42)`. It also exposes
`merge()`, `clear()`, and `getArguments()`, which returns a reference to the
internal array.

## Propagation

Every event that extends `BaseEvent` implements `StoppableEventInterface`.
A listener calls `stopPropagation()` to end the dispatch. Remaining
listeners are skipped, and the event is not forwarded to any dealer:

```php
$emitter->on(
    UserCreatedEvent::class,
    function (UserCreatedEvent $event) {
        if ($event->username === 'banned') {
            $event->stopPropagation();
        }
    }
);
```

`isPropagationStopped()` reports the current state.

Stopping only works for stoppable events. A plain object dispatched through
the PSR-14 `EventDispatcher` cannot be stopped, so every listener runs:

```php
class LogEvent {}

$dispatcher->dispatch(new LogEvent()); // all listeners run
```

Stopping does not roll back what earlier listeners changed. In the next
example, the caller still sees `amount` set to `0`:

```php
$emitter->on(
    OrderPaidEvent::class,
    function (OrderPaidEvent $event) {
        $event->amount = 0;
    },
    ListenerPriority::HIGH
);

$emitter->on(
    OrderPaidEvent::class,
    function (OrderPaidEvent $event) {
        $event->stopPropagation();
    }
);
```

