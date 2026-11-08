---
layout: doc
title: Connections
component: database
---

# Connections

A `DatabaseAdapter` owns a driver, and the driver owns the connection to
the database. The driver opens the connection lazily, when the first query
needs it, and keeps it for later queries. Understanding this model helps
you handle long-running workers, read-only access and connection pools.

## Driver Names

The driver name passed to `DatabaseFactory::create()` selects both the
driver class and the SQL platform. The name is written as
`<driver>_<platform>`, where the platform part can be omitted for drivers
that only support one database:

- `pdo_mysql`: PDO with MySQL or MariaDB.
- `pdo_pgsql`: PDO with PostgreSQL.
- `pdo_sqlsrv`: PDO with Microsoft SQL Server.
- `pdo_sqlite`: PDO with SQLite.
- `pdo_oci`: PDO with Oracle.
- `pdo_odbc`: PDO through ODBC.
- `mysqli`: the MySQLi extension with MySQL or MariaDB.
- `pgsql`: the native PostgreSQL extension.
- `sqlsrv`: the native SQL Server extension.

Use the PDO drivers unless you have a specific reason to use a native
extension. The following example uses SQLite, which needs no server:

```php
use Windwalker\Database\DatabaseFactory;
use Windwalker\Database\Driver\DriverOptions;

$db = new DatabaseFactory()->create(
    'pdo_sqlite',
    new DriverOptions(
        dbname: __DIR__ . '/app.db',
        // Or file: __DIR__ . '/app.db',
    ),
);
```

::: info
For SQLite, the file path is passed through `dbname` (or `file`). The
default `host` value is ignored for SQLite.
:::

## Driver Options

Connection settings are carried by `DriverOptions`. Its array form and
object form are equivalent, so you can pass either to the factory. The
main options are:

- `host`, `port`, `dbname`, `user`, `password`: the server address and
  credentials.
- `prefix`: the table prefix that replaces `#__` in SQL.
- `charset`: the character set of the connection.
- `dsn`: a full DSN string, which overrides the value built from `host`
  and `dbname`.
- `file`: the database file path for SQLite. `dbname` works as well.
- `unixSocket`: the socket path for MySQL, used instead of `host`.
- `driverOptions`: extra options passed to the underlying PDO or native
  driver.
- `afterConnect`: a SQL string, a closure that receives the driver, or an
  array of either. They run each time a connection is opened.
- `tls`: TLS settings, built with `DriverOptions::tlsOptions()`.
- `debug`: when `true`, the executed SQL is appended to query error
  messages.

```php
use Windwalker\Database\DatabaseFactory;
use Windwalker\Database\Driver\DriverOptions;

$options = new DriverOptions(
    host: 'db.internal',
    dbname: 'app',
    user: 'app_user',
    password: 'secret',
    charset: 'utf8mb4',
    tls: DriverOptions::tlsOptions(
        ca: '/etc/ssl/certs/db-ca.pem',
        verify: true,
    ),
);

$db = new DatabaseFactory()->create('pdo_mysql', $options);
```

::: warning
Do not commit credentials to source code. Read them from the environment,
as the package configuration does with `env()`.
:::

The platform is detected from the driver name. You can inspect the result
with `$db->getDbType()` or `$db->getPlatform()`.

```php
use Windwalker\Database\Platform\DbPlatform;

$db->getPlatform(); // MySQLPlatform object

$type = $db->getDbType(); // DbPlatform::MySQL

if ($type === DbPlatform::MySQL) {
    // Do something MySQL-specific.
}
```

## DbPlatform Enum

The `DbPlatform` enum:

```php
namespace Windwalker\Database\Platform;

enum DbPlatform
{
    case MySQL;
    case PostgreSQL;
    case SQLite;
    case SQLServer;
    case Oracle;
    
    // ...
}
```

You can wrap string values with `wrap()` to get the enum case.

```php
$type = DbPlatform::wrap('pgsql');
$type = DbPlatform::wrap('postgresql'); // same case
```

- `mysql` and `mariadb` are `MySQL`.
- `pgsql` and `postgresql` are `PostgreSQL`.
- `sqlite` is `SQLite`.
- `sqlsrv` and `sqlserver` are `SQLServer`.
- `oracle` and `oci` are `Oracle`.

## Strict Mode

MySQL can silently change invalid data unless its SQL mode is strict. The
standalone package does not enable strict mode by itself. Call the MySQL
platform method after connecting:

```php
use Windwalker\Database\Platform\MySQLPlatform;

$platform = $db->getPlatform();

if ($platform instanceof MySQLPlatform) {
    $platform->enableStrictMode();

    // Or set your own list of modes:
    $platform->setModes([
        'STRICT_TRANS_TABLES',
        'NO_ZERO_DATE',
    ]);
}
```

::: warning
Without strict mode, MySQL truncates oversized strings and converts invalid
dates to zero values, and it reports no error. Enable it unless the
application depends on the lenient behavior.
:::

## Table Prefix

Set `prefix` to share one database between several applications, or to
avoid name clashes. Write table names in SQL with the `#__` placeholder, and
the adapter replaces it with the prefix before the SQL is sent:

```php
$db = new DatabaseFactory()->create(
    'pdo_mysql',
    new DriverOptions(
        dbname: 'shared',
        prefix: 'app_',
    ),
);

// Runs as: SELECT * FROM app_posts
$posts = $db->prepare('SELECT * FROM #__posts')->all();
```

The replacement applies to SQL strings, and to `Query` objects built with
`createQuery()`.

::: info
Text inside quoted strings is not changed. A value such as `'#__posts'`
stays as written.
:::

## Connection Lifecycle

The driver opens a connection on first use and returns it to a pool when
it is released. Most code never manages this directly, but long-running
workers and tests sometimes need to.

- `getConnection(true)`: obtains a connection and keeps it for later
  queries, which keeps a transaction on one connection.
- `releaseKeptConnection()`: returns the kept connection to the pool.
- `dropConnection()`: closes the connection instead of returning it.
- `disconnect()`: closes the current connection. The next query opens a new
  one.
- `ping()`: returns `true` when the database responds.

```php
$driver = $db->getDriver();

$driver->getConnection(true);

// Now always use same connection even if connection poll enabled
$db->prepare('SELECT 1')->execute();

$driver->releaseKeptConnection();
```

`isSupported()` on the driver reports whether the PHP extension for it is
installed.

## Lost Connections

Long-running processes, such as queue workers or Swoole servers, may hold a
connection that the server has closed. `AbstractDriver::useConnection()`
detects a lost connection, reconnects, and runs the callback once more.
Statement execution and `ping()` go through this path.

```php
if (!$db->ping()) {
    // The connection is not usable.
}
```

Detection covers MySQL "gone away" errors, timeouts, connection resets and
closed SSL connections. A failed reconnect or a failed retry is thrown to
the caller; the driver does not loop indefinitely.

::: warning
The retry runs the callback again, so a write may be executed twice if the
server did not confirm the first attempt. A disconnect does not restore an
open transaction. Use idempotent writes for work that runs in a retried
callback, or check the result before you retry at the application level.
:::

## Read-only Mode

Set `readonly` to block write queries. Read queries, such as `SELECT`,
still run. The driver decides whether a statement is a write by inspecting
its SQL, including statements prefixed by a `WITH` clause and `FOR UPDATE`
locks.

```php
use Windwalker\Database\DatabaseFactory;
use Windwalker\Database\Driver\DriverOptions;

$db = new DatabaseFactory()->create(
    'pdo_mysql',
    new DriverOptions(
        dbname: 'app',
        readonly: true,
        readonlyThrow: true,
        readonlyNative: true,
    ),
);
```

- `readonly`: enables the check described above.
- `readonlyThrow`: when `true`, a blocked write throws a
  `DatabaseQueryException`. Defaults to `true`.
- `readonlyNative`: also asks the database to open the connection in
  read-only mode after connect. Supported by MySQL, PostgreSQL and SQLite.

::: warning
With `readonlyThrow` set to `false`, a blocked write is replaced by a
harmless query that returns no rows. The call succeeds, but nothing is
written, so an application may believe a change was saved. Keep
`readonlyThrow` enabled unless the silent behavior is intended.
:::

## Connection Pools

In a Swoole-based CLI server, the database package can share a set of
connections between requests through a connection pool. Pool settings are
given with the `pool` key of a connection configuration, and are built with
`PoolOptions`:

```php
use Windwalker\Pool\Enum\Heartbeat;
use Windwalker\Pool\PoolOptions;

'pool' => fn() => new PoolOptions(
    maxSize: 4,
    minSize: 1,
    idleTimeout: 60,
    heartbeat: Heartbeat::LAZY,
),
```

The package creates shared pools only when the application runs in the CLI
server runtime with pooling enabled. Your code uses the adapter the same way
in every mode.

::: tip
Keep the pool size below the database server's connection limit, and
account for every worker process when choosing `maxSize`.
:::
