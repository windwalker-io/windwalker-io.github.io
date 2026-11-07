Write complete, first-time documentation for a Windwalker component or package in this repository (VitePress site under `documentation/components/`).

Input (one of these):
- A set of existing documents (for example drafts, old pages, or notes) that the user points to. Use them as source material, but verify every API, option, and default against the source before using it.
- A request to read the source code directly. Locate the package source as described below and build the documentation from it.

Locating sources:
- Follow `.github/skills/source-lookup/README.md` to locate the host app and read the package source, `README.md`, `docs/`, and the package's own instructions. Do not search the whole filesystem.

- Follow `.github/instructions/documentation-style.instructions.md` for writing rules, and `.github/skills/templates/component-doc-page.md` for page structure.
- Study the Getting Started sections of existing component pages under `documentation/components/` to match tone and layout.
- Cover standalone usage (without the framework) and framework-injected usage (through DI, the application, or a service provider) for every component, where they apply.

Requirements:
1. Cover the package's full feature set as a reference manual: every public class, method, option, and parameter that users need, with its default and purpose. Explain how the parts combine and where each is used.
2. Do not write a step-by-step tutorial. The goal is that developers can quickly look up each parameter and see how to assemble and apply the features.
3. Verify every code sample, class name, method signature, and default against the source. Do not invent APIs.
4. Write in fluent, native-sounding English, in the tone of a professional open-source project. Keep it neutral. Do not include internal links, IDE tutorials, personal remarks, or images.
5. Use the site's page layout and frontmatter conventions. Add the new page to the navigation metadata in `.vitepress/data/components.ts` and `.vitepress/menu/components/` so it appears in the sidebar.
6. Split large topics into section pages only after asking the user for approval.
7. Do not change framework or host app source code.

Success criteria:
- The page covers standalone and framework-injected usage, plus every public feature, with verified code samples.
- The new page is linked in the sidebar metadata and no existing pages break.
- `yarn build` succeeds in the site root.
- Temporary files are removed, and a short summary lists what was documented and any items needing your decision.
