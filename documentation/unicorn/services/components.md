---
layout: doc
title: Components
description: Components page for Windwalker Unicorn.
---

# Components

Admin screens in Unicorn repeat the same UI: tabbed forms, page
navigation, and workflow-driven state controls. Unicorn packages these
as Edge components. Each one pairs a PHP class, which prepares the data,
with a Blade view, which renders the markup. Your views stay short, and
every admin screen looks and behaves the same way.

The components are registered by `UnicornPackage` as Edge tags. Use them
in any Blade view of a Unicorn application:

- `<x-tabs>` and `<x-tab>`: tabbed panels, for example in edit forms.
- `<x-pagination>`: page navigation for a `Pagination` object.
- `<x-state-button>`: a button or icon that shows a state.
- `<x-state-dropdown>`: a menu that changes a workflow state.
- `<x-publishing-dropdown>`: a state dropdown with publish schedules.

`<x-pagination-jump>` and `<x-pagination-stats>` are view-only
components. They are used inside `<x-pagination>`, as shown below.

## Tabs

`<x-tabs>` renders the tab container. Each `<x-tab>` is one pane. The
Unicorn JavaScript reads the panes and builds the navigation, so you only
write the panes.

```blade
<x-tabs id="settings-tabs" variant="pills">
    <x-tab name="general" title="General" active>
        <p>General settings.</p>
    </x-tab>

    <x-tab name="advanced" title="Advanced">
        <p>Advanced settings.</p>
    </x-tab>

    <x-tab title="Coming soon" disabled>
        <p>Not available yet.</p>
    </x-tab>
</x-tabs>
```

The class is `Unicorn\Component\TabsComponent`, and the pane class is
`Unicorn\Component\TabComponent`.

```php
// TabsComponent: <x-tabs>
public ?string $id = null;          // Container ID. Generated if empty.
public string $variant = 'tabs';    // 'tabs' or 'pills'.
public mixed $keepactive = null;    // Selector, or true for #admin-form.
public ?bool $fill = null;          // Stretch nav items evenly.
public ?string $navTarget = null;   // Selector to move the nav into.
public ?string $navClass = null;    // Extra classes for the nav.
public mixed $navAttrs = [];        // Attributes for the nav element.
public ?int $navGap = null;         // Adds gap-{n} to the nav.
public ?bool $disabled = null;      // Disable every tab link.

// TabComponent: <x-tab>
public ?string $id = null;          // Pane ID. Overrides name.
public ?string $name = null;        // Pane ID, if id is empty.
public string $title = '';          // Text of the nav link.
public bool $active = false;        // Open this pane initially.
public bool $disabled = false;      // Disable this tab link.
```

Use the container props to control the navigation and its behavior:

```blade
{{-- Pills, with the nav moved into an existing element. --}}
<x-tabs variant="pills" nav-target="#settings-nav">
    {{-- Panes go here --}}
</x-tabs>

{{-- Stretch the nav items and add spacing between them. --}}
<x-tabs :fill="true" :nav-gap="2" nav-class="mb-3">
    {{-- Panes go here --}}
</x-tabs>

{{-- Pass true to use #admin-form as the active-tab selector. --}}
<x-tabs :keepactive="true">
    {{-- Panes go here --}}
</x-tabs>

{{-- Pass attributes to the nav element. --}}
<x-tabs :nav-attrs="['aria-label' => 'Settings']">
    {{-- Panes go here --}}
</x-tabs>
```

`keepactive` accepts a selector string or `true`. `true` maps to
`#admin-form`. The value is passed to `useBs5KeepTab()` in the Unicorn
frontend.

The tab container sets the pane ID in this order:

- `name`, if set, is the pane ID.
- Otherwise, the slug of `title` is used, for example
  `c-tab-account-settings`.
- Otherwise, a unique ID is generated.

::: warning
Every pane is rendered into the page, including inactive and disabled
ones. `disabled` only blocks the tab link. Never put data in a tab that
the current user must not see.
:::

## Pagination

`<x-pagination>` renders the page navigation for a `Pagination` object.
It renders nothing when there is only one page.

```blade
<x-pagination :pagination="$pagination" allow-query="filter,sort">
    <x-pagination-jump :pagination="$pagination" />
    <x-pagination-stats :pagination="$pagination" />
</x-pagination>
```

![](https://github.com/user-attachments/assets/8ba1aabe-0602-48f7-bc5e-d781d72c46b3)

The class is `Unicorn\Component\PaginationComponent`.

```php
// PaginationComponent: <x-pagination>
public Pagination $pagination;      // Required. The page object.

// Query names to keep: comma string, array, or bool.
public string|array|bool|null $allowQuery = null;

public bool $inModal = false;       // Keep modal query names in links.
```

Page links keep only the query parameters that are allowed. The
`allow-query` prop adds names to that list, separated by commas. Pass an
array or `true` to allow more. Add the filter and sort names that your
list reads, or they are dropped when the user changes page.

```blade
{{-- Keep every query parameter in the page links. --}}
<x-pagination :pagination="$pagination" :allow-query="true" />
```

Inside a modal, use `in-modal`. It also keeps the modal parameters
`layout`, `callback`, `multiCheck`, and `selected` in the links.

```blade
<x-pagination :pagination="$pagination" in-modal />
```

## State Button

`<x-state-button>` renders one state as a button. Use it in a list row
when a click performs one action, such as publishing an item. It needs
the current `value` and a `states` source. The source is a plain array
keyed by value, or a `WorkflowController`.

```php
use Unicorn\Workflow\WorkflowController;

// Build the workflow once, then pass it to the view.
$workflow = new WorkflowController('status');

$workflow->addState('draft')
    ->title('Draft')
    ->color('secondary');

$workflow->addState('published')
    ->title('Published')
    ->color('success');
```

```blade
{{-- Plain array: keys are state values. --}}
<x-state-button
    :value="$item->published"
    :states="[
        '1' => ['title' => 'Published', 'color' => 'success'],
        '0' => ['title' => 'Unpublished', 'color' => 'secondary'],
    ]"
    :id="$item->id"
    :options="['task' => 'publish']"
/>

{{-- Workflow controller: read the state from the workflow. --}}
<x-state-button
    :value="$item->status"
    :states="$workflow"
    :id="$item->id"
/>

{{-- Row index instead of item ID, for grids with row checkboxes. --}}
<x-state-button
    :value="$item->status"
    :states="$workflow"
    :row="$i"
/>

{{-- Icon only: the state is shown, but not clickable. --}}
<x-state-button
    :value="$item->status"
    :states="$workflow"
    :readonly="true"
/>
```

The class is `Unicorn\Component\StateButtonComponent`.

```php
// StateButtonComponent: <x-state-button>
public mixed $value = '';           // Current state. true becomes '1'.
public mixed $id = null;            // Item ID for updateItemByTask().
public ?int $row = null;            // Row index for updateRowByTask().

// Required. A StateButton, WorkflowController, or array.
public StateButton|WorkflowController|array $states;

public string $store = 'grid';      // Alpine store name.
public string $size = 'sm';         // Button size, for example btn-sm.
public bool $disabled = false;      // Disable the button.
public bool $readonly = false;      // Show icon only, no button.
public array $options = [];         // Merged into the current state.

public \Closure|array|string|bool|null $confirm = null;
public string $confirmMessage = 'Are you sure?';
```

A boolean `value` is converted to `'1'` or `'0'`. A `task` in the state
or in `options` runs `$store.grid.updateItemByTask()` with `id`, or
`updateRowByTask()` with `row`. Use `store` to target another Alpine
store. It defaults to `grid`.

::: warning
A string `onclick` option is printed into the HTML without escaping.
Pass only trusted JavaScript, never user input.
```php
// Unsafe: $request->query('js') is user input.
$state->onclick($request->query('js'));
```
:::

### Confirming Dangerous States

Mark a state as dangerous, then set `confirm` on the component. For a
button, `confirm` applies only to `task` clicks, not to `href` or
`onclick` actions.

```php
$workflow->addState('deleted')
    ->title('Deleted')
    ->color('danger')
    ->dangerous();
```

```blade
{{-- Confirm only when the state is dangerous. --}}
<x-state-button
    :value="$item->status"
    :states="$workflow"
    :id="$item->id"
    :confirm="true"
    confirm-message="Delete this item?"
/>
```

## State Dropdown

`<x-state-dropdown>` shows the current state as a button and opens a
menu. By default, the menu lists the transitions enabled from the
current state. Add `use-states` to list every state instead.

```blade
{{-- Transitions: what the item can move to next. --}}
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->status"
    :id="$item->id"
/>

{{-- States: every state in the workflow. Text color, full width. --}}
<x-state-dropdown
    color-on="text"
    button-style="width: 100%"
    use-states
    :workflow="$workflow"
    :value="$item->status"
    :id="$item->id"
/>

{{-- Batch: one menu for the selected rows in a toolbar. --}}
<x-state-dropdown batch :workflow="[$workflow]" class="uni-btn-state">
    @lang('unicorn.toolbar.state.change')
</x-state-dropdown>
```

The class is `Unicorn\Component\StateDropdownComponent`.

```php
// StateDropdownComponent: <x-state-dropdown>

// Null, a WorkflowInterface, a WorkflowController, or an array
// of them. An array requires batch.
public WorkflowInterface|WorkflowController|array|null $workflow = null;

public mixed $value = '';           // Current state value.
public ?string $id = null;          // Item ID for updateItem().
public bool $batch = false;         // Batch mode for toolbars.
public bool $useStates = false;     // List states, not transitions.
public bool $readonly = false;      // Show current state text only.
public bool $disabled = false;      // Disable the dropdown.
public bool $noTitle = false;       // Hide the title text.
public string $colorOn = 'button';  // 'button' or 'text'.
public string $size = 'sm';         // Button size, for example btn-sm.
public string $store = 'grid';      // Alpine store name.
public ?string $buttonStyle = null; // Inline style of the toggle.
public ?string $buttonColor = null; // Button color class.
public ?string $textColor = null;   // Text color class.
public ?object $entity = null;      // Entity passed to compile().
public ?string $field = null;       // Field passed to compile().

// Custom action. Replaces the default update and skips confirm.
public \Closure|string|null $onclick = null;

public \Closure|array|string|bool|null $confirm = null;
public string $confirmMessage = 'Are you sure?';
```

In the default mode, the dropdown is disabled when the current state has
no enabled transitions. `readonly` shows only the current state title.

Passing several workflows requires `batch`. Without it, the component
throws an exception.

```blade
{{-- ERROR: InvalidArgumentException: Multiple workflows only
     supports "batch" mode. --}}
<x-state-dropdown :workflow="[$workflow, $other]" :value="$item->status" />
```

Set `color-on="text"` to color the title instead of the button. Use
`colorOn` in PHP for the same option.

### Confirming Transitions

`confirm` asks the user before a state or transition is applied. The
confirmation is a browser `confirm()` placed before the action. Cancelling
it stops the request.

```blade
{{-- Confirm dangerous items only, with the default message. --}}
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->status"
    :confirm="true"
/>

{{-- Confirm one transition by name. --}}
<x-state-dropdown
    :workflow="$workflow"
    :value="$item->status"
    :confirm="['delete' => 'This cannot be undone.']"
/>
```

A custom `onclick` replaces the action, and `confirm` is not applied to
it. Call `confirm()` yourself in that case.

## Publishing Dropdown

`<x-publishing-dropdown>` extends the state dropdown. It accepts the same
props, plus `publish-up` and `publish-down`. Each value can be a
`DateTimeInterface` or a date string.

```blade
<x-publishing-dropdown
    :workflow="$workflow"
    :value="$item->state"
    :id="$item->id"
    :publish-up="$item->publish_up"
    :publish-down="$item->publish_down"
/>
```

The class is `Unicorn\Component\PublishingDropdownComponent`. It extends
`StateDropdownComponent`, so it accepts all of its props, plus these:

```php
// PublishingDropdownComponent: <x-publishing-dropdown>
// Date objects or date strings. Null means no schedule.
public \DateTimeInterface|string|null $publishUp = null;
public \DateTimeInterface|string|null $publishDown = null;
```

The schedule changes the display only when `value` is `'1'`, the
published state.

- A `publish-up` in the future shows a "waiting" title with a clock icon.
- A `publish-down` in the past shows a stop icon.
- Otherwise, the title and tooltip show the publish times.

::: warning
The schedule is display only. The component does not change the item's
state. Enforce the publish window in your own queries or models.
:::

## Related

- [Workflow](/documentation/unicorn/services/workflow): states,
  transitions, and `WorkflowController`.
- [StateButton](/documentation/unicorn/services/utilities/state-button):
  the state option class used by these components.
