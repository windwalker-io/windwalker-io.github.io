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
- Keep agent or contributor guidance in `.github/skills/` and maintain `.github/skills/index.md` when new categories are added.
- Reusable documentation rules live in `.github/instructions/documentation-style.instructions.md`. Follow them for every public page.
- When creating reusable knowledge, keep it concise and actionable.

## Host app and framework source (MANDATORY)

This site documents Windwalker and Unicorn, whose packages are installed in a host app, not in this repository.

**Before documenting, explaining, or verifying any Windwalker or Unicorn API, you MUST read `.github/skills/source-lookup/README.md` and follow it.** It defines how to locate the host app, which package files to read, how to verify behavior at runtime, and the safety rules. Do not guess paths, class names, signatures, or defaults, and do not skip this step because the task looks small.

- Locate the host app only through the IDE include paths in `.idea/php.xml` and `.idea/workspace.xml`. Never search the whole filesystem.
- Read the host app's `vendor/` packages, and each package's own instructions, before writing about that package.

## Before finishing

Verify the site still builds successfully with `yarn build` when the change affects docs content, links, navigation, or site configuration.
