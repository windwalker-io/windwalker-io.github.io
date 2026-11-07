# Browser testing instructions

## Rules

- Inspect rendered pages (title, DOM, console errors, failed requests) with `playwright-core` driving the local Chrome (`chromium.launch({ channel: 'chrome' })`). Do not download browsers.
- Start the site first with `yarn dev` (default `http://localhost:5173/`) or `yarn preview`, and stop only the process you started.
- Put throwaway scripts in `tmp/` (git-ignored) and run them with `node tmp/<name>.mjs <URL>`.
- **Delete every temporary script in `tmp/` once the check is finished.**
- Keep a script only when it is confirmed to be reusable. Move it into `.github/skills/browser-testing/` as an example and update the skills index; never leave it in `tmp/`.
- Never bypass auth/CSRF or alter preserved data to make a check pass.

See [.github/skills/browser-testing/README.md](../skills/browser-testing/README.md) for the reusable example.
