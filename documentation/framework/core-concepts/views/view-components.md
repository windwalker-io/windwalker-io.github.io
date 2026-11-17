---
layout: doc
---

# View Components

View components are reusable Edge fragments that you call as HTML tags,
such as `<x-address />`. A component is either a template alone
(anonymous component) or a PHP class that prepares data and then
renders a template (class component). The system is built on Edge; see
[Edge Templates](./edge-templates) for the base syntax. For a quick syntax lookup, see
[Edge Components](/documentation/components/edge/) and
[Components](/documentation/components/edge/components).

## Minimal Usage

Put a template under the `views` folder and call it with `<x-name>`:

```blade
{{-- views/components/badge.edge.php --}}
<span class="badge">{!! $slot ?? '' !!}</span>
```

```blade
<x-components.badge>New</x-components.badge>
```

A dotted tag name maps to a dotted view name, so `<x-components.badge>`
renders `components.badge`.

## Complete Example

This example uses a class component to format an address, with a
default slot for the street and a named slot for a label.

```php
// App\Component\AddressComponent.php
namespace App\Component;

use Windwalker\Core\Edge\Attribute\EdgeComponent;
use Windwalker\Edge\Component\AbstractComponent;
use Windwalker\Utilities\Attributes\Prop;

#[EdgeComponent('address')]
class AddressComponent extends AbstractComponent
{
    public function __construct(
        #[Prop] public string $city = '',
        #[Prop] public string $country = '',
    ) {
    }

    public function render(): string
    {
        return 'components.address';
    }
}
```

```blade
{{-- views/components/address.edge.php --}}
<address {!! $attributes !!}>
    @if (isset($label))
        <strong>{!! $label !!}</strong>
    @endif
    <div>{!! $slot ?? '' !!}</div>
    <div>{{ $city }}, {{ $country }}</div>
</address>
```

```blade
{{-- views/user.edge.php --}}
<x-address city="Taipei" country="Taiwan" class="card">
    <x-slot name="label">Home</x-slot>
    123 Main Street
</x-address>
```

The layout calls `<x-address>`, so the view can receive `$city`,
`$country`, `$slot`, `$label`, and `$attributes` without extra code.

## Where Templates Live

Component templates are ordinary Edge views under the `@root/views`
path configured in `renderer.paths`.

- A view name uses dots for folders, so `components.address` is
  `views/components/address.edge.php`.
- Both `.edge.php` and `.blade.php` extensions are accepted by the
  Edge renderer.

### Anonymous Components

A template without a PHP class is an anonymous component. Its view name
is the tag name, so no `#[EdgeComponent]` is needed.

```blade
{{-- views/components/alert.edge.php --}}
<div class="alert {{ $type ?? 'info' }}" {!! $attributes !!}>
    {!! $slot ?? '' !!}
</div>
```

```blade
<x-components.alert type="warning">Check the form.</x-components.alert>
```

Anonymous components suit markup that needs only attributes and slots.

### Single-Name Aliases

A template registered under a name that starts with `@` can be used as a
single-name component. The Edge compiler checks `@name` before the plain
view name, so `<x-foo />` renders the view registered as `@foo`.
Windwalker uses the same convention for its own `@messages` and `@csrf`
views, which the directives render with `$__edge->render('@messages')`.

```blade
<x-foo title="Saved" />
```

## Class Components

Create a class when the component needs to prepare data.

- Extend `Windwalker\Edge\Component\AbstractComponent`.
- Add `#[EdgeComponent('name')]` from
  `Windwalker\Core\Edge\Attribute\EdgeComponent`.
- Implement `render()` and return the view name as a string.

```php
#[EdgeComponent('card')]
class CardComponent extends AbstractComponent
{
    public string $title = 'Untitled';

    public function render(): string
    {
        return 'components.card';
    }
}
```

Public properties are passed to the template as variables.

Public methods that take no parameters are also available in the
template as variables. Other members are not exposed.

::: info
Component classes are found in the namespaces listed in
`renderer.edge.component_scans`. The default value in a new project is
`App\Component`.
:::

Windwalker caches the scan result. In debug mode, the cache is rebuilt
on every request, so a new class is picked up at once. Outside debug
mode, clear the renderer cache after you add a component class.

### Adding Scan Paths

Each entry in `renderer.edge.component_scans` is a namespace. The
finder reads every class in that namespace and keeps the classes with
`#[EdgeComponent]`. To add a namespace, edit the renderer config in
`etc/packages/renderer.config.php`:

```php
'edge' => [
    'component_scans' => [
        'App\\Component',
        'Acme\\Ui\\Component',
    ],
],
```

A package can ship its components under its own namespace. Add that
namespace to the list, and the tags become available everywhere.

::: warning
Scan only namespaces that contain components. Each scanned class is
loaded, so a large namespace slows down the cache build.
:::

### Registering Manually

Scanning finds classes with `#[EdgeComponent]`. To register a class under
a tag name without the attribute, call `registerComponent()` on the Edge
component extension with the tag name and the class name:

```php
$extension->registerComponent('address', AddressComponent::class);
```

The tag name maps to the class. It does not depend on the class name or
its namespace.

### Injecting Services

Class components are built by the container, so constructor parameters
with type hints are resolved from it. Use this to inject services or
repositories, such as `AssetService` or a repository for an entity.

```php
namespace App\Component;

use App\Repository\PostRepository;
use Windwalker\Core\Asset\AssetService;
use Windwalker\Core\Edge\Attribute\EdgeComponent;
use Windwalker\Edge\Component\AbstractComponent;
use Windwalker\Utilities\Attributes\Prop;

#[EdgeComponent('latest-posts')]
class LatestPostsComponent extends AbstractComponent
{
    #[Prop]
    public int $limit = 5;

    public array $posts = [];

    public function __construct(
        protected PostRepository $postRepository,
        protected AssetService $asset,
    ) {
    }

    public function render(): string
    {
        $this->posts = $this->postRepository->findLatest($this->limit);

        $this->asset->css('css/latest-posts.css');

        return 'components.latest-posts';
    }
}
```

::: info
Only type-hinted constructor parameters are injected. Use public
properties with `#[Prop]` for values that come from the tag.
:::

## Props and Attributes

Mark a public property with `#[Prop]` to receive a value from the tag.

```php
use Windwalker\Utilities\Attributes\Prop;

#[EdgeComponent('address')]
class AddressComponent extends AbstractComponent
{
    public function __construct(
        #[Prop] public string $id = '',
        #[Prop] public mixed $value = null,
    ) {
    }

    public function render(): string
    {
        return 'components.address';
    }
}
```

```blade
<x-address id="billing" :value="$addr" />
```

- Static attributes such as `id="billing"` pass a string.
- Attributes with a colon, such as `:value="$addr"`, pass a PHP
  expression.
- The tag attribute name is the kebab-case form of the property name,
  so `$componentName` is read from `component-name`.

Attributes that are not props stay in `$attributes`.

```blade
{{-- views/components/address.edge.php --}}
<div id="{{ $id }}" {!! $attributes !!}>
    {!! $value !!}
</div>
```

`$attributes` is a `ComponentAttributes` object. It prints as
`key="value"` pairs when you echo it, and it escapes values.

- `get('name')` and `has('name')` read one attribute.
- `only([...])` and `except([...])` filter the list.
- `class([...])` builds a class list from an array, such as
  `['btn' => $active]`. It returns a new object and leaves the original
  unchanged, so assign the result back.

```blade
@php
    $attributes = $attributes->class([
        'btn',
        'btn-active' => $active,
    ]);
@endphp

<button {!! $attributes !!}>
    {{ $label }}
</button>
```

```blade
<x-button label="Save" class="ms-2" :active="true" />
```

The caller's `ms-2` class is kept, and the output is
`class="btn btn-active ms-2"`.

::: tip
Always reassign: `$attributes = $attributes->class(...)`. Calling
`$attributes->class(...)` alone and discarding the result changes nothing.
:::

### Declaring Props in Template-Only Components

A component without a class has no `#[Prop]` properties. Every tag
attribute then arrives in `$attributes` and prints as an HTML attribute.
Declare the values you need at the top of the template with
`$attributes->propsValues(...)`. The call removes those values from the
bag, so they no longer print.

```blade
@php
    [$userName, $role] = $attributes->propsValues(
        'userName',
        role: 'guest',
    );
@endphp

<div {!! $attributes !!}>
    <span>{{ $userName }}</span>
    <em>{{ $role }}</em>
</div>
```

```blade
<x-user-card userName="Simon" class="card" />
```

- Names can be camelCase or kebab-case. `userName` and `user-name`
  both match the same tag attribute.
- A keyed argument such as `role: 'guest'` sets the default value.
- Without the declaration, `userName` prints as an attribute, and
  `:user="$entity"` prints as `user="[Object ...]"`.

::: tip
Declare every prop at the top of the template, before `$attributes`
is printed. Any attribute still in the bag at that point is printed.
:::

## Slots

Text between the tags fills the default slot. A named slot uses
`<x-slot name="...">`.

```blade
<x-address>
    <x-slot name="label">Home</x-slot>
    123 Main Street
</x-address>
```

Inside the template, each slot is a variable with the same name.

- `$slot` holds the default slot. It is `null` when the caller passes
  no content, so use `$slot ?? ''` or `@if ($slot)`.
- `$label` holds the `label` slot.
- Use `name="default"` to set the default slot explicitly.

Plain text between the tags becomes the default slot. A slot that
needs arguments must be declared with `<x-slot>` in the caller.

### Passing Values Into a Slot

The component can call the default slot with values. The caller reads
them with `@scope`. Only `<x-slot>` content can receive values.

```blade
{{-- views/components/list.edge.php --}}
<ul>
    @foreach ($items as $item)
        <li>
            {!! $slot?->__invoke(item: $item, index: $loop->index) !!}
        </li>
    @endforeach
</ul>
```

```blade
<x-components.list :items="$articles">
    <x-slot name="default">
        @scope($item, $index)
            {{ $index + 1 }}. {{ $item->title }}
        @endscope
    </x-slot>
</x-components.list>
```

::: info
Named arguments in the `__invoke()` call become the variables that
`@scope` reads. Use the same names on both sides.
:::

## Loading TS and SCSS

A component can load its own assets. Call `AssetService` in `render()`,
so the assets load only when the component appears on the page.

```blade
<?php
$asset->css('~/css/latest-posts.scss');
$asset->module('~/js/latest-posts.ts');

?>
<div>
    ...
```

Use the same paths as in [Asset Management](./asset-management). Keep
the component's `.ts` or `.scss` file beside its template when the
project's asset pipeline compiles it.

## Blade Macros

A template can carry its own script and style without a separate
file. Mark the block with `data-macro`, and the renderer handles it.

- `<style data-macro>` is removed from the output of the template.
- `<script lang="ts" data-macro="name">` is replaced by a call that
  loads the inline module named `inline:name`.
- Use `data-prop:name="..."` on the script tag to pass a PHP expression
  to the module as a property.

```blade
{{-- views/components/counter.edge.php --}}
<div class="counter" data-target="{{ $target }}"></div>

<script lang="ts" data-macro="counter"
    data-prop:target="$target">
    // TypeScript code for the counter
</script>
```

::: tip
Use a blade macro for small, template-specific behavior. Use a file in
`js` for code that more than one template shares.
:::

## Related

- [Edge Templates](./edge-templates): layouts, includes, and
  directives.
- [Renderer](./renderer): where templates are searched.
- [Views](./views): how view templates are rendered.

