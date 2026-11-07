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

## Windwalker and Unicorn ecosystem

- This site documents Windwalker and Unicorn. Their packages are installed inside a host app, not used from this repo.
- The host app is usually named `earth`, but the name may differ. Locate it first through PhpStorm settings: the `PhpIncludePathManager` and `PhpWorkspaceProjectConfiguration` include paths in `.idea/php.xml` and `.idea/workspace.xml`, and the attached folders in the project settings.
- Windwalker and Unicorn live under the host app's `vendor/` directory. Read their source and docs there when you need API details.
- Each host-app domain package has its own `instructions` (for example `AGENTS.md` or `.github/copilot-instructions.md`). Read them before working on that package.
- Do not search the whole filesystem for the host app or the framework. Use the IDE include paths first, then the paths they point to.

## Verifying docs against the host app

When writing or changing docs, verify behavior in the host app instead of guessing. Read the host app's `.github/dev/instructions/` first (`cli`, `smoke-test`, `test-common`, `test-coverage`) and `.github/dev/skills/test/SKILL.md`.

- Dev server: `php windwalker server:start php:main --host localhost --port 8080` (run from the host app root; serves `www/`, entry `/dev.php`). Default port search starts at 8000, so pass an explicit `--port`.
- After starting, confirm it responds (e.g. `curl`). Stop only the process you started; `server:stop` supports Swoole only.
- Quick runtime checks: `php windwalker exec tmp/<distinctive-name>.php` or a temporary route/command per `smoke-test.instructions.md`. Delete temporary files afterwards.
- Run PHPUnit per the host app's test instructions to confirm documented behavior.
- Never run `php windwalker run preparedev` or other reset/seed commands against data that must be preserved, and never bypass auth/CSRF to make a check pass.
- Do not commit host-app changes made only for verification.

## Browser testing

Inspect rendered pages with `playwright-core` + local Chrome. Put temporary scripts in `tmp/` and **delete them when done**; only confirmed-reusable scripts belong in `.github/skills/browser-testing/` as examples. See `.github/instructions/browser-testing.instructions.md`.

## Editing guidance

- Keep content aligned with the existing documentation structure instead of creating ad hoc top-level pages.
- For new framework component docs, add the entry in the relevant component grouping and make sure the metadata matches the generated sidebar.
- Prefer small, targeted documentation edits; this repository is a docs site and does not have a large application codebase or test harness to validate behavior beyond the site build.
