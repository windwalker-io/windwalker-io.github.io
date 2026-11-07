Write complete, first-time documentation for a Windwalker component or package in this repository (VitePress site under `documentation/components/`).

Input (one of these):
- A set of existing documents (for example drafts, old pages, or notes) that the user points to. Use them as source material, but verify every API, option, and default against the source before using it.
- A request to read the source code directly. Locate the package source as described below and build the documentation from it.

Locating sources:
- Follow `.github/skills/source-lookup/README.md` to locate the host app and read the package source, `README.md`, `docs/`, and the package's own instructions. Do not search the whole filesystem.

- Follow `.github/instructions/documentation-style.instructions.md` for writing rules, and `.github/skills/templates/component-doc-page.md` for page structure.
- Study the Overview sections of existing component pages under `documentation/components/` to match tone and layout.
- Cover standalone usage (without the framework) and framework-injected usage (through DI, the application, or a service provider) for every component, where they apply.

Requirements:
1. Write a manual, not an API reference. Explain what each feature is for, how the parts work together, and where they are used. Introduce the main classes and the methods a user normally calls. Do not list every method, parameter, or option. Link readers to the source for complete signatures.
2. Do not write a step-by-step tutorial. Show short, realistic examples that illustrate each feature.
3. Verify every code sample, class name, method signature, and default against the source. Do not invent APIs. Mention a default only when it matters to the user.
4. Write in fluent, native-sounding English, in the tone of a professional open-source project. Keep it neutral. Do not include internal links, IDE tutorials, personal remarks, or images.
5. Use the site's page layout and frontmatter conventions: `layout: doc`, `title`, and `component: <name>` on every page of the component. Add the component to `.vitepress/data/components.ts` and its menu to `.vitepress/data/menu/components/<name>.ts` so the sidebar lists every page.
6. Keep the overview short. When a topic needs more than a few screens, split it into section pages (`documentation/components/<name>/<topic>.md`), one per feature area, and list them in the menu. Propose the page list to the user before creating section pages.
7. Do not change framework or host app source code.

Success criteria:
- The overview and section pages cover standalone and framework-injected usage and each main feature, with verified code samples.
- Every page is listed in the sidebar menu, and no existing pages break.
- `yarn build` succeeds in the site root.
- Temporary files are removed, and a short summary lists what was documented and any items needing your decision.
