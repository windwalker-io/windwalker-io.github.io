---
layout: doc
title: Dealers
component: event
---

# Dealers

A dealer is another dispatcher that receives every event an emitter
dispatches. Dealers let a component keep its own local emitter, so its
listeners stay private, while still making its events visible to a wider
system, such as the application-level emitter. The component does not need
to know who is listening outside itself.

## Minimal Usage

Register a dealer with `addDealer()`. After the emitter runs its own
listeners, it passes the event to each dealer. The example uses a typed
event class:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventEmitter;

class PaymentReceivedEvent extends BaseEvent
{
    public function __construct(
        public int $amount,
    ) {
    }
}

$local = new EventEmitter();
$global = new EventEmitter();

$global->on(
    PaymentReceivedEvent::class,
    function (PaymentReceivedEvent $event) {
        echo 'Global listener: ' . $event->amount;
    }
);

$local->addDealer($global);

$local->emit(new PaymentReceivedEvent(amount: 1000));
```

## Showcase: A Package Emitter Forwarding to the Application

Consider a payment package that owns its listeners. It keeps a local
emitter for internal reactions, and forwards every event to the application
emitter so that the application can log or audit payments:

```php
use Windwalker\Event\BaseEvent;
use Windwalker\Event\EventEmitter;

class PaymentCapturedEvent extends BaseEvent
{
    public function __construct(
        public int $orderId,
        public int $amount,
    ) {
    }
}

class PaymentGateway
{
    protected EventEmitter $emitter;

    public function __construct(EventEmitter $appEmitter)
    {
        $this->emitter = new EventEmitter();

        $this->emitter->addDealer($appEmitter);
    }

    public function capture(int $orderId, int $amount): void
    {
        // Charge the card, then announce the result.
        $this->emitter->emit(
            new PaymentCapturedEvent(
                orderId: $orderId,
                amount: $amount,
            ),
        );
    }

    public function onCaptured(callable $listener): void
    {
        $this->emitter->on(PaymentCapturedEvent::class, $listener);
    }
}

$app = new EventEmitter();

$app->on(
    PaymentCapturedEvent::class,
    function (PaymentCapturedEvent $event) {
        echo 'Audit order ' . $event->orderId;
    }
);

$gateway = new PaymentGateway($app);

$gateway->capture(orderId: 42, amount: 1000);
```


Here `capture()` runs the package's own listeners first, then the
application's `payment.captured` listener. The package does not need to
expose its emitter.

## Dealer Features

`addDealer()` accepts any `EventDispatcherInterface`. An `EventEmitter` is the
usual choice, because it also runs its own listeners and dealers before the
event moves on. Dealers run in the order they were added, after the emitter's
own listeners for the event:

```php
$emitter->addDealer($audit);
$emitter->addDealer($metrics);

$emitter->getDealers(); // WeakMap with both dealers

$emitter->resetDealers(); // Removes all dealers.
```

Classes that use `EventAwareTrait` can register a dealer with
`addEventDealer()`. It accepts a dispatcher, or an object that implements
`DispatcherAwareInterface`, in which case that object's own emitter is used:

```php
use Windwalker\Event\EventAwareTrait;

class PaymentGateway
{
    use EventAwareTrait;
}

$gateway = new PaymentGateway();

$gateway->addEventDealer($app);
```

## Dealers Are Held Weakly

Dealers are stored in a `WeakMap`. The emitter does not keep a dealer alive,
so a dealer that has no other reference is removed silently:

```php
$emitter = new EventEmitter();

$dealer = new EventEmitter();
$emitter->addDealer($dealer);

unset($dealer);

count($emitter->getDealers()); // 0
```

Keep a strong reference to the dealer for as long as the forwarding should
work. The `PaymentGateway` above does this with its application emitter.

## Stopping Reaches Dealers

Dealers receive an event only when it is still running. If a listener stops
propagation before the dealers are reached, none of them are called. A
listener that stops propagation should be aware of every consumer of the
event:

```php
$dealer = new EventEmitter();
$dealer->on(
    Stopper::class,
    fn () => print("Dealer ran\n")
);

$emitter = new EventEmitter();
$emitter->addDealer($dealer);

$emitter->on(
    Stopper::class,
    fn (Stopper $event) => $event->stopPropagation(),
    ListenerPriority::MAX
);

$emitter->emit(new Stopper()); // Prints nothing: the dealer is skipped.
```

## Cloned Emitters

A cloned emitter starts with its own copy of the dealer list. Adding or
removing dealers on one emitter does not affect the other:

```php
$original = new EventEmitter();
$original->addDealer($audit);

$copy = clone $original;
$copy->resetDealers();

count($original->getDealers()); // 1
```

