---
layout: doc
---

# Framework

This section documents the Windwalker application layer (`windwalker/core`): the part of the framework that turns the standalone [components](../components/) into a running application.

Components such as DI, Event, HTTP and Database work on their own. The application layer assembles them: it boots packages, loads configuration, routes requests to controllers, renders views and provides the `windwalker` command-line tool.

Start with:

- [Requirements and Installation](./getting-started/installation)

If you want a hands-on tutorial instead, see the [Guides](../guides/start/).
