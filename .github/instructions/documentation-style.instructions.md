# Documentation style instructions

## Rules

- Write all public pages in English, in a professional and neutral tone, as an Open Source project would.
- Verify commands, APIs, and paths against the current framework and the host app before documenting them. Do not copy from old or internal documents unchecked.
- Do not include internal material: private repository links, commit links, editor or IDE tutorials, personal remarks, or team conventions phrased as warnings.
- Do not use images by default. Describe results in text or with simulated terminal output in code blocks, and delete unused files from `public/`.
- Keep pages aligned with the navigation in `.vitepress/data/` and finish with `yarn build`.
- When a component's first-time documentation is complete, remove its `wip` flag (`extra: { 'wip': true }`) from its entry in `.vitepress/data/components.ts`, and set `extra: {}`.
- Write manual-style pages, not API reference. A page is a guide that teaches developers how to use the feature: what it is for, how it works, how the parts are assembled, and the design philosophy behind it. Introduce domain knowledge when a feature depends on it, and keep it brief.
- When a feature solves a problem that matters in real-world systems, briefly explain why it is needed and what advantage it gives, before describing how to use it. Keep this to a short paragraph and ground it in a concrete scenario. Cases such as the cache tagged pool and the reactor memory table are good candidates. Verify the actual advantages in the framework source before writing them.
- Do not write step-by-step tutorials or specs. Avoid listing every method, parameter, or option. Name the main classes and methods, and point to the source for full signatures.
- Include common misunderstandings, traps, and security-sensitive behavior where they matter. These are part of the manual. Do not make them a separate appendix.
- Never use the word "pitfall" in headings, labels, or section names. Do not add a "Pitfalls" or "Common Pitfalls" section.
- Put each reminder directly in the section that explains the related feature, right after the code or concept it concerns. Choose the form by its type and severity:
  - Plain text: a minor note, a common misreading, or a detail with no risk.
  - `::: tip`: a practice or shortcut that improves results.
  - `::: info`: background or behavior the reader may not expect, with no risk.
  - `::: warning`: data loss, overwritten files, disabled security checks, leaked secrets, silent wrong results, crashes or hangs, or failures that are hard to notice.
- Use each form sparingly. Do not put a container on every section, and do not mark routine details as warnings.
- Do not document a bug as a reminder. When the code behaves incorrectly or contradicts its own docblock, do not describe the defect in the docs. Report it directly to the framework maintainers as an issue, with reproduction steps and the affected file and line. Document only the intended behavior.
- For every case or variant of a feature, show a short, realistic code example. Do not describe a variant in one abstract sentence alone.
- Keep every line in code examples at 75 characters or fewer. When a line would exceed 75 characters, break it vertically: put each argument, array item, or chained call on its own line. usage and framework-injected usage for each component, where they apply.
- Component docs focus on standalone usage. The package is installed by itself in a user's project, and the main examples show the simplest entry point and usage without the framework. In a component's **Overview** page, include both `Use as Standalone Component` and `Use in Windwalker` sections. The `Use in Windwalker` section is the main entry point for framework users, so it may show DI examples. Assume the host app has already configured DI and the required environment: do not create a new `Container`; show how to obtain the component through the existing container or app (for example, `container->get()`, `app->retrieve()`, or `app->make()` for components that are not singletons), or declare it as a constructor dependency. Follow the [component doc page template](../skills/templates/component-doc-page.md) for the structure.
- Topic pages mention the host app only as background. Use it to explain when a framework-level control matters, for example that a setting can be overridden through config in a given situation. Do not repeat DI examples (container, constructor injection, `retrieve()`, `make()`) or command-line usage on topic pages. Those topics are covered in their own dedicated sections, so link to them instead.
- Keep the Overview short: explain the package, its main parts, and how they relate. Details belong on topic pages.
- Every topic page must have enough narrative flow to stand on its own. Do not jump straight into detailed features. In order, cover: (1) what the feature is for and the problem it solves; (2) the minimal way to enable or obtain it, and how its parts are assembled; (3) a complete, realistic showcase example that runs end to end; (4) the detailed features, grouped by concept; (5) reminders and security-sensitive behavior, placed in the sections where they matter. Short pages may merge steps, but none of the steps may be skipped.
- Split a component into topic pages by its structure, not by page length. Create a separate page for a subsystem, a domain concept, a topic a reader would look up on its own, or an optional add-on. Keep tightly coupled features together, even if the page is long. Short pages are fine when the topic is distinct. Name each page after its topic (`documentation/components/<name>/<topic>.md`), list it in the component menu, and explain the split in the final summary. If a split is unclear, ask the user before creating the page.
- Remove temporary files, scripts, and test pages created during the task.

For how to locate and verify framework source, see [source-lookup/README.md](../skills/source-lookup/README.md). For the page structure, see [component-doc-page.md](../skills/templates/component-doc-page.md). For the reusable rewrite workflow, see [rewrite-docs.prompt.md](../prompts/rewrite-docs.prompt.md).
