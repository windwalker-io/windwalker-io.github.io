---
layout: doc
title: File Object
component: filesystem
---

# File Object

Plain PHP file functions return booleans, do not create missing parent
folders, and leave recursive copy and delete to the caller. `FileObject`
groups these operations on one path. It extends `SplFileInfo`, so the
standard checks such as `exists()`, `isFile()`, and `getSize()` remain
available.

## Creating a File Object

There are three equivalent entry points:

```php
use Windwalker\Filesystem\FileObject;
use Windwalker\Filesystem\Filesystem;

use function Windwalker\fs;

$a = new FileObject('/var/www/storage/a.txt');
$b = fs('/var/www/storage/a.txt');
$c = Filesystem::get('/var/www/storage/a.txt');
```

`fs()` calls `FileObject::wrap()`. If you pass a `FileObject`, `wrap()`
returns that same instance, and a `$root` argument changes its root in
place. Pass a plain string when you want an independent object.

## Writing and Reading

`write()` replaces the content of a file and creates any missing parent
folders. It replaces existing content without warning, so check `exists()`
first when the file must be kept. `read()` returns a `StringObject` and
throws `FileNotFoundException` for a missing file. `readStream()` returns a
PSR-7 stream for large files.

```php
use function Windwalker\fs;

$state = fs('/var/www/storage/state.json');

if (!$state->exists()) {
    $state->write('{}');
}

$content = (string) $state->read();
```

The following example stores a report, copies it to a backup location,
and removes the original:

```php
use function Windwalker\fs;

$root = fs('/var/www/storage');

$report = $root
    ->appendPath('/reports/2026/summary.csv')
    ->write("id,total\n1,42\n");

$backup = $report->copyTo(
    $root->appendPath('/backup/summary.csv')
);

if ($backup->exists()) {
    $report->delete();
}

echo (string) $backup->read();
```

`copyTo()` returns the destination object. It throws if the destination
file already exists, unless you pass `$force = true`.

## Folders

`mkdir()` creates a folder and its parents, with mode `0755` by default.
`copyTo()` on a folder copies it recursively, and `moveTo()` renames it.

```php
use function Windwalker\fs;

fs('/var/www/storage/private')->mkdir(0750);
```

```php
use function Windwalker\fs;

$site = fs('/var/www/themes/default');

$site->copyTo('/var/www/themes/backup', force: true);

$site->moveTo('/var/www/themes/old', force: true);
```

`moveTo()` calls PHP's `rename()`, so it works only within the same
filesystem. To move files between disks, copy them and then delete the
source.

## Deleting

`delete()` removes a file or a folder recursively. `deleteIfExists()`
does the same when the path exists and returns `false` otherwise.

```php
use function Windwalker\fs;

fs('/var/www/storage/cache')->deleteIfExists();
```

Use `deleteNoFollow()` when a folder may contain symbolic links or
junctions. It removes each link itself and leaves the link target
untouched. `delete()` keeps the `$followLinks = true` default for backward
compatibility, and its argument is deprecated. The new `deleteNoFollow()`
method is the safe choice for new code. `deleteIfExists()` has the same
argument and default.

```php
use function Windwalker\fs;

fs('/var/www/storage/releases')->deleteNoFollow();
```

## Path Helpers

These methods return a new object or a string, and do not change the
original path:

```php
use function Windwalker\fs;

$file = fs('/var/www/app/src/A.php');

fs('/var/www/app')->appendPath('/config/app.php');
// /var/www/app/config/app.php

$file->getParent();
// /var/www/app/src

$file->isChildOf('/var/www/app'); // true
$file->isChildOf('/var/other');   // false

fs('/var/www/app/src/A.php', '/var/www/app')->getRelativePath();
// src
```

`getRelativePath()` and `getRelativePathname()` compare the path with a root.
The root comes from the second argument of `fs()`, the constructor, or
`setRoot()`. `prependPath()` joins strings without adding a separator, so
pass a leading slash to the second part:

```php
fs('config/app.php')->prependPath('/var/www');
// /var/wwwconfig/app.php, not /var/www/config/app.php

fs('config/app.php')->prependPath('/var/www/');
// /var/www/config/app.php
```

`addFile()` creates a file inside a folder, and `touch()` updates or
creates a file.


## Building a Folder Tree

`mkdir()` creates every missing parent in one call, and it returns the
same object, so the next call can start from the new folder. `addFile()`
creates a file inside a folder, and `touch()` creates an empty file or
updates the timestamp of an existing one.

```php
use function Windwalker\fs;

$project = fs('/var/www/projects/acme');

$project
    ->appendPath('/src/Controller')
    ->mkdir();

$project
    ->appendPath('/config')
    ->addFile('app.php', "<?php\n\nreturn [];\n");

$project
    ->appendPath('/storage/.gitkeep')
    ->touch();
```

`addFile()` throws a `FilesystemException` when the object does not point
to a folder. Check `isDir()` first when the path comes from configuration.

## Streams for Large Files

`readStream()` and `getStream()` return a PSR-7 stream. The methods that
accept a stream read it in chunks, so the whole file is never loaded into
memory. They need `windwalker/stream`.

The following example copies an uploaded file from a temporary location
into a permanent folder without loading it into a string:

```php
use function Windwalker\fs;

$source = fs('/var/www/storage/tmp/video.mp4');

$dest = fs('/var/www/storage/media/2026/video.mp4');

$dest->writeStream($source->readStream());

$source->delete();
```

`writeStream()` accepts a PSR-7 `StreamInterface` or a PHP resource. It
creates the parent folder, as `write()` does. The stream from `readStream()`
is opened in read-only mode by default.

For a read-write stream, call `getStream()`. It opens the file in
`READ_WRITE_FROM_BEGIN` mode by default, so seek to the end before you
append:

```php
use function Windwalker\fs;

$stream = fs('/var/www/storage/log.txt')->getStream();

$stream->seek(0, SEEK_END);
$stream->write("New entry\n");
$stream->close();
```

`getStream()` creates the file when it does not exist. Close the stream
when you are done, so that the handle is released before the next call.

## Relative Paths and Roots

A root tells a `FileObject` which folder it is relative to. Use it when
you build a manifest, a sitemap, or a backup index, and the output must not
contain absolute paths:

```php
use function Windwalker\fs;

$root = '/var/www/site/public';

$manifest = [];

foreach (fs($root)->files(recursive: true) as $file) {
    $manifest[] = $file->getRelativePathname($root);
}
```

`getRelativePathname()` returns the path without the root, for example
`css/app.css`. `getRelativePath()` returns only the folder part. If the
object has no root and you do not pass one, both methods throw an
`InvalidArgumentException`. You can set the root later with `setRoot()`, or
pass it in the constructor as the second argument of `fs()`.

`isChildOf()` answers a related question: is this path inside that folder?
The check normalizes both paths first, so `..` segments do not fool it.

## Encoding Files as Data URIs

`readBase64DataUri()` returns the file as a `data:` URI, which you can put
in an HTML `<img>` tag or a JSON payload. Pass the MIME type explicitly
when you know it, or pass a Symfony `MimeTypesInterface` to let the
library detect it from the extension:

```php
use Symfony\Component\Mime\MimeTypes;

use function Windwalker\fs;

$logo = fs('/var/www/public/images/logo.png');

$explicit = $logo->readBase64DataUri('image/png');

$detected = $logo->readBase64DataUri(new MimeTypes());
```

Detection fails with a `FilesystemException` when the extension is not
known to the detector. Pass the MIME type explicitly for files whose
extensions are unusual.

## Parsing Structured Files

`readAndParse()` returns a `Collection` from `windwalker/data`. The format
defaults to the file extension, and you can pass one explicitly together
with parser options:

```php
use function Windwalker\fs;

$settings = fs('/var/www/etc/settings.json')->readAndParse();

$timeout = $settings['http']['timeout'];

$raw = fs('/var/www/data/import.dat')->readAndParse('json');
```

Parsers usually need the whole document in memory, so use this method for
configuration and small data files, not for large imports.

## Overwrite Rules

The methods differ in what they do when the destination already exists:

| Operation | Destination exists | `force: true` |
| --- | --- | --- |
| `write()`, `writeStream()` | Replaced | Not applicable |
| `copyTo()` (file) | Throws `FilesystemException` | Replaced |
| `copyTo()` (folder) | Throws `FileNotFoundException` | Merged: matching files replaced, others kept |
| `moveTo()` | Throws `FilesystemException` | Replaced |
| `mkdir()` | Existing folder returned | Not applicable |

Read this table before you use `force: true`. It removes the destination
file, or the matching files in a destination folder, without a backup.

## Moving Between Disks

`moveTo()` uses PHP's `rename()`. That function cannot move a file across
mount points, such as from a local disk to a network share or from one
Docker volume to another. In that case `moveTo()` throws. Copy the file,
verify the copy, and delete the source instead:

```php
use function Windwalker\fs;

$source = fs('/mnt/uploads/report.pdf');

$target = $source->copyTo('/var/www/storage/report.pdf');

if ($target->exists()) {
    $source->delete();
}
```

## Pitfalls

**`delete()` follows links by default.** This default is kept for backward
compatibility. In a folder that contains a symbolic link to another
folder, `delete()` removes the contents of the link target. Use
`deleteNoFollow()` in new code, and for folders you do not fully control.
