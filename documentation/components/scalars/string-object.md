---
layout: doc
title: String Object
component: scalars
---

# String Object

`StringObject` wraps a string together with the encoding used to read it.
Its methods cover the text operations that code uses most often: trimming,
searching, case conversion, padding, slicing, and conversion to numbers.
Many PHP string functions are byte-oriented and take their arguments in
different orders. A chain of `StringObject` calls reads as a sequence of
text operations, and its length and position methods follow the encoding.

A typical case is normalizing user input before it is stored or shown, such
as a title that comes from a rich-text field and needs tags removed, spaces
collapsed, and a length limit applied.

## Method Summary

Methods that return **New object** leave the original unchanged. Methods
that return a native value, such as `bool`, `int`, or `string`, do not
create a new `StringObject`. The methods below are either defined on the
class or forwarded to `Windwalker\Utilities\Str`. Methods with a link have
a section below that explains them.

| Method | Returns | Description |
|--------|---------|-------------|
| [`str()`](#creating-a-stringobject) | New object | Helper; creates a StringObject with UTF-8 by default. |
| [`create()`](#creating-a-stringobject) | New object | Static factory. |
| [`wrap()`](#creating-a-stringobject) | Object | Static; returns the same instance or wraps a value. |
| [`getString()`](#immutability) | string | Returns the native string. |
| [`withString()`](#immutability) | New object | Copy with a different string. |
| [`getEncoding()`](#encoding) | string | Returns the encoding. |
| [`withEncoding()`](#encoding) | New object | Copy with a different encoding. |
| [`length()`](#inspecting-a-string) | int | Character count in its encoding. |
| [`count()`](#inspecting-a-string) | int | Same as `length()`. |
| [`isNull()`](#inspecting-a-string) | bool | `true` only for an empty string. |
| [`notNull()`](#inspecting-a-string) | bool | `true` for a non-empty string. |
| [`indexOf()`](#inspecting-a-string) | int | Position of the first match. |
| [`indexOfLast()`](#inspecting-a-string) | int | Position of the last match. |
| [`substrCount()`](#inspecting-a-string) | int | Number of occurrences. |
| [`compare()`](#inspecting-a-string) | int | Compares with another string. |
| [`contains()`](#inspecting-a-string) | bool | Whether the string contains a substring. |
| [`startsWith()`](#inspecting-a-string) | bool | Whether the string starts with a substring. |
| [`endsWith()`](#inspecting-a-string) | bool | Whether the string ends with a substring. |
| [`hasLowerCase()`](#inspecting-a-string) | bool | Whether it contains a lowercase letter. |
| [`hasUpperCase()`](#inspecting-a-string) | bool | Whether it contains an uppercase letter. |
| [`isLowerCase()`](#inspecting-a-string) | bool | Whether it is entirely lowercase. |
| [`isUpperCase()`](#inspecting-a-string) | bool | Whether it is entirely uppercase. |
| [`isPlural()`](#inflection) | bool | Whether the word is plural. |
| [`isSingular()`](#inflection) | bool | Whether the word is singular. |
| [`toPlural()`](#inflection) | New object | Converts the word to plural. |
| [`toSingular()`](#inflection) | New object | Converts the word to singular. |
| [`explode()`](#splitting-and-converting) | ArrayObject | Splits by a delimiter. |
| [`chop()`](#splitting-and-converting) | ArrayObject | Splits into chunks of a length. |
| [`toInteger()`](#splitting-and-converting) | int | Converts to an integer. |
| [`toFloat()`](#splitting-and-converting) | float | Converts to a float. |
| [`jsonDecode()`](#splitting-and-converting) | Collection | Decodes JSON; needs `windwalker/data`. |
| `parseToCollection()` | Collection | Parses a format into a Collection. |
| `toDOMDocument()` | `DOMDocument` | Parses as an XML document. |
| `toHTMLDocument()` | `DOMDocument` | Parses as an HTML document. |
| `toSimpleXML()` | `SimpleXMLElement` | Parses as a SimpleXML element. |
| [`toUpperCase()`](#case-conversion) | New object | Converts to uppercase. |
| [`toLowerCase()`](#case-conversion) | New object | Converts to lowercase. |
| [`upperCaseFirst()`](#case-conversion) | New object | Uppercases the first character. |
| [`lowerCaseFirst()`](#case-conversion) | New object | Lowercases the first character. |
| [`upperCaseWords()`](#case-conversion) | New object | Uppercases the first letter of each word. |
| [`toggleCase()`](#case-conversion) | New object | Swaps the case of each letter. |
| [`trim()`](#trimming-and-whitespace) | New object | Trims both ends. |
| [`trimLeft()`](#trimming-and-whitespace) | New object | Trims the start. |
| [`trimRight()`](#trimming-and-whitespace) | New object | Trims the end. |
| [`collapseWhitespaces()`](#trimming-and-whitespace) | New object | Collapses repeated whitespace. |
| [`padStart()`](#padding) | New object | Pads the start to a length. |
| [`padEnd()`](#padding) | New object | Pads the end to a length. |
| [`pad()`](#padding) | New object | Pads both ends to a length. |
| [`ensureStart()`](#prefix-and-suffix) | New object | Adds a prefix if it is missing. |
| [`ensureEnd()`](#prefix-and-suffix) | New object | Adds a suffix if it is missing. |
| [`removeStart()`](#prefix-and-suffix) | New object | Removes a prefix if present. |
| [`removeEnd()`](#prefix-and-suffix) | New object | Removes a suffix if present. |
| [`surrounds()`](#prefix-and-suffix) | New object | Wraps with a substring on both ends. |
| [`intersect()`](#prefix-and-suffix) | New object | Returns the common prefix of two strings. |
| [`intersectStart()`](#prefix-and-suffix) | New object | Returns the common prefix. |
| [`intersectEnd()`](#prefix-and-suffix) | New object | Returns the common suffix. |
| [`replace()`](#replacing-text) | New object | Replaces plain-text search strings. |
| [`replaceCallback()`](#replacing-text) | New object | Replaces regex matches through a callback. |
| [`substrReplace()`](#replacing-text) | New object | Replaces a portion by position. |
| [`reverse()`](#slicing-and-substrings) | New object | Reverses the characters. |
| [`insert()`](#slicing-and-substrings) | New object | Inserts a string at a position. |
| [`removeChar()`](#slicing-and-substrings) | New object | Removes characters at a position. |
| [`slice()`](#slicing-and-substrings) | New object | Returns a slice by start and end. |
| [`substring()`](#slicing-and-substrings) | New object | Returns a substring by start and end. |
| [`between()`](#slicing-and-substrings) | New object | Returns the text between two markers. |
| [`truncate()`](#slicing-and-substrings) | New object | Shortens to a length with a suffix. |
| [`first()`](#slicing-and-substrings) | New object | Returns the first characters. |
| [`last()`](#slicing-and-substrings) | New object | Returns the last characters. |
| [`getChar()`](#slicing-and-substrings) | New object | Returns the character at a position. |
| [`stripHtmlTags()`](#cleaning-html) | New object | Removes HTML tags, optionally keeping some. |
| `apply()` | New object | Passes the string to a callback. |
| `append()` | New object | Returns a copy with a string appended. |
| `prepend()` | New object | Returns a copy with a string prepended. |
| [`map()`](#filtering-and-mapping-characters) | New object | Maps each character and keeps the string. |
| [`filter()`](#filtering-and-mapping-characters) | New object | Keeps characters that match a callback. |
| [`reject()`](#filtering-and-mapping-characters) | New object | Drops characters that match a callback. |

Writes to `$s[0]` or `unset($s[0])` change the object in place. The
table omits deprecated aliases, such as `ensureLeft()` and `padLeft()`.

## Creating a StringObject

Use the `str()` helper. It uses UTF-8 by default. Pass an encoding as the
second argument when the text uses another charset:

```php
use function Windwalker\str;

$a = str('Hello');
$b = str('Hello', 'US-ASCII');
```

`StringObject::wrap()` returns the same instance when the given value is
already a `StringObject`. Otherwise it converts the value to a string first,
so it accepts scalars and `Stringable` objects.

## Showcase

The following example turns a rich-text field into a short, readable title:

```php
use function Windwalker\str;

$html = '<p>  windwalker   scalars  is a <b>chainable</b> toolkit.</p>';

$title = str($html)
    ->stripHtmlTags()
    ->trim()
    ->collapseWhitespaces()
    ->upperCaseWords();

echo $title;
// Windwalker Scalars Is A Chainable Toolkit.

echo $title->truncate(20, '...');
// Windwalker Scalars I...
```

Each step returns a new `StringObject`, so `$title` can be reused for the
full title and for the truncated version without repeating the cleanup.

## Inspecting a String

Methods such as `length()`, `contains()`, `startsWith()`, and `endsWith()`
return a native value rather than a new object:

```php
$s = str('Windwalker Scalars');

$s->length();                   // 18
$s->startsWith('Wind');         // true
$s->contains('SCALARS', false); // true, case-insensitive
$s->indexOf('Scalars');         // 11
$s->substrCount('a');           // 3
```

`compare()` returns a negative number, zero, or a positive number, like
`strcmp()`. The case checks inspect the letters of the string:

```php
str('abc')->compare('abd');  // -1
str('abc')->isLowerCase();   // true
str('abc')->hasUpperCase();  // false
```

`isNull()` and `notNull()` check for an empty string. A value of `'0'` is
not null:

```php
str('')->isNull();   // true
str('0')->isNull();  // false
```

## Trimming and Whitespace

`trim()` removes whitespace from both ends. `trimLeft()` and `trimRight()`
remove it from one end only. `collapseWhitespaces()` replaces each run of
whitespace inside the string with a single space:

```php
$text = str("  Hello   World \n");

$text->trim();                         // 'Hello   World'
$text->trimLeft();                     // 'Hello   World \n'
$text->trim()->collapseWhitespaces();  // 'Hello World'
```

## Case Conversion

Case methods change the letters of a string. `upperCaseWords()` capitalizes
each word, and `toggleCase()` swaps the case of every letter:

```php
str('hello')->upperCaseFirst();          // 'Hello'
str('Hello')->lowerCaseFirst();          // 'hello'
str('windwalker scalars')->upperCaseWords(); // 'Windwalker Scalars'
str('aB')->toggleCase();                 // 'Ab'
str('Mixed Case')->toLowerCase();        // 'mixed case'
```

## Prefix and Suffix

`ensureStart()` and `ensureEnd()` add a prefix or suffix only when it is
missing. `removeStart()` and `removeEnd()` do the opposite. `surrounds()`
wraps the string on both sides:

```php
str('path')->ensureStart('/');  // '/path'
str('path')->ensureEnd('/');    // 'path/'
str('/path/')->removeStart('/')->removeEnd('/'); // 'path'
str('x')->surrounds('"');       // '"x"'
```

::: tip
Use `ensureStart()` and `removeEnd()` for path and URL fragments. They
check the prefix or suffix, so they do not change a string that already
has it.
:::

The `intersect` family returns the text that two strings share at one end.
Use `intersectStart()` for a common prefix and `intersectEnd()` for a common
suffix:

```php
str('foobar')->intersectStart('fooz'); // 'foo'
str('foobar')->intersectEnd('zbar');   // 'bar'
str('foobar')->intersect('foobaz');    // 'fooba'
```

## Padding

Padding adds characters until the string reaches a given length. The
`padStart()` method adds them at the start, `padEnd()` at the end, and
`pad()` on both sides:

```php
str('7')->padStart(3, '0');  // '007'
str('ab')->padEnd(4, '-');   // 'ab--'
str('ab')->pad(6, '-');      // '--ab--'
```

## Replacing Text

`replace()` swaps plain-text substrings. Pass arrays to replace several
search strings with one call. `replaceCallback()` finds regex matches and
returns the callback result for each one. `substrReplace()` replaces the
part of the string at a position:

```php
str('snake_case-name')->replace(['_', '-'], ' ');
// 'snake case name'

str('a1b2')->replaceCallback('/\d/', fn (array $m) => $m[0] * 2);
// 'a2b4'

str('hello')->substrReplace('J', 0, 1);
// 'Jello'
```

## Filtering and Mapping Characters

`map()`, `filter()`, and `reject()` treat the string as a sequence of
characters. Each callback receives one character at a time, and UTF-8
characters such as `ü` are passed whole. `map()` replaces each character
with the callback result. `filter()` keeps the characters for which the
callback returns `true`, and `reject()` keeps the others:

```php
str('über')->map(fn (string $c) => $c . '|');
// 'ü|b|e|r|'

str('a1b2')->filter(fn (string $c) => $c !== '1');
// 'ab2'

str('hello')->reject(
    fn (string $c) => in_array($c, ['a', 'e', 'i', 'o', 'u'], true)
);
// 'hll'
```

When no character is kept, the result is an empty string.

::: tip
Use `replace()` for fixed substrings and `replaceCallback()` for regex
matches. Use `map()` and `filter()` when each character is decided on its
own.
:::

## Slicing and Substrings

`slice()` and `substring()` take a start and an end position, and the end is
not included. `first()` and `last()` take a number of characters from either
end. `truncate()` keeps a number of characters and then appends a suffix:

```php
$s = str('hello world');

$s->slice(0, 5);        // 'hello'
$s->substring(1, 3);    // 'el'
$s->first(2);           // 'he'
$s->last(2);            // 'ld'
$s->getChar(4);         // 'o'
$s->truncate(8, '...'); // 'hello wo...'
```

`between()` returns the text between two markers. `insert()`, `removeChar()`,
and `reverse()` change characters by position:

```php
str('[a]')->between('[', ']');  // 'a'
str('abc')->insert('X', 1);     // 'aXbc'
str('abc')->removeChar(1);      // 'ac'
str('abc')->reverse();          // 'cba'
```

## Cleaning HTML

`stripHtmlTags()` removes HTML tags from a string. Pass tag names to keep
them, as in `'<b>'`:

```php
str('<p>a <b>b</b></p>')->stripHtmlTags();      // 'a b'
str('<p>a <b>b</b></p>')->stripHtmlTags('<b>'); // 'a <b>b</b>'
```

::: info
`stripHtmlTags()` removes the tags only. It does not sanitize attributes or
scripts, so use an HTML purifier for untrusted markup.
:::

## Splitting and Converting

`explode()` returns an `ArrayObject`. `chop()` splits the string into
chunks of a given length and also returns an `ArrayObject`:

```php
str('a,b,c')->explode(',');  // ArrayObject ['a', 'b', 'c']
str('abcdefg')->chop(3);     // ArrayObject ['abc', 'def', 'g']
```

To read a number, use `toInteger()` or `toFloat()`. To parse JSON, use
`jsonDecode()`, which returns a `Windwalker\Data\Collection`:

```php
str('42abc')->toInteger();   // 42
str('1.5')->toFloat();       // 1.5

str('{"a": 1}')->jsonDecode()->get('a'); // 1
```

The `ArrayObject` returned by `explode()` can be chained further, which is
useful for parsing:

```php
$values = str(' 1, 2 , , 3 ')
    ->explode(',')
    ->map(fn (string $v) => trim($v))
    ->filter()
    ->map(fn (string $v) => (int) $v)
    ->values();

// [1, 2, 3]
```

## Inflection

The inflection methods detect and convert English singular and plural
forms:

```php
str('flowers')->isPlural();   // true
str('flower')->isSingular();  // true
str('flower')->toPlural();    // 'flowers'
str('flowers')->toSingular(); // 'flower'
```

## Calls to the Str Helper

Any public static method of `Windwalker\Utilities\Str` can be called
directly on a `StringObject`. The call passes the string as the first
argument. The result is wrapped in a new `StringObject` when it is a string,
and returned as-is otherwise:

```php
str('Flowers')->startsWith('flo', false); // true, a native bool
```

Use `explode()` to split a string into an `ArrayObject`.

::: info
Calls to a name that does not exist throw a `BadMethodCallException`.
:::

## Encoding

The encoding decides how `length()`, `indexOf()`, and the other position
methods count characters. Each instance has an encoding, and
`withEncoding()` returns a copy with a different one:

```php
str('über')->length();                 // 4, read as UTF-8
str('über', 'ISO-8859-1')->length();   // 5, read byte by byte
str('über', 'ISO-8859-1')
    ->withEncoding('UTF-8')
    ->length();                        // 4 again
```

::: warning
A string read with the wrong encoding produces silently wrong lengths and
offsets. Set the encoding to match the source of the text, such as the
file, database, or request charset.
:::

## Immutability

All transformations return a new instance, and `withString()` returns a copy
with a different string:

```php
$s = str('abc');
$u = $s->toUpperCase();

echo $s; // abc
echo $u; // ABC
```

The `ArrayAccess` methods are the exception. Writing to an offset changes
the object in place:

```php
$s = str('abc');
$s[0] = 'X';

echo $s; // Xbc
```

::: warning
`$s[0] = 'X'` and `unset($s[0])` change the object itself, not a copy.
Other `StringObject` values that share the same instance see the change.
Use `replace()` or `substrReplace()` when a new value is needed.
:::

To get the native string, use `getString()` or cast with `(string)`:

```php
$native = str('abc')->getString();
$native = (string) str('abc');
```
