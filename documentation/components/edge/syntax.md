---
layout: doc
title: Template Syntax
part: Components
component: edge
---

# Template Syntax

Edge templates are HTML files with two kinds of markup. Output tags such
as <code v-pre>{{ $name }}</code> print values, and `@` directives control logic and
structure. The syntax follows Laravel Blade closely, so developers who
know Blade can read Edge templates without learning a new language.

Output is escaped by default. Values from the data array are safe to
print in HTML text and double-quoted attributes unless you choose raw
output.

## Minimal Setup

Create an `Edge` instance and render a template string. The default
loader treats the layout name as the template source itself:

```php
use Windwalker\Edge\Edge;

$edge = new Edge();

echo $edge->render(
    '<h1>Hello, {{ $name }}</h1>',
    ['name' => 'Simon']
);
```

Templates stored in files are covered in [Loaders](/documentation/components/edge/loaders).

## Showcase

The following template combines a condition, a loop, and a class
helper. It renders end to end with the data passed to `render()`:

```php
$template = <<<'EDGE'
@if (count($items) > 0)
    <ul class="menu">
        @foreach ($items as $i => $item)
            <li @class(['active' => $i === $active])>
                {{ $item['title'] }}
            </li>
        @endforeach
    </ul>
@else
    <p>No items found.</p>
@endif
EDGE;

echo $edge->render($template, [
    'items' => [
        ['title' => 'Home'],
        ['title' => 'Blog'],
    ],
    'active' => 1,
]);
```

## Output

### Escaped Output

<code v-pre>{{ }}</code> passes the value through `Edge::escape()`, which uses
`htmlspecialchars()` with `ENT_COMPAT`. Double quotes, ampersands,
angle brackets, and `null` values are handled, and `null` prints as an
empty string.

```php
$edge->render('{{ $html }}', ['html' => '<b>"hi"</b>']);
// &lt;b&gt;&quot;hi&quot;&lt;/b&gt;
```

Use `??` for fallback values. An undefined variable produces a PHP
notice, so always provide a default when the key may be missing:

```blade
{{ $title ?? 'Untitled' }}
```

Edge also accepts the `or` form, which compiles to an `isset()` check.
The left side must be a variable:

```blade
{{ $title or 'Untitled' }}
```

This form is specific to Edge. See
[Differences from Blade](/documentation/components/edge/blade-differences)
for the full list.

::: warning
`ENT_COMPAT` does not encode single quotes. Always wrap HTML
attributes that contain output in double quotes, for example
<code v-pre>title="{{ $title }}"</code>. A single-quoted attribute can be broken out of
by a value that contains `'`.
:::

### Raw Output

<code v-pre>{!! !!}</code> prints the value without escaping:

```blade
{!! $htmlFragment !!}
```

::: warning
Raw output does not escape anything. Use it only for HTML that your
application generated or trusted. Never print user input with <code v-pre>{!! !!}</code>.
:::

### Literal Braces and Comments

Prefix a tag with `@` to print it literally, which is useful when the
same braces belong to a JavaScript framework:

```html
<div>@{{ message }}</div>
```

Comments between <code v-pre>{{-- --}}</code> are removed from the compiled output:

```blade
{{-- This line never reaches the browser. --}}
```

To keep a block unparsed, wrap it in `@verbatim` and `@endverbatim`.

## Conditions and Loops

Conditions use `@if`, `@elseif`, `@else`, and `@endif`. The `@unless`
directive is the negated form of `@if`.

```blade
@unless ($user->isGuest())
    <p>Welcome back.</p>
@endunless
```

Loops use `@foreach`, `@for`, and `@while`. The `@forelse` directive
renders an `@empty` branch when the collection has no items:

```blade
@forelse ($users as $user)
    <p>{{ $user['name'] }}</p>
@empty
    <p>No users found.</p>
@endforelse
```

Inside a loop, `@continue($condition)` and `@break($condition)` skip
an iteration or stop the loop when the condition is true:

```blade
@foreach ($numbers as $n)
    @continue($n === 2)
    @break($n === 4)
    {{ $n }}
@endforeach
```

Use `@switch` with `@case`, `@break`, and `@default` for value matching:

```blade
@switch($status)
    @case('draft')
        Draft
        @break

    @case('published')
        Published
        @break

    @default
        Unknown
@endswitch
```

## Attribute Helpers

Helpers add HTML attributes only when the condition is true. Each
helper prints an attribute name without a value.

```blade
<input type="checkbox" @checked($on) @disabled($locked)>
```

- `@checked($expr)` prints `checked`.
- `@selected($expr)` prints `selected`.
- `@disabled($expr)` prints `disabled`.
- `@readonly($expr)` and `@required($expr)` work the same way.

`@class` builds a `class` attribute from an array. Numeric keys are
always included. String keys are included when their value is truthy:

```blade
<p @class([
    'card',
    'card-active' => $active,
    'card-muted' => !$active,
])></p>
```

`@bool` prints `true` or `false` as a plain value, which is useful inside
JavaScript or an attribute that expects a literal boolean:

```blade
<button data-open="@bool($open)"></button>
```

`@json` encodes a value as JSON. The output is HTML-escaped, so place it
in an attribute, not inside a `<script>` block:

```blade
<div data-config="@json($config)"></div>
```

For a `<script>` block, use `@js`. It emits a JavaScript expression that
parses the value at runtime:

```blade
<script>
    const config = @js($config);
</script>
```

Edge encodes the JSON as base64 and outputs `JSON.parse(atob('...'))`.
The base64 text contains no quotes or angle brackets, so the output is
safe inside a script block without further escaping.

## PHP Code in Templates

`@php ... @endphp` runs a block of PHP, and `@php($expr)` runs a single
expression:

```blade
@php($total = count($items))

<p>{{ $total }} items</p>
```

`@unset($name)` removes a variable from the template scope. This is
useful when a loop variable must not leak into code that follows:

```blade
@unset($item)
```

::: warning
`@php` runs arbitrary PHP in the template scope. A template is code, so
only load templates that your application controls. Never build a
template string from user input.
:::

## Changing the Output Tags

Replace the default <code v-pre>{{ }}</code> and <code v-pre>{!! !!}</code> tags through the compiler.
See [Extending Edge](/documentation/components/edge/extending) for the
full list of tag setters.
