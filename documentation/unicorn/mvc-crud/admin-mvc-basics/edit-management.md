---
layout: doc
title: Edit Management
description: Work with the generated admin edit page, its save and cancel actions, validation, and the save hooks that extend the controller.
---

# Edit Management

The admin edit page creates and updates one record. It renders a form from the edit form class, saves the submitted data through the repository, and redirects back to the page. The generator builds the controller, the view, and the form, so you add only the rules and hooks that your record needs.

## Features of the Generated Edit Page

The generated edit page provides these parts:

- The `EditView`, which loads the record by the `id` route parameter.
- The `EditForm`, which defines the title, alias, and hidden ID fields.
- A toolbar with Save, Save & Close, and Cancel buttons.
- A hidden ID field and a CSRF token.

When the page is opened without an ID, the record is new.

## Loading the Record

The generated view reads the `id` route parameter and loads the record with `getItem()`:

```php
$id = $app->input('id');

$item = $this->repository->getItem($id);
```

A new record has no `id`, so `getItem()` returns `null`, and the form starts empty. An unknown ID also returns `null`. If an unknown ID must show a 404 page, use `mustGetItem()` in a view that always has an ID:

```php
// Throws RouteNotFoundException when no record matches.
$item = $this->repository->mustGetItem($id);
```

## Saving, Canceling, and Redirecting

The Save button posts the form to the edit route. The controller saves the data and redirects according to the `task` input:

```php
return match ($app->input('task')) {
    'save2close' => $nav->to('product_list'),
    default => $uri,
};
```

`$uri` is the redirect that `CrudController::saveWithNamespace()` returns. It points to the edit page of the saved record, with the new ID. Save & Close returns to the list page. Cancel is a link to the list page, and it does not save.

If saving fails, `CrudController` keeps the submitted data in the state under `edit.data`. The edit view reads that data after the redirect, so the user does not lose the input.

## Saving as a Copy

The Save as Copy action saves the current record, then opens a new record that starts with the same values. `rememberForClone()` removes the primary key from the submitted data and stores the rest in the state. The new edit page reads that state:

```php
$uri = $app->call(
    $controller->saveWithNamespace(...),
    compact('repository', 'form')
);

if ($app->input('task') === 'save2copy') {
    $controller->rememberForClone($app, $repository);

    return $nav->to('product_edit')->var('new', 1);
}

return $uri;
```

## Extending the Save Process

The save runs in this order:

1. The form filters the input and keeps only the fields that the form defines.
2. The form validates the filtered data.
3. `PrepareSaveEvent` runs with the filtered and validated data.
4. The ORM runs `BeforeSaveEvent`, saves the entity, and runs `AfterSaveEvent`.

Register the hooks in the generated controller's `save()` method. Each hook takes a callable and returns the controller:

```php
use Unicorn\Repository\Event\PrepareSaveEvent;
use Windwalker\ORM\Event\AfterSaveEvent;
use Windwalker\ORM\Event\BeforeSaveEvent;

$controller->prepareSave(
    function (PrepareSaveEvent $event): void {
        // $event->data holds the filtered, validated values.
        $event->data['alias'] = strtolower($event->data['title']);
    }
);

$controller->beforeSave(
    function (BeforeSaveEvent $event): void {
        if ($event->isCreate) {
            // Runs only when the record is new.
        }
    }
);

$controller->afterSave(
    function (AfterSaveEvent $event): void {
        // $event->entity is the saved entity, with its new ID.
        $id = $event->entity->id;
    }
);
```

`CrudController` also has `beforeDelete()` and `afterDelete()`, which take the same kind of callable.

To change the save for every request, use the repository instead. Configure the `SaveAction` in the repository, as the generated repository does:

```php
use Unicorn\Repository\Actions\SaveAction;
use Windwalker\ORM\Event\BeforeSaveEvent;

#[ConfigureAction(SaveAction::class)]
protected function configureSaveAction(SaveAction $action): void
{
    $action->beforeUpdate(
        function (BeforeSaveEvent $event): void {
            // Runs on every update, from any caller.
        }
    );
}
```

Use the controller for request-specific logic, and the repository for logic that applies to every save.

The repository can also listen to ORM save events with an attribute on one of its methods. This is the same as calling `beforeSave()` on the `SaveAction`:

```php
use Windwalker\ORM\Event\BeforeSaveEvent;

#[BeforeSaveEvent]
public function normalizeAlias(BeforeSaveEvent $event): void
{
    // Runs on every save, for create and update.
}
```

## Validating Fields

Set validation rules on the field in the form class. A failed rule stops the save before any data is written:

```php
$form->add('title', TextField::class)
    ->label($this->trans('unicorn.field.title'))
    ->addFilter('trim')
    ->required(true);

$form->add('contact', TextField::class)
    ->addValidator('email');
```

The `required()` method is a shortcut for the `required` rule. The `email` rule is a built-in validator name.

```php
// ERROR: ValidateFailException
// The message names each field that failed, such as "Title (Title)".
```

The generated controller stores the submitted input under `edit.data` before it rethrows the exception, so the edit page can show the input again.

### Skipping Validation and Filtering

The save accepts an options value that changes what runs. `SaveAction::IGNORE_VALIDATE` skips the form validators, and `SaveAction::IGNORE_FILTER` skips the form filter. Set the flag in trusted code, such as an import job:

```php
use Unicorn\Repository\Actions\SaveAction;

$action = $repository->createSaveAction();

$item = $action->processDataAndSave(
    $data,
    ProductEditForm::class,
    [],
    SaveAction::IGNORE_VALIDATE
);
```

::: warning
`IGNORE_FILTER` removes the whitelist, so every submitted key reaches the entity. `IGNORE_VALIDATE` skips every rule on the form. Never read the options value from request input, because a user could then turn off the checks.
:::

## Default Values and Input Filters

Use `addFilter()` to change a value before it is validated and saved. The generated title field uses the `trim` filter:

```php
$form->add('alias', TextField::class)
    ->addFilter('trim');
```

`defaultValue()` sets the value that the field returns when it has no value. The generated save does not apply it, because the save filters the input without the default-value option. To store a default, set the value in a `prepareSave` hook:

```php
$controller->prepareSave(
    function (PrepareSaveEvent $event): void {
        $event->data['state'] ??= 0;
    }
);
```

## Showing and Hiding Fields

Use `showon()` to show a field only when another field has a given value. The keys are field paths in the form, and the value is the value that shows the field:

```php
$form->add('discount', NumberField::class)
    ->showon(['item/type' => 'sale']);
```

```php
// ERROR: UnexpectedValueException: Field: item/type not found.
```

The path must match a field in the same form. Unicorn renders the condition as a `uni-show-on` attribute, and the browser applies it.

## Field Attributes

Use `tooltip()` for hover help, and `attr()` for any HTML attribute:

```php
$form->add('title', TextField::class)
    ->tooltip('Shown when the user hovers over the field.')
    ->attr('placeholder', 'Product name')
    ->attr('maxlength', 120);
```

## Printing Fieldsets and Fields

Print a fieldset or group with its `<x-fieldset>` component. The generated edit blade prints its two groups this way:

```blade
<x-fieldset name="basic" :title="$lang('unicorn.fieldset.basic')"
    :form="$form" is="card">
</x-fieldset>
```

To print a single field, pass the field object to `<x-field>`:

```blade
<x-field :field="$form->getField('item/title')"></x-field>
```

The title bar prints the title and alias fields at the top of the page as large floating inputs. It reads the `item/title` and `item/alias` fields from the namespace you pass:

```blade
<x-title-bar :form="$form" ns="item"></x-title-bar>
```

For how to define fieldsets and groups, see [Form Management](./form-management).

## Browser Behavior of the Edit Page

The edit page depends on Unicorn's `form.ts`. The edit script calls `useFormComponent('#admin-form')`, which creates an Alpine store named `form`. The toolbar buttons and the blade template call its methods:

```blade
<button type="button" @click="form.post()">Save</button>
<button type="button"
    @click="form.post(null, { task: 'save2close' })">
    Save & Close
</button>
```

The main methods are these:

- `submit(url, data, method, customMethod)`: copies `data` into hidden inputs, sets the action and method, and calls `requestSubmit()`.
- `post()`: submits with `POST`.
- `put()`, `patch()`, `delete()`: post with a `_method` input set to `PUT`, `PATCH`, or `DELETE`.
- `get()`: submits with `GET`. `query()` posts with `_method` set to `QUERY`.
- `injectInput(name, value)`: adds or updates one hidden input.

Because `submit()` calls `requestSubmit()`, the browser fires the `submit` event. `useDisableOnSubmit()` listens to that event by default. The `data` argument is flattened, so `{ task: 'save2close' }` arrives as the `task` input that the controller reads.

## Related

- [Edit Forms and Saving](/documentation/guides/rad/edit-forms)
- [Form Management](./form-management)
- [List Management](./list-management)

