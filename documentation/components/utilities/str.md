---
layout: doc
title: Str
component: utilities
---

# Str

`Str` is a static helper for strings. Many native PHP string functions
count bytes, not characters, so a multibyte word such as `Wörld` gives
different lengths and positions than it looks like. Their argument orders
also vary from function to function. `Str` counts characters in the
encoding you use, which is UTF-8 by default, and gives every method the
same argument order: the string first.

## Method Summary

Most methods take the string as their first argument. The parameters
listed below follow that string.

::: tip
Most `Str` features are also available on [`StringObject`](../scalars/string-object), returned by the
`str()` helper in the [Scalars](../scalars/) package. Prefer the object
version when you chain several operations on one value. Every public
method of `Str` can be called on a `StringObject` under the same name,
with the string passed automatically.
:::

| Method | Parameters | Description | StringObject |
|--------|------------|-------------|--------------|
| `getChar()` | `$string, $pos, $encoding = null` | Character at a position. | Same name |
| `between()` | `$string, $start, $end, $offset = 0, $encoding = null` | Text between two markers. | Same name |
| `collapseWhitespaces()` | `$string` | Collapses whitespace runs to one space. | Same name |
| `replaceCRLF()` | `$string, $replace = "\n"` | Replaces `\r\n` line endings. | Same name |
| `safeReplace()` | `$search, $replace, $subject, &$count = null` | Replaces, keeping escaped (`\`) terms. | Same name |
| `contains()` | `$string, $search, $caseSensitive = true, $encoding = null` | Whether a substring exists. | Same name |
| `startsWith()` | `$string, $target, $caseSensitive = true, $encoding = null` | Whether the string starts with a value. | Same name |
| `endsWith()` | `$string, $search, $caseSensitive = true, $encoding = null` | Whether the string ends with a value. | Same name |
| `ensureStart()` | `$string, $search, $encoding = null` | Adds a prefix when missing. | Same name |
| `ensureEnd()` | `$string, $search, $encoding = null` | Adds a suffix when missing. | Same name |
| `removeStart()` | `$string, $search, $encoding = null` | Removes a prefix when present. | Same name |
| `removeEnd()` | `$string, $search, $encoding = null` | Removes a suffix when present. | Same name |
| `removeChar()` | `$string, $offset, $length = null, $encoding = null` | Removes characters at a position. | Same name |
| `first()` | `$string, $length = 1, $encoding = null` | Leading characters. | Same name |
| `last()` | `$string, $length = 1, $encoding = null` | Trailing characters. | Same name |
| `slice()` | `$string, $start, $end = null, $encoding = null` | Slice with an exclusive end. | Same name |
| `substring()` | `$string, $start, $end = null, $encoding = null` | Substring by start and end. | Same name |
| `insert()` | `$string, $insert, $position, $encoding = null` | Inserts text at a character position. | Same name |
| `surrounds()` | `$string, $substring = ['"', '"']` | Wraps the string with two strings. | Same name |
| `toggleCase()` | `$string, $encoding = null` | Swaps the case of each letter. | Same name |
| `truncate()` | `$string, $length, $suffix = '', $wordBreak = true, $encoding = null` | Shortens with an optional suffix. | Same name |
| `pad()` | `$string, $length = 0, $substring = ' ', $encoding = null` | Pads both sides, centered. | Same name |
| `padStart()` | `$string, $length = 0, $substring = ' ', $encoding = null` | Pads the start. | Same name |
| `padEnd()` | `$string, $length = 0, $substring = ' ', $encoding = null` | Pads the end. | Same name |
| `map()` | `$string, $callback, $encoding = null` | Maps each character. | Same name |
| `filter()` | `$string, $callback, $encoding = null` | Keeps characters the callback accepts. | Same name |
| `reject()` | `$string, $callback, $encoding = null` | Drops characters the callback accepts. | Same name |
| `intersect()` | `$string1, $string2, $encoding = null` | Longest common substring. | Same name |
| `intersectStart()` | `$string1, $string2, $encoding = null` | Common prefix of two strings. | Same name |
| `intersectEnd()` | `$string1, $string2, $encoding = null` | Common suffix of two strings. | Same name |
| `match()` | `$pattern, $string, $option = 'msr', $encoding = null` | Whether a regex matches from the start of the string. | Same name |
| `hasUpperCase()` | `$string, $encoding = null` | Whether an uppercase letter exists. | Same name |
| `hasLowerCase()` | `$string, $encoding = null` | Whether a lowercase letter exists. | Same name |
| `isUpperCase()` | `$string` | Whether the string is all uppercase. | Same name |
| `isLowerCase()` | `$string` | Whether the string is all lowercase. | Same name |
| `increment()` | `$string, $pattern = '%s (%d)', $n = null` | Adds or raises a counter in a name. | Same name |
| `numToAlpha()` | `$n` | Number to column label, starting at `A` for `0`. | Static only |
| `alphaToNum()` | `$str` | Column label to number. | Same name |

## Minimal Setup

`Str` needs no setup. Import the class and call its methods:

```php
use Windwalker\Utilities\Str;

$path = Str::ensureStart('admin', '/');
// /admin
```

## Showcase: Normalizing a Title

User input often arrives with extra spaces, line breaks, and more text
than a list page can show. The following example cleans a title and
shortens it to a word boundary:

```php
use Windwalker\Utilities\Str;

$input = "  Hello   Wörld,\r\nthis is a long title  ";

$title = Str::collapseWhitespaces($input);
// 'Hello Wörld, this is a long title'

$summary = Str::truncate($title, 20, '...', false);
// 'Hello Wörld, this...'
```

`collapseWhitespaces()` removes the leading and trailing spaces, and
turns every run of whitespace, including line breaks, into a single
space. `truncate()` then limits the length. The `false` argument asks it
to avoid cutting a word in half, which is covered below.

## Checking Text

`contains()`, `startsWith()`, and `endsWith()` test for a substring. Each
takes a `$caseSensitive` flag, which is `true` by default:

```php
Str::contains('Hello World', 'world');        // false
Str::contains('Hello World', 'world', false); // true

Str::startsWith('Hello', 'hel', false);       // true
Str::endsWith('file.PHP', '.php', false);     // true
```

`hasUpperCase()`, `hasLowerCase()`, `isUpperCase()`, and
`isLowerCase()` check the letter case of a string:

```php
Str::hasUpperCase('Hello');  // true
Str::isLowerCase('hello');   // true
```

`between()` returns the text between two markers. It returns an empty
string when either marker is missing:

```php
Str::between('[abc]', '[', ']');  // abc
Str::between('abc', '[', ']');    // ''
```

## Ensuring and Removing Affixes

`ensureStart()` and `ensureEnd()` add a prefix or suffix only when it is
missing. `removeStart()` and `removeEnd()` do the reverse, and leave the
string unchanged when the affix is not present:

```php
Str::ensureStart('blog/', '/');   // /blog/
Str::ensureEnd('/blog', '/');     // /blog/

Str::removeStart('/blog/', '/');  // blog/
Str::removeEnd('file.php', '.php'); // file
```

`removeChar()` removes the character at one position. `first()` and
`last()` return the given number of characters from either end:

```php
Str::first('Hello', 2);  // He
Str::last('Hello', 2);   // lo
```

## Slicing and Reading Characters

`slice()` and `substring()` both take a start and an optional end. The
end position is exclusive, and a negative value counts from the end of the
string. `getChar()` returns the character at one position:

```php
Str::slice('Hello World', 0, -6);  // Hello
Str::substring('Hello', 1, 3);     // el
Str::getChar('héllo', 1);          // é
```

`insert()` puts text at a character position. If the position is beyond
the end of the string, the string is returned unchanged.

## Padding and Truncating

`padStart()` and `padEnd()` extend a string to a length with a filler
string. `pad()` centers the text, and any extra filler goes on the right:

```php
Str::padStart('7', 3, '0');  // 007
Str::padEnd('ab', 4, '.');   // ab..
Str::pad('ab', 5, '-');      // -ab--
```

`truncate()` shortens a string and appends a suffix. Its fourth argument,
`$wordBreak`, decides whether a word may be cut:

```php
$text = 'Hello beautiful world';

Str::truncate($text, 12, '...', true);
// 'Hello beauti...'

Str::truncate($text, 12, '...', false);
// 'Hello...'
```

When `$wordBreak` is `false`, the string is cut at the last space before
the limit. The default is `true`, which cuts at the exact length.

## Transforming Text

`collapseWhitespaces()` and `replaceCRLF()` normalize spacing and line
endings. `toggleCase()` swaps the case of each letter:

```php
Str::replaceCRLF("a\r\nb");     // "a\nb"
Str::toggleCase('Hi There');    // hI tHERE
```

`surrounds()` wraps a string with two characters. Pass one string to use it
on both sides, or an array for different opening and closing characters:

```php
Str::surrounds('x');              // "x"
Str::surrounds('x', ['(', ')']);  // (x)
```

`map()`, `filter()`, and `reject()` work on each character. The callback
receives one character at a time:

```php
Str::map('abc', fn (string $c) => strtoupper($c));  // ABC

Str::filter('a1b2', fn (string $c) => is_numeric($c)); // 12
Str::reject('a1b2', fn (string $c) => is_numeric($c)); // ab
```

`safeReplace()` replaces substrings like `str_replace()`, but a search
term preceded by a backslash is kept as written. Use it when a template
contains text that must not be replaced:

```php
Str::safeReplace('{name}', 'Alice', 'Hi \\{name}, {name}');
// 'Hi \{name}, Alice'
```

## Numbering and Incrementing

`increment()` adds or raises a counter in a name, which is useful for
generating unique file or slug names. The default pattern is `%s (%d)`:

```php
Str::increment('report');        // report (2)
Str::increment('report (2)');    // report (3)
Str::increment('report-1', '%s-%d'); // report-2
```

`numToAlpha()` and `alphaToNum()` convert between a number and a
spreadsheet-style column label. The numbering starts at zero:

```php
Str::numToAlpha(0);   // A
Str::numToAlpha(26);  // AA
Str::alphaToNum('AB'); // 27
```

## Encoding

Methods that work on characters, such as `slice()`, `truncate()`, and
`toggleCase()`, accept an optional `$encoding` as their last argument.
When it is omitted, the current `mb_internal_encoding()` is used.

::: warning
Positions, lengths, and case conversions follow the encoding. If your
data is not UTF-8, such as legacy ISO-8859-1 text, pass the encoding
explicitly. Otherwise `slice()` and `truncate()` can return wrong
results without an error.
:::

```php
Str::slice($legacyText, 0, 5, Str::ENCODING_DEFAULT_ISO);
```

## Related

- [Arr](./arr): the array helper in the same package.
- [Scalars](../scalars/string-object): a chainable wrapper that delegates
  its string methods to `Str`.
