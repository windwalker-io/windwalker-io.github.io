Write complete, first-time documentation for a Windwalker component or package in this repository (VitePress site under `documentation/components/`).

Input (one of these):
- A set of existing documents (for example drafts, old pages, or notes) that the user points to. Use them as source material, but verify every API, option, and default against the source before using it.
- A request to read the source code directly. Locate the package source as described below and build the documentation from it.

Locating sources:
- Follow `.github/skills/source-lookup/README.md` to locate the host app and read the package source, `README.md`, `docs/`, and the package's own instructions. Do not search the whole filesystem.

Step 0 (mandatory, before writing anything):
- Read `.github/instructions/documentation-style.instructions.md` in full.
- Read `.github/skills/templates/component-doc-page.md` in full.
- Reply with a short list of the rules you will apply, including where pitfalls go and the line-length limit, before creating any file.

- Follow `.github/instructions/documentation-style.instructions.md` for writing rules, and `.github/skills/templates/component-doc-page.md` for page structure.
- Study the Overview sections of existing component pages under `documentation/components/` to match tone and layout.
- Focus on standalone usage (without the framework) for every component. In the Overview, include the main framework entry point (DI examples are allowed there). On topic pages, mention framework-level behavior only briefly as background, for example when a config setting can control it. Do not write large DI, service provider, or command-line examples on topic pages; those belong to their own dedicated section.

Requirements:
1. Write a manual, not an API reference. The reader should understand what the package is for, how its parts think and fit together, and how to assemble them. Explain the concepts and the design philosophy before the details. Introduce a domain term when a feature depends on it, and explain it briefly.
1a. Give every topic page a complete narrative flow: its purpose and the problem it solves, the minimal enabling or assembly, a realistic showcase example that runs end to end, then the detailed features, and finally the pitfalls. Do not start a page with detailed features or with an API list.
2. Decide new section pages by the split rules in `.github/instructions/documentation-style.instructions.md` (subsystem, domain concept, topic, or optional add-on, not length). When a split is unclear, ask the user before creating the page.
3. Do not write a step-by-step tutorial, and do not write a spec. Use short, realistic examples that show a pattern or an assembly. Do not list every method, parameter, or option. Name the main classes and the methods a user normally calls, and point to the source for complete signatures.
4. Include the pitfalls: common misunderstandings, traps, and security-sensitive behavior. State them plainly where they matter, not in a separate appendix. The page should read like the introduction chapter of a book, not like a dictionary.
5. Decide page splits by the package's structure, not by length. Give a feature its own page when it is a subsystem, a domain concept, a separate topic the reader may look up on its own, or an optional add-on. Keep tightly coupled features on the same page, even if the page is long. A short page is acceptable when its topic is distinct.
6. Verify every code sample, class name, method signature, and default against the source and the package's `tests/` folder. Do not invent APIs. Mention a default only when it matters to the user. Use tests for realistic usage patterns.
7. Write in fluent, native-sounding English, in the tone of a professional open-source project. Keep it neutral. Do not include internal links, IDE tutorials, personal remarks, or images.
8. Use the site's page layout and frontmatter conventions: `layout: doc`, `title`, and `component: <name>` on every page of the component. Add the component to `.vitepress/data/components.ts` and its menu to `.vitepress/data/menu/components/<name>.ts` so the sidebar lists every page.
9. Keep every line in code examples at 75 characters or fewer. When a line would exceed 75 characters, break it vertically: put each argument, array item, or chained call on its own line.
10. Do not change framework or host app source code.

Final self-check (run before reporting completion, and report the result):
- No `## Pitfalls` or `### Pitfalls` heading at the end of a page, except one cross-cutting list of at most two items on the Overview. Every other pitfall sits right after the code or concept it concerns, marked `**Pitfall:**`.
- Every code block line is 75 characters or fewer. Check with: awk over fenced blocks, printing lines longer than 75.
- No sentence describes several methods, options, or steps in a list. Replace it with a short code example.
- Every topic page follows the order: purpose, minimal setup, showcase, details, pitfalls.
- `yarn build` passes with no dead links.

Success criteria:
- The overview explains the package and its main parts, and each page covers its topic with concepts, usage, and pitfalls.
- Standalone and framework-injected usage are covered where they apply.
- Page splits follow the rules in the documentation style instructions, and the final summary lists the proposed pages and reasons.
- Every page is listed in the sidebar menu, and no existing pages break.
- `yarn build` succeeds in the site root.
- Temporary files are removed, and a short summary lists what was documented and any items needing your decision.

