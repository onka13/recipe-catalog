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

Today: `dart/mobile-flutter`, `typescript/backend-node-tsoa`, `typescript/web-admin-react`, `csharp/backend-aspnetcore`. See `FORMAT.md` for the rules and `CATEGORIES.md` for the categories.

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
docker build -t recipe-catalog-toolchain toolchain/                # once: Node 20, Flutter 3.47.7, .NET SDK 10.0.401
npm run catalog -- verify admob-monetization --image recipe-catalog-toolchain --agent claude
npm run catalog -- release --version 0.2.0 --image recipe-catalog-toolchain --agent claude
```

`--agent` is `claude` (Claude Code), `codex` (OpenAI Codex CLI) or `copilot` (GitHub Copilot CLI), run in its non-interactive mode in the check folder; `--agent-bin` points at its executable when it is not on the PATH, and `--agent-model` picks the agent's model (for example `haiku`). Without `--agent`, `verify` stops at the first instruction. The project folders stay in `.check/` for inspection.

## Harvest a recipe from your own project

Turn a capability you built into a recipe with the coding agent you already use. The tool has no model client and asks for no key:

```bash
npm run catalog -- harvest ~/code/my-app "AdMob ads with consent" --stack mobile-flutter --agent claude
```

It reads your project with Code Intelligence, without changing it, and gives the agent the files around the capability. The agent then writes the recipe in `.harvest/` following `skills/harvest-recipe/SKILL.md`. The recipe is filed under `stacks/` only when it passes the lint and holds none of your secrets, account ids or package name. If it fails, the agent gets the problems back (`--fix-rounds`, default 2). Add `--image <toolchain image>` to be offered the full check afterwards (`--verify` runs it without asking). Use `--files a,b` when the capability's words do not find the right files, and `--category` to fix the category.

You can also ask your agent directly inside a clone of this repository ("harvest the AdMob ads from ~/code/my-app"). Claude Code loads the skill from `.claude/skills/`, and Codex and Copilot find it through `AGENTS.md`. The skill uses `catalog context` to read the project and `catalog add` to check and file the item.

## Catalog Studio

A local editor for items:

```bash
npm run catalog -- studio            # http://127.0.0.1:4310/
```

- The list on the left groups the items by stack, then scaffolds and recipes per category; a dot marks an item with uncommitted changes. Press `/` to search. With no item open, the overview shows what each stack holds.
- Each item opens in tabs: Overview (title, description, front matter form), Instructions, Conventions, Files (a file tree for `files/`), Changelog and Verify.
- The lint runs while you type. Save (or Ctrl+S / Cmd+S) is blocked while it reports an error, for example a released version whose files changed or a version without a changelog entry. "New version" raises the version (patch, minor or major) and adds its changelog entry for you to fill.
- Save writes only that item's folder, through the same format library the lint and the release use. "New recipe" shows the folder its front matter will name before you create the draft.
- Verify runs the full check with the agent you pick, Harvest runs the command above, and Changes shows the diff for your pull request, per file.

The Studio listens on 127.0.0.1 only and sends nothing anywhere. Verify and Harvest start your own coding agent, which talks to its own model service.

## Contribute

See `CONTRIBUTING.md`. Licensed under the Apache License 2.0.
