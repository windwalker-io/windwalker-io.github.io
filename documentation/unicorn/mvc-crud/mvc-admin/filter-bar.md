---
layout: doc
title: Grid Filter Bar
description: Configure the filter bar of an admin list, including its search box, filter fields, slots, props, and the JavaScript behind it.
---

# Grid Filter Bar

The filter bar sits above an admin list. It holds a search box, a toggle for
the filter panel, a clear button, and the filter fields from the grid form.
The generated list prints it with one line, so you only add fields and
handlers for your data.

```blade
<x-filter-bar :form="$form" :open="$showFilters"></x-filter-bar>
```

## Where the Fields Come From

The bar reads the grid form. The generated `ProductGridForm` defines two
namespaces, and each one maps to a part of the bar:

- `search`: the search box. The field `*` is the text input, so its name is
  `search/*`.
- `filter`: the fields in the filter panel.

A field appears in the panel only when its namespace is `filter`. Add a
filter field by adding a method with `#[NS('filter')]`:

```php
// ProductGridForm.php
#[FormDefine]
#[NS('filter')]
public function filter(Form $form): void
{
    $form->add('product.state', ListField::class)
        ->label($this->trans('unicorn.field.state'))
        ->option($this->trans('unicorn.select.placeholder'), '')
        ->registerFromEnums(BasicState::class, $this->lang)
        ->onchange('this.form.submit()');

    $form->add('product.category_id', ListField::class)
        ->label('Category')
        ->option('Books', 1)
        ->option('Games', 2)
        ->onchange('this.form.submit()');
}
```

The `onchange('this.form.submit()')` call sends the form when the value
changes, so the list refreshes without a button.

::: warning
A filter field only changes the form. The list still needs a handler that
turns the value into a condition. Add one with `addFilterHandler()`, as
described in [Custom Filter Rules](./list-management#custom-filter-rules).
:::

## Layout of the Panel

The bar has two rows. The top row holds the toggle, clear, and search
controls. The panel below holds the filter fields:

![Filter Bar Layout](https://github.com/user-attachments/assets/be3844a3-c83b-4207-b0ec-7688232762df)

Fields without a fieldset print in the first group. A field in a fieldset
prints under the fieldset's title, and its label floats inside the input.
Declare a fieldset with `#[Fieldset]` and a title:

```php
#[FormDefine]
#[NS('filter')]
#[Fieldset('advanced', 'Advanced')]
public function advancedFilter(Form $form): void
{
    $form->add('start_date', TextField::class)
        ->label('Created from')
        ->attr('type', 'date')
        ->onchange('this.form.submit()');

    $form->add('end_date', TextField::class)
        ->label('Created to')
        ->attr('type', 'date')
        ->onchange('this.form.submit()');
}
```

The panel opens by itself when the list has active filters, so the user
sees the values that shape the list.

## Props and Slots

The component takes these props. Set them as attributes, using kebab-case
names:

```blade
{{-- Default: search, toggle, clear, and the filter panel --}}
<x-filter-bar :form="$form" :open="$showFilters"></x-filter-bar>

{{-- Keep the panel and buttons, but hide the search box --}}
<x-filter-bar :form="$form" :search-block="false"></x-filter-bar>

{{-- Hide the filter panel and its toggle button --}}
<x-filter-bar :form="$form" :filter-block="false"></x-filter-bar>

{{-- Replace the search box with your own HTML --}}
<x-filter-bar :form="$form" :search-block="$mySearch"></x-filter-bar>

{{-- Search a different field (it must be in the search namespace) --}}
<x-filter-bar :form="$form" search-input="search/product.title"
    size="sm">
</x-filter-bar>

{{-- Open the panel for this page --}}
<x-filter-bar :form="$form" :open="true"></x-filter-bar>

{{-- Bind the bar to another Alpine store named "list" --}}
<x-filter-bar :form="$form" store="list"></x-filter-bar>
```

The props have these effects:

- `open`: opens the panel on load. The generated list sets it from
  `$showFilters`.
- `search-block`: `null` by default. `false` hides the search box, and a
  string prints that HTML instead.
- `filter-block`: `null` by default. `false` hides the panel and the
  toggle. A string prints that HTML as the panel.
- `search-input`: the form field path for the search box. The default is
  `search/*`.
- `size`: `sm` or `lg` for the input group and buttons.
- `store`: the Alpine store that the bar's `x-data` reads.

Two slots add content to the top row:

```blade
<x-filter-bar :form="$form" :open="$showFilters">
    {{-- Left side, after the toggle and clear buttons --}}
    <x-slot name="start">
        <a href="{{ $nav->to('product_edit') }}"
            class="btn btn-primary">
            New Product
        </a>
    </x-slot>

    {{-- Right side of the top row --}}
    <x-slot name="end">
        <span class="text-muted">
            {{ $pagination->getTotal() }} items
        </span>
    </x-slot>
</x-filter-bar>
```

![](https://github.com/user-attachments/assets/1b09fce8-fb15-47cf-90f3-c968f07154d5)

The `start` and `end` slots print their content as HTML without escaping.
Escape any user-supplied value with `{{ }}` inside the slot, as the example
does with the pagination total.

::: info
If `filter-block` is a string, the toggle button still shows, and it opens
the custom HTML. The panel stays hidden until the user clicks it.
:::

## JavaScript Behavior

The bar uses the Alpine store `grid`, which `useGridComponent()` creates in
the generated list script. Its methods handle the toggle, the clear
button, and form submission:

- **Toggle**: the button flips `open`. A watcher calls
  `grid.toggleFilters()`, which slides the panel up or down.
- **Clear**: the button calls `$store.grid.clearFilters($refs.filterbar)`.
  It empties every input and select in the bar, then submits the form.
- **Search**: the search button submits the form, and so does pressing Enter
  in the search box.
- **Filter fields**: each `onchange` handler submits the form.

Use the store from your own buttons:

```blade
<button type="button"
    class="btn btn-outline-secondary"
    @click="$store.grid.sendFilter($event, 'GET')">
    Apply
</button>
```

::: warning
`clearFilters()` clears every input inside the bar. That includes the
search box and any input you put in the `start` or `end` slot. Keep inputs
that must survive a clear outside the bar.
:::

::: info
The clear button always reads `$store.grid`. The `store` prop changes only
the bar's own `x-data`, so renaming the store breaks the clear button.
:::

## Opening the Panel for Search Results

The generated list opens the panel only when a filter value is set. The
`isFiltered()` method accepts the search text too, so the panel can open
for a search:

```php
// ProductListView.php
$showFilters = $this->isFiltered($filter, $search['*'] ?? '');
```

::: tip
Pass the search text as the second argument. Otherwise a user who searches
for a product sees results but a closed filter panel.
:::

## Styling the Filter Bar

Unicorn does not ship CSS for the filter bar. It uses Bootstrap 5 utility
classes, so you style it with your own CSS or with a theme.

Pass extra classes or attributes to the component. They are added to the
root element, which already has `c-filter-bar` and `mb-4`:

```blade
<x-filter-bar :form="$form" :open="$showFilters"
    class="p-3 bg-light rounded my-filter-bar"
    id="product-filters">
</x-filter-bar>
```

To change the markup, override the layout in your `@theme` folder. Copy
`views/ui/bootstrap5/grid/filter-bar.blade.php` to
`views/theme/grid/filter-bar.blade.php`, then edit the copy. Unicorn's
`@filter-bar` alias then renders your file. For how theme folders work, see
[Theming](/documentation/unicorn/introduction/theming).

::: warning
Keep the Alpine attributes in the copied file: `x-data`, `x-init`, the
`x-ref` attributes (`filterbar` and `filterForm`), and the `$store.grid`
calls. Removing or renaming them breaks the toggle and the clear button.
:::

## Related

- [List Management](./list-management)
- [Custom Filter Rules](./list-management#custom-filter-rules)
- [Modal List View](./modal-list-view)
- [Advanced Grid Features](/documentation/guides/rad/advanced-grid)
