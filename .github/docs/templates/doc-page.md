# General doc page template

Use this template for every documentation page that is not a component Overview. Topic pages, guides, and framework pages follow this flow. For a component's Overview page, use `.github/docs/templates/component-doc-page.md` instead. Replace each bracketed placeholder and remove sections that do not apply.

## Page skeleton

```md
---
layout: doc
title: [Page Title]
---

# [Page Title]

[One paragraph: what the feature is for and the problem it solves. Give a concrete scenario when the feature solves a real-world problem.]

## [Enabling or Obtaining It]

[The minimal way to enable or obtain the feature, and how its parts fit together. Name the main classes.]

## Complete Example

[One realistic example that runs end to end.]

```php
// Full, runnable example with the imports that matter.
```

## [Feature Concept]

[Detailed features, grouped by concept. Explain why it works this way.]

::: tip
[A practice that improves results.]
:::

## [Security or Trap Section]

[Reminders and security-sensitive behavior, placed where they matter.]

::: warning
[Data loss, disabled security checks, silent wrong results, or hard-to-notice failures.]
:::

## Related

- [Link to related page, after confirming it exists.]
```

## Introducing methods or syntax

When a class's methods, properties, or syntax need explaining, use one large code block with inline comments for each use case. Do not write a prose list or a table for each member. Use this shape:

```php
use Windwalker\Authentication\AuthResult;
use Windwalker\Authentication\ResultSet;

// Factory methods: create a result with a status.
$ok = AuthResult::success(['username' => 'alice']);
$fail = AuthResult::invalidPassword(['username' => 'alice']);

// Check the status before using the result.
if ($ok->status === AuthResult::SUCCESS) {
    // Credential was accepted.
}

// Keep the exception for logging; do not expose it to users.
if ($fail->exception) {
    $logger->error($fail->exception->getMessage());
}

// Collect results from several methods, then read the first one.
$set = (new ResultSet())
    ->addResult('database', $ok)
    ->addResult('ldap', $fail);

$first = $set->first(); // Regardless of status.
```

## Rules for every page

- Verify every class, method, parameter, and default against the source.
- Use complete code samples with the imports that matter. Keep samples short and realistic.
- Keep the wording neutral and concise. Do not use "I" or "we".
- Do not list every method or option. Name the main ones and point to the source for complete signatures.
- Never open a page with detailed features. Start with purpose, then minimal enabling, then the complete example.
- Place each reminder right after the code or concept it concerns, using `tip`, `info`, or `warning` as the documentation style instructions define.
- Keep every line in code samples at 75 characters or fewer. If a line is longer, break it vertically, one argument, array item, or chained call per line.
- Never use the word "pitfall" in headings or labels.
