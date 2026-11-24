# LLMs output architecture

The site publishes LLM-friendly plain text next to the HTML pages. All of it is produced by our own code in `.vitepress/data/`, not by a VitePress plugin.

- `/llms.txt`: an index of documentation pages, grouped by area, with absolute links.
- `/<page>.md`: a raw Markdown copy of every public source page, with a footer that links back to `llms.txt` and to the HTML page.
- `/skills.zip`: a zip of the same Markdown set, with relative links. See `skills-package.ts`.

## Where the code lives

- `.vitepress/data/markdown-export.ts`: the main logic.
  - `publicMarkdownFiles()` collects `.md` files under the repo. It skips `node_modules`, `.vitepress`, `.git`, `.yarn`, `tmp`, and `dist`. `publicExcludePrefixes` (glob patterns) also excludes `tmp/**`.
  - `llmsMarkdownFiles()` selects the pages for `llms.txt` and the skills package. It drops root-level files (no `/` in the path) and anything under `.github/` (`llmsExcludePrefixes`).
  - `buildLlmsTxt()` writes `llms.txt`. Pages are grouped by `sectionNames` (`documentation/guides`, `documentation/components`, `documentation/framework`, `documentation/unicorn`); anything else goes under `Other`. Subdirectories become nested lists. The Framework and Unicorn RAD sections follow `frameworkSidebar` and `unicornSidebar` instead (`sidebarSectionNames`): sidebar group headings are skipped, item nesting is kept, and pages missing from the sidebar are appended flat. Each entry uses only the frontmatter `description`.
  - `withMarkdownFooter()` appends the `llms.txt` and HTML links to every raw Markdown file.
  - `exportMarkdownAndLlmsTxt()` writes the `.md` copies and `llms.txt` into the build output. It is called from `buildEnd` in `.vitepress/config.mts`.
  - `markdownExportPlugin()` is a dev middleware. It serves `/llms.txt` and raw `.md` files during `yarn dev`. Requests that look like Vite module loads (`?` in the URL, or a non-document `sec-fetch-dest`) are passed through, so pages still render.
  - It also exports `siteUrl`, which is read from the repository root `CNAME` file (`https://<CNAME>`). Do not hard-code the domain elsewhere.
- `.vitepress/data/skills-package.ts`: builds the zip and its checksum. It runs before rendering, because the checksum is injected into `ai-development.md` through `__SKILLS_*` defines and `markdown.codeTransformers` in `.vitepress/config.mts`.

## How to change common things

- **Add a new top-level docs area to `llms.txt`**: add a `[prefix, name]` pair to `sectionNames`. Without it, the pages land under `Other`.
- **Hide a page from `llms.txt` and the skills zip**: add its prefix to `llmsExcludePrefixes`, or move it out of the `.md` set. Excluding it from `publicExcludePrefixes` also removes its raw `.md` copy and HTML build output.
- **Change the page description in `llms.txt`**: set `description` in the page frontmatter. Pages without it get no description in `llms.txt`.
- **Change the footer**: edit `withMarkdownFooter()`. It must not alter HTML pages, which are rendered from the source separately.
- **Change the site domain**: edit the repository root `CNAME` file. `siteUrl` in `markdown-export.ts` reads it, and the sitemap hostname in `config.mts` uses the same value.

## Things to know

- Pages are discovered from the file system, not from the sidebar. A new page appears in `llms.txt` without any sidebar change.
- `llms.txt` lists some internal pages (for example `wip.md`) because `llmsMarkdownFiles()` only excludes `.github/` and root-level files. Exclude them explicitly if they should not be published.
- Duplicate titles such as several `Introduction` entries are possible. Set a specific frontmatter `title` or `description` to make entries distinguishable.
- Dev mode serves `llms.txt` by rebuilding the in-memory string on each request. Raw `.md` files are read from the source on each request. `dist/` is not used in dev.

## Verification

- Run `yarn build` after any change here. Check `.vitepress/dist/llms.txt` and a sample `.md` file in `.vitepress/dist/`.
- Run `yarn dev` and request `http://localhost:5173/llms.txt` and a page `.md` URL with `curl`. Stop only the process you started.
- Do not put temporary Markdown files in `tmp/` while running the build. They break `yarn build`.

## Related

- [documentation-style.instructions.md](../../instructions/documentation-style.instructions.md) for the rules that apply to the Markdown pages themselves.
