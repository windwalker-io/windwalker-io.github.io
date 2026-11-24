---
layout: doc
description: Entry page for the Luna CMF documentation.
---

# About Luna CMF

Luna is a CMF (Content Management Framework) package for Windwalker, provided by LYRASOFT. It gives you a ready-made User system, content management, and an admin panel, so you do not have to build these from scratch for every website.

Luna is built on top of [Unicorn RAD](/documentation/unicorn/index). It depends on `windwalker/unicorn`, and it reuses Unicorn's MVC, form, and storage tooling.

## What Does Luna Provide?

- User System: A `User` entity with login by email or username, registration, account activation, and password handling.
- Remember Me and Session: Optional "remember me" login and admin session handling.
- Social Login: Optional social login support through an external library.
- Access Control: User roles and access rules for admin and frontend areas.
- Content Management: Articles, categories, tags, and pages, managed in the admin panel.
- Menus and Widgets: Manage frontend menus and widgets from the admin panel.
- Multi-language Content: Locale handling and language management, with per-language association of content.
- Page Builder: Build frontend pages from ready-made addons such as text, image, button, feature, and empty space.
- Captcha: Image captcha and Google reCAPTCHA support for forms.
- Admin and Frontend Modules: Ready-made admin modules and frontend modules for the features above.
- Fake Data: A Faker provider with locale support for seeding test data.

## How Luna Differs from Unicorn

Unicorn is a RAD toolkit. It generates the code for your own entities, controllers, views, and routes. Unicorn ships no User or content features, and it has almost no default database tables.

Luna is a CMF. It already contains the User, content, menu, widget, and access features that most websites need. You install it as a Windwalker package, and its modules and routes are ready to use.

In short:

- Use Unicorn when you want to build your own business features from generated CRUD code.
- Use Luna when you need a website with users, content, and an admin panel out of the box, and you still want to extend it.

Luna does not replace Unicorn. Luna uses Unicorn internally, so you can use Unicorn's tools alongside Luna.
