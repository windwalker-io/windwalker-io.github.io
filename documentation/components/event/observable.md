---
layout: doc
title: Observable
component: event
---

# Observable

`EventEmitter::observe()` turns an event class into a reactive stream. Each
emitted event becomes a value that you can transform, filter, and
subscribe to with the operators of [RxPHP](https://github.com/ReactiveX/RxPHP).
Use it when a sequence of events matters more than each event on its own,
for example a stream of progress updates, or a series of sensor readings
that you want to smooth or throttle before acting on them.

This feature is optional. The package does not require RxPHP, and
`observe()` throws a `DomainException` when `reactivex/rxphp` is not
installed. Install it only in projects that need reactive streams:

```bash
composer require reactivex/rxphp ^2.0
```

## Minimal Usage

Call `observe()` with an event class, then subscribe to the returned
`Observable`. The example uses a typed event class:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventEmitter;

class SensorReadEvent extends BaseEvent
{
    public function __construct(
        public int $value,
    ) {
    }
}

$emitter = new EventEmitter();

$emitter->observe(SensorReadEvent::class)
    ->subscribe(
        function (SensorReadEvent $event) {
            echo 'Reading: ' . $event->value;
        }
    );

$emitter->emit(new SensorReadEvent(value: 21));
```

## Showcase: Smoothing Progress Events

A long import emits an `ImportProgressEvent` for each row. Subscribers
that update a progress bar do not need every single row. The stream below
turns the events into whole-percent values, and forwards only the values
that have changed:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventEmitter;

class ImportProgressEvent extends BaseEvent
{
    public function __construct(
        public int $done,
        public int $total,
    ) {
    }
}

$emitter = new EventEmitter();

$emitter->observe(ImportProgressEvent::class)
    ->map(
        static fn (ImportProgressEvent $event): int
            => (int) floor($event->done / $event->total * 100)
    )
    ->distinctUntilChanged()
    ->subscribe(
        function (int $percent) {
            echo "Progress: {$percent}%\n";
        }
    );

for ($i = 1; $i <= 200; $i++) {
    $emitter->emit(
        new ImportProgressEvent(done: $i, total: 200),
    );
}
```

Each emitted event is turned into a percentage, and the stream only
forwards a value when it differs from the previous one. The loop above
emits 200 events, and the output has one line for each percentage from 0%
to 100%.

## How It Works

`observe()` returns an RxPHP `Observable`. When you subscribe to it, the
package registers a listener on the emitter with `on()`. The listener calls
the observer's `onNext()` with each event. The event object is passed
unchanged, so the operators receive the same event object that the emitter
dispatched. The operators run synchronously inside `emit()`, so a slow
operator slows down the code that emits the event. Keep operators cheap, and
move heavy work to a queue.

The optional second argument of `observe()` is the listener priority. It
works the same way as the priority of `on()`; see
[Listeners and Subscribers](/documentation/components/event/listeners).

```php
$emitter->observe(SensorReadEvent::class, ListenerPriority::HIGH)
    ->filter(fn (SensorReadEvent $event) => $event->value > 10)
    ->subscribe(
        function (SensorReadEvent $event) {
            echo "High reading {$event->value}\n";
        }
    );

$emitter->emit(new SensorReadEvent(value: 5));  // prints nothing
$emitter->emit(new SensorReadEvent(value: 21)); // High reading 21
```

## Subscriptions and Listeners

Each subscription registers its own listener. Subscribing twice to the same
observable therefore registers two listeners, and each one receives every
event:

```php
$observable = $emitter->observe(SensorReadEvent::class);

$observable->subscribe(fn () => $count++);
$observable->subscribe(fn () => $count++);

$emitter->emit(new SensorReadEvent(value: 1)); // $count increases by 2
```

Disposing a subscription does not remove its listener. The `on()` listener
stays registered, and events keep arriving:

```php
$subscription = $emitter->observe(SensorReadEvent::class)
    ->subscribe(fn () => $count++);

$emitter->emit(new SensorReadEvent(value: 1)); // counted
$subscription->dispose();
$emitter->emit(new SensorReadEvent(value: 1)); // still counted
```

To stop a stream, remove its listeners with `off()` and the event class, or
create a dedicated emitter for short-lived streams.

