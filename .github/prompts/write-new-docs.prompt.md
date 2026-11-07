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
1. Write a manual, not an API reference. The reader should understand what the package is for, how its parts think and fit together, and how to assemble them. Explain the concepts and the design philosophy before the details. Introduce a domain term when a feature depends on it, and explain it briefly.
2. Do not write a step-by-step tutorial, and do not write a spec. Use short, realistic examples that show a pattern or an assembly. Do not list every method, parameter, or option. Name the main classes and the methods a user normally calls, and point to the source for complete signatures.
3. Include the pitfalls: common misunderstandings, traps, and security-sensitive behavior. State them plainly where they matter, not in a separate appendix. The page should read like the introduction chapter of a book, not like a dictionary.
4. Decide page splits by the package's structure, not by length. Give a feature its own page when it is a subsystem, a domain concept, a separate topic the reader may look up on its own, or an optional add-on. Keep tightly coupled features on the same page, even if the page is long. A short page is acceptable when its topic is distinct.
5. Verify every code sample, class name, method signature, and default against the source. Do not invent APIs. Mention a default only when it matters to the user.
6. Write in fluent, native-sounding English, in the tone of a professional open-source project. Keep it neutral. Do not include internal links, IDE tutorials, personal remarks, or images.
7. Use the site's page layout and frontmatter conventions: `layout: doc`, `title`, and `component: <name>` on every page of the component. Add the component to `.vitepress/data/components.ts` and its menu to `.vitepress/data/menu/components/<name>.ts` so the sidebar lists every page.
8. Keep every line in code examples at 75 characters or fewer. When a line would exceed 75 characters, break it vertically: put each argument, array item, or chained call on its own line.
9. Do not change framework or host app source code.

Success criteria:
- The overview explains the package and its main parts, and each page covers its topic with concepts, usage, and pitfalls.
- Standalone and framework-injected usage are covered where they apply.
- Page splits follow the rules in the documentation style instructions, and the final summary lists the proposed pages and reasons.
- Every page is listed in the sidebar menu, and no existing pages break.
- `yarn build` succeeds in the site root.
- Temporary files are removed, and a short summary lists what was documented and any items needing your decision.

