---
layout: doc
description: Overview of Windwalker's API system, covering JSON responses and input, error responses, CORS and JSON middlewares, and object serialization.
---

# API Systems

Windwalker Core treats an API as a set of controller methods that return
JSON. Routing, input, and entity layers are shared with page controllers,
so an API endpoint does not need a separate framework stack.

The chapter is not only for public APIs. Local AJAX calls from your own
pages can use the same controllers, envelope, errors, and CORS settings.

This chapter explains how the pieces work. Use the source for full
method signatures.

## What the API system provides

- **JSON responses**: `#[JsonApi]` wraps a controller result in a standard
  JSON envelope.
- **JSON input**: `#[Input]` and `#[BodyValue]` read request values into
  method arguments.
- **Error responses**: `ApiException` and error code enums turn failures
  into JSON with an HTTP status.
- **Middlewares**: CORS and JSON response handling run as
  route middlewares.
- **Object serialization**: entities and records convert to JSON with control over
  exposed properties.

## How the parts fit together

1. The router matches the route and selects a controller method.
2. Middlewares run in order, including `JsonApiMiddleware` when the method
   has `#[JsonApi]`.
3. Input attributes resolve method arguments from the query, route, body,
   or headers.
4. The method returns an array, an entity, or a response object.
5. `JsonApiMiddleware` wraps the result in a `JsonBuffer` envelope.
6. Any exception in the chain becomes a JSON error response.

## Topic pages

- [JSON API Response](./api-systems/json-api.md): the envelope format and
  the `#[JsonApi]` attribute.
- [Routing and JSON Input](./api-systems/routing-and-input.md): method
  attributes, route parameters, and request body values.
- [Error Handling and Error Codes](./api-systems/error-codes.md): throwing
  API errors and defining error code enums.
- [CORS](./api-systems/cors.md): cross-origin configuration
  middlewares and cross-origin configuration.
- [Object Serialization](./api-systems/object-serialization.md): returning
  entities as JSON and controlling exposed properties.
