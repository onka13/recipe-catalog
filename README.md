# Recipe Catalog

Scaffolds and recipes for every language and project type, written as Markdown files that people and coding agents can read.

- A **scaffold** creates a new project of a stack (for example a Flutter app or a Node TypeScript API).
- A **recipe** adds one capability to such a project (logging, an HTTP client, ads, request signing, ...): files to write, packages to add, parameters to fill in, and instructions for a coding agent where an existing file must change.
- A **stack** groups the scaffolds and recipes of one kind of project.

Every item is checked by applying it to a fresh project and building and testing the result.

> Status: pre-release (`0.x`). The format may still change; `schemaVersion` marks every change. The project's final name is not chosen yet.

## Layout

```
stacks/<language>/<stack>/STACK.md
stacks/<language>/<stack>/scaffolds/<id>/SCAFFOLD.md   + files/
stacks/<language>/<stack>/recipes/<category>/<id>/RECIPE.md + files/
```

Today: `dart/mobile-flutter`, `typescript/backend-node-tsoa`, `typescript/web-admin-react`. See `FORMAT.md` for the rules and `CATEGORIES.md` for the categories.

## Use it

Read the Markdown directly, or use a release: every tagged release has `release/catalog.json`, all items in one JSON file (`schema/bundle.schema.json`), and `release/checks.json`, the check result of every item.

## The `catalog` command

```bash
npm install && npm run build
npm run catalog -- lint                                   # check every item
npm run catalog -- lint --against release/catalog.json    # also: no released version changed
npm run catalog -- build --version 0.2.0                  # write release/catalog.json
```

Check an item the way a project receives it (FORMAT.md 7.3): a fresh project of its stack in the toolchain image, its mandatory recipes, the item, its instructions carried out by your coding agent, then the build and tests:

```bash
docker build -t recipe-catalog-toolchain toolchain/                # once
npm run catalog -- verify admob-monetization --image recipe-catalog-toolchain --agent claude
npm run catalog -- release --version 0.2.0 --image recipe-catalog-toolchain --agent claude
```

`--agent` is `claude` (Claude Code), `codex` (OpenAI Codex CLI) or `copilot` (GitHub Copilot CLI), run in its non-interactive mode in the check folder; `--agent-bin` points at its executable when it is not on the PATH. Without `--agent`, `verify` stops at the first instruction. The project folders stay in `.check/` for inspection.

Coming next: `harvest` (turn a capability of your own project into a recipe, with the coding agent you already use) and `studio` (a local editor).

## Contribute

See `CONTRIBUTING.md`. Licensed under the Apache License 2.0.
