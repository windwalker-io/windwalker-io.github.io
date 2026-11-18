Rewrite or update documents within the scope the user specifies, based on review feedback left in the documents.

The user marks each change request with `!review` and wraps the request in a Markdown blockquote (`>`). Example:

> !review Replace this paragraph with a short example of the retry flow.

Requirements:
- Find every `!review` blockquote in the specified scope. The scope is the files or folder the user names; if the user names none, use the file that is currently open.
- Treat the text in each blockquote as an instruction. Apply it to the document as written.
- Place each edit near the blockquote it answers. If the instruction asks for a change across the whole document (for example, "unify the terminology"), scan the full document and apply the change everywhere it applies.
- Change only what the instructions require. Keep the surrounding text, structure, and tone unchanged.
- After applying an instruction, delete its `!review` blockquote from the document.

Constraints:
- Do not edit files outside the specified scope.
- Follow the repository's documentation style rules and any instructions files that apply to the document.
- If an instruction is unclear or conflicts with the repository rules, leave its blockquote in place and report the reason instead of guessing.
- Verify facts against the source code or existing docs before writing new content.

Success criteria:
- Every in-scope `!review` blockquote is either applied and removed, or left in place with a stated reason.
- No unrelated text changed.
- The documents still build (run the project's build command if the change affects site content, links, or navigation).

When finished, reply with a short list of the files changed and the instructions applied, plus any blockquotes left in place and why.
