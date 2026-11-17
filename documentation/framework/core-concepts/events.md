---
layout: doc
---

# Events

Windwalker uses an event dispatcher to connect the parts of an
application. Components emit events, and listeners react to them
without the emitter knowing who is listening. The `EventProvider`
registers the dispatcher. Components and their emitters are covered
in the [Event component](../../components/event/events.md) docs.

## Minimal Setup

The dispatcher is enabled by `EventProvider` in
`etc/conf/events.config.php`, which is already present in the host
app.

```php
// etc/conf/events.config.php
return [
    'providers' => [
        EventProvider::class
    ],
];
```

`EventProvider` binds `EventEmitter` and the aliases
`EventDispatcher` and `EventDispatcherInterface`. Inject any of these
names to get the same dispatcher.

## Listening to Events

Attach a listener with `on()`. The listener receives the event object.

```php
use Windwalker\Core\Events\Web\AfterRespondEvent;

$app->on(
    AfterRespondEvent::class,
    function (AfterRespondEvent $event) {
        // Run after the response is sent.
    }
);
```

`CoreEventAwareTrait` provides `on()` and `addDealer()` for services
that own an emitter.

## Declaring Listeners in Config

Most projects declare listeners in `etc/app/main.config.php`. Add a
`listeners` key there, and the app attaches the listeners when it boots.
You do not need to look for an inner config module.

Use the service ID form as the main pattern. The key is a service ID,
and its value is an array of listeners for that service's dispatcher.
Inside that array, you can use the other forms as well.

```php
// etc/app/main.config.php
use Windwalker\Event\Attributes\ListenTo;

return [
    'listeners' => [
        ReportService::class => [
            // Event name => closure
            ReportGeneratedEvent::class => function (
                ReportGeneratedEvent $event,
            ) {
                // Runs when a report is generated.
            },

            // Event name => [class, '__invoke']
            // The class is resolved from the container.
            ReportFailedEvent::class => [
                LogReportFailureListener::class,
                '__invoke',
            ],

            // Numeric key => closure with #[ListenTo]
            // The event and options come from the attribute.
            #[ListenTo(ReportSavedEvent::class, once: true)]
            function (ReportSavedEvent $event) {
                // Runs only once.
            },

            // Numeric key => subscriber class
            // The subscriber declares its own events.
            ReportAuditSubscriber::class,
        ],
    ],
];
```

The `#[ListenTo]` attribute accepts the event name, an optional
`priority`, and `once`. Set a listener to `null` or `false` to skip
it, for example to turn off a listener declared in another config
module.

Listeners can also be declared in any other config module, such as
`etc/conf/billing.config.php`, using the same `listeners` key. Set
`'enabled' => false` on that module to skip its listeners.

::: info
Listeners declared at the top level of `main.config.php` are attached
to the root application, which is not recommended. To listen to top-level lifecycle events, attach
your listener to `AppContext::class`.
:::

## Registering Events in Routes

Routes can attach subscribers, so the listeners run only for the matched
request. Use `subscribe()` for one listener at a time, or `subscribes()`
to pass an array with the same forms as the `listeners` config.

```php
// routes.php
use App\Listener\CacheHeaderSubscriber;
use Windwalker\Event\Attributes\ListenTo;

// 1. One callable with #[ListenTo]
$router->get('post_show', '/post/{id}')
    ->handler(PostController::class)
    ->subscribe(
        #[ListenTo(AfterRespondEvent::class)]
        function (AfterRespondEvent $event) {
            // Runs after the response is sent.
        }
    );

// 2. One subscriber class
$router->get('post_show', '/post/{id}')
    ->subscribe(CacheHeaderSubscriber::class);

// 3. Event name => listener
$router->get('post_list', '/post')
    ->subscribe(AfterRespondEvent::class, SendStatsListener::class);

// 4. Service ID => subscriber class
$router->get('post_edit', '/post/{id}/edit')
    ->subscribe(ReportService::class, ReportAuditSubscriber::class);

// 5. Service ID => event name => listener
$router->get('post_export', '/post/export')
    ->subscribe(
        ReportService::class,
        ReportGeneratedEvent::class,
        LogReportListener::class,
    );

// subscribes() takes an array, in the same shape as the config
$router->get('blog', '/blog')
    ->subscribes([
        AfterRespondEvent::class => [
            SendStatsListener::class,
        ],
        ReportService::class => [
            ReportGeneratedEvent::class => [
                LogReportListener::class,
                '__invoke',
            ],
        ],
    ]);
```

Calling `subscribes()` again merges the array into the existing
subscribers instead of replacing them.

`RoutingMiddleware` runs these subscribers after the route is
matched. Forms 4 and 5 require the service to implement
`EventAwareInterface`, as they do in config.

::: info
The `subscribe()` forms with a service ID are the route-level equivalent
of the config form 5. Use them when the event belongs to a specific
service instead of the application.
:::

## Dealers: Forwarding Events to the App

A dealer is another dispatcher that receives every event an emitter
dispatches. `RoutingMiddleware` adds the application dispatcher as a
dealer, so events raised inside a route also reach app-level
listeners.

```php
// Inside a service
$this->emitter = new EventEmitter();
$this->emitter->addDealer($app->getEventDispatcher());
```

## Lifecycle Events

The core web lifecycle fires these events, in order:

- `BeforeRequestEvent`
- `BeforeRoutingEvent`
- `AfterRoutingEvent`
- `RoutingNotMatchedEvent`
- `BeforeControllerDispatchEvent`
- `AfterControllerDispatchEvent`
- `BeforeAppDispatchEvent`
- `AfterRespondEvent`
- `TerminatingEvent`
- `AfterRequestEvent`

Console apps use the events under `Core\Events\Console`. See the
[Request Lifecycle](./applications/request-lifecycle.md) page for what
happens at each step and when it is safe to modify the response.

## Defining Your Own Events

Create an event class that extends `BaseEvent`. Put the data the
listeners need in public properties.

```php
use Windwalker\Event\BaseEvent;

class OrderPlacedEvent extends BaseEvent
{
    public function __construct(
        public int $orderId,
        public int $total,
    ) {
    }
}
```

Inject `EventEmitter` into your service and emit the event. Listeners
subscribe by class name.

```php
use Windwalker\Event\EventEmitter;

class OrderService
{
    public function __construct(
        protected EventEmitter $emitter,
    ) {
    }

    public function place(int $orderId, int $total): void
    {
        $this->emitter->emit(
            new OrderPlacedEvent(orderId: $orderId, total: $total)
        );
    }
}
```

Each injected `EventEmitter` is a separate object. The container does
not share it, so two services never share listeners through their
emitters. Listeners added to one emitter do not fire for another one.
To share events, forward them to the app as shown in
[Sharing Events with the App](#sharing-events-with-the-app).

If your class needs an emitter but should not take it through the
constructor, use the `EventAwareTrait`. It creates an `EventEmitter`
lazily for each instance and provides `emit()`, `on()`, `subscribe()`,
and `getEventDispatcher()`.

```php
use Windwalker\Event\EventAwareTrait;

class OrderService
{
    use EventAwareTrait;

    public function place(int $orderId, int $total): void
    {
        $this->emit(
            new OrderPlacedEvent(orderId: $orderId, total: $total)
        );
    }
}

$service = new OrderService();
$service->on(
    OrderPlacedEvent::class,
    fn (OrderPlacedEvent $event) => null
);
```

::: info
Each instance using `EventAwareTrait` has its own emitter. Two
`OrderService` objects do not share listeners.
:::

::: tip
Use typed event classes instead of string names. IDE completion and
static analysis then catch wrong property names.
:::

## Sharing Events with the App

A service that owns its emitter should forward its events to the
application. Add the app dispatcher as a dealer, as shown above. This
lets an application-level listener, such as an audit log, react to
events from a package without the package knowing about the log.

::: warning
Events forwarded to the app are visible to every listener in the app.
Do not put secrets or raw credentials inside event properties.
:::

## Topic pages

- [Event component](../../components/event/events.md): listeners,
  priorities, and emitter internals.
- [Dealers](../../components/event/dealers.md): forwarding in detail.
- [Request Lifecycle](./applications/request-lifecycle.md): the full
  order of core events.
