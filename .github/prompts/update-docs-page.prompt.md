Update a documentation page that has already been written in this repository (VitePress site under `documentation/`). The user may add a new paragraph or rewrite an existing section. The user's instruction may be in any language and only describes the direction of the change, roughly. Write the new or rewritten content in English.

Requirements:
0. Follow `.github/instructions/documentation-style.instructions.md` and `.github/skills/source-lookup/README.md` for all writing, research, and verification rules. Their rules apply in full to this task.
1. Read the target page in full and the section the user mentions. Keep the existing structure and tone unless the user asks otherwise.
2. Before writing, research the real usage as described in "Reading real usage for documentation" in `.github/skills/source-lookup/README.md`. Do not search the whole filesystem.
3. Complete the whole section, not only the sentence the user wrote. Fix nearby gaps that the research shows, and add missing examples, but do not change unrelated sections.
3a. When completing information the user provided, do not stop at a brief explanation or summary. For each usage scenario, add a realistic code example and a full scenario description: the problem, the setup, the code that runs end to end, and what the reader gets from it. Ground every example in the source and tests.
4. Follow `.github/instructions/documentation-style.instructions.md` for all writing, reminder, and formatting rules, including the code line length limit and the ban on the word "Pitfall". For page structure and how to introduce methods or syntax, follow `.github/docs/templates/doc-page.md`.
5. Do not change framework or host app source code.
6. Keep frontmatter unchanged unless the change requires it.


Constraints:
- Edit only the target page, unless a sidebar or metadata update is required by the change.
- Do not leave temporary files behind.

Success criteria:
- The requested paragraph or section is in English, accurate to the source, and consistent with the surrounding page.
- Every code sample and API name has been checked against the source or tests.
- Every code block line is 75 characters or fewer.
- `yarn build` passes with no dead links, when the change affects content, links, or navigation.
- A short summary lists what changed and any items that need the user's decision.

Validation after completion (mandatory):
- Re-open the changed page and check it against `documentation-style.instructions.md`, including the 75-character limit and the ban on the word "Pitfall".
- Confirm every code sample and API name matches the source or tests.
- Run `yarn build` in the site root and report the result.
