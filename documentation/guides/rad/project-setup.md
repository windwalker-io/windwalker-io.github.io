---
layout: doc
---

# Project Setup

## Requirements

- PHP 8.4.6 or later
- Composer
- A database supported by Windwalker Database
- Node.js 20 or later and Yarn 4 (Corepack) for frontend assets

For general environment setup, see the [Installation guide](../start/).

## Create a Windwalker Application

Create a new application from the Windwalker Starter:

```bash
composer create-project windwalker/starter storefront ^4.0 --remove-vcs
cd storefront
```

Complete the installer's prompts. The starter's post-creation scripts install frontend dependencies and build the assets. The next chapter adds Unicorn and the database packages used by this guide.

## Application Structure

The starter provides these application locations:

| Path | Purpose |
| --- | --- |
| `src/Entity/` | Application entities |
| `src/Module/Admin/` | Admin controllers, view models, forms, templates and assets |
| `etc/` | Application and package configuration |
| `resources/migrations/` | Database schema migrations |
| `resources/seeders/` | Seed data and seeder registration |
| `routes/admin/` | Admin route definitions |
| `www/` | Public web document root |

The starter's `routes/admin.route.php` defines the `/admin` URL prefix and `admin` route namespace. A generated product list route is therefore available at `/admin/product/list`.

## Run the Application

Start the local PHP server:

```bash
php windwalker server:start php:main --host localhost --port 8080
```

Open `http://localhost:8080` to verify the starter. After installing Unicorn and generating the product module, open `http://localhost:8080/admin/product/list`.
