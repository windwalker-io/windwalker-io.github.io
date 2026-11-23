---
layout: doc
title: StateList
description: StateList field page for Windwalker Unicorn.
---

# StateList

A status field, such as a review state, changes in a fixed order. A plain
select lets editors pick any value. The workflow then rejects the save when
the move is not allowed, and the editor only sees the error after saving.
`StateListField` lists only the states that the workflow allows from the
current value, so the form offers valid moves from the start.

The field reads its states from a workflow. Define the workflow as described
on the [Workflow](/documentation/unicorn/services/workflow) page.

## Enabling the Field

Add `StateListField` to a form, and pass the workflow with `workflow()`.
The field name must match the `field` of the workflow's `#[StateMachine]`
attribute:

```php
use Unicorn\Field\StateListField;

$form->add('review_state', StateListField::class)
    ->label('Review state')
    ->workflow($this->workflow);
```

::: info
`workflow()` is required. The field cannot list states without a workflow.
:::

## Complete Example

The following form lets an editor change the review state of a product. The
workflow is the `ProductReviewWorkflow` from the Workflow page, and the
workflow is injected into the form class:

```php
use App\Workflow\ProductReviewWorkflow;
use Unicorn\Field\StateListField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Form;

class ProductEditForm
{
    public function __construct(
        protected ProductReviewWorkflow $workflow,
    ) {
    }

    #[FormDefine]
    #[NS('item')]
    public function basic(Form $form): void
    {
        $form->add('review_state', StateListField::class)
            ->label('Review state')
            ->workflow($this->workflow);
    }
}
```

Fill the form with the stored record as usual. The field then lists the
states that are allowed from the stored value.

## Which States Are Listed

The list depends on the stored value:

- Empty value, such as a new record: the initial states of the workflow.
- A stored state: the state itself, plus every state that a transition
  can reach from it.

Assume the review workflow from the Workflow page, with `draft` and `approved`
as initial states, and the transitions `submit`, `approve`, and `reject`:

```php
// New record: draft, approved.
// Stored "draft": draft, pending.
// Stored "pending": pending, approved, rejected.
// Stored "approved": approved.
```

The stored state is always listed, so the value of an existing record stays
selectable when the form is saved without a change.

## Free Mode

A workflow in free mode allows any move. The list then offers every enabled
state for a stored value. The initial states still apply to an empty value.

```php
#[StateMachine(
    field: 'review_state',
    enum: ReviewState::class,
    strict: false
)]
class ProductReviewWorkflow implements WorkflowInterface
{
    // ...
}
```

The list does not check the order in free mode. Use strict mode when the
order of states must hold.

## Option Text

The option text is the state title. Set it with the `#[Title]` attribute on
each enum case, or with `mustGetState()->title()` in the workflow's
`prepare()` method. Give every state a title, so that editors see readable
text.

## Enforcing the Workflow

The field only limits what the form offers. The entity must also check the
workflow when it is saved. Register the workflow with `listen()` in an
`#[EntitySetup]` method, as shown on the Workflow page.

::: warning
Without `listen()`, a change that the list would not offer is saved without
an error. The list is not a security check.
:::

When the workflow is strict, a rejected move throws an exception on save:

```php
// ERROR: Unicorn\Workflow\Exception\TransitionDisallowException
$product->reviewState = ReviewState::APPROVED; // From "draft".
$orm->mapper(Product::class)->saveOne($product);
```

## Options Reference

The state list adds one method to attach the workflow that provides the
states.

| Method | Description | Default |
| --- | --- | --- |
| `workflow()` | Sets the workflow whose states the field lists. | — |
| `getWorkflow()` | Returns the workflow, or `null` when none is set. | — |

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

## Related

- [Workflow](/documentation/unicorn/services/workflow)
- [Form Management](/documentation/unicorn/mvc-crud/mvc-admin/form-management)
- [Switcher](/documentation/unicorn/form-fields/field-types/switcher)
