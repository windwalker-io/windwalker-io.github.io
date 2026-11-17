# Documentation style instructions

## Rules

- Write public pages in English, in a neutral, professional open-source tone.
- Verify commands, APIs, and paths against the framework and the host app. Do not copy unchecked content from old or internal documents.
- Exclude internal material: private repository or commit links, IDE tutorials, personal remarks, and team conventions phrased as warnings.
- Use no images by default. Show results as text or simulated terminal output, and delete unused files in `public/`.
- Keep pages aligned with the navigation in `.vitepress/data/`, and finish with `yarn build`.
- When a component's first-time docs are complete, remove its `wip` flag (`extra: { 'wip': true }`) in `.vitepress/data/components.ts` and set `extra: {}`.
- Write manuals, not API references. A page guides developers through a feature: its purpose, how it works, how the parts fit together, and the design philosophy.
- Introduce domain knowledge briefly when a feature depends on it.
- When a feature solves a real-world problem, add a short paragraph before the usage. Explain why it is needed and what it gains, using a concrete scenario. Verify the advantages in the source first. Good candidates include the cache tagged pool and the reactor memory table.
- No step-by-step tutorials or specs. Name the main classes and methods, and link to the source for full signatures.
- Cover misunderstandings, traps, and security-sensitive behavior in the section where they matter, not in an appendix.
- Never use the word "pitfall" in headings, labels, or section names, and do not add a Pitfalls section.
- Place each reminder right after the code or concept it concerns, in the form that fits its type and severity:
  - Plain text: a minor note, a common misreading, or a risk-free detail.
  - `::: tip`: a practice or shortcut that improves results.
  - `::: info`: unexpected behavior with no risk.
  - `::: warning`: data loss, overwritten files, disabled security checks, leaked secrets, silent wrong results, crashes or hangs, or failures that are hard to notice.
- Use containers sparingly. Do not mark routine details as warnings.
- Do not document a bug as a reminder. Report it to the framework maintainers as an issue, with reproduction steps and the affected file and line, and document only the intended behavior.
- Show a short, realistic code example for every case or variant. Do not describe a variant in one abstract sentence.
- To introduce the methods, properties, or syntax of a class, use one large code block with inline comments for each use case. Let the example carry the explanation, and avoid prose lists or tables for each member.
- Present enumerations as bulleted lists, one item per line, with a short description when it helps.
- Keep code lines at 75 characters or fewer. Break longer lines vertically, with one argument, array item, or chained call per line.
- Before reporting a doc change as complete, check fenced blocks with awk for lines over 75 characters. Run `yarn build` when the change affects content, links, or navigation.
- Component docs focus on standalone usage, because the package is installed alone in a user's project. Show the simplest entry point without the framework.
- The Overview includes `Use as Standalone Component` and `Use in Windwalker` sections. The framework section may show DI. Assume DI is configured: do not create a `Container`. Obtain the component with `container->get()`, `app->retrieve()`, or `app->make()` for non-singletons, or inject it in a constructor. Follow the [component doc page template](../docs/templates/component-doc-page.md).
- Topic pages mention the host app only as background, such as a config override. Do not repeat DI examples or command-line usage there. Link to the dedicated sections instead.
- Keep the Overview short: the package, its main parts, and how they relate. Put details on topic pages.
- Topic pages follow this narrative order, and no step may be skipped:
  1. What the feature is for and the problem it solves.
  2. The minimal way to enable or obtain it, and how its parts fit together.
  3. A complete, realistic example that runs end to end.
  4. The detailed features, grouped by concept.
  5. Reminders and security-sensitive behavior, in the relevant sections.
- Split a component into topic pages by structure, not length. Create a page for a subsystem, a domain concept, a topic readers look up on their own, or an optional add-on. Keep tightly coupled features together. Name pages `documentation/components/<name>/<topic>.md`, list them in the component menu, and explain the split in the final summary. Ask the user if the split is unclear.
- Keep prose short. Use one sentence per idea, state the rule first, and cut filler, repeated explanations, and restated headings. Never change code examples while shortening text.
- Remove temporary files, scripts, and test pages created during the task.

For how to locate and verify framework source, see [source-lookup/README.md](../skills/source-lookup/README.md). For the page structure, see [doc-page.md](../docs/templates/doc-page.md), and for component Overviews, [component-doc-page.md](../docs/templates/component-doc-page.md). For the reusable rewrite workflow, see [rewrite-docs.prompt.md](../prompts/rewrite-docs.prompt.md).
