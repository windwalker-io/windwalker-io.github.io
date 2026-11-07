# Source lookup skill

This skill defines how to locate and verify the Windwalker and Unicorn framework source. Any task that documents, explains, or verifies a Windwalker or Unicorn API must follow it.

## Purpose

This repository is a documentation site. The framework packages are installed in a host app, not in this repository. Always verify APIs, signatures, defaults, and behavior against the host app's code instead of guessing.

## Scope

- Locating the host app
- Reading package source, `README.md`, `docs/`, and each package's own instructions
- Runtime and test verification in the host app

## Locating the host app

1. Do not search the whole filesystem.
2. Read the include paths in `.idea/php.xml` and `.idea/workspace.xml` (the `PhpIncludePathManager` and `PhpWorkspaceProjectConfiguration` entries). Resolve them relative to this repository.
3. The host app is usually named `earth`, but the name may differ.
4. Windwalker and Unicorn packages live under the host app's `vendor/` directory.

## Reading the source

- Read each package's source, `README.md`, and `docs/` folder under `vendor/`.
- Look beyond `src/`. Each package's `tests/` folder is a rich source of verified, runnable usage examples. Check it for the setup, assembly, and call patterns of a feature, and for edge cases and documented behavior. Prefer test examples that match the public API over internal test helpers.
- When a test and the source disagree, trust the source and note the discrepancy.
- Before working on a package, read its own instructions file (for example `AGENTS.md` or `.github/copilot-instructions.md`).
- Use `git log` in the package to see recent changes when needed.
- Draft documents under `vendor/windwalker-io/*/docs/` describe new or major features. Treat them as leads and verify them against the code.

## Runtime and test verification

Read the host app's `.github/dev/instructions/` first (`cli`, `smoke-test`, `test-common`, `test-coverage`) and `.github/dev/skills/test/SKILL.md`.

- Dev server: `php windwalker server:start php:main --host localhost --port 8080` (run from the host app root; serves `www/`, entry `/dev.php`). Pass an explicit `--port`, because the default port search starts at 8000.
- After starting, confirm it responds (for example with `curl`). Stop only the process you started. `server:stop` supports Swoole only.
- Quick runtime checks: `php windwalker exec tmp/<distinctive-name>.php`, or a temporary route or command per `smoke-test.instructions.md`. Delete temporary files afterwards.
- Run PHPUnit per the host app's test instructions to confirm documented behavior.

## Safety rules

- Never run `php windwalker run preparedev` or other reset or seed commands against data that must be preserved.
- Never bypass auth or CSRF to make a check pass.
- Do not commit host-app changes made only for verification.
- Do not change framework or host app source code from this repository.

## Validation

- Every API, option, and default in the docs must match the code you read.
- Note anything you could not verify in your final summary.
