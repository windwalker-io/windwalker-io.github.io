---
layout: doc
title: Differences from Blade
part: Components
component: edge
---

# Differences from Blade

Edge keeps the Blade syntax for echoes, control structures, layouts,
stacks, and components, so most Blade templates read the same way. The
two engines are separate implementations, though. Edge has directives
that Blade does not have, it treats some directives differently, and it
does not implement the parts of Blade that depend on Laravel, such as
authentication and the session.

This page compares Edge with the Blade compiler in Laravel 13.x. Read it
when you port a template from Laravel, or when you write a template that
must work with both engines.

## Edge-Only Features

Edge adds these features on top of the Blade syntax:

- `@scope(...)` reads the named arguments that a component passes to a
  slot. See [Scoped Slots](/documentation/components/edge/components#scoped-slots).
- <code v-pre>{{ $value or 'default' }}</code> prints a fallback when the variable is not
  set. See [Template Syntax](/documentation/components/edge/syntax).
- `@js` encodes a value as base64 and emits a `JSON.parse(atob(...))`
  expression. See [Template Syntax](/documentation/components/edge/syntax).
- `renderWithContext()` binds `$this` in a template to an object of your
  choice. See [Extending Edge](/documentation/components/edge/extending).
- `renderEach()` renders a partial for each item in an array. Blade
  provides the same behavior through `@each`.
- The `#[Prop]` attribute declares which properties receive tag
  attributes in a class component. See
  [Components](/documentation/components/edge/components).

## Behavior That Differs

Some directives exist in both engines but behave differently. Check
these when you move a template between Blade and Edge.

### Escaping Quotes

Blade escapes output with the `e()` helper, which encodes single quotes
as well as double quotes. Edge's <code v-pre>{{ }}</code> encodes double quotes but not
single quotes.

::: warning
In Edge, never print a value inside a single-quoted HTML attribute.
Wrap every attribute in double quotes, or the value can close the
attribute early. Templates that work in Blade can be unsafe in Edge.
:::

### The `@json` Output

Blade prints the result of `json_encode()` without escaping. Edge escapes
it as HTML. The two engines therefore expect the directive in different
places:

- In Edge, use `@json` inside an attribute, for example
  `data-config="@json($config)"`.
- In Blade, use `@json` inside a `<script>` block.

::: warning
If you copy an `@json` call from a Blade `<script>` block into an Edge
template, the escaped quotes break the JavaScript. Use `@js` in Edge for
script values.
:::

### The `@js` Output

Blade's `@js` creates a `JSON.parse('...')` literal, or a plain string
literal for a string value. Edge always emits `JSON.parse(atob('...'))`
with a base64 payload. The rendered HTML differs, but the value that the
browser receives is the same.

### Loop Breaks and Continues

Blade accepts a number to break out of several nested loops. Edge does
not. In Edge, the argument of `@break` and `@continue` is treated as a
condition, so a number is a condition too.

::: warning
In Edge, `@break(2)` breaks the innermost loop, not two levels. Blade
breaks two levels. Nested loops that rely on the multi-level form render
different output in Edge without any error.
:::

Use an explicit condition in each loop instead. A flag variable stops the
outer loop, and `@continue` skips the rest of the outer iterations:

```blade
@php($stop = false)
@foreach ($groups as $group)
    @continue($stop)
    @foreach ($group as $item)
        @if ($item === 'stop')
            @php($stop = true)
            @break
        @endif
        {{ $item }}
    @endforeach
@endforeach
```

### The `$loop` Variable

Blade defines `$loop` inside `@foreach` and `@forelse`, with values such as
`$loop->index` and `$loop->first`. Edge does not define `$loop`. Use an
explicit index instead:

```blade
@foreach ($items as $i => $item)
    <li class="{{ $i === 0 ? 'first' : '' }}">{{ $item }}</li>
@endforeach
```

### Component Attributes

Blade binds tag attributes to the constructor parameters of a class
component. Edge binds them to the properties that carry the `#[Prop]`
attribute. Standalone, Edge passes the prop values to the constructor
as named arguments, so each prop also needs a matching constructor
parameter. See [Components](/documentation/components/edge/components).

### Compilation Cache

Blade writes compiled files to a cache path and compares a hash of the
output on every compile. The default `EdgeArrayCache` does not keep files
between requests, and it compiles each template again on every render.
Use `EdgeFileCache` for a production application. See
[Compiled Template Cache](/documentation/components/edge/cache).

### Echo Handlers

Blade lets you register a handler for an object class with
`stringable()`, so the handler decides how that object prints. Edge
does not have this feature. Convert the value in your data before
rendering, or call a method in the template.

## Blade Directives That Edge Does Not Provide

Edge does not implement the following directives from Laravel 13.x.
Each group lists the directives by purpose.

- Authentication and environment:
  - `@auth`, `@guest`, and their `@else` and `@end` forms
  - `@env` and `@production`
  - `@can`, `@cannot`, and `@canany`
- Errors, sessions, and context:
  - `@error`, `@session`, `@context`
  - `@fragment` and `@endfragment`
- Includes and components:
  - `@includeWhen`, `@includeUnless`, `@includeFirst`
  - `@includeIsolated`, `@extendsFirst`
  - `@componentFirst` and `@aware`
- Stacks and sections:
  - `@prepend` and `@prependOnce`
  - `@hasStack`, `@sectionMissing`, and `@isset`
- Injection and imports:
  - `@inject` and `@use`
- Translation:
  - `@lang` and `@choice`
- Helpers:
  - `@csrf`, `@method`, `@dd`, and `@dump`
  - `@vite`, `@viteReactRefresh`, and `@fonts`
  - `@style`

In a Windwalker application, Windwalker Core registers some of these
names for you, for example `@csrf`, `@can`, `@cannot`, `@lang`,
`@choice`, `@dump`, and `@dd`. Those directives belong to the Core
package, so they are not available when you use Edge on its own.

## Working Without a Missing Directive

Most missing directives have a plain PHP equivalent. Pass the value
through your data or a global variable, and use an ordinary condition:

```php
$edge->addGlobal('currentUser', $user);
```

```blade
@if ($currentUser !== null)
    <p>Hello, {{ $currentUser->name }}</p>
@endif
```

For a directive you use often, register your own directive with
`directive()`. See [Extending Edge](/documentation/components/edge/extending).
