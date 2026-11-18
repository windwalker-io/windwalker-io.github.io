---
layout: doc
title: Getting Started
---

# Getting Started

The Database service gives your application a single connection object
for MySQL, PostgreSQL, SQLite, SQL Server, and other engines. It handles
connection setup, strict SQL modes, TLS, read-only protection, and
transactions, so your code can focus on queries.

This page covers installation, the connection configuration, and the
basic ways to read and write data. For the full API, see the component
docs:

- [Database component](/documentation/components/database/)
- [Query builder](/documentation/components/query/)
- [ORM](/documentation/components/orm/)
- [Connection pool](/documentation/components/pool/)

## Installation

Install the database package. It depends on `windwalker/query`, so the
query builder is installed automatically.

```bash
composer require windwalker/database
```

Install `windwalker/orm` as well if you want entity mapping. It is
recommended for most applications.

```bash
composer require windwalker/orm
```

## Minimal Setup

The simplest connection uses a driver name and the host, database,
user, and password. The driver string follows the form
`{platform}_{driver}`, for example `pdo_mysql` or `mysqli`.

```php
use Windwalker\Database\DatabaseFactory;

$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        'host' => 'localhost',
        'dbname' => 'blog',
        'user' => 'root',
        'password' => 'secret',
    ],
);

$rows = $db->prepare('SELECT * FROM posts')->all();
```

Inside a Windwalker application, the framework builds the adapter for
you from the configuration file. You do not need to call
`DatabaseFactory` yourself.

## Configuration File

The framework ships a `database.config.php` file that reads its values
from environment variables and returns a `DriverOptions` object.
`DatabaseServiceFactory::createAdapter()` builds the adapter from it.

```php
// etc/database.config.php
use Windwalker\Database\Driver\DriverOptions;

return [
    'driver' => env('DATABASE_DRIVER'),
    'connections' => [
        'local' => new DriverOptions(
            host: env('DATABASE_HOST') ?: 'localhost',
            dbname: env('DATABASE_NAME'),
            user: env('DATABASE_USER'),
            password: env('DATABASE_PASSWORD'),
            port: env('DATABASE_PORT'),
            prefix: env('DATABASE_TABLE_PREFIX'),
            dsn: env('DATABASE_DSN'),
        ),
    ],
];
```

Set the matching variables in your `.env` file:

```ini
DATABASE_DRIVER=pdo_mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=blog
DATABASE_USER=blog_user
DATABASE_PASSWORD=change-me
DATABASE_TABLE_PREFIX=wind_
```

::: warning
Do not commit real credentials. Keep `.env` out of version control and
use a separate value for each environment.
:::

## Supported Drivers

The `pdo_*` drivers use PHP PDO. The native drivers use the PHP
extension directly. Choose a PDO driver unless you have a reason to use
a native one.

- `pdo_mysql`: MySQL and MariaDB through PDO.
- `pdo_pgsql`: PostgreSQL through PDO.
- `pdo_sqlite`: SQLite through PDO.
- `pdo_sqlsrv`: Microsoft SQL Server through PDO.
- `pdo_oci`, `pdo_odbc`: Oracle and ODBC through PDO.
- `mysqli`: MySQL and MariaDB through the `mysqli` extension.
- `pgsql`: PostgreSQL through the `pgsql` extension.
- `sqlsrv`: Microsoft SQL Server through the `sqlsrv` extension.

## Connection Options

Options are passed as the second argument to `DatabaseFactory::create()`,
or set under the connection in the configuration file. The main options
are:

```php
use Windwalker\Database\DatabaseFactory;

$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        // Connection target
        'host' => 'localhost',
        'port' => 3306,
        'dbname' => 'blog',
        'unix_socket' => null,
        'dsn' => null,           // Overrides host, port and dbname

        // Credentials
        'user' => 'root',
        'password' => 'secret',

        // Behavior
        'prefix' => 'wind_',     // Table prefix for '#__' names
        'charset' => 'utf8mb4',
        'collation' => null,
        'strict' => true,        // Enable strict SQL modes (MySQL)
        'modes' => null,         // Custom SQL modes (MySQL)
        'debug' => false,
        'readonlyThrow' => true, // Throw on writes in readonly mode
        'readonlyNative' => false,
        'afterConnect' => null,  // SQL string or callable

        // Driver-specific
        'driverOptions' => [],   // Extra PDO attributes
        'tls' => null,           // TLS / SSL settings
    ],
);
```

The full set of options is defined by `DriverOptions`. Read its
constructor for the complete list of parameters.

::: tip
Use `#__` in table names. The adapter replaces it with the configured
`prefix`, so the same SQL works across installations.
:::

## Using a DSN

A DSN replaces the `host`, `port`, `dbname`, and related fields. Set
`dsn` when your connection string comes from a single environment
variable or a cloud provider.

```php
$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        'dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=blog',
        'user' => 'blog_user',
        'password' => 'change-me',
    ],
);
```

With the configuration file, set `DATABASE_DSN` instead of the
host-related variables:

```ini
DATABASE_DRIVER=pdo_mysql
DATABASE_DSN=mysql:host=127.0.0.1;port=3306;dbname=blog
DATABASE_USER=blog_user
DATABASE_PASSWORD=change-me
```

When a DSN is set, the framework reads it back into the `host`,
`port`, and `dbname` options. Keep the user and password in their own
variables rather than inside the DSN string.

::: info
A DSN is used only by PDO drivers. Native drivers ignore it and use
`host`, `port`, `dbname`, `user`, and `password`.
:::

## MySQL Strict Mode

For `pdo_mysql` and `mysqli`, strict mode is enabled by default. The
framework sets `@@SESSION.sql_mode` after the connection opens, so
invalid data fails loudly instead of being silently truncated or
converted.

The default modes are:

- `ONLY_FULL_GROUP_BY`
- `STRICT_TRANS_TABLES`
- `ERROR_FOR_DIVISION_BY_ZERO`
- `NO_ENGINE_SUBSTITUTION`
- `NO_ZERO_IN_DATE`
- `NO_ZERO_DATE`

Set `modes` to use your own list. Set `strict` to `false` to keep the
server's current mode.

```php
// Use a custom list of modes
$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        'dbname' => 'blog',
        'modes' => ['STRICT_TRANS_TABLES', 'NO_ZERO_DATE'],
    ],
);

// Keep the server defaults and do not change sql_mode
$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        'dbname' => 'legacy',
        'strict' => false,
    ],
);
```

::: warning
If the server rejects the mode change, the framework ignores the error
silently. Check `SELECT @@SESSION.sql_mode` when you rely on a specific
mode.
:::

## TLS / SSL

Set `tls` to enable encrypted connections. Each driver maps these
values to its own options.

```php
$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        'host' => 'db.example.com',
        'dbname' => 'blog',
        'user' => 'blog_user',
        'password' => 'change-me',
        'tls' => [
            'key' => '/certs/client-key.pem',
            'cert' => '/certs/client-cert.pem',
            'ca' => '/certs/ca.pem',
            'verify' => true,
        ],
    ],
);
```

- MySQL (`pdo_mysql`, `mysqli`): `key`, `cert`, `ca`, `capath`, `verify`,
  and `cipherAlgos`.
- PostgreSQL (`pdo_pgsql`): `key`, `cert`, `ca`, `crl`, and `password`.
  Setting `verify` selects `verify-full` or `require` for `sslmode`.
- SQL Server (`pdo_sqlsrv`, `sqlsrv`): encryption is turned on by
  `tls`. Set `tls` to `false` to disable encryption on the native driver.

::: warning
Set `verify` to `true` in production. With verification off, the client
accepts any server certificate and the connection is open to
man-in-the-middle attacks.
:::

## SQLite

SQLite uses a file path instead of a host. Set `dbname` to the file,
or `:memory:` for an in-memory database.

```php
// File database
$db = DatabaseFactory::create(
    'pdo_sqlite',
    [
        'dbname' => __DIR__ . '/data/app.sqlite',
    ],
);

// In-memory database, useful for tests
$db = DatabaseFactory::create(
    'pdo_sqlite',
    [
        'dbname' => ':memory:',
    ],
);
```

The `readonlyNative` option runs `PRAGMA query_only = 1` after the
connection opens. Use it for read-only replicas or reporting copies.

## Differences Between Databases

The main differences are:

- MySQL: uses `charset` and `collation`, and supports `strict`,
  `modes`, and `unix_socket`.
- PostgreSQL: uses `sslmode` through `tls`, and `readonlyNative` sets
  `default_transaction_read_only`.
- SQLite: uses a file path in `dbname`. It has no `host`, `port`,
  `user`, or `password`.
- SQL Server: uses `host,port` in the DSN. Encryption is controlled by
  `tls`.

Use the same query code on every database. Differences only appear in
the connection options and in SQL that is specific to one engine.

## Basic Usage

You can get the database through dependency injection in two ways. The
`DatabaseAdapter` is the low-level service for SQL and the query
builder. The ORM is built on top of it and maps rows to entities.

```php
use Windwalker\Database\DatabaseAdapter;
use Windwalker\ORM\ORM;

class PostService
{
    public function __construct(
        protected DatabaseAdapter $db,
        protected ORM $orm,
    ) {
    }
}
```

Use the `DatabaseAdapter` for direct SQL and simple queries. Use the
`ORM` when you work with entities, mappers, and relations. The ORM
creates its selectors from the same adapter, so both share one
connection.

### Select

Use `prepare()` with placeholders for raw SQL. Use `select()` to build
a query.

```php
// Raw SQL with positional parameters
$rows = $db->prepare(
    'SELECT * FROM #__posts WHERE state = ?',
)
    ->execute([1])
    ->all();

// Query builder
$post = $db->select('*')
    ->from('#__posts')
    ->where('id', 5)
    ->get();
```

### Insert

```php
$db->insert('#__posts')
    ->columns('title', 'state')
    ->values(['Hello World', 1])
    ->execute();

// Insert several rows in one statement
$db->insert('#__posts')
    ->columns('title', 'state')
    ->values(['First', 1])
    ->values(['Second', 0])
    ->execute();
```

### Update

```php
$db->update('#__posts')
    ->set('state', 0)
    ->where('id', 5)
    ->execute();
```

### Delete

```php
$db->delete('#__posts')
    ->where('id', 5)
    ->execute();
```

Query methods such as `where()`, `join()`, and `groupBy()` are covered in
the [query builder docs](/documentation/components/query/).

::: warning
An `update()` or `delete()` without a `where()` affects every row in
the table. Always add a condition unless you mean to change all rows.
:::

### Using the ORM

With the ORM, read and write entities through a mapper or a selector:

```php
use App\Entity\Post;

$posts = $orm->from(Post::class)
    ->where('state', 1)
    ->all(Post::class);

$post = $orm->mapper(Post::class)->findOne(['id' => 5]);
```

See the [ORM docs](/documentation/components/orm/) for mappers, entities,
and relations.

## Transactions

`transaction()` runs a callback inside a transaction. It commits when the
callback returns, and rolls back when it throws.

```php
$postId = $db->transaction(function (DatabaseAdapter $db) use ($data) {
    $statement = $db->insert('#__posts')
        ->columns('title', 'state')
        ->values([$data['title'], 1])
        ->execute();

    return $statement->lastInsertId();
});
```

Use the same pattern with the ORM:

```php
$orm->transaction(function () use ($orm, $id) {
    $orm->mapper(Post::class)->deleteWhere(['author_id' => $id]);
    $orm->mapper(Author::class)->deleteOne($id);
});
```

Call `isInTransaction()` to check whether a transaction is already open.

## Other Basic Operations

- `execute($sql, $params)` runs a statement that does not return rows.
- `prepare($sql)` returns a statement. Call `all()`, `get()`, or
  `result()` on it.
- `pretend(callable)` records the SQL that would run without executing
  write queries. Use it to inspect generated SQL.
- `getTable('posts')` returns a `TableManager` for schema operations.

## Read-Only Mode

Read-only mode protects a connection from accidental writes. It is
useful for reporting code and replicas.

```php
$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        'dbname' => 'blog',
        'readonlyThrow' => true,
        'readonlyNative' => true,
    ],
);

// ERROR: Throws DatabaseQueryException for write queries
$db->update('#__posts')->set('state', 0)->execute();
```

`readonlyThrow` throws on write queries. Set it to `false` to skip them
silently. `readonlyNative` also sets the server's read-only session mode.

::: warning
With `readonlyThrow` set to `false`, write queries return without
running and without an error. A failed write can go unnoticed.
:::

## Running SQL After Connect

Use `afterConnect` to run setup SQL each time a connection opens. It
accepts a SQL string or a callable that receives the driver.

```php
$db = DatabaseFactory::create(
    'pdo_mysql',
    [
        'dbname' => 'blog',
        'afterConnect' => function ($driver) {
            $driver->execute('SET time_zone = "+00:00"');
        },
    ],
);
```

## Connection Pool

Set the `pool` option to reuse connections across requests in long-running
processes. See the [connection pool docs](/documentation/components/pool/)
for setup and options.

## Backup and Export

Backup and export are available through the core services. See
[Backup and Export](/documentation/framework/services/database/backup-and-export)
for details.

## Related Pages

- [ORM](/documentation/framework/services/database/orm)
- [Entities](/documentation/framework/services/database/entities)
- [Migrations](/documentation/framework/services/database/migrations)
- [Seeders](/documentation/framework/services/database/seeders)
- [Pagination](/documentation/framework/services/database/pagination)
- [Connection Pool](/documentation/framework/services/database/connection-pool)
- [Backup and Export](/documentation/framework/services/database/backup-and-export)
