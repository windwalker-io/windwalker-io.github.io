---
layout: doc
title: Introduction
part: Components
chapter: Data
menu: components/data
component: data
---

# Introduction

Windwalker Data provides containers for structured values: the arrays and
objects that come from configuration files, API responses, database rows,
and form input. Nested arrays are hard to read and easy to get wrong when
every access is written as `$data['a']['b'] ?? null`. The data package lets
you wrap such values once and then work with them through methods, path
strings, and copies that never change the original.

The package has these main parts:

- `Collection`: an array-based container with deep path access through
  `getDeep()`, `setDeep()`, and `hasDeep()`. It also provides immutable
  `with*()` copies and proxies that write back into the original data.
- `Record`: a base class for your own data objects. Public properties are
  the fields, and constructor parameters are used when an array is wrapped.
- `FormatRegistry`: the set of format handlers that `Collection` uses to
  read and write JSON, XML, INI, PHP, and other formats through one API.
- `ValueObject`: the older base class for data objects. It is deprecated,
  so use `Record` in new code.

## Installation

```bash
composer require windwalker/data ^4.0
```

The package requires PHP 8.4.6 or later. It depends on `windwalker/scalars`
and `windwalker/utilities`. YAML, TOML, and HJSON support needs an extra
library for each format. See [Formats](/documentation/components/data/formats)
for the list.

## Use as Standalone Component

Without the framework, create a `Collection` from any array or from a
string in a supported format. The `collect()` helper is a shortcut for
`Collection::wrap()`:

```php
use Windwalker\Data\Collection;
use function Windwalker\collect;

$config = Collection::from(
    file_get_contents('config.json'),
    'json'
);

$host = $config->getDeep('database.host');
$port = $config->getDeep('database.port');

$flowers = collect(['rose', 'sakura']);
```

Data classes extend `Record` when the shape of the data is known:

```php
use Windwalker\Data\Record;

class Flower extends Record
{
    public string $name = '';

    public string $color = '';

    public function __construct(string $name = '')
    {
        $this->name = $name;
    }
}

$flower = Flower::wrap(['name' => 'Sakura', 'color' => 'pink']);

echo $flower->name; // Sakura
```

## Use in Windwalker

The data package does not register services in the DI container, so there
is nothing to inject. Create `Collection` and `Record` objects where you
need them. Many framework methods already return a `Collection`. For
example, a statement from the database adapter returns one:

```php
use Windwalker\Database\DatabaseAdapter;

$db = $app->retrieve(DatabaseAdapter::class);

$rows = $db->prepare('SELECT * FROM flowers')->all();

foreach ($rows as $row) {
    echo $row->getDeep('name');
}
```

Your own `Record` classes also work with framework components that accept
them. The ORM uses a `Record` subclass as a cast target, and the filter
component can use one as a filter clause. See the
[Record](/documentation/components/data/record) page for details.

## Core Concepts

Both `Collection` and `Record` treat data as values. Methods that change
the data return `$this`, while methods with a `with` prefix return a new
object and leave the original unchanged. Choose the style that matches how
the data is shared. A value that other services read should usually be
copied, not modified in place.

## Topic Pages

- [Collection](/documentation/components/data/collection): deep path
  access, immutable copies, loading data, and proxies.
- [Record](/documentation/components/data/record): typed data objects,
  wrapping, merging, defaults, and JSON serialization.
- [Formats](/documentation/components/data/formats): reading and writing
  JSON, XML, INI, YAML, and other formats, and how to register your own.

## Related components

- [Database](/documentation/components/database/): returns `Collection`
  rows from its statements.
- [Filter](/documentation/components/filter/): can use a `Record` class as
  a filter clause.
