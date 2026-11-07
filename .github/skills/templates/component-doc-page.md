# Component doc page template

Use this template when writing first-time documentation for a component or package. It is a reference manual, not a step-by-step tutorial. Replace each bracketed placeholder and remove sections that do not apply.

```md
---
layout: doc
title: [Component Name]
---

# [Component Name]

[One paragraph: what the package does and when to use it. Name the main classes.]

## Installation

[Composer command and the minimum PHP version, verified from `composer.json`.]

## Standalone usage

[How to use the package without the framework. Show the minimal construction and the main entry point.]

## Usage in the framework

[How the package is injected or registered in the framework: DI container, application, or service provider. Show the registration and the typical injection.]

## [Feature area]

[Concise description. Then a list or table of public methods, options, or parameters with their types, defaults, and purpose. Follow with a complete, verified code sample.]

## [Feature area]

...

## Events

[Only if the package dispatches or listens to events.]

## Related components

- [Link to related component page, after confirming it exists.]
```

Rules for every section:

- Verify every class, method, parameter, and default against the source.
- Use complete code samples with the imports that matter.
- Keep the wording neutral and concise. Do not use "I" or "we".
- Split a large feature area into a section page only after the user approves it.
