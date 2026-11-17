---
layout: doc
---

# Layout Rendering

Layout rendering turns a template name into HTML. Windwalker renders
pages and fragments through the [Edge](./edge-templates) engine, and
`RendererService` is the entry point. This page covers where layouts
are found, how to render them from code, and which variables a layout
receives. Route-bound pages are described in [Views](./views).

## How It Works

Edge is compatible with Blade syntax, so Windwalker accepts both
`.blade.php` and `.edge.php` as layout extensions. Use `.blade.php`
for new files. IDEs and editors already know this extension, so you get
Blade syntax highlighting and completion without extra plugins.

::: info
If both `name.blade.php` and `name.edge.php` exist for the same layout,
`edge.php` is found first and wins. Keep one extension per layout.
:::

Each layout is a `.blade.php` file. Its path under a layout folder,
without the extension, is its layout name. Dots in the name become
folder separators:

```text
views/
  post/
    list.blade.php        -> post.list
  components/
    address.blade.php     -> components.address
```

`RendererService` resolves the name against the registered paths,
merges the global variables into your data, and renders the Edge
template. A missing layout throws `LayoutNotFoundException`.

## Minimal Usage

Inject `RendererService` and call `render()` with a layout name and
an array of data:

```php
use Windwalker\Core\Renderer\RendererService;

class MailService
{
    public function __construct(
        protected RendererService $renderer,
    ) {
    }

    public function renderWelcome(string $name): string
    {
        return $this->renderer->render(
            'mail.welcome',
            ['name' => $name],
        );
    }
}
```

`render()` returns the HTML as a string.
Its optional third argument is an array of render options.

## Complete Example

The following example renders an order receipt email as an HTML
fragment inside a service. No route or ViewModel is involved. The
service builds the data, renders the layout, and returns the HTML to
its caller.

Create the template at `Views/mail/receipt.blade.php`:

```blade
<h2>Thanks for your order, {{ $customer }}</h2>

<ul>
    @foreach ($items as $item)
        <li>{{ $item['name'] }} x {{ $item['qty'] }}</li>
    @endforeach
</ul>

@if ($total > 100)
    <p>You qualify for free shipping.</p>
@endif

<p>Total: {{ number_format($total, 2) }}</p>
```

Create the service at `Services/ReceiptMailer.php`:

```php
use Windwalker\Core\Renderer\RendererService;

class ReceiptMailer
{
    public function __construct(
        protected RendererService $renderer,
    ) {
    }

    public function build(string $customer, array $items): string
    {
        $total = array_sum(
            array_map(
                fn (array $item) => $item['price'] * $item['qty'],
                $items,
            ),
        );

        return $this->renderer->render(
            'mail.receipt',
            [
                'customer' => $customer,
                'items' => $items,
                'total' => $total,
            ],
        );
    }
}
```

Call the service from any code path, then send the returned HTML:

```php
$html = $mailer->build('Alice', [
    ['name' => 'Notebook', 'qty' => 2, 'price' => 30.0],
    ['name' => 'Pen', 'qty' => 5, 'price' => 4.5],
]);
```

The `mail.receipt` name maps to `Views/mail/receipt.blade.php` when
`Views/` is registered as a layout path. See [Layout Paths](#layout-paths).

## Layout Paths

Windwalker searches the registered paths in priority order. The first
path that contains the layout wins. Add a path in code with
`addPath()`:

```php
use Windwalker\Utilities\Iterator\PriorityQueue;

$renderer->addPath(
    __DIR__ . '/../Views',
    PriorityQueue::ABOVE_NORMAL,
);
```

The default priority is `PriorityQueue::ABOVE_NORMAL`. The priority
constants are `MIN`, `LOW`, `BELOW_NORMAL`, `NORMAL`, `ABOVE_NORMAL`,
`HIGH`, and `MAX`.

::: tip
Use a higher priority for a path that should override a layout with
the same name in another folder.
:::

Use `dumpPaths()` to see the search order while debugging a missing
layout:

```php
print_r($renderer->dumpPaths());
```

`getPaths()` returns the same paths as a `PriorityQueue` object.

Check whether a layout exists before rendering it with `hasLayout()`:

```php
if ($renderer->hasLayout('post.list')) {
    $html = $renderer->render('post.list', ['title' => 'Posts']);
}
```

`resolveLayout()` returns the full file path of a layout and throws
`LayoutNotFoundException` if the layout does not exist.

## Namespaces

Each path belongs to a namespace. The default namespace is `main`.
Register paths for another namespace with the `ns` argument:

```php
$renderer->addPath(
    __DIR__ . '/../Admin/Views',
    ns: 'admin',
);

$paths = $renderer->dumpPaths('admin');
```

Namespace methods take the namespace as an argument, so `getPaths()`
and `dumpPaths()` return the main namespace unless you pass a name.

## Global Variables

Every layout receives the global variables. Windwalker adds these
from `WindwalkerExtension::getGlobals()`:

| Variable | Description |
|----------|-------------|
| `$app` | The current application. |
| `$uri` | The URI helper for building links. |
| `$chronos` | The date and time helper. |
| `$asset` | The `AssetService`. See [Asset Management](./asset-management). |
| `$lang` | The language service. |
| `$nav` | The navigation helper. |

Add your own globals with `addGlobal()` or replace them all with
`setGlobals()`. Read them with `getGlobal()` or `getGlobals()`:

```php
$renderer->addGlobal('siteName', 'Windwalker Demo');
```

```blade
<footer>{{ $siteName }}</footer>
```

Data passed to `render()` is merged after the globals.
A data key with the same name as a global overrides it for that
layout only.

::: info
The asset global is named `$asset`, not `$assets`.
:::

## Deferred and Custom Rendering

`make()` returns a `Closure` that renders the layout when called. Use
it when the data is not ready yet:

```php
$render = $renderer->make('mail.welcome');

$html = $render(['name' => 'Alice']);
```

`renderWith()` renders with a specific `RendererInterface`, such as a
renderer you created yourself, instead of the default Edge renderer:

```php
$html = $renderer->renderWith(
    $myRenderer,
    'mail.welcome',
    ['name' => 'Alice'],
);
```

## Render Context

The View sets `$vm` only when the ViewModel returns an array. That
array is rendered as the layout data, and `$vm` is added to it:

```blade
<h1>{{ $title }}</h1>
{{-- $vm is the ViewModel object that produced this layout --}}
```

The View also passes the ViewModel object as the Edge render context.

A ViewModel that returns a response or redirect does not render a
template, so `$vm` is not set for it.

See [Views](./views) for the ViewModel contract.

## Related

- [Views](./views): route-bound page views and ViewModels.
- [Edge Templates](./edge-templates): syntax and inheritance.
- [View Components](./view-components): reusable template components.
