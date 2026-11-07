# Copilot instructions for this repository

## Project overview

This repository is the documentation site for the Windwalker PHP framework, not the framework source code itself. The site is built with VitePress and the content is primarily authored in Markdown under `documentation/`, with site-level config in `.vitepress/`.

## Build, test, and lint commands

This project uses Yarn and VitePress.

```bash
yarn install

yarn dev

yarn build

yarn preview
```

- `yarn dev`: starts the local VitePress dev server for live editing.
- `yarn build`: production build used by the deployment pipeline.
- `yarn preview`: serves the built site locally for final checks.

There are no explicit `test` or `lint` scripts in `package.json`, so there is no repo-specific single-test command to run here. For validation in this repo, prefer `yarn build` after content or config changes.

## High-level architecture

- `index.md`: landing page for the project.
- `documentation/`: main documentation content. It is organized into `guides/` and `components/` sections.
- `.vitepress/config.mts`: site-wide VitePress configuration, including title, navigation, sidebar behavior, and route metadata.
- `.vitepress/data/`: generated navigation and component metadata. `components.ts` defines the component taxonomies used to build the docs site, and `guides.ts` builds the guide sidebar.
- `public/`: static assets and files served as-is.
- `.github/workflows/deploy.yml`: GitHub Pages deployment pipeline; it installs dependencies with Yarn and runs `yarn build` before publishing.

## Key conventions

- This repo is content-first. Most changes are Markdown pages plus VitePress metadata, not application code.
- If you add or rename a documentation page, keep the generated navigation in sync with `.vitepress/data/components.ts` or `.vitepress/data/guides.ts`.
- Page frontmatter is meaningful: pages commonly use `layout: doc` and the home page uses `layout: home`.
- The site uses route prefixes and generated sidebars (`guideRoutePrefix` and `componentRoutePrefix` in `.vitepress/config.mts`); follow the existing route patterns when adding content.
- Deployment uses Yarn in CI (`.github/workflows/deploy.yml`), so keep the package manager and scripts aligned with that workflow.
- Most docs are framework documentation for Windwalker components; prefer matching the existing naming, grouping, and tone of the surrounding docs when editing content.

## Host app and framework source (MANDATORY)

This site documents Windwalker and Unicorn, whose packages are installed in a host app. Before documenting or verifying any Windwalker or Unicorn API, you MUST read and follow `.github/skills/source-lookup/README.md`. It covers locating the host app, reading package source, runtime verification, and safety rules. Do not guess APIs or paths.

## Browser testing

Inspect rendered pages with `playwright-core` + local Chrome. Put temporary scripts in `tmp/` and **delete them when done**; only confirmed-reusable scripts belong in `.github/skills/browser-testing/` as examples. See `.github/instructions/browser-testing.instructions.md`.

## Editing guidance

- Keep content aligned with the existing documentation structure instead of creating ad hoc top-level pages.
- For new framework component docs, add the entry in the relevant component grouping and make sure the metadata matches the generated sidebar.
- Prefer small, targeted documentation edits; this repository is a docs site and does not have a large application codebase or test harness to validate behavior beyond the site build.
