---
layout: doc
title: Introduction
part: Components
chapter: Utilities
menu: components/utilities
component: utilities
---

# Introduction

Windwalker Utilities is a set of small helpers that other Windwalker
packages build on. Its two main classes, `Arr` and `Str`, cover the array
and string work that native PHP functions make awkward: nested data is
read by key path, argument order is consistent, and text is handled as
UTF-8 by default.

The package has these main parts:

- `Arr`: static helpers for arrays and objects. It reads, writes, filters,
  queries, merges, and diffs data by dot-separated key paths. See
  [Arr](./arr).
- `Arr::sync()`: splits existing and incoming rows into creating, deleting,
  and keeping groups. See [Array Sync](./arr-sync).
- `Str`: static helpers for strings. It searches, trims, pads, truncates,
  and increments text with encoding awareness. See [Str](./str).

Both classes are static. You call them directly, with no instance to
create and no service to register.

## Installation

```bash
composer require windwalker/utilities ^4.0
```

The package requires PHP 8.4.6 or later.

## Use as Standalone Component

Import the classes you need. No configuration is required:

```php
use Windwalker\Utilities\Arr;
use Windwalker\Utilities\Str;

$config = [
    'app' => ['name' => 'blog'],
];

$name = Arr::get($config, 'app.name');   // blog
$path = Str::ensureStart('admin', '/');  // /admin
```

## Use in Windwalker

The helpers are not registered in the Windwalker container. Use them the
same way as in standalone code, by importing the class where you need it:

```php
use Windwalker\Utilities\Arr;

class UserProfile
{
    public function displayName(array $user): string
    {
        return Arr::get($user, 'profile.name') ?? 'Guest';
    }
}
```

## Core Concepts

Both classes follow the same two ideas.

- **Key paths**: a dot-separated string such as `db.host` addresses a value
  inside nested arrays or objects. Passing a different delimiter changes
  the separator. Read [Arr](./arr) for details.
- **Non-destructive by default**: most methods return a new value and
  leave the input unchanged. The exceptions, such as `Arr::takeout()`, are
  named in their topic pages.

## Topic Pages

- [Arr](./arr): reading, writing, selecting, and reshaping arrays and
  objects by key path.
- [Array Sync](./arr-sync): comparing a stored list with incoming input to
  decide what to create, delete, and update.
- [Str](./str): searching, trimming, padding, truncating, and transforming
  strings, with encoding support.

## Related components

- [Scalars](../scalars/): wraps arrays and strings in chainable objects
  that use `Arr` and `Str` internally.
