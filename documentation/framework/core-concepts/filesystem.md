---
layout: doc
description: How to use the filesystem package for file objects, path helpers, and temporary files, with safe path checks for user-supplied names.
---

# Filesystem

Windwalker's filesystem package provides file objects, path helpers,
and temporary files. It is a standalone package, so it is not deeply
wired into the application services. Use it directly from your code.

For the full API, see the [Filesystem component](../../components/filesystem/index.md).

## Path Safety

Paths that come from users, such as an upload name or a URL parameter,
must never reach the filesystem unchecked. Use `Path` to clean and
verify them.

```php
use Windwalker\Filesystem\Path;

$name = Path::makeSafe($_POST['filename']);
$full = Path::makeSafeAbsolute($name, WINDWALKER_ROOT . '/storage');

if (!Path::isChild($full, WINDWALKER_ROOT . '/storage')) {
    throw new \RuntimeException('Invalid path.');
}
```

- `Path::makeSafe()` removes `..` sequences, any character other than
  letters, digits, `.`, `_`, `-`, and space, and leading or trailing dots.
- `Path::makeSafeAbsolute()` joins the name to a base directory and
  rejects paths that escape it.
- `Path::isChild()` checks that a path is inside a root directory.

::: warning
Do not join user input to a base path with string concatenation and
then open the file. A value such as `../../etc/passwd` escapes the
folder. Always check the final path with `Path::isChild()`.
:::

### Normalizing Paths

`Path::normalize()` converts separators and resolves `.` and `..`
segments. Use it when you compare two paths.

```php
use Windwalker\Filesystem\Path;

Path::normalize('/var/www/app/../storage/./logs');
// /var/www/storage/logs
```

::: info
`normalize()` works on the string only. It does not check that the path
exists, and it does not follow symbolic links. Use `Path::realpath()`
when you need the resolved location on disk.
:::

Avoid `..` in any path you build from input. Even when it is cleaned,
an unexpected segment is a sign that the input is not trusted.

## Temporary Files

`Filesystem::createTemp()` creates a unique file in a directory and
returns a `TempFileObject`. Pass `WINDWALKER_TEMP` to store it in the
application temp folder.

```php
use Windwalker\Filesystem\Filesystem;

$temp = Filesystem::createTemp(WINDWALKER_TEMP, 'export-');

file_put_contents($temp->getPathname(), $csv);

// Use the file, for example to send it or to import it.
```

`createTemp()` removes the file when the object is destroyed by default.
`TempFileObject` has two methods to change this for one object.

```php
use Windwalker\Filesystem\Filesystem;

$temp = Filesystem::createTemp(WINDWALKER_TEMP, 'report-');

// Remove the file when PHP shuts down
$temp->deleteWhenShutdown();

// Or keep the file after the object is destroyed
$temp->deleteWhenDestruct(false);
```

- `deleteWhenShutdown()` registers the file for removal at shutdown.
  It takes no arguments because it uses `register_shutdown_function()`,
  which cannot be unregistered. Once called, the removal always happens.
- `deleteWhenDestruct(bool $value = false)` sets whether the file is
  removed when the object is destroyed. The default is `false`, because
  an accidental deletion is easy to cause and hard to undo. Pass `true`
  explicitly to confirm you want the file removed.

::: warning
Calling `deleteWhenShutdown()` cannot be undone. If you need to keep
the file, do not call it, or move the file before the request ends.
:::

You can also pass flags to `createTemp()` for the same behavior.

```php
// Remove it at shutdown, even if the object is still referenced
$temp = Filesystem::createTemp(
    WINDWALKER_TEMP,
    'report-',
    Filesystem::DELETE_WHEN_SHUTDOWN,
);
```

- `DELETE_WHEN_DESTRUCT` (default) removes the file when the object is
  destroyed.
- `DELETE_WHEN_SHUTDOWN` removes the file when PHP shuts down.

::: tip
Keep the temp object in a variable for as long as you need the file.
If you only pass its path around, the file may be removed earlier than
you expect.
:::

::: warning
Do not store temp files in a shared public folder. Use `WINDWALKER_TEMP`
or a private directory, and never serve the temp folder directly to
users.
:::

## Topic pages

- [Helpers](./helpers.md): utility functions for common tasks.
- [Filesystem component](../../components/filesystem/index.md): file
  objects, iterators, path utilities, and async operations.
