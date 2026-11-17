# LLMs output instructions

## Rules

- Any change to the llms.txt, raw `.md` export, or skills zip code in `.vitepress/data/` must be verified with `yarn build`.
- Check `.vitepress/dist/llms.txt` and one sample `.md` file in `.vitepress/dist/` after the build.
- Never put temporary Markdown files in `tmp/` while building. They break `yarn build`.

## Reference

The generated files, the code map, and how to change them are documented in [docs/architecture/llms-output.md](../docs/architecture/llms-output.md).
