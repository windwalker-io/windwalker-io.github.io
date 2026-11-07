# Skill: repository-init-generic

## Purpose

Initialize a repository with a lightweight, repo-specific AI guidance scaffold so future Copilot sessions can understand the project, its workflows, and conventions without digging through many files.

## When to use

Use this skill when:

- the repo has no AI guidance files yet
- the repo has partial guidance but no consistent structure
- you want to add or standardize local agent instructions without forcing a fixed folder layout
- the project has a custom architecture and the guidance should match it

## Expected behavior

1. Inspect the repository and identify its actual structure, language, tooling, and entry points.
2. Detect whether existing guidance files already exist (for example: `AGENTS.md`, `.github/copilot-instructions.md`, `.cursorrules`, `CLAUDE.md`, etc.).
3. Create a minimal, repo-appropriate AI documentation structure if needed.
4. Add or update `AGENTS.md` with repo context, critical files, working conventions, and validation steps.
5. Add or update `.github/copilot-instructions.md` with project overview, commands, architecture summary, and repo-specific conventions.
6. Keep the directory structure generic and flexible instead of hard-coding a fixed set of subfolders.
7. Preserve existing project guidance and extend it rather than replacing it wholesale.
8. Validate that the new files are present and internally consistent.

## Guiding principle

Do not force a rigid folder layout. The structure should match the repo.

Examples of acceptable patterns:

- `.github/docs/` with an index and a few project-specific notes
- `.github/skills/` for reusable operational guidance
- `docs/` or `guides/` if the repo already uses those conventions
- a single root-level `AGENTS.md` when no `.github/` structure is needed

Only create a directory and files when they add clarity for future sessions.

## Minimal file content pattern

### `AGENTS.md`

Include:

- repo purpose and stack
- important directories/files
- build/dev commands
- validation workflow
- repo-specific conventions
- any project-specific rules that matter for safe edits

### `.github/copilot-instructions.md`

Include:

- project overview
- build/test/lint commands if they exist
- high-level architecture
- key conventions and cross-file relationships
- brief editing guidance specific to the project

### Optional repo-local guidance folder

If a dedicated folder is useful, keep it simple:

- `index.md` or `README.md`
- category files only when the repo genuinely needs them
- no fixed naming requirement beyond clarity and consistency

## Validation checklist

- repo structure was inspected before creating files
- guidance is aligned to the actual project
- core commands were sourced from real config, scripts, or docs
- no unnecessary or fabricated sections were added
- existing guidance was preserved when relevant

## Reusable prompt

```text
Set up AI/project guidance for this repository in a way that matches the repo's actual structure and conventions.

Requirements:
1. Inspect the repo first and identify its real architecture, stack, and tooling.
2. Check whether AGENTS.md, .github/copilot-instructions.md, and any repo-local docs/skills guidance already exist.
3. Create or extend guidance files only where they add value.
4. Keep the structure generic and project-appropriate rather than forcing a fixed subfolder layout.
5. Add repo-specific context covering:
   - purpose of the project
   - important files/directories
   - build/dev/test/lint commands if they exist
   - key conventions and architecture decisions
   - validation expectations for future sessions
6. Preserve any existing relevant guidance and extend it instead of replacing it wholesale.
7. Keep the final result concise, useful, and aligned with how this repository actually works.

After finishing, confirm that the resulting guidance files are present and summarize the repo-specific instructions added.
```

## Short command variant

```text
Initialize AI repo guidance for this project by inspecting its real structure, creating or updating AGENTS.md and .github/copilot-instructions.md as needed, using a flexible project-appropriate layout, preserving existing guidance, and summarizing the repo-specific workflow and conventions.
```
