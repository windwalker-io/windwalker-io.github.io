# Architecture skills

This folder captures the system-level understanding needed to work safely in this repository.

## Key repository facts

- This is a VitePress docs site, not the framework runtime code.
- Documentation content lives under `documentation/` and the site root.
- Site behavior is configured in `.vitepress/config.mts`.
- Generated navigation depends on `.vitepress/data/*.ts`.

## Working rule

When changing docs or site structure, check both the content and the generated navigation metadata so the documentation remains discoverable and consistent.
