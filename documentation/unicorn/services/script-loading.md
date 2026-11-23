---
layout: doc
title: Script Loading
description: Load page scripts, styles, and init code with Unicorn script objects.
---

# Script Loading

Unicorn pages need scripts that depend on the page: the Unicorn runtime,
Bootstrap behavior, form widgets, editors, and uploaders. Writing the same
tags and init code in every view repeats work, and it is easy to load one
script twice. Unicorn groups this work into script objects. Each object adds
the assets and page code for one area, and it skips a helper that was already
added with the same arguments.

## Script Classes

All script classes live in `Unicorn\Script`. Each one is a shared object in
the container, so you can inject it or retrieve it with `$app->retrieve()`.

- `UnicornScript`: the runtime entry, page data, translations, and routes.
- `BootstrapScript`: tooltips, popovers, tabs, and iframe modals.
- `FormScript`: choices, date pickers, color pickers, and dependent lists.
- `EditorScript`: TinyMCE and the Nuxt editor.
- `VueScript`: Vue 2 or 3, composition API, draggable, and animations.
- `JQueryScript`: jQuery and jQuery slim.
- `ModernScript`: polyfills for older browsers and web components.
- `AwsScript`: the S3 browser uploader.

Each class extends `Windwalker\Core\Asset\AbstractScript`. Most helpers return the script object, so calls can be chained. Helpers that
add a stylesheet or a polyfill may return nothing.

## Complete Example

A controller prepares the edit page. It loads the entry, passes data and
translations to the page, and enables two widgets.

```php
use Unicorn\Script\BootstrapScript;
use Unicorn\Script\FormScript;
use Unicorn\Script\UnicornScript;

class ArticleEditView
{
    public function __construct(
        protected UnicornScript $unicornScript,
        protected FormScript $formScript,
        protected BootstrapScript $bootstrapScript,
    ) {
    }

    public function prepare(int $id): void
    {
        // Load the page entry; this also sets up the runtime.
        $this->unicornScript->init('@vite/src/front/main.ts');

        // Values and strings for the page scripts.
        $this->unicornScript->data('article.id', $id);
        $this->unicornScript->translate('article.edit.*');

        // Widgets and behavior, added once per page.
        $this->formScript->choices('#tags', ['removeItemButton' => true]);
        $this->formScript->flatpickr();
        $this->bootstrapScript->tooltip();
    }
}
```

## Page Entry: init() and main()

`init()` sets up the page. Call it once, before any helper that writes
page code. It takes the entry path, or no argument when the page needs
only the runtime.

Unicorn has two loading modes, selected by the `unicorn.modules.next`
setting:

- Next mode uses an import map. Entries use the `@vite` alias or the `~/`
  prefix, and their CSS comes from the Vite manifest.
- Classic mode uses SystemJS. The entry path is loaded through the
  `@main` import.

::: info
Next mode and classic mode produce different script tags. The helpers
work in both modes, so your PHP code stays the same.
:::

`main()` runs inside `init()`. It adds the system URI data, the Unicorn
translation keys, and the CSRF token to the page. You can call `main()`
alone when a page has no entry file:

```php
$this->unicornScript->main();
```

::: warning
`main()` exposes the CSRF token to every script on the page. Load only
scripts you trust on pages that include the token.
:::

## Page Code and Deferred Imports

Helpers such as `tooltip()`, `choices()`, and `keepTab()` do not run
immediately. They add code that runs in the `@main` module after the
page's entry is loaded. `UnicornScript` provides the same mechanism for
your own code:

```php
// Run code after the entry module is loaded.
$this->unicornScript->importMainThen("u.\$ui.bootstrap.tooltip()");

// Import a module, then run code with its exports.
$this->unicornScript->importThen(
    '@myapp/widget.js',
    'module.init("#widget");',
    afterMain: true,
);

// Import a module without running code.
$this->unicornScript->importScript('@myapp/legacy.js', afterMain: true);

// Add a named block of code. Reusing the name replaces the block.
$this->unicornScript->addInitialise('console.log("ready");', 'my-block');
```

::: warning
Code queued with `importMainThen()` or `addInitialise()` runs in `@main`,
which exists only after `init()` sets its import map. Call `init()` first,
or the queued code never runs.
:::

## Once-Only Helpers

Most helpers check `available()` with their arguments. The same method with the
same arguments adds its assets only once per script object:

```php
$this->bootstrapScript->tooltip();
$this->bootstrapScript->tooltip(); // Ignored: same selector and options.

// Added: a different selector.
$this->bootstrapScript->tooltip('.help-icon');
```

Because the script objects are shared, this check applies to the whole
request. A widget loaded by a parent view is not loaded again by a child view.

## Data, Translations, and Routes

`UnicornScript` sends values from PHP to the page. These methods are covered
on their own pages, so only the entry points are shown here:

```php
$this->unicornScript->data('article.id', 12);
$this->unicornScript->translate('article.edit.save');
$this->unicornScript->addRoute('@post_ajax');
$this->unicornScript->exposeCspNonce();
```

- `data()` and the page-side reader are described in
  [Data Transfer](../javascript-frontend/basics/data-transfer).
- `translate()` is described in
  [Translation](../javascript-frontend/utilities/translation).
- `addRoute()` is described in [Router](../javascript-frontend/utilities/router).
- `exposeCspNonce()` is described in
  [Content Security Policy](../../framework/core-concepts/security/content-security-policy).

## Bootstrap Helpers

`BootstrapScript` enables Bootstrap 5 behavior. Each helper takes an
optional selector and options. Tabs, button radios, and iframe modals have
their own pages:

```php
$this->bootstrapScript->tooltip();
$this->bootstrapScript->popover('[data-bs-toggle=popover]', [
    'trigger' => 'hover',
]);
$this->bootstrapScript->collapse();
$this->bootstrapScript->offcanvas();
$this->bootstrapScript->scrollspy();
$this->bootstrapScript->keepTab();
$this->bootstrapScript->buttonRadio();
$this->bootstrapScript->iframeModal();
```

Use [Bootstrap 5 Overview](../javascript-frontend/bootstrap-5/overview) for
the markup these helpers expect. Use
[Keep Tab](../javascript-frontend/bootstrap-5/keep-tab),
[Button Radio](../javascript-frontend/bootstrap-5/button-radio), and
[Iframe Modal](../javascript-frontend/bootstrap-5/iframe-modal) for the
details of each feature.

`multiLevelMenu()` and `bs4Adapter()` add stylesheets only, and they take no
selector.

## Form Helpers

`FormScript` adds widgets for form fields. The field and grid pages describe
their markup and options:

```php
$this->formScript->choices('#tags');
$this->formScript->flatpickr();
$this->formScript->colorPicker('.color-input');
$this->formScript->switcher();
$this->formScript->singleImageDrag();
$this->formScript->fileDrag();
$this->formScript->multiUploader();
$this->formScript->repeatable();
```

`listDependent()` and `showOn()` connect a field to another field. See
[List Dependent](../javascript-frontend/ui/list-dependent) and
[Form](../javascript-frontend/ui/form) for their usage.

## Editor, Vue, and Other Helpers

`EditorScript` starts a rich-text editor on a selector:

```php
$this->editorScript->tinymce('#content', [
    'height' => 400,
]);
```

`VueScript` adds Vue and its optional libraries:

```php
$this->vueScript->vue(3);      // Vue 3 is the default.
$this->vueScript->compositionAPI();
$this->vueScript->draggable();
$this->vueScript->animate();
```

`JQueryScript` and `ModernScript` add optional libraries:

```php
$this->jQueryScript->jquery();      // Or ->slim() for jQuery slim.
$this->modernScript->ie();           // Polyfills for older browsers.
$this->modernScript->webComponentPolyfill();
```

`AwsScript` adds a browser uploader for S3. Its
options, including the S3 profile, are described in
[S3 Service](./s3-service):

```php
$this->awsScript->s3BrowserUploader(
    'article-images',
    options: ['profile' => 'default'],
);
```

::: warning
`s3BrowserUploader()` requires `aws/aws-sdk-php` version 3 or later. Without it,
the call throws `DomainException`.
:::

## Related

- [Theming](../introduction/theming)
- [Unicorn JS](../javascript-frontend/unicorn-js)
- [Asset Management](../../framework/core-concepts/views/asset-management)

