---
layout: doc
title: Backup & Export
---

# Backup & Export

The database package can export a database to a SQL file. The export
service runs the native dump tool of each database when it is available,
so the result is a full backup. It falls back to a PHP-based SQL export
when the tool is missing or fails.

Exports are used in two ways. Migration and seeder commands create a
safety backup automatically before they change data. You can also run
an export yourself with the `db:export` command or
`DatabaseExportService`.

## Automatic Backups

Migration and seeder commands back up the database before they run.
This protects data when a migration drops or rewrites tables.
The migration commands (go, back, squash, reset) and the seeder
import and clear commands do this.

A backup is skipped when you pass `--no-backup` to the command.
The `DB_BACKUP_DISABLED` environment variable also turns it off, and
it takes precedence over the option.

```bash
# Run the migration without a backup
php windwalker mig:go --no-backup

# Disable automatic backups for every command
DB_BACKUP_DISABLED=1 php windwalker mig:go
```

See [Migrations](/documentation/framework/services/database/migrations)
and [Seeders](/documentation/framework/services/database/seeders) for
how these commands are used.

## The db:export Command

Use `db:export` for a manual backup, for example before a deployment
or before you test a risky change.

```bash
# Export the default connection to @temp/sql-export
php bin/windwalker.php db:export

# Export a named connection
php bin/windwalker.php db:export --connection=reporting

# Export to a specific file
php bin/windwalker.php db:export /backups/site-before-release.sql

# Compress the output and keep only the 3 newest files
php bin/windwalker.php db:export --compress --keep=3
```

The command accepts these arguments and options:

- `dest`: the destination file. If omitted, a file name is generated.
- `--connection`, `-c`: the connection to export. When given, it sets
  `database.default` for the run.
- `--dir`, `-d`: the directory for generated file names. The default
  is `@temp/sql-export`.
- `--compress`, `-z`: write a gzip file with the `.gz` extension.
- `--keep`, `-k`: the number of export files to keep. The default is `7`.

When you do not pass `dest`, the file name follows this pattern:

```text
{app-name}-sql-{connection}-{Y-m-d-H-i-s}.sql
```

The same export logic is available in code through
`DatabaseExportService`. Its `export()` method writes to the backup
directory, and `exportTo()` writes to a destination you choose. Both
take an `IOInterface` for progress messages and return the written
file. See `src/Core/Database/DatabaseExportService.php` in the
`windwalker/core` package for the full signatures.

```php
use Windwalker\Core\Database\DatabaseExportService;

// Inside a command, $io is the IOInterface it receives
$service = $app->make(DatabaseExportService::class);

// Write to database.backup.dir with a generated name
$file = $service->export($io, ['compress' => true]);

echo $file->getRealPath();
echo $file->getSize();
```

::: tip
Run `db:export` before a deployment, and keep the output outside the
web root.
:::

## Tools by Database

Each database has its own exporter. The exporter tries the native
tools in order.

- **MySQL / MariaDB**: `mysqldump`. The exporter writes the credentials to
  a temporary defaults file, so the password is not passed on the command line.
  It also passes `--no-tablespaces`, and you can add extra arguments
  with `MYSQLDUMP_EXTRA_OPTIONS`.
- **PostgreSQL**: `pg_dump --format=plain` writes `.sql`. If that fails,
  `pg_dump --format=custom` writes a `.dump` file, which needs
  `pg_restore`. The password is passed in the `PGPASSWORD` environment
  variable.
- **SQLite**: `sqlite3 .dump` writes `.sql`. The exporter opens the database
  read-only. If the SQL dump fails, `sqlite3 .backup` writes a binary
  `.sqlite` copy. In-memory databases skip the CLI tools.

- **SQL Server**: `mssql-scripter` writes `.sql`. The exporter sets
  the password through `MSSQL_SCRIPTER_PASSWORD`. If `sqlpackage` is
  installed, it can also write a `.bacpac` file, which restores with
  `sqlpackage` or SSMS.
- **Oracle**: `expdp` (Data Pump) writes a `.dmp` file, and `exp` is used
  when Data Pump is not available. `sql` (SQLcl) writes `.sql`. Plain
  SQL export needs native tools when the schema has identity columns,
  because the PHP path rejects `GENERATED ALWAYS` identity columns.

```dotenv
MSSQL_SCRIPTER_BINARY=/usr/local/bin/mssql-scripter
SQLPACKAGE_BINARY=/opt/sqlpackage/sqlpackage
ORACLE_EXPDP_BINARY=/u01/app/oracle/bin/expdp
ORACLE_EXP_BINARY=/u01/app/oracle/bin/exp
SQLCL_BINARY=/opt/sqlcl/bin/sql
```

The output format and what it contains depend on the tool:

- A `.sql` dump restores with the database client, such as `mysql` or `psql`.
- A `.dump` file from PostgreSQL restores with `pg_restore`.
- A `.sqlite` file is a complete SQLite database file.

A native dump includes routines, grants, and database settings. A PHP
fallback does not include them.

If the tool is not on `PATH`, set its location with an environment variable:

```dotenv
MYSQLDUMP_BINARY=/usr/local/mysql/bin/mysqldump
PG_DUMP_BINARY=/usr/lib/postgresql/16/bin/pg_dump
SQLITE3_BINARY=/usr/local/bin/sqlite3
```

::: info
MySQL also checks the common XAMPP and AMPPS install paths when
`mysqldump` is not on `PATH`.
:::

## PHP Fallback

If the CLI tool is missing, or it exits with an error, the exporter
writes the SQL with PHP. The console prints a message first:

```text
Error: ... Fallback to php backup script.
```

The PHP export is a limited logical backup. It is not a full native
backup, and it is not a consistent snapshot if the application writes
to the database during the export. Use the database's native tools for
a complete backup.

- MySQL: the fallback writes table structures and rows.
- PostgreSQL: domain types are rejected. Use `pg_dump` for those databases.
- SQLite: virtual tables are rejected.

```text
// ERROR: DomainException when a PostgreSQL domain type is present
```

The CLI tool writes to a temporary file first. A failed or empty output
is discarded, so partial output never ends up in the backup.

::: warning
The PHP fallback does not fully support generated columns or views.
Generated column values are left out of the exported rows, and views are
not exported. Do not rely on the PHP fallback for a project. Install the
native tools for your database.
:::

## Compression

Pass `--compress` to write a gzip file. The exporter uses the system
`gzip` when it is available, and PHP zlib otherwise. The file name
gets a `.gz` suffix, for example `app-sql-default-2025-01-01-10-00-00.sql.gz`.

Automatic backups read the same setting from `DB_BACKUP_COMPRESS`.

```dotenv
DB_BACKUP_COMPRESS=1
```

::: info
The value is checked for truthiness. `0` and an empty value leave
compression off, but any other string, including `false`, turns it on.
:::

To restore a compressed dump, decompress it first, for example with
`gunzip`, and then run the native restore tool.

## Rotation

Each export first deletes the oldest files in the target directory,
so only the newest files remain. The `--keep` option sets the count for
`db:export`. Without it, the count comes from `database.backup.max`,
and then from the default of `10`.

::: warning
Rotation deletes every older file in the target directory, not only
backup files. Use a dedicated directory for backups, and never point
`--dir` or `database.backup.dir` at a directory that holds other files.
:::

## Configuration

Set the backup directory and retention in the database config:

```php
// Database config, for example config/database.php
return [
    'backup' => [
        // Where export files are written
        'dir' => '@temp/sql-backup',

        // How many backup files to keep
        'max' => 10,
    ],
];
```

The environment variables below change the export behavior:

- `DB_BACKUP_DISABLED`: set to `1` to skip automatic backups in
  migration and seeder commands.
- `DB_BACKUP_COMPRESS`: set to `1` to compress automatic backups.
- `MYSQLDUMP_BINARY`: the path to `mysqldump`.
- `MYSQLDUMP_EXTRA_OPTIONS`: extra arguments for `mysqldump`.
- `PG_DUMP_BINARY`: the path to `pg_dump`.
- `SQLITE3_BINARY`: the path to `sqlite3`.
- `GZIP_BINARY`: the path to `gzip`.

## Security Considerations

Exports contain your data in plain text, and the files are not
encrypted. Anyone who can read the backup directory can read every row
in the database, including password hashes and personal data.

The MySQL exporter writes the database user and password to a temporary
defaults file under `@temp`. The exporter removes the file at shutdown.

::: warning
Store backup files outside the web root and restrict their file
permissions. The MySQL defaults file holds the password in plain text
until shutdown, and a killed process can leave it behind. Check `@temp`
after a failed run, and encrypt copies that leave the server.
:::

::: warning
The automatic backup before migrations and seeders is temporary protection
against mistakes in those commands. It does not replace a regular backup
schedule. For projects with sensitive or very large data, set
`DB_BACKUP_DISABLED=1` in `.env.base` to turn it off permanently.
:::
