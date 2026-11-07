# Architecture notes

This folder documents repository-level architecture and important cross-file relationships.

## Standard sections

- purpose and scope
- primary directories and entry points
- important configuration and build paths
- conventions that require coordination across multiple files

## Repository-specific notes

This repo is a VitePress documentation site for the Windwalker PHP framework. Key files include:

- `package.json` for scripts and dependency management
- `.vitepress/config.mts` for site setup and generated navigation
- `.vitepress/data/components.ts` and `.vitepress/data/guides.ts` for sidebar content
- `.github/workflows/deploy.yml` for deployment

Keep these files aligned when changing docs structure or navigation.
