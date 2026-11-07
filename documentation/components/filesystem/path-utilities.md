---
layout: doc
title: Path Utilities
component: filesystem
---

# Path Utilities

Paths come from many places: configuration files, operating system
APIs, and user input. They mix separators, contain `.` and `..` segments,
and may be relative or absolute. Comparing or joining them as raw strings
gives wrong results. The static class `Windwalker\Filesystem\Path` cleans
these strings without touching the disk, and provides checks that keep
user-supplied names inside a base folder.

## Cleaning and Comparing Paths

`Path::clean()` replaces separators and removes duplicate slashes. It
does not resolve `..`. `Path::normalize()` also resolves `.` and `..`
segments. Neither method checks whether the path exists, and neither resolves symbolic
links. Use PHP's native `realpath()` when you need the link target.

```php
use Windwalker\Filesystem\Path;

Path::clean('/var//www\\app/');
// '/var/www/app/'

Path::normalize('/var/www/app/../storage/./cache');
// '/var/www/storage/cache'
```

Use `Path::exists()` when the existence of the path matters. Its third
argument controls case sensitivity. The default follows the operating system,
and the explicit modes are shown in
[Case-Sensitive Checks](#case-sensitive-checks) below.

`Path::relative()` and `Path::makeRelative()` compute a relative path
between two paths. `Path::isChild()` checks whether one path lies inside
another. The `Path::is*()` helpers classify a string, as shown in
[Classifying Paths](#classifying-paths).

## Showcase: Storing a User Upload

The following example turns a client-supplied file name into a path
inside an upload folder. It rejects anything that would escape the folder:

```php
use Windwalker\Filesystem\Path;

$base = '/var/www/storage/uploads';

$name = Path::makeSafe($originalName);

$target = Path::makeSafeAbsolute($name, $base);

$file = fs($target)->write($content);
```

Here `$originalName` and `$content` come from the request. `makeSafe()`
removes every character except letters, digits, dots, underscores,
hyphens, and spaces. Because slashes are removed, the name cannot contain
path segments. `makeSafeAbsolute()` then builds the full path and throws a
`FilesystemException` if the result is not inside `$base`.

## Safety Helpers

Each helper handles a different kind of input. `makeSafe()` keeps ASCII
letters, digits, dots, underscores, hyphens, and spaces. It removes
everything else, including non-ASCII letters, so the name is safe on any
file system:

```php
use Windwalker\Filesystem\Path;

Path::makeSafe('Résumé.pdf');        // 'Rsum.pdf'
Path::makeSafe('../etc/passwd');     // 'etcpasswd'
Path::makeSafe('.htaccess');         // 'htaccess'
Path::makeSafe('my report (1).pdf'); // 'my report 1.pdf'
Path::makeSafe('file.pdf.');         // 'file.pdf'
```

`makeUtf8Safe()` keeps Unicode letters and digits, and removes path
separators and characters that are unsafe in file names. It returns
`bool|string`, so check the result before you use it:

```php
Path::makeUtf8Safe('Résumé.pdf'); // 'Résumé.pdf'
Path::makeUtf8Safe('a/b.txt');    // 'ab.txt'
```

`makeSafeAbsolute($path, $base, $allowDots = false)` builds a full path
under `$base`, and it refuses any input that could escape the folder:

```php
$base = '/var/www/uploads';

Path::makeSafeAbsolute('x.txt', $base);
// '/var/www/uploads/x.txt'

Path::makeSafeAbsolute('../etc/passwd', $base);
// FilesystemException: Invalid path.

Path::makeSafeAbsolute('/etc/passwd', $base);
// FilesystemException: Invalid path.

Path::makeSafeAbsolute('a/../b.txt', $base, true);
// '/var/www/uploads/b.txt'
```

`$allowDots` is `false` by default, so any `..` is rejected, even when the
result would stay inside `$base`, as `a/../b.txt` does. Pass `true` only when
the input is expected to contain `..`. Even then, the child check still
applies to the resolved path, so `../etc/passwd` is rejected with
`$allowDots` set to `true`.

## Other Helpers

`Path::getHomeDirectory()` returns the home folder of the current user. The
name helpers in [Names and Extensions](#names-and-extensions) work on
strings without touching the disk.


## Resolving Paths Against a Base

`Path::makeAbsolute()` turns a relative path into an absolute path under a
base folder. `Path::makeRelative()` and `Path::relative()` go the other way.
These functions work on strings, so they are useful for generating links,
manifests, and log messages:

```php
use Windwalker\Filesystem\Path;

Path::makeAbsolute('x/y.txt', '/var/www');
// '/var/www/x/y.txt'

Path::makeRelative('/var/www/app/src', '/var/www');
// 'app/src'

Path::relative('/var/www/app', '/var/www/app/src/Controller');
// 'src/Controller'
```

`makeAbsolute()` returns a path unchanged when it is already absolute, so
it is safe to call on input that may or may not be relative. It does not
check that the result stays inside the base. Use `makeSafeAbsolute()` for
that check, as shown in the upload example below.

## Classifying Paths

Three helpers tell you what kind of string you have, without touching the
disk. Use them to branch before you call a file function:

```php
use Windwalker\Filesystem\Path;

Path::isAbsolute('/var/www');        // true, starts at the root
Path::isAbsolute('C:\\app');         // true, Windows drive path
Path::isAbsolute('https://a.com/x'); // true, a URL is also absolute

Path::isRelative('src/App.php');     // true
Path::isRelative('https://a.com');   // false, the opposite of isAbsolute()

Path::isURL('https://a.com/x');      // true, contains '://'
Path::isURL('/var/www');             // false
```

A URL must not be passed to `read()` as if it were a local path. Check
`isURL()` first, and then choose a stream or HTTP client for it.

## Names and Extensions

The name helpers split a path without touching the disk:

```php
use Windwalker\Filesystem\Path;

Path::getFilename('/a/b/report.pdf?v=2');   // 'report.pdf'
Path::getExtension('/a/b/archive.tar.gz');  // 'gz'
Path::basename('/a/b/archive.tar.gz', true); // 'archive.tar'
Path::stripExtension('/a/b/archive.tar.gz'); // '/a/b/archive.tar'
Path::stripQuerySuffix('/a/b/file.txt?v=2'); // '/a/b/file.txt'
```

`getFilename()` and `getExtension()` strip a query suffix by default, so a
URL-like string keeps its name. `basename()` with `$noExtension = true`
removes only the last extension, which is why `archive.tar` remains.

## Case-Sensitive Checks

Windows and macOS usually treat `Report.PDF` and `report.pdf` as the same
file, while Linux does not. `Path::exists()` takes a third argument to
control this:

```php
use Windwalker\Filesystem\Path;

Path::exists('/var/www/storage/Report.PDF');

Path::exists(
    '/var/www/storage/Report.PDF',
    Path::CASE_SENSITIVE
);

Path::exists(
    '/var/www/storage/Report.PDF',
    Path::CASE_INSENSITIVE
);
```

The two explicit modes list the parent folder and compare names. They are
slower than the default. Use them when the exact spelling matters, for
example when the same file must be found on Linux and macOS alike.

## Permissions

`Path::setPermissions()` takes a file mode and a folder mode. The folder mode
applies to the folder, and the file mode applies to the files inside it. The
defaults are `0644` for files and `0755` for folders. `Path::getPermissions()`
returns the mode as an octal string, or as a symbolic string when the second
argument is `true`:

```php
use Windwalker\Filesystem\Path;

Path::setPermissions('/var/www/storage/uploads', '0640', '0750');

$file = '/var/www/storage/uploads/a.txt';

$mode = Path::getPermissions($file);   // '640'
$label = Path::getPermissions($file, true); // 'rw-r-----'
```

Permission behavior depends on the operating system, so test the result on
each platform you deploy to.

## A Showcase: Validating an Upload

The following example combines the helpers into a complete upload handler.
It checks the extension against an allow-list, builds a safe name, writes
the file to a folder that cannot be escaped, and returns the stored path:

```php
use Windwalker\Filesystem\Path;

use function Windwalker\fs;

function storeUpload(
    string $originalName,
    string $content,
    string $uploadDir
): string {
    $extension = strtolower(Path::getExtension($originalName));

    $allowed = ['pdf', 'png', 'jpg', 'csv'];

    if (!in_array($extension, $allowed, true)) {
        throw new InvalidArgumentException('File type not allowed.');
    }

    $stem = Path::stripExtension(Path::makeSafe($originalName));

    $name = $stem . '-' . bin2hex(random_bytes(6)) . '.' . $extension;

    $target = Path::makeSafeAbsolute($name, $uploadDir);

    fs($target)->write($content);

    return $target;
}
```

The random suffix prevents one upload from overwriting another. The
extension check happens before any path is built, and `makeSafeAbsolute()`
is the last line of defense if a name somehow contains a separator.

The extension check is necessary but not sufficient. It looks only at the
last extension, so `shell.php.jpg` passes:

```php
storeUpload('shell.php.jpg', $content, $uploadDir);
// Stored as shell.php-<random>.jpg
```

Store uploads outside any folder that the web server executes, and serve
them with a fixed `Content-Type`. Do not rely on the original name for
security.
