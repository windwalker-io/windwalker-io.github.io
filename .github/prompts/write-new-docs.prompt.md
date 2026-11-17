Write complete, first-time documentation for a Windwalker or Unicorn package, guide, or framework topic in this repository (VitePress site under `documentation/`).

Scope:
- The user defines the scope. It may be a component, a guide, a framework area, or a specific set of pages. Do not assume it is a component.
- If the target package or the target area under `documentation/` is unclear, or it is unclear whether pages are new or existing, ask the user before creating any file.
- Only when the scope is a component under `documentation/components/` use the component doc page template below. For any other scope, follow the documentation style instructions and the existing pages of that area instead.
- When the scope is a framework area (for example core, Unicorn, or Luna), read the real usage first, as described in "Reading real usage for documentation" in `.github/skills/source-lookup/README.md`, and write the page from that understanding.

Input (one of these):
- A set of existing documents (for example drafts, old pages, or notes) that the user points to. Use them as source material, but verify every API, option, and default against the source before using it. If these documents contain headings, treat them as the user's intended table of contents and follow that order where possible so readers can learn step by step. The order is not mandatory: add, merge, or change sections when it improves the manual. Headings only describe the topic to cover, so rewrite them into clear, polished headings suited to the manual's style.
- A request to read the source code directly. Locate the package source as described below and build the documentation from it.

User Outline:
- If this prompt file or the user's input contains a "User Outline" section, treat it as the user's direct instructions for this task.
- Follow the User Outline's structure, headings, page list, and order exactly. When it conflicts with the general rules below, the User Outline wins, except for the verification and style rules in `documentation-style.instructions.md`, which always apply.
- Use the User Outline as the page structure. Do not add, merge, or reorder sections unless the User Outline allows it.
- If the User Outline is missing details needed to write a section, ask the user before creating the file.

Locating sources:
- Follow `.github/skills/source-lookup/README.md` to locate the host app and read the package source, `README.md`, `docs/`, and the package's own instructions. Do not search the whole filesystem.

Step 0 (mandatory, before writing anything):
- Read `.github/instructions/documentation-style.instructions.md` in full.
- If the scope is a component, also read `.github/skills/templates/component-doc-page.md` in full.
- Reply with a short list of the rules you will apply, including where reminders go and the line-length limit, before creating any file.

- Follow `.github/instructions/documentation-style.instructions.md` for writing rules.
- If the scope is a component, follow `.github/skills/templates/component-doc-page.md` for page structure. Otherwise, follow the structure of the existing pages in the same area under `documentation/`.
- Study the Overview sections of existing pages in the same area (for component scope, under `documentation/components/`) to match tone and layout.
- For component packages, focus on standalone usage (without the framework). In the Overview, include the main framework entry point (DI examples are allowed there). On topic pages, mention framework-level behavior only briefly as background, for example when a config setting can control it. Do not write large DI, service provider, or command-line examples on topic pages; those belong to their own dedicated section.

Requirements:
0. Follow `.github/instructions/documentation-style.instructions.md` and `.github/skills/source-lookup/README.md` for all writing, research, and verification rules. Their rules apply in full to this task.
1. Write a manual, not an API reference. The reader should understand what the package is for, how its parts think and fit together, and how to assemble them. Explain the concepts and the design philosophy before the details. Introduce a domain term when a feature depends on it, and explain it briefly.
1a. Give every topic page a complete narrative flow: its purpose and the problem it solves, the minimal enabling or assembly, a realistic showcase example that runs end to end, then the detailed features. Do not start a page with detailed features or with an API list.
2. Decide new section pages by the split rules in `.github/instructions/documentation-style.instructions.md` (subsystem, domain concept, topic, or optional add-on, not length). When a split is unclear, ask the user before creating the page.
3. Do not write a step-by-step tutorial, and do not write a spec. Use short, realistic examples that show a pattern or an assembly. Do not list every method, parameter, or option. Name the main classes and the methods a user normally calls, and point to the source for complete signatures.
4. Include the reminders: common misunderstandings, traps, and security-sensitive behavior. State them plainly in the section where they matter, not in a separate appendix. Mark each with plain text, `::: tip`, `::: info`, or `::: warning`, according to its type and severity. The page should read like the introduction chapter of a book, not like a dictionary.
5. Decide page splits by the package's structure, not by length. Give a feature its own page when it is a subsystem, a domain concept, a separate topic the reader may look up on its own, or an optional add-on. Keep tightly coupled features on the same page, even if the page is long. A short page is acceptable when its topic is distinct.
6. Verify every code sample, class name, method signature, and default against the source and the package's `tests/` folder. Do not invent APIs. Mention a default only when it matters to the user. Use tests for realistic usage patterns.
7. Write in fluent, native-sounding English, in the tone of a professional open-source project. Keep it neutral. Do not include internal links, IDE tutorials, personal remarks, or images.
8. Use the site's page layout and frontmatter conventions: `layout: doc` and `title` on every page. For component pages, also set `component: <name>` on every page of the component, add the component to `.vitepress/data/components.ts`, and add its menu to `.vitepress/data/menu/components/<name>.ts`. For other scopes, follow the sidebar setup used by that area (for example `.vitepress/data/guides.ts`). Make sure the sidebar lists every new page.
9. Apply the code line length limit (75 characters) from `documentation-style.instructions.md`.
10. Do not change framework or host app source code.

Final self-check (run before reporting completion, and report the result):
- No `Pitfall` word in any heading or label, and no Pitfalls section at the end of a page. Every reminder sits right after the code or concept it concerns, as plain text, `::: tip`, `::: info`, or `::: warning`.
- Code block line length and `yarn build` are verified as described in `documentation-style.instructions.md`.
- No sentence describes several methods, options, or steps in a list. Replace it with a short code example.
- Every topic page follows the order: purpose, minimal setup, showcase, details, with reminders inside the relevant sections.
- `yarn build` passes with no dead links.

Success criteria:
- The overview or introduction page explains the subject and its main parts, and each page covers its topic with concepts, usage, and reminders.
- Standalone and framework-injected usage are covered where they apply, which for component packages is always.
- Page splits follow the rules in the documentation style instructions, and the final summary lists the proposed pages and reasons.
- Every page is listed in the sidebar menu, and no existing pages break.
- `yarn build` succeeds in the site root.
- Temporary files are removed, and a short summary lists what was documented and any items needing your decision.

Validation after completion (mandatory):
- Re-open every created or changed file and check it against `documentation-style.instructions.md` and the Final self-check above. Fix any violation before reporting.
- Check every heading and section of the outline or summary. Any section that is still a brief outline, summary, or bullet list instead of a formal manual section must be expanded with the full narrative flow, realistic examples, and reminders. Do not leave any unfinished section behind, not even the second half of the page.
- Repeat the check until no section is left as an outline or summary.
- Confirm every referenced path and section in the prompt and the pages exists.
- Run `yarn build` in the site root and report the result.

