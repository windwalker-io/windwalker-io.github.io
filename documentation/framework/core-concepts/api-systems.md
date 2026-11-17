---
layout: doc
---

# API Systems

Windwalker Core treats an API as a set of controller methods that return
JSON. Routing, input, and entity layers are shared with page controllers,
so an API endpoint does not need a separate framework stack.

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
- **Entity serialization**: entities convert to JSON with control over
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
- [Middlewares and CORS](./api-systems/middlewares-and-cors.md): API
  middlewares and cross-origin configuration.
- [Entity Serialization](./api-systems/entity-serialization.md): returning
  entities as JSON and controlling exposed properties.
