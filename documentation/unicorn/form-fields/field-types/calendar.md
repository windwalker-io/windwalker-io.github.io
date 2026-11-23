---
layout: doc
title: Calendar
description: Calendar field page for Windwalker Unicorn.
---

# Calendar

Date and time values are easy to mistype, and they must match the format the
server stores. `CalendarField` shows a [Flatpickr](https://flatpickr.js.org/) picker on a text input. It
formats the value for display and converts the saved value to the server
timezone.

Unicorn's [field generation](../field-generation) uses this field for
`datetime` and `timestamp` columns.

## Enabling the Field

Add the field with `CalendarField::class`. The defaults give a date and time
picker that saves `Y-m-d H:i:S` values.

```php
use Unicorn\Field\CalendarField;

$form->add('publish_up', CalendarField::class)
    ->label('Publish Up');
```

The toggle and clear buttons appear only when the field can be modified.
Disabled and readonly fields show the input alone.

## Complete Example

The form below has a date and time field and a date-only field. The date-only
field has a minimum date for the picker.

```php
use Unicorn\Field\CalendarField;
use Windwalker\Form\Attributes\FormDefine;
use Windwalker\Form\Attributes\NS;
use Windwalker\Form\Form;

#[FormDefine]
#[NS('article')]
public function main(Form $form): void
{
    // Date and time, converted to the server timezone on save.
    $form->add('publish_up', CalendarField::class)
        ->label('Publish Up');

    // Date only: no time picker, and no timezone conversion.
    $form->add('expire_on', CalendarField::class)
        ->label('Expire On')
        ->enableTime(false)
        ->format(CalendarField::FORMAT_DATE)
        ->convertTimezone(false)
        ->calendarOptions([
            'minDate' => 'today',
        ]);
}
```

If the application timezone is Asia/Taipei and the server stores UTC, a value
picked as `2026-11-23 16:42:00` is saved as `2026-11-23 08:42:00`. Clearing
the input saves `null`.

## Formats

`format()` sets the format of the input text. Use the `FORMAT_*` constants of
the class:

```php
use Unicorn\Field\CalendarField;

// Date and time, down to seconds. This is the default.
$form->add('starts_at', CalendarField::class)
    ->format(CalendarField::FORMAT_DATETIME_FULL);

// Date and time, down to minutes.
$form->add('ends_at', CalendarField::class)
    ->format(CalendarField::FORMAT_DATETIME_MINUTE)
    ->calendarOptions([
        'enableSeconds' => false,
    ]);

// Date only.
$form->add('birthday', CalendarField::class)
    ->enableTime(false)
    ->format(CalendarField::FORMAT_DATE);
```

::: tip
Call `format()` together with `enableTime(false)` every time. Use
`CalendarField::FORMAT_DATE` for date-only values.
:::

## Timezone Conversion

The picker shows the saved value in the application timezone. On save, the
field converts the typed value to the server timezone with
`ChronosService::toServer()`. The conversion applies to every value, so
the field can convert a value that has no time part.

::: warning
For a date-only, month, or time-only value, call `convertTimezone(false)`.
Otherwise the saved date or time can shift.
:::

Use `convertTimezone(false)` when the value is not a point in time, such as
a birthday. The field then saves the text as typed.

On read, the field converts the stored value to the user timezone and shows
it in the input. The field timezone from `timezone()` is used when set, and
the Chronos timezone otherwise. On save, `prepareStore()` converts the typed
value to the server timezone.

Do not write a value that is already in the user timezone into the field by
hand. The next save converts it again, and the time shifts on every save. When
you assign a value in code, turn the automatic conversion off first:

```php
$form->add('starts_at', CalendarField::class)
    ->convertTimezone(false);
```

## Month and Time-Only Pickers

`monthSelect()` switches the picker to the Flatpickr month plugin. `noCalendar()`
hides the calendar and shows a time picker only.

```php
use Unicorn\Field\CalendarField;

// Month picker. Saves year and month.
$form->add('billing_month', CalendarField::class)
    ->monthSelect(true)
    ->convertTimezone(false);

// Time only. Saves the time text as typed.
$form->add('opens_at', CalendarField::class)
    ->noCalendar(true)
    ->format('H:i')
    ->calendarOptions([
        'enableSeconds' => false,
    ])
    ->convertTimezone(false);
```

## Calendar Options

`calendarOptions()` merges Flatpickr options into the field's defaults. A key
you pass replaces the default with the same name.

```php
use Unicorn\Field\CalendarField;

$form->add('travel_date', CalendarField::class)
    ->enableTime(false)
    ->format(CalendarField::FORMAT_DATE)
    ->convertTimezone(false)
    ->calendarOptions([
        'minDate' => 'today',
        'maxDate' => '2030-12-31',
    ]);
```

The picker follows the application locale when Flatpickr has a matching
locale file.

The date range applies only in the browser. Check the range on the server
when the value matters.

## Accessing the Picker in JavaScript

Windwalker use a custom element named `<uni-flatpickr>` to wrap the input. The element
exposes the Flatpickr instance as its `instance` property, so you can open
the picker or set a date with the Flatpickr API:

```js
// Select the element of your field, for example by its id.
const picker = document.querySelector(
    'uni-flatpickr#input-article-publish_up'
);

picker.instance.open();
picker.instance.setDate('2026-12-01', true);
```

::: info
The `instance` property is set after the element connects and its options
load. Read it in an event handler, not at the start of the script.
:::

## Options Reference

`CalendarField` provides the following methods for configuring the picker.

| Method | Description | Default |
| --- | --- | --- |
| `calendarOptions()` | Sets extra options merged into the picker configuration. | — |
| `getCalendarOptions()` | Returns the extra picker options. | — |
| `from()` | Sets the earliest selectable date. | — |
| `getFrom()` | Returns the earliest selectable date. | — |
| `to()` | Sets the latest selectable date. | — |
| `getTo()` | Returns the latest selectable date. | — |
| `format()` | Sets the date format of the picker and the value. | `Y-m-d H:i:S` |
| `getFormat()` | Returns the date format. | — |
| `enableTime()` | Shows or hides the time selection. | `true` |
| `getEnableTime()` | Returns whether time selection is enabled. | — |
| `monthSelect()` | Enables month-only selection. | — |
| `getMonthSelect()` | Returns whether month selection is enabled. | — |
| `timezone()` | Sets the timezone used for display and conversion. | — |
| `getTimezone()` | Returns the timezone set on the field. | — |
| `noCalendar()` | Hides the calendar and shows only the time picker. | — |
| `getNoCalendar()` | Returns whether the calendar is hidden. | — |
| `convertTimezone()` | Set to `false` to skip timezone conversion of the value. | — |
| `getConvertTimezone()` | Returns whether timezone conversion is enabled. | — |

Common form field methods such as `label()`, `required()`, and `disabled()` also work.

## Related

- [Field Generation](../field-generation)
- [Form Utilities](/documentation/unicorn/form-fields/form-utilities)
- [ColorPicker](./color-picker)
