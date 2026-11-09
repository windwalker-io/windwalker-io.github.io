---
layout: doc
title: Layouts, Sections, and Stacks
part: Components
component: edge
---

# Layouts, Sections, and Stacks

Most pages share the same outer frame: a header, a navigation area, and
a footer. Repeating that markup in every template makes changes slow and
error-prone. Edge solves this with layout inheritance. A master layout
defines the frame and named *sections*. Child templates extend the
layout and fill those sections with their own content.

Stacks solve a related problem. A page body may need a script or
stylesheet that belongs in the `<head>` or at the bottom of the layout.
A child template can *push* content onto a named stack, and the layout
prints the stack where it needs it.

## Minimal Setup

A layout uses `@yield` to mark a place that children can fill. A child
uses `@extends` to name its layout and `@section` to provide content:

```php
{{-- layouts/master.blade.php --}}
<html>
<head>
    <title>@yield('title', 'My Site')</title>
</head>
<body>
    @yield('content')
</body>
</html>
```

```php
{{-- pages/home.blade.php --}}
@extends('layouts.master')

@section('title', 'Home')

@section('content')
    <h1>Welcome</h1>
@endsection
```

Dots in `layouts.master` map to directories, as described in
[Loaders](/documentation/components/edge/loaders).

## Showcase

The following example builds a page with a shared frame, a default
sidebar, and a page-specific script. It renders end to end when the
loader points at the directory that contains the `layouts` and `pages`
folders:

```php
$html = $edge->render('pages.dashboard', [
    'user' => ['name' => 'Simon'],
]);
```

```php
{{-- layouts/master.blade.php --}}
<html>
<head>
    <title>@yield('title', 'Admin')</title>
    @stack('scripts')
</head>
<body>
@section('sidebar')
    <nav>Default navigation</nav>
@show

<main>
    @yield('content')
</main>

@stack('bottom')
</body>
</html>
```

```php
{{-- pages/dashboard.blade.php --}}
@extends('layouts.master')

@section('title', 'Dashboard')

@section('sidebar')
    @parent
    <p>Signed in as {{ $user['name'] }}</p>
@endsection

@section('content')
    <h1>Dashboard</h1>
@endsection

@push('scripts')
    <script src="/js/dashboard.js"></script>
@endpush
```

The `sidebar` section is defined in the layout with `@show`. The child
overrides it and calls `@parent` to keep the layout's default content
before its own.

## Sections

- `@section('name', 'value')` sets a short section inline.
- `@section('name')` opens a block that ends with `@endsection` or
  `@stop`.
- `@yield('name', 'default')` prints a section in the layout. The
  second argument is shown when the child does not define the section.
- `@show` defines a section in the layout and prints it immediately.
  Children can override it.
- `@parent` inside a child section prints the parent's content for
  that section.

::: info
`@show` is the way to declare a section that has default content and
can be extended. Use `@yield` when the layout only needs a slot that
children must fill.
:::

## Stacks

Stacks collect content from many templates and print it once in the
layout. A child pushes its scripts and styles, and the layout prints
them in `<head>` or before `</body>`.

- `@push('name')` and `@endpush` append a block to the stack.
- `@stack('name')` prints the stack in the layout.
- `@pushIf($condition, 'name')` pushes only when the condition is true.
- `@pushOnce('name', 'id')` pushes a block once, even when the same
  template is rendered several times with the same id.

```php
@pushIf($user->isAdmin(), 'scripts')
    <script src="/js/admin.js"></script>
@endPushIf
```

## Partials Rendered Once

Use `@once` for a block that should appear one time, such as a
JavaScript library included by a reusable partial:

```php
@once('chart-library')
    @push('scripts')
        <script src="/js/chart.js"></script>
    @endpush
@endonce
```

The state for `@once` lives on the `Edge` instance. Each instance
tracks its own set of ids, so a block is rendered once per instance,
not once per request in a long-running process unless the same
instance is reused.

::: tip
Create the `Edge` instance once and reuse it. This keeps the compiled
templates in the cache and keeps `@once` working across the partials
rendered in one response.
:::
