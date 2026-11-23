---
layout: doc
title: Modal List View
description: Reuse an admin list as a record picker in a modal, with ModalField or with a standalone iframe modal.
---

# Modal List View

Forms often need to pick a record that lives in another list, such as a
category or a product. Building a second picker duplicates the list logic.
The generated list route can render a `modal` view instead. The picker then
keeps the same filters, search, and pagination as the admin list.

## How the Modal View Works

The generated list view maps the `modal` layout to a separate template:

```php
// {Name}ListView.php
#[ViewModel(
    layout: [
        'default' => 'product-list',
        'modal' => 'product-modal',
    ],
    js: 'product-list.ts'
)]
```

Add `layout=modal` to the list URL to render `{name}-modal`. The
`callback` query value names the function on the parent page that receives
the selection. The template reads it with `$app->input('callback')`.

## Item Payload

Each row is a link. A click sends an array to the parent window. The first
item is the callback name, and the second is the row payload:

```blade
@php($data = [
    'title' => $item->title,
    'value' => $item->id,
    'image' => $item->image,
])

<a href="javascript://"
    data-task="post-message"
    data-instance-id="{{ $callback }}"
    data-payload="@json($data)"
>
    {{ $item->title }}
</a>
```

The script in the template posts `[callback, payload]` to the parent. The
payload always has `title`, `value`, and `image` keys.

::: info
The modal view uses the same route and controller as the [admin list](/documentation/unicorn/mvc-crud/mvc-admin/list-management). It
has the same access rules and the same state and filters.
:::

## Using the Modal with ModalField

[ModalField](/documentation/unicorn/form-fields/field-types/modal-field)
builds the modal URL for you. It adds `layout=modal` and a `callback`
value, and it renders the picker button with `uni-modal-link` inside a
`<uni-iframe-modal>`.

```php
use Unicorn\Field\ModalField;

$form->add('product_id', ModalField::class)
    ->label('Product')
    ->route('product_list')
    ->table('products')
    ->titleField('title')
    ->keyField('id');
```

[ModalField](/documentation/unicorn/form-fields/field-types/modal-field)
lists every option, such as `multiple()`, `max()`, and `sortable()`.

When the user clicks a row, the form script fills the title and the value
inputs and closes the modal. You do not write a message listener for this
case.

## Using the Modal Without ModalField

You can open the modal view from any page, without a form field. Build the
URL with the `modal` layout and a unique `callback` name:

```blade
@php($pickUrl = $nav->to('product_list')
    ->layout('modal')
    ->withVar('callback', 'pickProduct'))

<a href="{{ $pickUrl }}"
    class="btn btn-primary"
    uni-modal-link="#product-modal"
    data-size="modal-xl"
>
    Pick a product
</a>

<uni-iframe-modal id="product-modal"></uni-iframe-modal>
```

Load the iframe modal module on the page. In a Blade view, call
`$app->service(BootstrapScript::class)->iframeModal()`, as the ModalField
template does. For plain HTML pages, see the
[Iframe Modal](/documentation/unicorn/javascript-frontend/bootstrap-5/iframe-modal) page.

The parent page listens for the message. Check the origin and the callback
name before you use the payload:

```js
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) {
    return;
  }

  if (!Array.isArray(e.data) || e.data[0] !== 'pickProduct') {
    return;
  }

  const product = e.data[1];

  // product = { title, value, image }
  document.querySelector('#product-id').value = product.value;

  document.querySelector('#product-modal').close();
});
```

Each picker needs its own callback name. See
[Callback Names](#callback-names) for the rules.

## Selecting with Checkboxes

Call `multiCheck(true)` together with `multiple(true)` on the field. The
field then adds `multiCheck=1` and the selected keys, as a comma-separated
list, to the picker URL. Without `multiCheck`, each row stays a link that
sends one record.

The list view renders a checkbox in place of the link. The `$data` array is
the payload from [Item Payload](#item-payload):

```blade
@php($multiCheck = (bool) $app->input('multiCheck'))
@php($selected = explode(',', (string) $app->input('selected')))

@if ($multiCheck)
    <input type="checkbox" class="form-check-input"
        data-task="select-row"
        data-instance-id="{{ $callback }}"
        data-payload="@json($data)"
        @attr('checked', in_array($item->id, $selected))
    />
@endif
```

A script in the list view sends a `select-row` message on each change. The
field adds the record when `checked` is `true`, and removes it otherwise:

```html
<script type="text/javascript">
    const selector = '[data-task="select-row"]';

    for (const el of document.querySelectorAll(selector)) {
        el.addEventListener('change', () => {
            parent.postMessage({
                task: 'select-row',
                checked: el.checked,
                id: el.dataset.instanceId,
                value: JSON.parse(el.dataset.payload)
            }, '{{ $uri->root() }}');
        });
    }
</script>
```

## Limiting Selections with max()

The field enforces `max()` in the browser. When the limit is reached, the
picker does not open, and a checkbox beyond the limit is rejected. The field
then sends a `remove-row` message. The list view must uncheck that box, so
add this listener to the same script:

```html
<script type="text/javascript">
    parent.addEventListener('message', (event) => {
        if (event.data?.task === 'remove-row') {
            const el = document.querySelector(
                `input[value="${event.data.value.value}"]`
            );

            if (el && event.data.id === el.dataset.instanceId) {
                el.checked = false;
            }
        }
    });
</script>
```

The server does not check the limit. See
[ModalField](/documentation/unicorn/form-fields/field-types/modal-field#limiting-selections-with-max)
for details.

## Callback Names

The field names each selection callback in the picker URL. By default the
name is unique per field. Set `callback()` on the field only when your own
script needs a known name.

::: warning
Two pickers on the same page must not share a callback name. The parent
matches each message by name, so both pickers would receive each other's
selections.
:::

## Related

- [ModalField](/documentation/unicorn/form-fields/field-types/modal-field)
- [Iframe Modal](/documentation/unicorn/javascript-frontend/bootstrap-5/iframe-modal)
- [List Management](./list-management)
- [Form Management](./form-management)
