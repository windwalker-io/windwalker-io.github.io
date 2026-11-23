---
layout: doc
title: StateButton
description: Describe status values once and render clickable state buttons.
---

# StateButton

Grid rows often show a status, such as published or trashed, that users can change with one click. `StateButton` describes each possible value once, with its icon, color, title, and action. The `<x-state-button>` component reads that description and renders the right button for each row.

## Enabling It

Create a `StateButton` with `create()`, or build one from a backed [enum](/documentation/framework/core-concepts/enum) with `fromEnum()`. The options array sets defaults that merge into every state, such as `buttonClass`.

```php
use Unicorn\Html\State\StateButton;

$states = StateButton::create(['buttonClass' => 'btn btn-sm']);

// addState() returns the StateOption, so chain its setters.
$states->addState(1)
    ->title('Published')
    ->icon('fa fa-check')
    ->color('success')
    ->task('unpublish');
```

Use `fromEnum()` when the statuses already live in an enum. Each case becomes a state. The icon and title come from the enum only when it implements `EnumMetaInterface`. Set `color` and `task` on each state yourself.

```php
$states = StateButton::fromEnum(PublishState::class, [
    'buttonClass' => 'btn btn-sm',
]);
```

## Complete Example

A view model builds the states once. The Blade list renders one button per row.

```php
use Unicorn\Html\State\StateButton;

final class ArticleListViewModel
{
    public function prepareStates(): StateButton
    {
        $states = StateButton::create(['buttonClass' => 'btn btn-sm']);

        $states->addState(1)
            ->title('Published')
            ->icon('fa fa-check')
            ->color('success')
            ->task('unpublish');

        $states->addState(0)
            ->title('Unpublished')
            ->icon('fa fa-times')
            ->color('secondary')
            ->task('publish');

        return $states;
    }
}
```

```blade
@foreach ($items as $item)
    <tr>
        <td> ... </td>
        <td>
            <x-state-button
                :states="$states"
                :value="$item->published"
                :id="$item->id"
            />
        </td>
        ...
    </tr>
@endforeach
```

`$item->published` may be a boolean, an integer, or a backed enum. The
button normalizes it to a string value, so `true` matches the state `'1'`.

## Custom Actions and Batch Tasks

A `task` click sends the task name and the checked ids to the grid form's
URL. The grid controller's `batch()` method receives them and calls a
method named `batch` plus the task name, when the controller defines one.

```php
use Unicorn\Controller\GridController;
use Windwalker\Core\Application\AppContext;
use Windwalker\Core\Router\Navigator;

class ArticleController extends GridController
{
    // Runs for the "unpublish" task from any state button.
    public function batchUnpublish(
        AppContext $app,
        Navigator $nav,
        ArticleRepository $repository,
        mixed $ids = null,
    ): mixed {
        // Checkbox and button submits both send the ids as id[].
        $ids = (array) ($ids ?? $app->input('id'));

        $repository->createBatchAction()
            ->update($ids, ['state' => 0]);

        return $nav->back();
    }
}
```

Use the array form of `confirm` to ask before a task runs. For a button,
the key is the state value, so `'1'` applies to the Published state.

```blade
<x-state-button
    :states="$states"
    :value="$item->published"
    :id="$item->id"
    :confirm="['1' => 'Unpublish this article?']"
/>
```

A button cannot send a row to its own URL. For a separate page, use an
`onclick` closure and pass the id through `options`. The closure receives
the options as its third argument.

```php
$states->addState(0)
    ->onclick(
        fn ($value, $state, $options) =>
            "location.href = '/article/edit/{$options['id']}'"
    );
```

```blade
<x-state-button
    :states="$states"
    :value="$item->published"
    :id="$item->id"
    :options="['id' => $item->id]"
/>
```
## Describing States

Each state is a `StateOption`. Its setters control the appearance and the
action of the button.

```php
$states->addState('draft')
    ->title('Draft')
    ->icon('fa fa-pen')
    ->color('secondary')    // Rendered as text-secondary on the icon.
    ->text('Draft')         // Visible label beside the icon.
    ->onlyIcon(false)
    ->disabled(false)
    ->buttonClass('btn btn-light');
```

Each state has one action. `task()` calls the grid store's
`updateItemByTask()` (or `updateRowByTask()` when you pass `row`). `href()`
navigates with `location.href`. `onclick()` runs your own JavaScript.

```php
$states->addState(0)
    ->href('/articles/archive');
```

::: warning
`href` and `onclick` actions do not use the `confirm` prop. Add your own
`confirm()` call in `onclick` when a navigation or script is destructive.
:::

## Reading and Changing States

The `StateButton` keeps all states by value. These methods read and edit
the list.

```php
// getState() returns the raw StateOption, or null.
$published = $states->getState(1);

// getStates() returns every state keyed by value.
$all = $states->getStates();

// getCompiledState() clones the state and merges extra options.
// Use it when a row needs a different title.
$live = $states->getCompiledState('1', ['title' => 'Live']);

// removeState() drops a value. addState() with the same value replaces it.
$states->removeState('0');
```

The `<x-state-button>` component uses `getCompiledState()` internally. Pass
the same options through the `options` prop when a row needs them.

::: info
Values are normalized before lookup. `true` becomes `'1'`, `false` becomes
`'0'`, and backed enums are unwrapped to their value.
:::

## Passing a Workflow

The `states` prop also accepts a `WorkflowController`. The component
calls `getStateButton()` to build the `StateButton` for you.

```blade
<x-state-button
    :states="$workflow"
    :value="$item->state"
    :id="$item->id"
/>
```

## Confirming Changes

Set `dangerous()` on a state, then pass `confirm` to ask the user before
the task runs.

```php
$states->addState(1)
    ->title('Published')
    ->task('unpublish')
    ->dangerous();
```

```blade
<x-state-button
    :states="$states"
    :value="$item->published"
    :id="$item->id"
    :confirm="true"
    confirm-message="Unpublish this article?"
/>
```

`confirm="true"` asks only for dangerous states. A string message does the
same with that text. An array or closure lets the page decide per state.

::: info
The `confirm` prop applies to `task` clicks only.
:::

## Errors for Unknown Values

When `states` is a `StateButton`, a value without a matching state throws.
Arrays of state definitions fall back to a default state instead.

```php
// ERROR: RuntimeException: State with value 'x' not found.
$states->getCompiledState('x');
```
