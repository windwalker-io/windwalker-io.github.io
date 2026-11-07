# Browser testing skill

Reusable pattern for inspecting rendered pages with `playwright-core` and local Chrome.

## When to use

- Verifying rendered docs, navigation, or sidebar after content/config changes.
- Catching console errors, page errors, and failed requests.

## Workflow

1. Start the site with `yarn dev` (or `yarn build && yarn preview`).
2. Run the example: `node .github/skills/browser-testing/inspect.example.mjs <URL>` (or copy it to `tmp/` and adapt).
3. Delete any adapted copy in `tmp/` when finished.

## Notes

- `channel: 'chrome'` uses the installed Chrome; no browser download needed.
- Extend the example (screenshots, `page.locator(...)`, `page.evaluate(...)`) in a `tmp/` copy, not in place, unless the change is generally reusable.
