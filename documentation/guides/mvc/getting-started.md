---
layout: doc
---

# Getting Started

This tutorial covers the basic Windwalker MVC only. Advanced packages such as Unicorn and Luna are not included.

Tutorial chapters:

1. Getting Started (this page)
2. [Entity, Migrations and Seeders](./modeling)
3. [Create Views](./view)
4. [Admin and Forms](./admin)

## Prerequisites

Please install and set up the environment as described in [Installation](../start/):

- PHP 8.4.6 or above
- Composer and a web server (or the built-in PHP server)
- Node.js 20+ (22+ recommended) and Yarn 4.9+ (installing via corepack is recommended)

## Install the Default Database Schema

After installation, run the migrations (add `-s` to run the seeders too):

```bash
php windwalker mig:go -s
```

It will ask you to confirm:

```
Do you really want to run migration/seeding?: [N/y] y
```

To skip this question, add `-f` when running migrations.

The command lists each migration and seeder it runs and ends with `Completed.`.

Then open `http://{site}/www/admin/acme`. If you see a list of sample `acme` records, the installation succeeded.

## Create a New MVC Set

Run:

```bash
php windwalker g view Front/Sakura
```

This creates `src/Module/Front/Sakura/SakuraView.php` and a set of related files.

Add something to `prepare()`:

```php
<?php
// src/Module/Front/Sakura/SakuraView.php

// ...

class SakuraView
{
    // ...

    #[ViewPrepare]
    public function prepare(AppContext $app, View $view): array
    {
        // Add these lines
        $title = 'Sakura View';

        return compact('title');
    }
}
```

Then print the variable in the template:

```php
<?php // src/Module/Front/Sakura/views/sakura.blade.php ?>

...

@extends('global.body')

@section('content')
    <div class="container">
        <h2>{{ $title }}</h2>
    </div>
@stop
```

Next, create the route:

```bash
php windwalker g route front/sakura
```

Open the generated file and register the URL:

```php
<?php
// routes/front/sakura.route.php

use App\Module\Front\Sakura\SakuraView;

// ...

$router->group('sakura')
    ->register(function (RouteCreator $router) {
        // Add this
        $router->any('sakura', '/sakura')
            ->view(SakuraView::class);
    });
```

Now open the following URL in the browser to see your view:

```
http://{site}/www/sakura
```

The page displays the "Sakura View" heading.

### Modify CSS

Edit `assets/_sakura.scss` in the Sakura folder:

```scss
// src/Module/Front/Sakura/assets/_sakura.scss

// Scoped to this view only
.view-sakura {
  h2 {
    color: red;
  }
}
```

Then run:

```bash
yarn build
```

The heading is now displayed in red.

You can also keep a dev server running, so you don't need to rebuild after every edit:

```bash
yarn dev
```

In Windwalker 4, CSS is spread across MVC folders and merged only when Vite compiles.

You can also write inline macro styles. If a Blade file contains a `<style data-macro …>` tag, you can write styles directly inside it. Remove the red style above, then add the following to the Blade file, using a Bootstrap variable:

```html
@push('macro')
<style data-macro type="text/scss" data-scope=".view-sakura">
    // Add below
    h2 {
        color: $primary;
    }
</style>

...
```

Keep `yarn dev` running and it will compile automatically. The heading now uses the Bootstrap primary color.

### Modify JS (TypeScript)

JS is also placed inside the MVC folder, named after the view. Edit `sakura.ts`:

```ts
// src/Module/Front/Sakura/assets/sakura.ts

console.log('Hello Sakura');
```

Compile with `yarn build`, or keep `yarn dev` running.

Refresh the page and open the browser console to see the `Hello Sakura` output.

Windwalker TypeScript runs in an ES Module + bundler environment, so you can use `import` directly. The following is only an example, do not paste it into your file, it will break:

```ts
import { Modal } from 'bootstrap';

const modalEl = document.querySelector<HTMLDivElement>('#my-modal')!;
const modal = Modal.getOrCreateInstance(modalEl);

modalEl.addEventListener('shown.bs.modal', () => {
  console.log('Modal show');
});

modal.show();
```

You can also write an inline macro. Find the `<script data-macro="…" lang="ts" …>` tag in the Blade file and write something inside it. This example imports a module inside `<script>`, keep `yarn dev` running:

```html
...

<script data-macro="sakura" lang="ts" type="module">
    import { Modal } from 'bootstrap';

    console.log(Modal);
</script>

...
```

If the console prints the imported `Modal` class, it works.

## Project Structure

See [Directory Structures](../start/#directory-structures) in the installation guide for the layout of the project root.

Inside `src/`, files are organized like this:

| Directory | Purpose                          |
|:----------|:---------------------------------|
| Command   | Project CLI commands             |
| Console   | Project console app              |
| Entity    | Shared entities                  |
| Enum      | Shared enums                     |
| Module    | MVC modules (views, controllers) |
| Web       | Project web app                  |
| Services  | Shared services                  |

## Debug Mode

To enter debug mode (to see DB queries, full error messages, or to disable CSS/JS caching), the easiest way is to add `/dev.php` to the URL.

For example, change `http://localhost/hello/www/sakura/list` to `http://localhost/hello/www/dev.php/sakura/list`.

In debug mode, a debug console appears at the bottom of the page, showing information such as DB queries and timeline.

When an error occurs, the full error message is displayed. Try throwing an exception or visiting an invalid URL to see the error page with the message and stack trace.

See [Debugging](../start/debugging) for details, including `DEV_ALLOW_IPS` and verbosity settings.

## CLI Auto-completion

Windwalker supports auto-completion for macOS ZSH. Run this once:

```bash
php windwalker auto-complete
```

Restart your terminal, then type part of a command and press Tab to complete it. For example, typing `php windwalker g v` and pressing Tab completes it to `g view`.
