User may provide a component folder, audit the Windwalker framework documentation in this repository (VitePress site under `documentation/<component>/`) against the current framework source, then complete the outdated and missing content.

Context and sources:
- Follow `.github/skills/source-lookup/README.md` to locate the host app, read the package source, and verify runtime behavior. Do not search the whole filesystem.
- Site component docs: `documentation/components/<component>/`. Navigation metadata: `.vitepress/data/components.ts` and `.vitepress/menu/components/`.

Requirements:
1. For provided component in `documentation/components/`, compare the existing pages with the current source. Record which content is outdated (wrong APIs, signatures, defaults, or examples) and which is missing (new features, options, or behavior).
2. Fix outdated content and fill in missing content in the existing pages. Keep the current structure, tone, and naming. Verify every code sample and API name against the source before writing it.
3. Treat the draft docs under the package `docs/` folders in the host app's vendor (`vendor/windwalker-io/*/docs/`, for example database, orm, query, session, utilities) as major features that need documentation. Add them to the matching component pages.
4. Do not create new section pages without asking the user first. Report which features you consider worth a new section page and wait for approval.
5. Only add a feature to the docs when it significantly changes the logic, usage, or developer experience. Skip minor internal changes.
6. Keep docs English, professional, and neutral. Do not add internal links, IDE tutorials, or images.
7. Do not change framework source code.

Success criteria:
- Each component page matches the current source for the APIs it documents.
- All draft features in the package `docs/` folders (under the host app's vendor) are covered in the site docs, or are listed as pending your approval for new pages.
- A short final summary lists the outdated and missing items found per component, and what was changed.
- `yarn build` succeeds in the site root.
- Temporary files are removed.
