---
layout: doc
title: Text Transforms
component: utilities
---

# Text Transforms

Three kinds of text work appear again and again: filling a fixed text with
values, choosing the singular or plural form of a word, and converting a
name from one naming style to another. Each needs a few lines of logic, and
each is easy to repeat in several places with slightly different rules.
`SimpleTemplate`, `StrInflector`, and `StrNormalize` cover these three
tasks, and this page describes them together because they share one goal:
turning text into other text.

## Simple Template

Notification emails, generated file names, and log lines often need a few
values inserted into a fixed text. A full template engine is more than
these cases need, and string concatenation spreads the text over the code
that builds it. `SimpleTemplate` replaces named placeholders with values
from an array. It supports nested values through a delimiter, and the
template stays a plain string that can be stored or loaded from a file.

### Minimal Setup

Call the static `render()` method with the template and the data:

```php
use Windwalker\Utilities\SimpleTemplate;

SimpleTemplate::render(
    'Hello {{ name }}!',
    ['name' => 'Alice'],
);
// Hello Alice!
```

The default placeholder uses double braces around the key name, as the
examples above show.

### Showcase: A Shipping Notice

The following example creates a template object once, and renders it for
each order. Nested values are read with dots:

```php
use Windwalker\Utilities\SimpleTemplate;

$notice = SimpleTemplate::create(
    "Hi {{ user.name }},\n"
    . "Order {{ order.id }} has shipped.\n"
    . "Track it at {{ order.tracking.url }}."
);

$body = $notice([
    'user' => ['name' => 'Alice'],
    'order' => [
        'id' => 1042,
        'tracking' => ['url' => 'https://example.com/t/abc'],
    ],
]);
```

The template object is callable, so `$notice([...])` renders it. The same
object can render any number of data sets.

### Placeholders

A placeholder names a key in the data. A dot separates the levels of a
nested array or object:

- A key such as `name` reads `$data['name']`.
- A dotted path such as `user.name` reads `$data['user']['name']`.

A missing key renders as an empty string, so a typo in a placeholder
removes the value rather than failing. A value that is an array or an
object is converted to text with `TypeCast::toString()`, which gives
`Array()` for an array.

Pass another delimiter when the keys contain dots:

```php
SimpleTemplate::render(
    '{{ a/b }}',
    ['a' => ['b' => 'value']],
    '/',
);
// value
```

::: warning
Values are inserted as they are, without escaping. Do not use the output
as HTML, JSON, or a SQL fragment when the values come from users. Escape
them for that context first.
:::

### Custom Wrappers

The placeholder delimiters can be changed. Pass the opening and closing
strings as the fourth argument of `render()`, or as the third argument of
`create()`:

```php
$template = SimpleTemplate::create(
    'Hi [[ name ]]',
    '.',
    ['[[', ']]'],
);

$template(['name' => 'Bob']); // Hi Bob
```

`setVarWrapper()` changes the wrappers of an existing template object.

::: info
`Assert` builds its messages with this engine, using single braces such as
`{value}`. Its placeholders work the same way.
:::

### Changing a Template

The template text and the delimiter can be read and changed on the object:

- `getTemplate()` and `setTemplate()` read and replace the text.
- `getDelimiter()` and `setDelimiter()` read and change the path delimiter.
- `renderTemplate()` renders with the current text and wrappers.

`setTemplate()` and `setDelimiter()` return the object, so calls can be
chained.

### Simple Template Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `create()` | `string $template, string $delimiter = '.', ?array $wrapper = null` | Creates a template object. |
| `render()` | `string $string, array $data = [], string $delimiter = '.', ?array $wrapper = null` | Renders a template in one call. |
| `__invoke()` | `array $data = []` | Renders the template, the same as `renderTemplate()`. |
| `renderTemplate()` | `array $data = []` | Renders the current template text. |
| `setVarWrapper()` | `string $start, string $end` | Sets the placeholder wrappers. |
| `getTemplate()` / `setTemplate()` | `string $template` | Reads or replaces the template text. |
| `getDelimiter()` / `setDelimiter()` | `string $delimiter` | Reads or sets the path delimiter. |

## Inflector

Code that generates names often needs a singular or a plural form: a
table named `users` for a `User` model, a route `/posts` for a `Post`
resource, or a label that reads "1 item" or "2 items". English plural
rules are irregular enough that a simple `+ 's'` gives wrong results for
`city` and `box`. `StrInflector` converts words between their singular and
plural forms, and reports whether a word is already in one of them.

### Inflector Minimal Setup

`StrInflector` uses the `symfony/string` package for the English rules.
Install it in your project:

```bash
composer require symfony/string
```

Without it, the methods throw a `DomainException`. The inflector is a static
class, so no other setup is needed:

```php
use Windwalker\Utilities\StrInflector;

StrInflector::toPlural('box');      // boxes
StrInflector::toSingular('cities'); // city
```

### Showcase: Naming a Resource

The following example derives the names of a REST resource from a model
name. The collection route uses the plural, and the item label uses the
singular:

```php
use Windwalker\Utilities\StrInflector;

function resourceNames(string $model): array
{
    $singular = StrInflector::toSingular($model);

    return [
        'table' => strtolower(StrInflector::toPlural($singular)),
        'route' => '/' . strtolower(StrInflector::toPlural($singular)),
        'label' => strtolower($singular),
    ];
}

resourceNames('Post');
// [
//     'table' => 'posts',
//     'route' => '/posts',
//     'label' => 'post',
// ]

resourceNames('Category');
// [
//     'table' => 'categories',
//     'route' => '/categories',
//     'label' => 'category',
// ]
```

Calling `toSingular()` first makes the function accept either a singular or
a plural model name, so `resourceNames('Posts')` gives the same result.

### Checking the Form of a Word

`isPlural()` and `isSingular()` report whether a word is already in one of
the forms. They compare the word with its converted form:

```php
StrInflector::isPlural('data');   // true
StrInflector::isSingular('user'); // true
StrInflector::isPlural('user');   // false
```

Some words have the same form in both numbers, such as `sheep`. For such a
word, both `isSingular()` and `isPlural()` return `true`, so do not use
these methods to decide the number of a word that is passed in as a count.

### Candidate Forms

Some words have more than one accepted form. The `getPossible*()` methods
return every candidate, while `toPlural()` and `toSingular()` return one
form:

```php
StrInflector::getPossiblePluralize('status');
// ['status', 'statuses']

StrInflector::toPlural('status');
// 'statuses'

StrInflector::getPossibleSingularize('posts');
// ['post']
```

Use the candidate list when you need to match a word against a database
or a list of known names, and accept any of the forms.

### Custom Inflection

`StrInflector::$inflector` holds the object that does the work. It is
created the first time it is needed, as an `EnglishInflector`. Replace it
with any object that implements `InflectorInterface` to use other rules, such
as those of another language:

```php
use Symfony\Component\String\Inflector\InflectorInterface;

StrInflector::$inflector = $myInflector;
```

::: info
Replacing the inflector changes the result of every call in the process. Set
it once at startup, not in the middle of a request.
:::

### Inflector Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `toPlural()` | `string $word` | Returns the plural form. |
| `toSingular()` | `string $word` | Returns the singular form. |
| `isPlural()` | `string $word` | Whether the word equals its plural form. |
| `isSingular()` | `string $word` | Whether the word equals its singular form. |
| `getPossiblePluralize()` | `string $word` | Returns all candidate plural forms. |
| `getPossibleSingularize()` | `string $word` | Returns all candidate singular forms. |

## Str Normalize

A name appears in many forms across a system. A property is `userName`, a
database column is `user_name`, a URL segment is `user-name`, and a class
is `UserName`. Converting by hand means remembering which form each place
expects, and writing one more regular expression each time. `StrNormalize`
splits a name into its words and joins them in the style you need. Words
are recognized from camel case, underscores, dashes, dots, and spaces.

### Normalize Minimal Setup

`StrNormalize` is a static class. Pass a name in any style, and ask for the
style you need:

```php
use Windwalker\Utilities\StrNormalize;

StrNormalize::toSnakeCase('UserName'); // user_name
StrNormalize::toKebabCase('UserName'); // user-name
```

### Showcase: Mapping Form Fields to Columns

The following example turns the fields of a submitted form into database
columns and property names. The form uses one style, and each target uses
another:

```php
use Windwalker\Utilities\StrNormalize;

$form = [
    'firstName' => 'Alice',
    'lastName' => 'Smith',
];

$columns = [];

foreach ($form as $field => $value) {
    $columns[StrNormalize::toSnakeCase($field)] = $value;
}

// ['first_name' => 'Alice', 'last_name' => 'Smith']

$route = '/users/' . StrNormalize::toKebabCase('ProfileSettings');
// /users/profile-settings
```

The conversions work on every word of the input, so `firstName`,
`first_name`, and `first-name` give the same words to any target style.

### Splitting Names

The methods that convert style are built on the split methods. Use them
directly when you need the words:

- `splitCamelCase()` splits at case boundaries. `userIDName` gives
  `user`, `ID`, and `Name`, and `HTTPServer` gives `HTTP` and `Server`.
- `splitBy()` splits at one separator. `splitBy('a_b-c', '_')` gives `a`
  and `b-c`.
- `splitAll()` splits at camel case, underscores, dashes, dots, and spaces.
  `splitAll('UserName-x_y')` gives `User`, `Name`, `x`, and `y`.

### Joining Words

`separate()` joins the words of a name with any separator, and keeps the
case of each word:

```php
StrNormalize::separate('UserName', '-'); // User-Name
StrNormalize::separate('fooBarBaz', ' '); // foo Bar Baz
```

The named methods apply a fixed separator and case:

- `toSpaceSeparated()`, `toDotSeparated()`, and
  `toUnderscoreSeparated()` keep the case of each word, so `UserName`
  becomes `User Name`, `User.Name`, or `User_Name`.
- `toSnakeCase()` and `toKebabCase()` lowercase the words, so `UserName`
  becomes `user_name` or `user-name`.
- `toCamelCase()` joins the words with the first one in lowercase, so
  `user_name` and `user name` become `userName`.
- `toPascalCase()` capitalizes every word, so `user-name` becomes
  `UserName`.
- `toVariable()` returns a variable name in camel case, so `order_item`
  becomes `orderItem`.
- `toKey()` returns a lowercase key with underscores, so `User Name`
  becomes `user_name`.

### Class Namespaces

`toClassNamespace()` converts a path with slashes, or a namespace with
backslashes, into a class namespace:

```php
StrNormalize::toClassNamespace('app/models/user');
// App\Models\User
```

::: info
The conversion only changes the separators and the case of each part. It
does not check that the class exists.
:::

### Normalize Method Summary

| Method | Parameters | Description |
|--------|------------|-------------|
| `splitCamelCase()` | `string $str` | Splits at case boundaries. |
| `splitBy()` | `string $str, string $separator = '_'` | Splits at one separator. |
| `splitAll()` | `string $str` | Splits at all recognized separators. |
| `separate()` | `string $input, string $separator = '_'` | Joins the words with a separator, keeping case. |
| `toCamelCase()` | `string $input` | Camel case, starting in lowercase. |
| `toPascalCase()` | `string $input` | Pascal case. |
| `toSnakeCase()` | `string $input` | Lowercase words joined with underscores. |
| `toKebabCase()` | `string $input` | Lowercase words joined with dashes. |
| `toSpaceSeparated()` | `string $input` | Words joined with spaces, keeping case. |
| `toDotSeparated()` | `string $input` | Words joined with dots, keeping case. |
| `toUnderscoreSeparated()` | `string $input` | Words joined with underscores, keeping case. |
| `toVariable()` | `string $input` | Variable name in camel case. |
| `toKey()` | `string $input` | Lowercase key with underscores. |
| `toClassNamespace()` | `string $class` | Converts a path or namespace to a class namespace. |

## Related

- [Assert](./assert): uses the template engine for its message placeholders.
- [Str](./str): other string helpers.
- [Type Cast](./type-cast): converts array and object values to text.
