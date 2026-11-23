Restructure the sections of a documentation page in this repository (VitePress site under `documentation/`) so that its content is grouped by topic and reads clearly.

Scope:
- The user names the page. If no page is named, use the file that is currently open.
- Edit only that page. Do not edit other files, except to fix links that the restructuring breaks in that page.

Requirements:
1. Find every feature description on the page, including those scattered across different sections.
2. Group related features under one topic. Move each description next to the other descriptions of the same topic, so that a feature is not split across the page.
3. Organize the topics into major sections (`##`) and minor sections (`###`). Give each section a clear heading that names its topic. Order the sections so that a reader learns the concepts first, then the usage, then the details.
4. Keep the existing content. Do not delete, summarize, or shorten any sentence, code sample, example, reminder, or admonition (`tip`, `info`, `warning`). Moving content is allowed. Rewriting it is not, except for the heading text.
5. Keep the existing wording, code samples, tone, and terminology unchanged. Only change a heading when the new grouping needs it.
6. Keep the page frontmatter and the opening introduction. Do not add or remove a page.

Constraints:
- Follow `.github/instructions/documentation-style.instructions.md` for all writing rules, including the 75-character limit for code lines.
- Do not change framework or host app source code.
- If a section cannot be placed in a clear topic without rewriting its content, leave it in place and report the reason instead of guessing.
- Do not create temporary files.

Success criteria:
- Every feature description on the page belongs to exactly one clearly named topic group.
- No content from the original page is lost. Compare the code blocks, admonitions, and sentences before and after.
- `yarn build` succeeds in the site root, and no links on the page are broken.
- The final reply lists the new section outline and any content left in place, with the reason.
