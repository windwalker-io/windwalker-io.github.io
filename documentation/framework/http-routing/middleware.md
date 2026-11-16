---
layout: doc
---

# Middleware

This page is an outline. The content will be written later.

## Middleware Attributes

Some middlewares can be placed directly on a controller method as an
attribute. The attribute applies only to that method.

- `#[JsonApi]`: JSON envelope for the return value, and JSON error responses.
- `#[Json]`: return value as a `JsonResponse`, without the envelope.
- `#[Csrf]`: runs `CsrfMiddleware` before the method.
- `#[Method('POST', ...)]`: allows only the listed HTTP methods (400 otherwise).

