# Documentation style instructions

## Rules

- Write all public pages in English, in a professional and neutral tone, as an Open Source project would.
- Verify commands, APIs, and paths against the current framework and the host app before documenting them. Do not copy from old or internal documents unchecked.
- Do not include internal material: private repository links, commit links, editor or IDE tutorials, personal remarks, or team conventions phrased as warnings.
- Do not use images by default. Describe results in text or with simulated terminal output in code blocks, and delete unused files from `public/`.
- Keep pages aligned with the navigation in `.vitepress/data/` and finish with `yarn build`.
- Write reference-style pages: developers should be able to look up each parameter quickly. Do not write step-by-step tutorials unless the user asks for one.
- Cover standalone usage and framework-injected usage for each component, where they apply.
- Do not create new section pages without the user's approval. Propose them in the final summary.
- Remove temporary files, scripts, and test pages created during the task.

For how to locate and verify framework source, see [source-lookup/README.md](../skills/source-lookup/README.md). For the page structure, see [component-doc-page.md](../skills/templates/component-doc-page.md). For the reusable rewrite workflow, see [rewrite-docs.prompt.md](../prompts/rewrite-docs.prompt.md).
