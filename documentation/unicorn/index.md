---
layout: doc
description: Entry page for the Windwalker unicorn documentation.
---

# About Unicorn RAD

Unicorn is a RAD (Rapid Application Development) toolkit, the official RAD package provided by the Windwalker framework. It includes a code generator, a basic MVC CRUD structure, common admin and frontend components, many dynamic form fields, frontend and backend integration code, switchable CSS framework integration (Bootstrap 5 by default), and a set of commonly used utility services, so developers can quickly build a complete admin management system.

## What Does Unicorn Provide?

- Code Generation: Generate code for entities, migrations, controllers, views, and routes.
- MVC Admin: Provides a basic structure for admin CRUD operations, including list management, edit management, and form management.
- [Simple MVC](/documentation/unicorn/mvc-crud/mvc-simple): Offers a simplified MVC structure for quick development.
- [CSS & JS in MVC Pages](/documentation/unicorn/mvc-crud/css-js-in-mvc-pages): Integrates CSS and JavaScript into MVC pages for enhanced functionality and styling.
- [Nested Set MVC](/documentation/unicorn/mvc-crud/mvc-admin/nested-set-mvc): Supports nested set structures for hierarchical data management.
- Services: Includes various services such as [storage](/documentation/unicorn/services/storage), [uploader](/documentation/unicorn/services/uploader/upload-service), [repository](/documentation/unicorn/services/repository), [list selector](/documentation/unicorn/services/list-selector), [components](/documentation/unicorn/services/components), utilities, [script loading](/documentation/unicorn/services/script-loading), and [workflow](/documentation/unicorn/services/workflow) management.
- [Form Fields](/documentation/unicorn/form-fields/field-generation): Offers a wide range of form field types and utilities for building dynamic forms.
- JavaScript & Frontend: Provides [Unicorn JS](/documentation/unicorn/javascript-frontend/unicorn-js) for frontend development, including macros and event handling.

## What Is Unicorn Not?

Unicorn is not a CMF, nor is it a ready-made admin management system. It is a collection of tools for building both. Developers do not need to spend time organizing the project structure, creating the basic CRUD architecture, generating code, or integrating frontend CSS/JS frameworks. They can focus on business logic.

Unlike Laravel Nova or Laravel Backpack, Unicorn does not ship a complete admin system. It provides a basic admin layout structure, and you can apply any Bootstrap 5 theme to build your own admin UI. Unicorn also has almost no default database tables; you generate everything according to your own business logic.

Unicorn is also not a CMF. It has no built-in User or content management features. However, Unicorn is designed to let developers generate these features easily and modify them to fit their needs. If you need a CMF, please refer to the LYRASOFT Luna package.

## Advantages of Unicorn

Unicorn is the successor of Windwalker Phoenix. Since 2015, we have provided developers with a complete PHP RAD toolkit. It integrates advanced features such as MVC admin, form building, Nested Set structures, multi-source Storages and uploads, automated image processing and optimization, and seamless PHP and frontend CSS/JS integration. Major frameworks only began offering these features around 2020, but none offer the tight, seamless integration of Windwalker Unicorn, nor the many years of experience behind Windwalker.

The goal of Unicorn is to let developers focus on the business logic of back-office and complex frontend applications, instead of spending time on repetitive CRUD architecture, code generation, frontend integration, and other routine tasks.
