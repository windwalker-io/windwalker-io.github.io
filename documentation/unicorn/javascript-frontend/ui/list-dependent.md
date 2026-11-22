---
layout: doc
title: ListDependent
description: Fill a select list with options that depend on another select.
---

# ListDependent

A select list often depends on another select. A country choice decides
which cities appear in the next list. `ListDependent` watches the controlling
select, loads the matching options, and replaces the options of the dependent
list. The options come from a URL that returns JSON or from local data.

## Enabling ListDependent

Import `useListDependent` and call it with the dependent select, the
controlling select, and a data source:

```ts
import { useListDependent } from '@windwalker-io/unicorn-next';

await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
  },
});
```

Without `ajax.url` or `source`, the list does not load any options.

## Complete Example

The following page has a country select and a city select. Choosing a country
loads its cities from the server.

```html
<label for="country">Country</label>
<select id="country">
  <option value="">Select a country</option>
  <option value="1">Japan</option>
  <option value="2">Taiwan</option>
</select>

<label for="city">City</label>
<select id="city" name="city_id"></select>
```

```ts
import { useListDependent } from '@windwalker-io/unicorn-next';

await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
    value_field: 'country_id',
    data: {
      lang: 'en',
    },
  },
  text_field: 'name',
  value_field: 'id',
  first_option: {
    id: '',
    name: 'Select a city',
  },
  default_value: 10,
});
```

On page load, the list requests the cities for the current country value.
When the country changes, the list requests again. The browser sends:

```text
GET /api/cities?country_id=1&lang=en
```

The server returns a `success` flag and a `data` list:

```json
{
  "success": true,
  "data": [
    { "id": 10, "name": "Tokyo" },
    { "id": 11, "name": "Osaka" }
  ]
}
```

The list then renders the following options. The `first_option` appears
first, and `default_value` selects Tokyo:

```html
<select id="city" name="city_id">
  <option value="">Select a city</option>
  <option value="10" selected="selected">Tokyo</option>
  <option value="11">Osaka</option>
</select>
```

## Dependent Select

The first argument is the list to fill. It accepts a selector or an
`HTMLSelectElement`. The second argument is the controlling select, which
also accepts a selector or an element.

If you omit the second argument, the list reads the selector from its
`data-dependent` attribute:

```html
<select id="city" data-dependent="#country"></select>
```

```ts
await useListDependent('#city', undefined, {
  ajax: {
    url: '/api/cities',
  },
});
```

Each list keeps one instance per element. Calling `useListDependent()` again
for the same element returns the existing instance, and the new options are
ignored.

## Loading from a URL

Set `ajax.url` to load options with a GET request. The URL can be a string or
a function that returns a string:

```ts
await useListDependent('#city', '#country', {
  ajax: {
    // A string URL.
    url: '/api/cities',
  },
});

await useListDependent('#district', '#city', {
  ajax: {
    // A function that builds the URL at request time.
    url: () => document.body.dataset.apiBase + '/districts',
    value_field: 'city_id',
  },
});
```

The value of the controlling select is sent as a query parameter. Its name is
`ajax.value_field`, which defaults to `value`.

Use `ajax.data` to send more parameters with every request. It accepts an
object or a function. A function receives the current parameters and the
instance, and must return the parameters to send:

```ts
await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
    // A static object.
    data: {
      lang: 'en',
    },
  },
});

await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
    // A function. Return the value field too.
    data: (data, self) => ({ ...data, lang: 'en' }),
  },
});
```

When the controlling select has no value, the server receives the empty
mark instead:

```text
GET /api/cities?country_id=__EMPTY__
```

::: tip
Return an empty list for `__EMPTY__`. The mark is set by the `empty_mark`
option.
:::

The response must be an object with `success` and `data`. When `success` is
false, the library logs `data` to the console and leaves the current options
unchanged:

```jsonc
// ERROR: console.error(data) runs; options stay unchanged.
{ "success": false, "data": "Country not found" }
```

A failed request, such as a network error, is also logged to the console.
The current options stay in place.

::: warning
The browser sends the value of the controlling select, and any user can
change it. Validate the parameter on the server. Return only the rows the
current user may read.
:::

## Loading from Local Data

Set `source` to an object when the options are already on the page. Each key
is a value of the controlling select. Each value is the list for that key:

```ts
await useListDependent('#size', '#type', {
  source: {
    shirt: [
      { id: 'S', title: 'Small' },
      { id: 'M', title: 'Medium' },
    ],
    shoes: [
      { id: '42', title: '42' },
      { id: '43', title: '43' },
    ],
  },
});
```

For an empty controlling value, the key is `__EMPTY__`. A value without a
matching key clears the list. The library logs a message to the console for
that case, except during the initial load.

If `ajax.url` is set, the library uses it and ignores `source`.

## Option Text, Value, and Attributes

`text_field` and `value_field` name the fields of each item. They default to
`title` and `id`. The following example maps `name` and `code` from the
response:

```ts
await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
    value_field: 'country_id',
  },
  // Text shown in each option.
  text_field: 'name',
  // Value stored in each option.
  value_field: 'code',
});
```

Each item can carry an `attributes` object. Its keys become attributes of the
`<option>` element:

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "name": "Tokyo",
      "attributes": { "data-timezone": "Asia/Tokyo" }
    }
  ]
}
```

```html
<option value="10" data-timezone="Asia/Tokyo">Tokyo</option>
```

The response can be grouped by an object of lists. Each key becomes an
`<optgroup>` label:

```json
{
  "success": true,
  "data": {
    "Asia": [{ "id": 10, "name": "Tokyo" }],
    "Europe": [{ "id": 20, "name": "Paris" }]
  }
}
```

```html
<optgroup label="Asia">
  <option value="10">Tokyo</option>
</optgroup>
```

::: info
`first_option` is added only to flat lists. It is not added to grouped data.
:::

## Preselected Values

`default_value` selects options whose value matches. It accepts a single
value, an array, an object whose keys are values, or a function:

```ts
await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
  },
  // A single value.
  default_value: 10,
});

await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
  },
  // An array of values, for a multiple select.
  default_value: [10, 11],
});

await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
  },
  // Preselect Tokyo only when Japan is selected.
  default_value: (value, self) => (
    self.dependent.value === '1' ? 10 : null
  ),
});
```

A `data-selected` attribute on the list overrides `default_value`. This is
useful when the server renders the selected value into the page:

```html
<select id="city" data-selected="10"></select>
```

::: info
The comparison is strict. The `data-selected` value is a string, so the
option is selected only when the response uses a string value, such as
`"10"`. A number such as `10` does not match it.
:::

## Initial Load

By default, the list loads its options when the page starts, using the current
value of the controlling select. The load replaces any options the server
rendered.

To keep the rendered options until the user changes the controlling select,
set `initial_load` to `false`:

```ts
await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
  },
  initial_load: false,
});
```

## Hooks

The `hooks` option runs code before and after each update. The hooks receive
the value, the list element, and the controlling select. Both URL and local
data updates call them.

```ts
await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
    value_field: 'country_id',
  },
  hooks: {
    before_request: function (value, element, dependent) {
      element.classList.add('is-loading');
    },
    after_request: function (value, element, dependent) {
      element.classList.remove('is-loading');
    },
  },
});
```

The library calls the hooks with `this` set to the instance. Use a regular
function if you need `this`. The after hook runs when the request ends,
including when it fails.

## Manual Updates and Cancellation

`useListDependent()` resolves to the instance. Use it to reload the list or
cancel a pending request:

```ts
const city = await useListDependent('#city', '#country', {
  ajax: {
    url: '/api/cities',
    value_field: 'country_id',
  },
});

const country = document.querySelector<HTMLSelectElement>('#country')!;

// Load the options for a given value.
city.changeList(country.value);

// Cancel the pending request.
city.abort();
```

`changeList()` takes the value as its first argument. An empty value falls
back to the current value of the controlling select.

## Events and Chained Lists

After the options change, the list fires two events on its element: `change`
and `list:updated`. Listen to `list:updated` when you need to know that the
options are ready.

```ts
const city = document.querySelector<HTMLSelectElement>('#city')!;

city.addEventListener('list:updated', () => {
  console.log('Cities loaded.');
});
```

Because the list fires `change`, another `ListDependent` can depend on it. The
following list reloads when the city changes:

```ts
await useListDependent('#district', '#city', {
  ajax: {
    url: '/api/districts',
    value_field: 'city_id',
  },
});
```

## Using the Attribute Directive

The module also registers a `uni-list-dependent` attribute. Its value is a
JSON object with the same options. Call `useListDependent()` without
arguments once on the page to register the directive:

```ts
import { useListDependent } from '@windwalker-io/unicorn-next';

await useListDependent();
```

```html
<select
  id="city"
  uni-list-dependent='{
    "dependent": "#country",
    "ajax": { "url": "/api/cities", "value_field": "country_id" },
    "text_field": "name"
  }'
></select>
```

The `dependent` key replaces the second argument of the function form.

## Options Reference

The following code shows every option. Defaults appear where they matter:

```ts
await useListDependent('#city', '#country', {
  ajax: {
    // A string or a function. Set it to load from a URL.
    url: null,
    // Query parameter that carries the controlling value.
    value_field: 'value',
    // Object or function of extra query parameters.
    data: {},
  },
  // Local data keyed by the controlling value. Used when no ajax.url.
  source: undefined,
  // Item field used as option text.
  text_field: 'title',
  // Item field used as option value.
  value_field: 'id',
  // Option prepended to flat lists.
  first_option: undefined,
  // Preselected value, array, object, or function.
  default_value: null,
  // Load options when the page starts.
  initial_load: true,
  // Value sent or looked up when the controlling value is empty.
  empty_mark: '__EMPTY__',
  hooks: {
    // Called with (value, element, dependent) before each update.
    before_request: () => {},
    // Called with (value, element, dependent) after each update.
    after_request: () => {},
  },
});
```
