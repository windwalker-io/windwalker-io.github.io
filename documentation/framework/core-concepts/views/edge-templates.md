---
layout: doc
description: How Edge templates are written in Windwalker, covering template locations, layout inheritance, partials, escaped output, and directives.
---

# Edge Templates

Edge is the template engine Windwalker uses for views. This page covers
where templates live, how layouts inherit from each other, how partials
are included, how output is escaped, and which directives Windwalker
adds. Component tags are described in
[View Components](./view-components).

For a quick syntax lookup, see [Edge Components](/documentation/components/edge/),
[Template Syntax](/documentation/components/edge/syntax), and
[Components](/documentation/components/edge/components).

## Minimal Usage

Echo a value with `{{ }}`. The value is escaped:

```blade
<h1>{{ $title }}</h1>
```

## Complete Example

A list page that uses a layout, a partial, a stack, and a permission
check:

```blade
{{-- views/post/list.edge.php --}}
@extends('layouts.main')

@section('title', 'Posts')

@section('content')
    <h1>{{ $title }}</h1>

    @can('post.create', $user)
        <a href="{{ $createUrl }}">New post</a>
    @endcan

    @foreach ($posts as $post)
        @include('post.card', ['post' => $post])
    @endforeach
@endsection

@push('scripts')
    <script src="/js/post-list.js"></script>
@endpush
```

## Template Placement

Templates use the `.edge.php` extension. A layout name uses dots in
place of folder separators, so `layouts.main` is found at
`layouts/main.edge.php` inside a views folder.

Layout paths come from the `renderer.paths` and `renderer.namespaces`
config keys. See [Renderer](./renderer#layout-paths) for the search
order.

Keep a page's templates close to its ViewModel:

```text
src/Views/Post/
  PostListViewModel.php
  list.edge.php
```

## Layout Inheritance

### Extending a Layout

Use `@extends` to render a parent layout after the child template. The
child defines content with `@section`, and the parent places it with
`@yield`:

```blade
{{-- views/layouts/main.edge.php --}}
<html>
<head>
    <title>@yield('title')</title>
</head>
<body>
    @yield('content')
</body>
</html>
```

```blade
{{-- views/post/list.edge.php --}}
@extends('layouts.main')

@section('title', 'Posts')

@section('content')
    <h1>Posts</h1>
@endsection
```

### Section Forms

Use `@section(name, value)` for a short inline value. It takes no block
and no `@endsection`:

```php
@section('title', 'Posts')
```

Use `@section(name)` with `@endsection` for block content.

### Default Content and Parent Content

Use `@yield(name, default)` in a parent to show a fallback when a child
does not define the section:

```php
@yield('sidebar', '<p>Default sidebar</p>')
```

Use `@show` to end a section and yield it in the same place. Use
`@parent` inside a child section to render the parent's content at that
point:

```php
@section('sidebar')
    @parent
    <p>Extra links for this page.</p>
@endsection
```

Use `@overwrite` instead of `@endsection` to replace the parent's
section without rendering the parent's content.

::: info
A child template's variables are passed to the parent layout, so
`{{ $title }}` in a layout reads the child's `$title`.
:::

## Partials

### Including a Partial

Use `@include(name, data)` to render a partial where it appears. The
partial receives the data array and the variables of the including
template:

```php
@include('post.card', ['post' => $post])
```

### Optional Partials

Use `@includeIf(name, data)` to render nothing when the partial does not
exist:

```php
@includeIf('post.banner', ['post' => $post])
```

### Rendering a Collection

Use `@each(name, items, iterator, empty)` to render a partial once for
each item. The iterator name sets the variable each item has in the
partial. The optional fourth argument names a partial for an empty list:

```php
@each('post.card', $posts, 'post', 'post.empty')
```

::: tip
Pass only the variables a partial needs. This keeps the partial
reusable and easy to test.
:::

## Escaping

### Escaped Output

`{{ }}` escapes the value for HTML. Use it for all user-supplied text:

```blade
<p>{{ $post->title }}</p>
```

### Raw Output

`{!! !!}` prints the value without escaping:

```php
{!! $post->renderedBody !!}
```

::: warning
`{!! !!}` prints the value without escaping. Use it only with HTML that
your code has already produced or sanitized, or the page is open to
cross-site scripting.
:::

### Literal Tags

Put `@` before a tag to print it as text, such as `@{{ $name }}`.

## Stacks

### Pushing Content

Use `@push(name)` and `@endpush` to add content to a named stack from
anywhere in the template tree:

```blade
@push('scripts')
    <script src="/js/post-list.js"></script>
@endpush
```

### Rendering a Stack

Use `@stack(name)` where the content should appear, such as the end of
the layout's `<head>` or `<body>`:

```php
@stack('scripts')
```

### Pushing Once

Use `@pushOnce(name, id)` to add the content only the first time that
`id` is pushed. This is useful when a partial that needs a script is
rendered many times in one page:

```blade
@pushOnce('scripts', 'chart-js')
    <script src="/js/chart.js"></script>
@endPushOnce
```

## Anonymous Components

Use an `<x-name>` tag to render a template as a component. The tag
name resolves to a view the Edge loader can find under that name:

```blade
<x-alert />
```

Components that need a PHP class or a registered short name are
described in [View Components](./view-components).

## Windwalker Directives

Windwalker registers these directives in its Edge extension
(`core/src/Core/Renderer/Edge/WindwalkerExtension.php`).

### Language

- `@lang(key)`: translate a language key.
- `@translate(key)`: an alias of `@lang`.
- `@choice(...)`: choose a plural form for a language key.

```blade
<h2>@lang('post.list.title')</h2>
```

### Forms and Security

- `@csrf` and `@formToken`: output the CSRF token field. They take no
  arguments.
- `@nonce`: output the Content Security Policy nonce attribute. It takes
  no arguments.

```blade
<form method="post">
    @csrf
    <button type="submit">Save</button>
</form>
```

### Attributes

`@attr` renders an array of HTML attributes, so you do not have to
write each attribute by hand. Pass an array, or a name and a value:

```blade
<input @attr(['type' => 'checkbox', 'name' => 'agree'])>

<button @attr('disabled', $saving)>Save</button>

<div @attr([
    'class' => 'card',
    'data-id' => $post->id,
    'hidden' => false,
])>
    ...
</div>
```

The values follow these rules:

- `true` outputs a bare attribute, such as `disabled`.
- `false` and `null` omit the attribute.
- Arrays and objects are encoded as JSON.
- Other values are escaped.

::: tip
Use `@attr` for conditional attributes instead of wrapping the
whole tag in `@if`.
:::

### Permissions

- `@can(policy, user, ...args)` and `@endcan`: render the block when the
  user is allowed.
- `@cannot(policy, user, ...args)` and `@endcannot`: render the block
  when the user is not allowed.

The second argument is the user. Any further arguments are passed to the
policy:

```blade
@can('post.edit', $user, $post)
    <a href="{{ $editUrl }}">Edit</a>
@endcan

@cannot('post.edit', $user, $post)
    <p>You cannot edit this post.</p>
@endcannot
```

### Messages

- `@messages`: render the application's flash messages.

### Debugging

- `@dd(...)`: dump values and stop.
- `@die`: stop the request.
- `@debug` / `@enddebug`: render the block only in debug mode.

::: warning
`@dd` and `@die` stop the request. Remove them before the page reaches
production.
:::

## Related

- [Renderer](./renderer): the render API and global variables.
- [View Components](./view-components): class and anonymous
  components.
- [Asset Management](./asset-management): loading CSS and JavaScript.
