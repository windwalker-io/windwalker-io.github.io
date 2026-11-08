---
layout: doc
title: Formats
part: Components
chapter: Data
menu: components/data
component: data
---

# Formats

Applications receive structured data in many forms. A service may read
its settings from INI, an API may answer in JSON or XML, and a deployment
tool may write YAML. Each format has its own library and its own quirks.
The data package hides these differences behind one registry. The
`FormatRegistry` class knows how to parse a string into an array and how
to dump an array back into a string. `Collection` uses the registry for
its `load()`, `loadFile()`, and `toString()` methods, so the same calls
work for every format.

## Loading and Dumping

Pass the format name to `Collection::from()`, `load()`, or `toString()`.
When you omit the format, JSON is used:

```php
use Windwalker\Data\Collection;

$data = Collection::from('{"flower":"sakura"}', 'json');

echo $data->toString('xml');
echo $data->toString(); // JSON
```

## Showcase

The following example reads a database settings file in INI format and
writes it out as JSON. The `mode` option keeps numbers as integers. In
the default mode, every INI value is a string:

```php
use Windwalker\Data\Collection;

$ini = <<<INI
[database]
host = "localhost"
port = 3306
debug = false
INI;

$settings = Collection::from(
    $ini,
    'ini',
    [
        'process_section' => true,
        'mode' => INI_SCANNER_TYPED,
    ]
);

echo $settings->toString('json');
// {"database":{"host":"localhost","port":3306,"debug":false}}

echo $settings->getDeep('database.port') + 1; // 3307
```

The `process_section` option turns `[database]` into a nested array.
Without it, the section header is ignored and the keys are top-level.

## Built-in Formats

The registry includes these formats:

- `json`: uses `json_encode()` and `json_decode()`. Options are `depth`,
  `options`, and `assoc`.
- `xml`: uses SimpleXML. Options are `name` for the root element and
  `nodeName` for each item. A dumped value is written with `name` and
  `type` attributes:

  ```php
  echo Collection::from(['a' => 1])->toXml();
  // <Data><node name="a" type="integer">1</node></Data>
  ```

- `ini`: uses `parse_ini_string()`. Options are `process_section` and
  `mode`, where `mode` accepts a `INI_SCANNER_*` constant.
- `php`: dumps an array as a `return [...]` statement. Options are
  `header`, `return`, `strict`, and `closingtag`. It cannot parse, so
  `Collection::from($string, 'php')` throws a `LogicException`.
- `phpSerialize`: uses `serialize()` and `unserialize()`. The format name
  is matched case-insensitively, so `phpserialize` also works.
- `yaml` (also available as `yml`): needs `symfony/yaml`. Options are
  `inline`, `indent`, and `flags` for dumping, and `flags` for parsing.
- `toml`: needs `yosymfony/toml`. The option `resultAsObject` returns
  objects instead of arrays.
- `hjson`: needs `laktak/hjson`.

::: info
The YAML, TOML, and HJSON libraries are not required by `windwalker/data`.
Without the library, calling that format throws an `Error` such as
`Class "Symfony\Component\Yaml\Yaml" not found`. Install the library in
your project before you use the format.
:::

## Loading Files

`loadFile()` reads a file. It chooses the format from the file extension
unless you pass one. The extension map turns `yml` into `yaml`:

```php
$settings = new Collection();

$settings->loadFile(__DIR__ . '/config/app.yml');
$settings->loadFile(__DIR__ . '/config/app.json', 'json');
```

::: warning
Do not load a `.php` file from an untrusted location. `loadFile()` runs
the file with `require`, so the file's code runs in your application.
:::

::: warning
`load()`, `from()`, and `loadFile()` treat a string as a file name when it
is the path of an existing file. If the string comes from user input, a
request can make your code read any file it is allowed to read. Check the
input before you pass it on:

```php
$input = $request->get('data');

// Unsafe: the string is read as a file if it names one.
$data = Collection::from($input, 'json');
```

Pass the input as a parsed value, or validate it so that it cannot name
a file.
:::

::: warning
The `phpSerialize` format calls `unserialize()`. Unserializing data from
an untrusted source can instantiate arbitrary classes. Use it only for
data that your application wrote itself. Pass an `allowed_classes` option
to restrict the classes, because the options array is passed directly to
`unserialize()`:

```php
$data = Collection::from(
    $serialized,
    'phpSerialize',
    ['allowed_classes' => false],
);
```

Prefer `json` for data that crosses a trust boundary.
:::

## Registering Formats

Register a custom format with `registerFormat()`. It takes a name, a
parser, and a dumper. The parser receives the string and the options, and
the dumper receives the data and the options. The example below adds a
simple comma-separated format:

```php
use Windwalker\Data\Collection;
use Windwalker\Data\Format\FormatRegistry;

$registry = new FormatRegistry();

$registry->registerFormat(
    'csv',
    fn(string $input): array => explode(',', $input),
    fn(array $data, array $options = []): string => implode(',', $data),
);

$flowers = new Collection();
$flowers->setFormatRegistry($registry);

$flowers->load('rose,sakura', 'csv');

echo $flowers->toString('csv'); // rose,sakura
```

For a larger handler, implement `FormatInterface` and pass the object to
`registerFormat()` instead of two callables. The interface needs `parse()`
and `dump()` methods.

::: tip
A `Collection` creates its own `FormatRegistry` the first time it needs
one. Formats registered on one collection are not visible to another.
Create one registry at the start of your application and pass it to every
collection with `setFormatRegistry()`.
:::

### Aliases and Extension Maps

Use `alias()` to give a format a second name, and `extMap()` to map a file
extension to a format:

```php
$registry->alias('cfg', 'ini');
$registry->extMap('conf', 'ini');

$settings = (new Collection())->setFormatRegistry($registry);

$settings->loadFile('/etc/app/app.conf');
```

The registry already maps the alias `yml` to `yaml` and the extension
`yml` to `yaml`, so you do not need to register them.
