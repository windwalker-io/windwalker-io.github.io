---
layout: doc
title: Workflow
description: Workflow page for Windwalker Unicorn.
---

# Workflow

Many business records move through stages. A product is drafted, submitted for review, then approved or rejected. The workflow service models these stages as a finite state machine. States hold the current status, and transitions define which moves are allowed and what they are called. The workflow also drives the status buttons in admin lists and runs your code when a change happens.

## Core Concepts

A workflow is built from a few terms:

- State: a value the field can hold, such as `draft` or `pending`.
- Transition: a named move from one or more states to another, such as `submit`. Transition names are usually verbs.
- Strict mode: only the transitions you define are allowed.
- Free mode: any state can move to any other state.

`BasicStateWorkflow` is the built-in example. It defines the `publish` and `unpublish` transitions, and most list pages use it for their status buttons.

```php
use Unicorn\Enum\BasicState;

$workflow->addTransition(
    'publish',
    BasicState::UNPUBLISHED,
    BasicState::PUBLISHED
)->button('fa fa-fw fa-check', 'Publish');
```

## Enabling a Workflow

A workflow needs three parts: a state enum, a workflow class, and a listener on the entity.

### Defining the States

Define the states in an enum. Use the `Title`, `Icon`, and `Color` attributes on each case, so the workflow can read them.

```php
use Windwalker\Utilities\Attributes\Enum\Color;
use Windwalker\Utilities\Attributes\Enum\Icon;
use Windwalker\Utilities\Attributes\Enum\Title;
use Windwalker\Utilities\Enum\EnumTranslatableInterface;
use Windwalker\Utilities\Enum\EnumTranslatableTrait;

enum ReviewState: string implements EnumTranslatableInterface
{
    use EnumTranslatableTrait;

    #[Title('Draft')]
    #[Icon('fa-solid fa-fw fa-pen')]
    #[Color('info')]
    case DRAFT = 'draft';

    #[Title('Pending')]
    #[Icon('fa-regular fa-fw fa-clock')]
    #[Color('warning')]
    case PENDING = 'pending';

    #[Title('Approved')]
    #[Icon('fa-solid fa-fw fa-check')]
    #[Color('success')]
    case APPROVED = 'approved';

    #[Title('Rejected')]
    #[Icon('fa fa-fw fa-xmark')]
    #[Color('danger')]
    case REJECTED = 'rejected';
}
```

### Generating the Workflow Class

Generate the workflow class with the `unicorn:workflow` generator. The optional `field` argument sets the field name, and it is asked for when omitted.

```bash
php windwalker g unicorn:workflow ProductReview
```

Create a separate workflow class for each workflow. Do not share one class between unrelated fields, because each class carries its own transitions.

The `#[StateMachine]` attribute connects the class to a field and an enum. `enum` loads all cases of the enum as states, and `field` names the entity column. `strict` controls whether transitions are enforced.

```php
use Unicorn\Attributes\StateMachine;
use Unicorn\Workflow\WorkflowController;
use Unicorn\Workflow\WorkflowInterface;
use Unicorn\Workflow\WorkflowTrait;

#[StateMachine(
    field: 'review_state',
    enum: ReviewState::class,
    strict: true
)]
class ProductReviewWorkflow implements WorkflowInterface
{
    use WorkflowTrait;

    public function prepare(
        WorkflowController $workflow,
        ?object $entity
    ): void {
        //
    }
}
```

`WorkflowTrait` supplies `listen()`, `compile()`, and the option handling. `prepare()` is where you configure the states and transitions. It runs each time the workflow is compiled.

## Strict and Free Modes

Strict mode is used in the examples on this page. It limits changes to the defined transitions. Set `strict` to `false` when every state may move to every other state.

```php
#[StateMachine(
    field: 'review_state',
    enum: ReviewState::class,
    strict: false
)]
```

In strict mode, a change that has no matching transition is rejected when the entity is saved. The message is translated from `unicorn.workflow.error.transition.disallow`.

```php
// ERROR: Transition from "Draft" to "Approved" is disallow.
```

::: info
`isAllow()` treats the same state as always allowed. Saving an entity without changing its state never fails.
:::

## Complete Example

The following workflow runs a product review process. It starts from the `draft` or `approved` state, and it allows moves only along the defined transitions.

```php
namespace App\Workflow;

use App\Enum\ReviewState;
use Unicorn\Attributes\StateMachine;
use Unicorn\Workflow\WorkflowController;
use Unicorn\Workflow\WorkflowInterface;
use Unicorn\Workflow\WorkflowTrait;

#[StateMachine(
    field: 'review_state',
    enum: ReviewState::class,
    strict: true
)]
class ProductReviewWorkflow implements WorkflowInterface
{
    use WorkflowTrait;

    public function prepare(
        WorkflowController $workflow,
        ?object $entity
    ): void {
        // A new product can start as draft or approved.
        $workflow->setInitialStates(
            [
                ReviewState::DRAFT,
                ReviewState::APPROVED,
            ]
        );

        $workflow->addTransition(
            'submit',
            froms: [
                ReviewState::DRAFT,
                ReviewState::REJECTED,
            ],
            to: ReviewState::PENDING
        )->button('far fa-paper-plane text-primary', 'Submit');

        $workflow->addTransition(
            'approve',
            froms: [
                ReviewState::PENDING,
            ],
            to: ReviewState::APPROVED
        )->button('far fa-hand text-success', 'Approve');

        $workflow->addTransition(
            'reject',
            froms: [
                ReviewState::PENDING,
            ],
            to: ReviewState::REJECTED
        )->button('far fa-hand text-danger', 'Reject');
    }
}
```

Register the workflow on the entity, so that changes to the field are checked. The entity setup runs once when the entity metadata is built.

```php
use App\Workflow\ProductReviewWorkflow;
use Windwalker\DI\Attributes\Autowire;
use Windwalker\ORM\Attributes\EntitySetup;
use Windwalker\ORM\Metadata\EntityMetadata;

#[EntitySetup]
public static function setup(
    EntityMetadata $metadata,
    #[Autowire] ProductReviewWorkflow $workflow
): void {
    $workflow->listen($metadata);
}
```

Then render the dropdown in the list view. By default, it shows the transitions available from the current state.

```blade
@php($reviewWorkflow = $app->service(ProductReviewWorkflow::class))

<x-state-dropdown
    color-on="text"
    button-style="width: 100%"
    :workflow="$reviewWorkflow"
    :id="$item->id"
    :value="$item->review_state"
/>
```

## Listing States Instead of Transitions

Add `use-states` to show the states directly, so the user can set any state that the workflow allows.

```blade
<x-state-dropdown
    color-on="text"
    button-style="width: 100%"
    use-states
    :workflow="$reviewWorkflow"
    :id="$item->id"
    :value="$item->review_state"
/>
```

## Dynamic States and Transitions

Use a dynamic workflow when the states or transitions depend on the entity. For example, a product type can decide which states apply. Remove `field` and `enum` from `#[StateMachine]`, keep `strict`, and register the states in `prepare()`.

```php
use App\Entity\Article;
use App\Entity\Product;
use App\Enum\ArticleState;
use App\Enum\ProductState;

#[StateMachine(
    strict: true
)]
class ProductReviewWorkflow implements WorkflowInterface
{
    use WorkflowTrait;

    public function prepare(
        WorkflowController $workflow,
        ?object $entity
    ): void {
        if ($entity instanceof Product) {
            $workflow->registerStatesFromEnum(ProductState::class);
        } elseif ($entity instanceof Article) {
            $workflow->registerStatesFromEnum(ArticleState::class);
        }
    }
}
```

Since the field is not set in the attribute, name it when listening in entity setup.

```php
class Product implements EntityInterface
{
    // ...

    #[EntitySetup]
    public static function setup(
        EntityMetadata $metadata,
        #[Autowire] ProductReviewWorkflow $workflow
    ): void {
        $workflow->listen($metadata, 'review_status');
    }
```

In list views, compile the controller with the entity, and pass the result to the dropdown.

```blade
@php($ctrl = $reviewWorkflow->compile($entity, 'review_status'))

<x-state-dropdown
    color-on="text"
    style="width: 100%"
    :workflow="$ctrl"
    :id="$entity->getId()"
    :value="$item->status"
/>
```

You can also pass the workflow with `field` and `entity`, and let the component compile it.

```blade
<x-state-dropdown
    color-on="text"
    style="width: 100%"
    :workflow="$reviewWorkflow"
    :id="$entity->getId()"
    :value="$item->status"
    field="review_status"
    :entity="$entity"
/>
```

### Passing Options

Options are an extra channel for the workflow. Pass them to `listen()` and to `compile()`, and read them in `prepare()` with `getOption()`.

```php
// In the entity setup
$workflow->listen($metadata, 'review_status', ['foo' => 'bar']);

// In the list view
$ctrl = $reviewWorkflow->compile(
    $entity,
    'review_status',
    ['foo' => 'bar']
);
```

```php
// *Workflow.php

public function prepare(
    WorkflowController $workflow,
    ?object $entity
): void {
    if ($workflow->getOption('foo') === 'bar') {
        $workflow->registerStatesFromEnum(ProductState::class);
    } else {
        $workflow->registerStatesFromEnum(ArticleState::class);
    }
}
```

::: warning
`compile()` does not read the options passed to `listen()`. If the list view
omits them, the dropdown shows a different set of states from the one
that validates the save. Pass the same options in both places.
:::

## Listening to Workflow Events

### Transition Events

Listeners run around a state change. Register them in `prepare()`, after the transitions they refer to. Use `onBeforeTransition()` and `onAfterTransition()` for named transitions, and send a notification after the change is stored.

```php
public function prepare(
    WorkflowController $workflow,
    ?object $entity
): void {
    // ... states and transitions, as above

    $workflow->onAfterTransition(
        'submit',
        function (TransitionEvent $event) {
            // The entity that was changed.
            $product = $event->watchEvent->tempEntity;

            // Notify the admin.
        }
    );

    $workflow->onAfterTransition(
        'approve',
        function (TransitionEvent $event) {
            // Notify the author.
        }
    );
}
```

::: warning
A listener is attached only when the transition already exists. If you register a listener before `addTransition()` for that name, the listener is silently ignored. Register transitions first.
:::

`TransitionEvent` exposes the change through its public properties.

```php
$workflow->onAfterTransition(
    'approve',
    function (TransitionEvent $event) {
        // The ORM watch event, with the entity and old/new values.
        $event->watchEvent;

        // The states of the change, as a string or array.
        $event->froms;
        $event->to;

        // The Transition object, or null for a plain state change.
        $event->transition;

        // True while seeding or migrating. See below.
        $event->muted;
    }
);
```

### State Changes

Use `onBeforeChanged()` and `onAfterChanged()` to listen to state changes, whether or not a transition exists. They are useful in free mode, or for finer control. Pass `'*'` or `null` to match every state.

```php
// Several states to one state
$workflow->onAfterChanged(
    [ReviewState::REJECTED, ReviewState::DRAFT],
    ReviewState::PENDING,
    function (TransitionEvent $event) {
        // Do something
    }
);

// One state to several states
$workflow->onAfterChanged(
    ReviewState::PENDING,
    [ReviewState::REJECTED, ReviewState::DRAFT],
    function (TransitionEvent $event) {
        // Do something
    }
);

// Any state to one state
$workflow->onAfterChanged(
    '*',
    ReviewState::REJECTED,
    function (TransitionEvent $event) {
        // Do something
    }
);
```

Use the `From` and `To` variants to listen to one side of a change. The other side matches every state.

```php
// Any change away from "pending"
$workflow->onAfterFrom(
    ReviewState::PENDING,
    function (TransitionEvent $event) {
        // Do something
    }
);

// Any change into "approved"
$workflow->onAfterTo(
    ReviewState::APPROVED,
    function (TransitionEvent $event) {
        // Do something
    }
);
```

### Muting Events While Seeding or Migrating

Workflow listeners often have external side effects, such as sending mail or calling an API. A seeder or a migration can trigger many transitions in a row, which would send a flood of those side effects. To prevent this, regular listeners are muted automatically while a seeder or a migration runs. You do not need to turn anything off.

`SeedService::$running` and `MigrationService::$running` are static flags in `windwalker/core`. They are `true` while a seeder (import or clear) or a migration handler runs. `WorkflowController::isMuted()` returns `true` when either flag is set.

::: info
There is no public method to mute the workflow by hand. Muting is only switched on by seeders and migrations, so you cannot turn it on for a normal request.
:::

While muted:

- Regular listeners are skipped. These are the listeners registered with `onBeforeChanged()`, `onAfterChanged()`, `onBeforeTransition()`, `onAfterTransition()`, `onBeforeFrom()`, `onAfterFrom()`, `onBeforeTo()`, and `onAfterTo()`.
- `Always` listeners still run.
- Transition validation is not affected. A disallowed change still throws `TransitionDisallowException`.

Put anything with external side effects in a regular listener, and anything that must always run, such as logging or keeping internal data consistent, in an `Always` listener.

```php
// Sends mail: skipped while seeding or migrating
$workflow->onAfterTransition(
    'approve',
    function (TransitionEvent $event) use ($mailer) {
        $mailer->send(/* ... */);
    }
);

// Always runs
$workflow->onAfterTransitionAlways(
    'approve',
    function (TransitionEvent $event) use ($logger) {
        $logger->info('Product approved');
    }
);
```

Each regular method has an `Always` counterpart. The `always` flag is the same switch in code.

```php
// Equivalent to onAfterTransitionAlways()
$workflow->onAfterTransition('approve', $listener, always: true);

// Equivalent to onAfterChangedAlways()
$workflow->onAfterChanged(
    ReviewState::PENDING,
    ReviewState::APPROVED,
    $listener,
    always: true
);
```

A listener can check `muted` to decide what to do.

```php
$workflow->onAfterChangedAlways(
    'draft',
    'published',
    function (TransitionEvent $event) use ($logger, $cache) {
        $logger->info(
            'Published',
            ['seeding' => $event->muted]
        );

        if (!$event->muted) {
            $cache->clear();
        }
    }
);
```

::: info
Only seeders and migrations that run through `SeedService` and `MigrationService` mute the workflow. Other batch jobs are not muted, so use `Always` and regular listeners deliberately there.
:::

## Confirm Before Changing State

`<x-state-dropdown>` and `<x-state-button>` can ask the user to confirm before a state or transition is applied. The workflow only marks which states or transitions are dangerous. The page decides whether and how to warn, so the same workflow can behave differently on different pages.

### Marking Dangerous States and Transitions

`State`, `Transition`, and `StateOption` provide `dangerous()` and `isDangerous()`. The flag is only a semantic marker. It does not change behavior or add any CSS class by itself.

```php
$workflow = new WorkflowController('status');

$workflow->addState('published')->title('Published');
$workflow->addState('deleted')
    ->title('Deleted')
    ->dangerous();

$workflow->addTransition('delete', 'published', 'deleted')
    ->title('Delete')
    ->dangerous();
```

`WorkflowController::getStateButton()` carries the flag from each `State` to its `StateOption`.

### Enabling Confirmation in the View

Both components accept a `confirm` prop and an optional `confirmMessage` prop. The default message is `Are you sure?`.

```blade
{{-- Warn on dangerous items only, with the default message --}}
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->state"
    :id="$item->id"
    :confirm="true"
/>

{{-- Warn on dangerous items only, with a custom message --}}
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->state"
    :id="$item->id"
    confirm="This cannot be undone."
/>

{{-- Change the default message --}}
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->state"
    :id="$item->id"
    :confirm="true"
    confirm-message="Really?"
/>
```

The `confirm` prop accepts these values:

- `null` or `false` (default): no confirmation.
- `true`: the default message, for dangerous items only.
- A string: that message, for dangerous items only.
- An array: per-item control. The dangerous flag is ignored.
- A `Closure`: per-item control. The dangerous flag is ignored.

#### Per-Item Control

An array is keyed by transition name, or by state value in `use-states` and `batch` modes. Each value is a message, `true` for the default message, or `false` for no confirmation. Items that are not listed are not confirmed.

```blade
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->state"
    :id="$item->id"
    :confirm="[
        'unpublish' => 'Unpublish this article?',
        'delete' => true,
    ]"
/>
```

A closure receives the item and its key. It returns a message, `true`, or `null`. The page can decide based on the current user or the data.

```blade
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->state"
    :id="$item->id"
    :confirm="fn ($item, string $key) =>
        $item->isDangerous() && !$isAdmin
            ? 'Ask an admin first.'
            : null"
/>
```

### Behaviors and Limitations

- The confirmation is a browser `confirm()` call placed before the existing action. Cancelling it stops the request.
- `<x-state-dropdown>` supports the normal, `use-states`, and `batch` modes.
- A custom `onclick` on `<x-state-dropdown>` takes full control, and `confirm` is not applied. Call `confirm()` yourself inside it if needed.
- `<x-state-button>` applies `confirm` to `task` clicks only. `onclick` and `href` actions are not affected. For a button, the key of an array or closure is the current state value.
- Dangerous items are not styled automatically. Add your own classes to highlight them.

## Related

- [StateButton](/documentation/unicorn/services/utilities/state-button)
- [Repository](/documentation/unicorn/services/repository)

