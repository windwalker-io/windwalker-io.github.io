---
layout: doc
title: ModalField
description: ModalField field page for Windwalker Unicorn.
---

# ModalField

Many form values point to a record in another list, such as an event, an
article, or an owner. Typing the ID by hand is error-prone, and a plain
select does not scale to thousands of rows. `ModalField` lets the user pick
records from an admin list inside a modal dialog. The field stores the
selected key, or a list of keys, and shows the chosen titles beside the
button.

The picker reuses the list route with the `modal` layout. The search,
filters, and pagination of the admin list therefore work inside the dialog.
See [Modal List View](/documentation/unicorn/mvc-crud/mvc-admin/modal-list-view)
for how the list renders that layout.

## Enabling the Field

Add the field with `ModalField::class`, then set the route of the list and
the table that holds the records. The field builds the picker URL from the
route and queries the table for the titles.

```php
use Unicorn\Field\ModalField;

$form->add('event_id', ModalField::class)
    ->label('Event')
    ->route('event_list')
    ->table('events');
```

::: warning
`table()` is required. Without it, rendering the field throws a
`LogicException` with the message `No table provided`.
:::

## Complete Example

This example uses one field for a single record and one for several
records. The list route must render the `modal` layout, as described in
[Modal List View](/documentation/unicorn/mvc-crud/mvc-admin/modal-list-view).

```php
use Unicorn\Field\ModalField;

$form->add('event_id', ModalField::class)
    ->label('Event')
    ->route('event_list')
    ->table('events')
    ->titleField('title')
    ->keyField('id');

$form->add('related_events', ModalField::class)
    ->label('Related events')
    ->route('event_list')
    ->table('events')
    ->multiple(true)
    ->multiCheck(true)
    ->max(5)
    ->sortable(true)
    ->hasImage(true);
```

## Single and Multiple Selection

The field works in single mode by default. A hidden input stores the key,
and a read-only input shows the title. Choosing another record replaces the
value. An unselect button also appears when the field is not required.

Call `multiple(true)` to select several records. Each selected record is
shown as a row with a remove button. The form receives an array of keys
under the field name. The server renders the saved records into the page
data, so the list does not need a second request to show them.

```php
$form->add('related_events', ModalField::class)
    ->route('event_list')
    ->table('events')
    ->multiple(true);
```

Without checkboxes, picking a record that is already selected shows an
alert and adds nothing.

The list also renders a hidden input under the field name. Its value is
`__EMPTY_ARRAY__`, which keeps an empty selection in the request. Unicorn
converts that sentinel to an empty array when it reads the request, so your
controller receives `[]`. See
[Empty Array Utilities](/documentation/unicorn/form-fields/form-utilities#empty-array-utilities).

::: info
The stored value can be a JSON array, a comma-separated string, or an array.
The field normalizes all three when it renders the saved selection.
:::

## Selecting with Checkboxes

Call `multiCheck(true)` with `multiple(true)` to keep the picker open. Each
click adds or removes a record, and the picker keeps the current selection
in the `selected` URL parameter.

```php
$form->add('related_events', ModalField::class)
    ->route('event_list')
    ->table('events')
    ->multiple(true)
    ->multiCheck(true);
```

The field adds `multiCheck=1` to the picker URL. The list view then renders
checkboxes and posts `select-row` messages. The list view side is covered in
[Selecting with Checkboxes](/documentation/unicorn/mvc-crud/mvc-admin/modal-list-view#selecting-with-checkboxes).
Set `multiCheck` only when users pick many records in a row. A single
click picker is faster for one record.
:::

## Limiting Selections with max()

`max()` limits how many records a multiple field accepts. When the limit
is reached, the picker stops, and an alert shows the maximum.

```php
$form->add('related_events', ModalField::class)
    ->route('event_list')
    ->table('events')
    ->multiple(true)
    ->multiCheck(true)
    ->max(5);
```

With `multiCheck`, a rejected check does not stay checked. The field sends a
`remove-row` message, and the list view unchecks the box. The list view
listener is described in
[Limiting Selections](/documentation/unicorn/mvc-crud/mvc-admin/modal-list-view#limiting-selections-with-max).

::: warning
`max()` is enforced only in the browser. The server accepts any number of
keys, so validate the count in your controller or form validator.
:::

## Sorting Selected Records

`sortable(true)` adds drag handles to the selected rows. The saved order is
preserved when the field renders again.

```php
$form->add('related_events', ModalField::class)
    ->route('event_list')
    ->table('events')
    ->multiple(true)
    ->sortable(true);
```

Without `sortable`, the selected rows follow the order of the query result.
The field does not keep the order in which the user picked them.

## Picker Source and Query

The field loads records through a query on `table()`. Use `configureQuery()`
to add filters, or override `prepareQuery()` in a subclass for fixed
filters. The handler receives the query and the field, and may return a
replacement query or `null`.

```php
$form->add('event_id', ModalField::class)
    ->route('event_list')
    ->table('events')
    ->configureQuery(function ($query, $field) {
        return $query->where('state', 1);
    });
```

::: info
`prepareQuery()` runs on a clone of the query for every lookup, so the
filter applies to both the saved titles and the item list.
:::

`autoSelection()` sets the value passed to the query's `autoSelections()`.
Pass `false` to skip automatic column selection.

## Titles, Keys, and Images

The field reads three columns from each record. Set them with
`titleField()`, `keyField()`, and `imageField()`. The defaults are `title`,
`id`, and `image`. A key may include a table prefix, such as `events.id`;
the field uses only the part after the last dot to read the key from each
row.

```php
$form->add('owner_id', ModalField::class)
    ->route('user_list')
    ->table('users')
    ->titleField('name')
    ->keyField('id')
    ->imageField('avatar')
    ->hasImage(true);
```

`hasImage(true)` shows the image beside the title in both single and
multiple mode.

## Adding Extra Data to Items

Override `prepareItem()` in a subclass to pass more data to the template.
Each item keeps the keys `title`, `value`, and `image`, and you add your own
keys.

```php
use Unicorn\Field\ModalField;
use Windwalker\Data\Collection;

class EventModalField extends ModalField
{
    protected function prepareItem(Collection $item): array
    {
        $data = parent::prepareItem($item);

        // Extra key for the item template.
        $data['state'] = (bool) $item->state;

        return $data;
    }
}
```

Use the subclass in the form the same way as `ModalField`:

```php
$form->add('event_id', EventModalField::class)
    ->route('event_list')
    ->table('events');
```

::: info
Records added during the same session come from the picker payload, not from
`prepareItem()`. Add the same key to the payload in the list view, as shown in
[Item Payload](/documentation/unicorn/mvc-crud/mvc-admin/modal-list-view#item-payload).
Otherwise the new record will lack it until the form is reloaded.
:::

Use a custom template to display the extra key. Copy the default
`@theme::field.modal.modal-list` into your app's views and point the field
to it with `layout()`:

```php
$form->add('event_id', EventModalField::class)
    ->route('event_list')
    ->table('events')
    ->layout('field.modal.event-list');
```

## Customizing the Picker URL

`route()` builds the picker URL from a route name and adds the `modal`
layout. Use `url()` to set a full URL, and `configureUrl()` to change the
URL that `route()` built. The handler gets the URL and the field, and
returns the URL to use.

```php
$form->add('event_id', ModalField::class)
    ->route('event_list')
    ->table('events')
    ->configureUrl(function ($url, $field) {
        return $url->withVar('category', 'news');
    });
```

The field adds a `callback` parameter to the URL. Its value names the
function that receives the selection. By default it is unique per field.
Set `callback()` yourself only when your own script needs a known name.
See [Callback Names](/documentation/unicorn/mvc-crud/mvc-admin/modal-list-view#callback-names)
for the rules.

The picker needs a URL. Without `route()` or `url()`, the field throws:

```php
// ERROR: LogicException: No URL for field: ModalField,
// please provide a URL or route name
$form->add('event_id', ModalField::class)
    ->table('events');
```

::: info
The form accepts picker messages only from its own origin. A picker page
on another origin is ignored without an error.
:::

## Layout Options

Use these options to adjust the field's look. They do not change the stored
value.

```php
$form->add('related_events', ModalField::class)
    ->route('event_list')
    ->table('events')
    ->multiple(true)
    ->height(240)
    ->buttonText('Add events')
    ->placeholder('No events selected')
    ->modalHeight('90vh')
    ->titleClass('fw-bold');
```

- `height()` sets the list's maximum height in pixels, and the list scrolls
  beyond it. Without it, the list has no height limit.
- `modalHeight()` sets the dialog height. The default is `80vh`.
- `buttonText()` replaces the translated picker button label.
- `placeholder()` shows text in the picker bar, beside the button.
- `titleClass()` adds CSS classes to the title input in single mode.

With `required(true)`, the multiple list validates through a hidden input.
The input is enabled only while the list is empty, so an empty list fails
the check.

`multiCheck()` affects the list template only. The single-mode template
ignores it, although the field still adds `multiCheck=1` to the URL.

## Related

- [Modal List View](/documentation/unicorn/mvc-crud/mvc-admin/modal-list-view)
- [Iframe Modal](/documentation/unicorn/javascript-frontend/bootstrap-5/iframe-modal)
- [Empty Array Utilities](/documentation/unicorn/form-fields/form-utilities#empty-array-utilities)
