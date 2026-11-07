---
layout: doc
title: Listener Providers
component: event
---

# Listener Providers

PSR-14 splits event handling into two roles. The dispatcher sends an event
to the listeners, and the listener provider answers one question: which
listeners apply to this event? Windwalker Event follows that split. The
provider is where listeners are stored and looked up, and it can be
replaced or extended without changing how events are dispatched.

Most applications never need to think about this. `new EventEmitter()`
already builds a provider for you. Work with providers directly when your
listeners come from somewhere other than code calls, such as a fixed map
loaded from configuration, or when you want to add a custom lookup, such as
listeners stored in a database.

## Minimal Usage

Use `EventEmitter` when you need `on()`, `emit()`, and subscribers. Use
`EventDispatcher` when you only need a PSR-14 dispatcher around a provider
you built yourself. The provider below maps an event class to its listeners:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventDispatcher;
use Windwalker\Event\Provider\SimpleListenerProvider;

class CacheClearedEvent extends BaseEvent
{
    public function __construct(
        public string $by,
    ) {
    }
}

$provider = new SimpleListenerProvider([
    CacheClearedEvent::class => [
        fn (CacheClearedEvent $event) => print("Purge CDN\n"),
    ],
]);

$dispatcher = new EventDispatcher($provider);

$dispatcher->dispatch(new CacheClearedEvent(by: 'admin'));
```

## Showcase: Combining a Fixed Map with Runtime Listeners

An `EventEmitter` accepts a provider in its constructor. The provider is
added alongside the emitter's own subscribable provider, so you can keep a
fixed map of listeners and still register listeners at runtime. The example
uses the `CacheClearedEvent` class declared above:

```php
use Windwalker\Event\EventEmitter;
use Windwalker\Event\Provider\SimpleListenerProvider;

$fixed = new SimpleListenerProvider([
    CacheClearedEvent::class => [
        fn (CacheClearedEvent $event) => print("Purge CDN\n"),
    ],
]);

$emitter = new EventEmitter($fixed);

$emitter->on(
    CacheClearedEvent::class,
    fn (CacheClearedEvent $event) => print("Clear local cache\n")
);

$emitter->emit(new CacheClearedEvent(by: 'admin'));
```

The emitter runs its own subscribable provider first, then the fixed map.
You can add more providers later with `appendProvider()`.

## Provider Types

### SubscribableListenerProvider

The default provider. It stores listeners in priority queues, keyed by event
name, and it is the only provider type that understands priorities. Use it
directly when you want a standalone PSR-14 dispatcher with runtime
registration:

```php
use Windwalker\Event\EventDispatcher;
use Windwalker\Event\Listener\ListenerPriority;
use Windwalker\Event\Provider\SubscribableListenerProvider;

$provider = new SubscribableListenerProvider();

$provider->on(
    CacheClearedEvent::class,
    fn (CacheClearedEvent $event) => print("Normal\n")
);

$provider->on(
    CacheClearedEvent::class,
    fn (CacheClearedEvent $event) => print("High\n"),
    ListenerPriority::HIGH
);

$dispatcher = new EventDispatcher($provider);

$dispatcher->dispatch(new CacheClearedEvent(by: 'admin'));
// High, Normal
```

### SimpleListenerProvider

Built from an array of listeners, and `add()` appends more. Keys are event
class names for typed events, and class names for other objects. It has no
priorities, so listeners run in array order:

```php
use Windwalker\Event\EventDispatcher;
use Windwalker\Event\Provider\SimpleListenerProvider;

$provider = new SimpleListenerProvider([]);

$provider->add(
    CacheClearedEvent::class,
    fn (CacheClearedEvent $event) => print("Purge CDN\n")
);

$dispatcher = new EventDispatcher($provider);
```

### CompositeListenerProvider

Combines one subscribable provider with any number of other providers.
`EventEmitter` uses it internally, and `CompositeListenerProvider::create()`
wraps any provider for you. Use `appendProvider()` to add a provider and
`resetProviders()` to remove the extra ones:

```php
use Windwalker\Event\Provider\CompositeListenerProvider;

$composite = CompositeListenerProvider::create();

$composite->appendProvider($provider);

$composite->resetProviders(); // Only the subscribable provider remains.
```

### DecorateListenerProvider

Wraps another provider. Extend it to filter or transform the listeners it
returns. The following decorator skips all listeners for guest users:

```php
use Windwalker\Event\Provider\DecorateListenerProvider;

class SkipGuestProvider extends DecorateListenerProvider
{
    public function getListenersForEvent(object $event): iterable
    {
        if (
            $event instanceof CacheClearedEvent
            && $event->by === 'guest'
        ) {
            return [];
        }

        return parent::getListenersForEvent($event);
    }
}

$dispatcher = new EventDispatcher(new SkipGuestProvider($provider));
```

## How Lookup Works

For a typed event, the name is its class name, and the subscribable provider
uses the lower-cased name as its key. For a plain object that is not an
event, it uses the exact class name.

Typed events are matched by their exact class. A listener registered for a
parent class does not receive events of its child class:

```php
class ChildCacheEvent extends CacheClearedEvent {}

$emitter->on(
    CacheClearedEvent::class,
    fn (CacheClearedEvent $event) => print("Parent listener\n")
);

// Prints nothing: ChildCacheEvent has its own name.
$emitter->emit(new ChildCacheEvent(by: 'admin'));
```

Register listeners for each concrete event class that needs them.

The composite provider asks each of its providers in turn, and concatenates
the results. Listeners from the subscribable provider always come first,
followed by the listeners of appended providers. Priorities do not cross
provider boundaries, so a `MAX` listener in the emitter still runs before
a `SimpleListenerProvider` listener, whatever their priorities:

```php
$simple = new SimpleListenerProvider([
    CacheClearedEvent::class => [
        fn () => print("Simple provider\n"),
    ],
]);

$emitter = new EventEmitter($simple);

$emitter->on(
    CacheClearedEvent::class,
    fn () => print("Emitter, MAX priority\n"),
    ListenerPriority::MAX
);

$emitter->emit(new CacheClearedEvent(by: 'admin'));
// Emitter, MAX priority
// Simple provider
```

`SimpleListenerProvider` uses the first key that matches. For class keys on
plain objects, the first class in the array that the object is an instance of
wins, and later matches are ignored.

Removal follows the same boundary. `off()` and `remove()` only change the
subscribable provider, so the simple provider above keeps its listener:

```php
$emitter->off(CacheClearedEvent::class);

// Still prints "Simple provider".
$emitter->emit(new CacheClearedEvent(by: 'admin'));
```

To remove listeners from an appended provider, manage that provider directly.

