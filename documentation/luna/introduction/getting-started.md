---
layout: doc
description: Sign in to the Luna admin, create an article, and view it on the front end.
---

# Getting Started

This page walks through the first session after installing Luna. You sign in
to the admin, create a category and an article, then view the article on the
front end.

## Sign In to the Admin

Open the admin login page. The route is `admin::auth.login`, served at
`/admin/login` under your admin path:

```text
https://example.com/admin/login
```

Sign in with a user that has the `manager` role or higher. Luna's seeders do
not create an admin account, so create one in the user list or set a role
for an existing user. Use the default password defined in Luna's migrations
to sign in to a seeded user.

## Create a Category

Articles belong to a category. Open the **Article Categories** page (its
title is `Article Categories`) and create a new category there. The routes are:

```text
admin::category.category_list  /category/list/article
admin::category.category_edit  /category/edit/article
```

Set a title and an alias, then save. The alias forms the front-end URL.

## Create an Article

Open the article editor from the article list:

```text
admin::article.article_list  /article/list
admin::article.article_edit  /article/edit
```

Fill in the title, choose the category you just created, write the body,
and set the state to published. Save the article.

## View on the Front End

The article is available at its front-end route:

```text
article_item  /article/{id}-{alias}
```

Open `/article/1-my-first-article` in your browser, substituting the ID and
alias of your article. The category listing is served at `/articles/{path}`.

::: tip
Only published articles appear on the front end. Drafts stay visible in the
admin only.
:::

## Package Install Tags

Luna declares these tags for `pkg:install`. Pass them with `-t`, or pick
them from the interactive menu:

- `config`: Config files in `etc/`.
- `lang`: Language files.
- `migrations`: Database migrations.
- `seeders`: Demo seeders.
- `routes`: Route files.
- `views`: Blade views.
- `modules`: All MVC modules.

Each feature also has its own tag. Use `_admin`, `_front`, or `_model`
to copy one layer:

- `category_admin`, `category_front`, `category_model`
- `article_admin`, `article_front`, `article_model`
- `page_admin`, `page_front`, `page_model`
- `tag_admin`, `tag_model`
- `menu_admin`, `menu_model`
- `widget_admin`, `widget_model`
- `config_admin`, `config_model`
- `auth_admin`, `auth_front`, `auth_model`
- `registration_front`, `registration_model`
- `user_admin`, `user_front`, `user_model`
- `user_access`: User role and rule entities.
- `front_profile`: Front-end profile module.

```bash
php windwalker pkg:install lyrasoft/luna -t routes -t article_admin
```

## Config Files

Luna installs these config files into `etc/packages/` when the `config`
tag is copied. Each one returns a `ConfigModule` array you can override:

- `luna.config.php`: Core settings, including `i18n`, `error` pages, and
  the `view_extends` layouts for the front and admin.
- `user.config.php`: Member settings, such as `login_name` (default
  `email`), `remember` for the remember-me cookie, and `srp` login.
- `social_login.config.php`: Social login for Facebook and Google. Both
  are disabled by default and read their keys from `.env`.
- `captcha.config.php`: Captcha driver. The default is `none`. Set
  `CAPTCHA_DEFAULT` to `google` or `image` to enable one.
- `pages.config.php`: Page builder addons, animation driver, page
  templates, and the upload profile.
- `widget.config.php`: Widget types and positions.
- `menu.config.php`: Menu view types and the `mainmenu` menu type.
- `access.config.php`: Roles and actions. Set `roles_db_enabled` or
  `actions_db_enabled` to load them from the database instead.

## Next Steps

Review the [Installation](./installation) steps if any command failed, then
continue with the rest of the Luna documentation.

To see how the admin list and edit pages are built, read Unicorn's
[List Management](/documentation/unicorn/mvc-crud/mvc-admin/list-management)
and [Edit Management](/documentation/unicorn/mvc-crud/mvc-admin/edit-management)
pages. For the underlying framework, see the
[Framework installation](/documentation/framework/getting-started/installation).
