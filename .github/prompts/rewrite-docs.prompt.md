---
description: 'Rewrite internal or outdated source documents into public English Open Source docs for this site'
---
Read the source documents the user points to (internal tutorials, notes, or outdated pages). They may be outdated or informal, but they contain knowledge and procedures about Windwalker. Rewrite them, or update the existing pages, into standard public English Open Source documentation for this VitePress site.

Requirements:
- Verify every command and API against the current code, following `.github/skills/source-lookup/README.md`. Delete temporary files afterwards.
- Prefer updating an existing page over creating an overlapping one. When adding or renaming a page, update `.vitepress/data/guides.ts` or `.vitepress/data/components.ts`, and keep the route patterns and `layout: doc` frontmatter.
- Apply all rules in `.github/instructions/documentation-style.instructions.md`: English tone, no internal or IDE material, no personal remarks, and no images (replace each image with text or simulated terminal output, and delete unreferenced image files).
- Give every rewritten topic page a complete flow: purpose and problem solved, minimal enabling and assembly, a complete showcase example, then detailed features, then pitfalls. Add the missing introduction and showcase when the source jumps straight into details.
- Keep code samples complete and correct: working imports where they matter, consistent examples across a chapter, and no stale or intermediate code left in the final version.
- Use VitePress containers (`::: tip`, `::: warning`) sparingly, only for information that matters to the reader.
- Link to related component docs (for example ORM, Query, HtmlFrame) after confirming the target page exists.

Success criteria:
- `yarn build` completes without dead-link or missing-asset errors.
- No remaining mention of internal repositories, editors, or images in the rewritten pages.
- Every command and API in the pages was verified against the current code.
- Every topic page opens with its purpose and minimal setup, not with detailed features.
- Finish with a short summary of changed pages, removed material, and anything that could not be verified.
