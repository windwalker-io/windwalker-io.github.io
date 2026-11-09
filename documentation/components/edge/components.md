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

```blade
{{-- components/alert.blade.php --}}
<div class="alert">
    {{ $slot }}
</div>
```

```blade
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

```blade
{{-- components/card.blade.php --}}
@props(['title' => 'Untitled'])

<section {!! $attributes->withMerge(['class' => 'card']) !!}>
    <h3>{{ $title }}</h3>
    {!! $slot() !!}
</section>
```

```blade
{{-- components/button.blade.php --}}
<button type="button">{{ $label }}</button>
```

```blade
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

```blade
@props(['type' => 'info', 'message' => 'Unknown'])

<div>{{ $type }}: {{ $message }}</div>
```

Attributes that are not declared in `@props` are collected in
`$attributes`. Call `withMerge()` to add default classes while keeping
the classes the caller passes:

```blade
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

### Reading Props from Attributes

`props()` takes the names of the values that the view expects and
removes them from `$attributes`. Print the remaining attributes after
calling it, so that the prop names do not appear in the HTML:

```blade
<?php

$props = $attributes->props('item', 'open');
$item = $props['item'] ?? null;
$open = $props['open'] ?? false;
$attributes = $attributes->class('my-new-class');

?>
<div data-open="{{ $open ? '1' : '0' }}" {!! $attributes !!}>
    {{ $item }}
</div>
```

The caller passes the values with bound attributes:

```blade
<x-components.address :item="'Taipei'" :open="true" id="c-addr" />
```

::: info
The keys of the collection returned by `props()` use the kebab-case form
of the names, so a prop named `openState` is read with `$props['open-state']`.
:::

### Optional Slots

A slot that the caller does not pass is not defined in the view. Check a
named slot with `??` before you call it:

```blade
<section {!! $attributes !!}>
    {!! $slot() !!}

    @if ($footer ?? null)
        <footer>{!! $footer() !!}</footer>
    @endif
</section>
```

The caller adds the named slot with `<x-slot>`:

```blade
<x-components.card>
    Body
    <x-slot name="footer">Footer text</x-slot>
</x-components.card>
```

### Declaring View Variables

Add a docblock at the top of a view that lists the variables it uses.
The docblock does not run, but it tells readers and the IDE which
variables are available:

```blade
<?php

/**
 * @var ComponentAttributes $attributes
 * @var string              $item
 * @var bool                $open
 */
```

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

Every public property becomes a variable in the view. Public methods are
available to the view too, as described in
[Calling Public Methods](#calling-public-methods). Add a property to the
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

### Calling Public Methods

Public methods of a class component are passed to the view as variables.
How the view calls a method depends on whether it takes arguments.

A method without arguments can be called with parentheses, or printed as a
variable. Both forms return the same value:

```php
public function headline(): string
{
    return strtoupper($this->title);
}
```

```blade
<h1>{{ $headline() }}</h1>
<h1>{{ $headline }}</h1>
```

A method with arguments is passed as a closure. Call it with the arguments
that the view needs:

```php
public function greet(string $who): string
{
    return "Hi $who";
}
```

```blade
<p>{{ $greet('Simon') }}</p>
```

::: tip
Each call runs the method again. If the view uses the same result several
times, store it in a variable first, for example `@php($title = $headline())`.
:::

### Computed Properties

PHP 8.4 property hooks let a public property compute its value when it is
read. In this example, `fullName` combines two props. The view receives the
computed value like any other property, and nothing is stored in the component:

```php
use Closure;
use Windwalker\Edge\Component\AbstractComponent;
use Windwalker\Utilities\Attributes\Prop;

class UserNameComponent extends AbstractComponent
{
    public function __construct(
        #[Prop]
        public string $firstName = '',
        #[Prop]
        public string $lastName = '',
    ) {
    }

    public string $fullName {
        get => trim("$this->firstName $this->lastName");
    }

    public function render(): Closure|string
    {
        return 'components.user-name';
    }
}
```

```blade
<p>{{ $fullName }}</p>
```

The caller passes the props as attributes. Kebab-case attributes map to the
camel-case props:

```blade
<x-user-name first-name="Simon" last-name="Wang" />
```

Edge reads the public properties once, when it builds the data for the view.
A computed property therefore gives the view a snapshot of its value at that
moment. If the component changes during rendering, the view does not see the
new value.

If a value must change while the view renders, use a public method instead.
A method runs each time the view calls it, so it returns the current state:

```php
public function label(): string
{
    return "Total: {$this->amount} TWD";
}
```

```blade
<p>{{ $label() }}</p>
```

Keep computed properties for values that depend on props and do not change
during rendering. Keep the getter free of side effects and expensive queries.

### Adding Data

Override `data()` when a value must be computed before the view renders.
Assign the value to a public property, then return `parent::data()`, so
that the property reaches the view:

```php
class AddressComponent extends AbstractComponent
{
    public array $address = [];

    public function data(): array
    {
        $this->address = ['city' => 'Taipei'];

        return parent::data();
    }
}
```

In a Windwalker application, services that load data are usuallyinjected into the constructor. See the [Overview](/documentation/components/edge/)
for that setup.

### Inline Templates

`render()` can return a `Closure` that returns the template text instead
of a view name. The template is compiled like a view file, so it can use
the public properties of the component:

```php
public function render(): Closure|string
{
    return fn() => '<p>{{ $address["city"] }}</p>';
}
```

Register class components by name. Use `registerComponent()` on the
`ComponentExtension`, then call the name in a tag:

```php
$ext->registerComponent('alert', AlertComponent::class);
```

A name can also point to a view file instead of a class. Tags with that
name render the view as an anonymous component:

```php
$ext->registerComponent('address', 'components.address');
```

```blade
<x-address :item="'Taipei'" />
```

```blade
<x-alert level="warning">Check your input.</x-alert>
```

In a Windwalker application, a class component can also be declared with
the `EdgeComponent` attribute, described in
[Overview](/documentation/components/edge/).

## Scoped Slots

A slot can receive values from the component that renders it. The
component passes named arguments when it calls the slot, and the slot
reads them with `@scope`. The variable names in `@scope` must match the
argument names:

```blade
{{-- components/row.blade.php --}}
<ul>
    {!! $item(user: 'Simon', role: 'admin') !!}
</ul>
```

```blade
{{-- pages/list.blade.php --}}
<x-components.row>
    <x-slot name="item">
        @scope($user, $role)
        <li>{{ $user }} ({{ $role }})</li>
    </x-slot>
</x-components.row>
```

Rendering the page outputs `<li>Simon (admin)</li>` inside the list.
The `<x-slot>` tag names the slot, and `@scope` is the only directive in
this example. It is specific to Edge. Blade does not have an equivalent
directive. See [Differences from Blade](/documentation/components/edge/blade-differences).

## Designing Props

A component should receive the data it uses, and nothing more. The
caller decides which record to pass, so the component does not query
for data that it does not display. For example, a product card that
shows one variant should declare that variant as a prop, and not a list
of all variants:

```php
#[EdgeComponent('product-card')]
class ProductCardComponent extends AbstractComponent
{
    public function __construct(
        #[Prop]
        public Product $item,
        #[Prop]
        public ProductVariant $variant,
    ) {
    }
}
```

```blade
<x-product-card :item="$product" :variant="$product->variants[0]" />
```

Declaring only the values that the view uses keeps the component easy to
reuse and makes its interface clear to the developer who calls it.

## Dynamic Components

`<x-dynamic-component>` chooses its target from the `is` attribute at
render time. The value can be a registered component name, or the name
of a view that is used as an anonymous component:

```blade
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
