---
layout: doc
title: Components
part: Components
component: edge
---

# Components

A component is a reusable piece of UI that you call with an HTML-like
tag, such as `<x-alert type="warning">`. Components let you move a
button, card, or alert into one place and pass it attributes and slot
content, instead of copying markup into every page.

Edge supports three forms. They share the same tag syntax and differ in
where their logic lives:

- **Anonymous components** are view files with an optional `@props`
  list. No PHP class is needed.
- **Class components** are PHP classes that extend `AbstractComponent`.
  Their public properties and methods are available to the view.
- **Dynamic components** pick a component at runtime from an `is`
  attribute.

## Minimal Setup

Anonymous components need only a loader path. Create the component file
inside the path, then call it with an `<x-...>` tag. The dot in the name
maps to a directory:

```php
{{-- components/alert.blade.php --}}
<div class="alert">
    {{ $slot }}
</div>
```

```php
{{-- pages/home.blade.php --}}
<x-components.alert>
    Saved.
</x-components.alert>
```

Tag-based components need the `ComponentExtension`. Add it to the Edge
instance once:

```php
use Windwalker\Edge\Component\ComponentExtension;

$edge->addExtension(new ComponentExtension($edge));
```

## Showcase

The following example combines an anonymous component, a class
component, and a dynamic component. It renders end to end with the
`Edge` instance from the previous step:

```php
use Closure;
use Windwalker\Edge\Component\AbstractComponent;
use Windwalker\Utilities\Attributes\Prop;

class ButtonComponent extends AbstractComponent
{
    public function __construct(
        #[Prop]
        public string $label = 'Save',
    ) {
    }

    public function render(): Closure|string
    {
        return 'components.button';
    }
}

$ext = new ComponentExtension($edge);
$ext->registerComponent('button', ButtonComponent::class);
$edge->addExtension($ext);

echo $edge->render('pages.form');
```

```php
{{-- components/card.blade.php --}}
@props(['title' => 'Untitled'])

<section {!! $attributes->withMerge(['class' => 'card']) !!}>
    <h3>{{ $title }}</h3>
    {!! $slot() !!}
</section>
```

```php
{{-- components/button.blade.php --}}
<button type="button">{{ $label }}</button>
```

```php
{{-- pages/form.blade.php --}}
<x-components.card title="Profile" id="profile">
    <p>Update your details.</p>
    <x-button :label="'Submit'" />
</x-components.card>

<x-dynamic-component is="button" label="Cancel" />
```

## Anonymous Components

An anonymous component is a view file. Its `@props` directive declares
the attributes it accepts, with default values:

```php
@props(['type' => 'info', 'message' => 'Unknown'])

<div>{{ $type }}: {{ $message }}</div>
```

Attributes that are not declared in `@props` are collected in
`$attributes`. Call `withMerge()` to add default classes while keeping
the classes the caller passes:

```php
<div {!! $attributes->withMerge(['class' => 'alert']) !!}>
    {!! $slot() !!}
</div>
```

The slot is available as the callable `$slot()` in an anonymous
component. Content between the tags goes into the default slot. Named
slots use `<x-slot name="footer">`.

Bound attributes such as `:label="'Submit'"` are evaluated as PHP. Plain
attributes such as `label="Submit"` are passed as strings.

::: info
`$attributes->withMerge()` escapes the values it outputs by default.
Pass `false` as the second argument only for values that are already
safe HTML.
:::

## Class Components

A class component extends `AbstractComponent` and returns the view to
render from `render()`. The view can be a view name, or a `Closure`:

```php
use Closure;
use Windwalker\Edge\Component\AbstractComponent;

class AlertComponent extends AbstractComponent
{
    public string $level = 'info';

    public function render(): Closure|string
    {
        return 'components.alert';
    }
}
```

Every public property becomes a variable in the view. A public method
with no arguments is available as an invokable variable, so
<code v-pre>{{ $headline() }}</code> and <code v-pre>{{ $headline }}</code> both work. A public method
with arguments is available as a closure. Add a property to the
`$except` array to hide it from the view.

A tag attribute sets a property only when that property has the
`#[Prop]` attribute. The attribute name is the kebab-case form of the
property name, so `label` or `:label` fills `$label`, and `show-title`
fills `$showTitle`. Other attributes go to the view's `$attributes`.

Standalone, Edge creates the component with the prop values as named
constructor arguments. Declare each `#[Prop]` property as a promoted
constructor parameter, as shown below:

```php
use Windwalker\Utilities\Attributes\Prop;

class AlertComponent extends AbstractComponent
{
    public function __construct(
        #[Prop]
        public string $level = 'info',
    ) {
    }
}
```

Properties without `#[Prop]` keep their default value and are only
visible in the view. To hide a property completely, list it in
`$except`:

```php
class AlertComponent extends AbstractComponent
{
    protected array $except = ['secret'];

    public string $secret = 'hidden';
}
```

::: warning
Every public property and method of a class component is visible to
its view. Keep internal state `protected`, or list it in `$except`.
:::

Register class components by name. Use `registerComponent()` on the
`ComponentExtension`, then call the name in a tag:

```php
$ext->registerComponent('alert', AlertComponent::class);
```

```php
<x-alert level="warning">Check your input.</x-alert>
```

In a Windwalker application, a class component can also be declared with
the `EdgeComponent` attribute, described in
[Overview](/documentation/components/edge/).

## Dynamic Components

`<x-dynamic-component>` chooses its target from the `is` attribute at
render time. The value can be a registered component name, or the name
of a view that is used as an anonymous component:

```php
<x-dynamic-component is="alert" level="danger">
    Something failed.
</x-dynamic-component>

<x-dynamic-component is="components.card" title="Notes">
    Content for the card.
</x-dynamic-component>
```

Dynamic components are useful when the component to show comes from
data, such as a list of widget types that the database controls.

::: warning
The value of `is` selects which component or view is rendered. Never
pass user input directly into `is`. Choose from a fixed list of names
instead.
:::
