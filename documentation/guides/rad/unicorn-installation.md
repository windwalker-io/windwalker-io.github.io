---
layout: doc
---

# Install the Unicorn Package

The Windwalker Starter does not include Unicorn or the database and form packages used by this guide. Install them in the application root:

```bash
composer require windwalker/unicorn:^1.2 windwalker/database:^4.0 windwalker/orm:^4.0 windwalker/form:^4.0
```

Unicorn requires Windwalker Core and discovers its package provider through Composer metadata. The other packages provide database migrations, ORM entities, and form definitions used in the following chapters.

Publish Unicorn's configuration and language resources to the application:

```bash
php windwalker pkg:install windwalker/unicorn --tag config
php windwalker pkg:install windwalker/unicorn --tag lang
```

This guide does not use file-upload fields, so it does not install Unicorn's optional upload route. If uploads are added later, configure an upload endpoint protected by the application's authentication middleware.

Confirm that the Unicorn generator commands are available:

```bash
php windwalker g
```

The list includes commands such as `unicorn:controller`, `unicorn:view-grid`, and `unicorn:view-edit`.
