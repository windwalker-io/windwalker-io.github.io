# Documentation style instructions

## Rules

- Write all public pages in English, in a professional and neutral tone, as an Open Source project would.
- Verify commands, APIs, and paths against the current framework and the host app before documenting them. Do not copy from old or internal documents unchecked.
- Do not include internal material: private repository links, commit links, editor or IDE tutorials, personal remarks, or team conventions phrased as warnings.
- Do not use images by default. Describe results in text or with simulated terminal output in code blocks, and delete unused files from `public/`.
- Keep pages aligned with the navigation in `.vitepress/data/` and finish with `yarn build`.
- Write manual-style pages, not API reference. A page is a guide that teaches developers how to use the feature: what it is for, how it works, how the parts are assembled, and the design philosophy behind it. Introduce domain knowledge when a feature depends on it, and keep it brief.
- Do not write step-by-step tutorials or specs. Avoid listing every method, parameter, or option. Name the main classes and methods, and point to the source for full signatures.
- Include common misunderstandings, pitfalls, and security-sensitive behavior where they matter. These are part of the manual. Do not make them a separate appendix.
- Keep every line in code examples at 75 characters or fewer. When a line would exceed 75 characters, break it vertically: put each argument, array item, or chained call on its own line. usage and framework-injected usage for each component, where they apply.
- In a component's **Overview** page, include both `Use in Windwalker` and `Use as Standalone Component` sections. Follow the [component doc page template](../skills/templates/component-doc-page.md) for the example structure. In `Use as Standalone Component`, assume the package is installed by itself in a user's project and show the simplest entry point and usage. In `Use in Windwalker`, assume the host app has already configured DI and the required environment: do not create a new `Container`; show how to obtain the component through the existing container or app (for example, `container->get()`, `app->retrieve()`, or `app->make()` for components that are not singletons), or declare it as a constructor dependency. A component that is itself part of the DI or core system may be an exception, since its implementation is intentionally user-defined.
- Keep the Overview short: explain the package, its main parts, and how they relate. Details belong on topic pages.
- Split a component into topic pages by its structure, not by page length. Create a separate page for a subsystem, a domain concept, a topic a reader would look up on its own, or an optional add-on. Keep tightly coupled features together, even if the page is long. Short pages are fine when the topic is distinct. Name each page after its topic (`documentation/components/<name>/<topic>.md`), list it in the component menu, and explain the split in the final summary. If a split is unclear, ask the user before creating the page.
- Remove temporary files, scripts, and test pages created during the task.

For how to locate and verify framework source, see [source-lookup/README.md](../skills/source-lookup/README.md). For the page structure, see [component-doc-page.md](../skills/templates/component-doc-page.md). For the reusable rewrite workflow, see [rewrite-docs.prompt.md](../prompts/rewrite-docs.prompt.md).
