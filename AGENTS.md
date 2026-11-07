# AGENTS.md

## Repository context

This repository is the documentation website for the Windwalker PHP framework. It is a VitePress site, not the framework source code itself.

## Critical files

- `package.json`: scripts and package manager setup
- `.vitepress/config.mts`: site configuration, navigation, and sidebar behavior
- `.vitepress/data/components.ts`: component taxonomy used to generate documentation navigation
- `.vitepress/data/guides.ts`: guide navigation for the docs site
- `.github/copilot-instructions.md`: repo-specific Copilot guidance for future sessions

## Build and validation

Use these commands for local work:

```bash
yarn install
yarn dev
yarn build
yarn preview
```

- `yarn dev` for active local development
- `yarn build` for production verification
- `yarn preview` for a final local preview of the built site

There are no dedicated lint or test scripts in this repo, so prefer `yarn build` as the main validation step after documentation or VitePress config changes.

## Working conventions

- Keep content changes in Markdown under `documentation/` or the site root.
- If you add or rename a documentation page, check whether the sidebar metadata also needs updating in `.vitepress/data/`.
- Preserve existing route patterns and naming conventions.
- Treat VitePress config and generated navigation as coupled files; changes in one often require matching updates in the other.
- Keep edits small and scoped to the specific documentation change.

## Documentation standards

- Prefer the existing language and structure used by nearby pages.
- Keep agent or contributor guidance in `doc/skills/` and maintain the index when new categories are added.
- When creating reusable knowledge, keep it concise and actionable.

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

## Before finishing

Verify the site still builds successfully with `yarn build` when the change affects docs content, links, navigation, or site configuration.
