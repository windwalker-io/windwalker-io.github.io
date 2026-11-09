---
layout: doc
title: Extending Edge
part: Components
component: edge
---

# Extending Edge

Edge is built from small parts, and each part can be extended without
changing the package. Project code often needs a few custom pieces: a
directive for a formatting helper, a global variable for the site name,
or a shared preprocessing step. Extensions let you add these pieces in
one place, and every template rendered by the engine can use them.

There are four extension points:

- **Directives** add a custom `@name(...)` tag that compiles to PHP.
- **Parsers** rewrite the template source before it is compiled.
- **Global variables** are available in every template.
- **Extensions** are classes that bundle the above and register them
  with `addExtension()`.

## Minimal Setup

Register a directive directly on the compiler. The compiler is available
from the engine, and it must be configured before the template is
compiled:

```php
$edge->getCompiler()->directive(
    'money',
    fn(string $expr) => "<?php echo money{$expr}; ?>",
);
```

The handler receives the raw argument text, including the parentheses.
`@money($total)` therefore becomes `<?php echo money($total); ?>`. The
function `money()` must exist in your application.

## Showcase

The following extension packages a directive, a global variable, and
a shared helper into one class. It renders end to end when registered
with `addExtension()`:

```php
use Windwalker\Edge\Extension\DirectivesExtensionInterface;
use Windwalker\Edge\Extension\EdgeExtensionInterface;
use Windwalker\Edge\Extension\GlobalVariablesExtensionInterface;

class ShopExtension implements
    EdgeExtensionInterface,
    DirectivesExtensionInterface,
    GlobalVariablesExtensionInterface
{
    public function getName(): string
    {
        return 'shop';
    }

    public function getDirectives(): array
    {
        return [
            'money' => fn(string $expr) => "<?php echo money{$expr}; ?>",
        ];
    }

    public function getGlobals(): array
    {
        return ['currency' => 'USD'];
    }
}

function money(float $amount): string
{
    return number_format($amount, 2) . ' USD';
}

$edge->addExtension(new ShopExtension());

echo $edge->render(
    '<p>Total: @money($total) ({{ $currency }})</p>',
    ['total' => 1234.5]
);
```

The output is `<p>Total: 1,234.50 USD (USD)</p>`. The `currency` global is
available without being passed in the data array.

## Directives

Each directive maps a name to a handler. The handler returns PHP code.
Keep the returned code short, and return a complete statement or
expression wrapped in `<?php ... ?>`:

```php
$edge->getCompiler()->directive(
    'upper',
    fn(string $expr) => "<?php echo strtoupper{$expr}; ?>",
);
```

Use `getDirectives()` on an extension class when several directives
belong together. The extension is registered with `addExtension()`.

## Parsers

A parser receives the whole template as a string. It runs before any
directive or echo is compiled, so it can rewrite text that the compiler
would otherwise not understand. Use parsers sparingly, because they see
the entire template:

```php
$edge->getCompiler()->parser(
    fn(string $value) => str_replace(
        '{{ year }}',
        date('Y'),
        $value,
    ),
);
```

Implement `ParsersExtensionInterface` on an extension class to register
parsers through `getParsers()`.

## Global Variables

Globals are merged into the data of every render. The data passed to
`render()` takes priority over a global with the same name:

```php
$edge->addGlobal('siteName', 'Windwalker');

echo $edge->render('{{ $siteName }}');
```

`getGlobal()`, `removeGlobal()`, and `setGlobals()` manage the same
list. Extension globals are added to the list when a render starts.

## Extension Classes

An extension has a unique name, which is the key used by `addExtension()`
and `getExtension()`. Registering a second extension with the same name
replaces the first.

Implement the interfaces that match the parts you need:

- `DirectivesExtensionInterface` for `getDirectives()`.
- `ParsersExtensionInterface` for `getParsers()`.
- `GlobalVariablesExtensionInterface` for `getGlobals()`.

## Rendering with a Context Object

`renderWithContext()` renders a template and binds `$this` inside the
template to a context object. Use it when a template needs methods of an
object owned by your application, such as a page presenter:

```php
class PagePresenter
{
    public function title(): string
    {
        return 'Dashboard';
    }
}

echo $edge->renderWithContext(
    '<h1>{{ $this->title() }}</h1>',
    [],
    new PagePresenter(),
);
```

The output is `<h1>Dashboard</h1>`. The context is only set for the
duration of the call, so each render receives its own object.

## Changing the Echo Tags

The compiler also controls the tags for output. The setters are:

- `setContentTags('[[', ']]')` changes the escaped output tags.
- `setEscapedContentTags('[[[', ']]]')` changes the escaped tags used
  with three braces.
- `setRawTags('<<', '>>')` changes the raw output tags.

```php
$edge->getCompiler()->setContentTags('[[', ']]');

echo $edge->render('Hello [[ $name ]]', ['name' => 'Simon']);
```

::: info
Tag changes apply to every template that the compiler processes. Set
them once during application setup, before the first render.
:::

::: warning
Directive handlers and parsers produce PHP code that runs inside
templates. The expression that a directive receives is template code,
so never build it from user input.
:::
