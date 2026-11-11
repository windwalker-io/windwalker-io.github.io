---
layout: doc
---

# Requirements and Installation

## Requirements

- PHP 8.4.6 or above, with the `json` extension
- [Composer](https://getcomposer.org/)
- A web server, or the built-in development server

The `windwalker/core` package itself only requires PHP and `ext-json`. Other extensions depend on the packages you use, for example a `pdo_*` extension for the database.

The starter project also builds CSS and JavaScript with Vite, so the following are needed when you use it:

- Node.js 20 or above
- Yarn 4 (via Corepack)

## Install the Starter

The recommended way to begin is the [Windwalker Starter](https://github.com/windwalker-io/starter). It provides a ready-to-run application skeleton with the core package, configuration, routes and a Vite asset build.

```shell
composer create-project windwalker/starter {folder} ^4.0 --remove-vcs
```

Replace `{folder}` with your project directory. After the dependencies are installed, an interactive installer asks for the application name, a secret, and the database settings, then installs the frontend dependencies.

::: tip
Settings are stored in `.env`. To regenerate it later, run `composer env`.
:::

## Run the Application

Start the built-in PHP server from the project root:

```shell
php windwalker server:start
```

Then open `http://localhost:8000`. If the default port is taken, pass `--port`:

```shell
php windwalker server:start --port 8080
```

When deploying to a production server, point the document root to the `www` directory.

## Project Layout

| Directory   | Purpose                                              |
|-------------|------------------------------------------------------|
| `etc`       | Configuration: `app/`, `conf/`, `packages/`, `di/`   |
| `resources` | Assets, languages, migrations and seeders            |
| `routes`    | Route definitions                                    |
| `src`       | Application code                                     |
| `views`     | Templates                                            |
| `www`       | Public web root                                      |
