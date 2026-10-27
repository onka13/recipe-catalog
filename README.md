# Recipe Catalog

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-strict-3178c6.svg?logo=typescript&logoColor=white)](tsconfig.json)
[![Tests](https://github.com/onka13/recipe-catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/onka13/recipe-catalog/actions/workflows/ci.yml)
[![Node: >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg?logo=node.js&logoColor=white)](package.json)
[![Checks: 33/33 passed](https://img.shields.io/badge/checks-33%2F33%20passed-e8734a.svg)](release/checks.json)

**Recipes your coding agent can apply, and that are proven to build.**

Scaffolds and recipes for every language and project type, written as Markdown files that people and coding agents can read.

- A **scaffold** creates a new project of a stack (for example a Flutter app or a Node TypeScript API).
- A **recipe** adds one capability to such a project (logging, an HTTP client, ads, request signing, ...): files to write, packages to add, parameters to fill in, and instructions for a coding agent where an existing file must change.
- A **stack** groups the scaffolds and recipes of one kind of project.

Every item is checked by applying it to a fresh project, letting a coding agent carry out its instructions, and building and testing the result.

> **Why not just ask the agent?**
> An agent asked to "add AdMob ads with consent" writes it from scratch every time, a little differently, against whatever package version it remembers. A recipe is the version that already worked: real files, pinned packages, named parameters, and only the edits to existing files left to the agent. The check proves the whole thing builds before anyone receives it.
>
> The agent is still the right tool for what is specific to your project. A recipe gives it a tested starting point, so it spends its effort there.

> **Status:** catalog 0.1 (tagged `v0.1.1`). The format is versioned (`schemaVersion` in every item) and may still change before 1.0. A released `id@version` never changes.

## What a recipe looks like, in one example

`stacks/dart/mobile-flutter/recipes/monetization/admob-monetization/` is one folder: a `RECIPE.md` and the files it writes, at the paths they get in the project.

<table>
<tr><th>RECIPE.md (trimmed)</th><th>The folder</th></tr>
<tr><td>

```markdown
---
schemaVersion: 1
id: admob-monetization
version: 1.0.0
language: dart
stack: mobile-flutter
category: monetization
dependsOn:
  - core-foundation
parameters:
  - key: ADMOB_APP_ID_ANDROID
    label: AdMob Android App ID
    default: ca-app-pub-3940256099942544~3347511713
packages:
  - name: google_mobile_ads
    version: ^5.1.0
verify:
  - flutter analyze
---
# Google AdMob Mobile Ads & Consent

## Instructions

### lib/main.dart
1. Import package:{{PACKAGE_NAME}}/core/ads/admob_service_adapter.dart.
2. Call await AdMobServiceAdapter().initialize()
   inside main() before runApp().
```

</td><td>

```
admob-monetization/
├── RECIPE.md
└── files/
    └── lib/core/ads/
        ├── ad_service_port.dart
        ├── admob_service_adapter.dart
        └── mock_ad_service_adapter.dart
```

```dart
abstract interface class AdServicePort {
  Future<void> initialize();
  Future<bool> showInterstitialAd();
  bool get isInitialized;
}
```

</td></tr>
</table>

The front matter is what a tool needs: where the item belongs, what it depends on, which packages to add and which parameters to fill in (the defaults are Google's test ids, never real ones). The `files/` are real files, so they can be read, diffed and compiled. The `### <path>` sections are the only part an agent carries out: changes to files the project already has, which a plain copy cannot make.

## Every item is checked the way a project receives it

The check starts from a fresh project of the stack in a toolchain image, applies the item, lets a coding agent carry out its instructions, and builds and tests the result. This is the AdMob recipe's entry in `release/checks.json` (trimmed):

```json
{
  "kind": "recipe", "id": "admob-monetization", "version": "1.0.0", "status": "passed",
  "image": "recipe-catalog-toolchain", "agent": "claude",
  "steps": [
    { "step": "baseline: flutter-app and its mandatory recipes", "status": "passed" },
    { "step": "admob-monetization: files", "status": "passed" },
    { "step": "admob-monetization: packages", "command": "flutter pub add google_mobile_ads:^5.1.0", "status": "passed" },
    { "step": "admob-monetization: instructions", "command": "claude", "status": "passed" },
    { "step": "admob-monetization: verify", "command": "flutter analyze", "status": "passed" },
    { "step": "delivery scripts", "command": "bash scripts/build.sh", "status": "passed" },
    { "step": "delivery scripts", "command": "bash scripts/test.sh", "status": "passed" }
  ]
}
```

A step fails when a command exits non-zero or an instruction's target file did not change, and an item that fails cannot be released. Each entry carries the item's `contentHash`, so a result belongs to exactly the files it checked.

## What is in it today

| Stack | Language | Scaffold | Recipes |
| :--- | :--- | :--- | ---: |
| `mobile-flutter`: Flutter mobile app | Dart | `flutter-app` | 8 |
| `backend-node-tsoa`: Node TypeScript API (Express, tsoa) | TypeScript | `node-tsoa-api` | 17 |
| `web-admin-react`: React web admin | TypeScript | `react-web` | 2 |
| `backend-aspnetcore`: C# API (ASP.NET Core) | C# | `aspnetcore-api` | 2 |

All 33 items of `v0.1.1` passed the full check. The recipes cover core foundations, architecture (dependency injection, anti-corruption layer, strangler facade), API boundaries, networking, storage, security (HMAC request signing, Firebase App Check), observability, testing, theming, speech, ads and vector search. `CATEGORIES.md` lists the categories.

## Layout

```
stacks/<language>/<stack>/STACK.md
stacks/<language>/<stack>/scaffolds/<id>/SCAFFOLD.md   + files/
stacks/<language>/<stack>/recipes/<category>/<id>/RECIPE.md + files/
```

See `FORMAT.md` for the rules and `CATEGORIES.md` for the categories.

## Use it

Read the Markdown directly, or use a release: every tagged release has `release/catalog.json`, all items in one JSON file (`schema/bundle.schema.json`), and `release/checks.json`, the check result of every item. To have a coding agent apply a recipe to your project, point it at `skills/apply-recipe/SKILL.md`.

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

It reads your project with [Code Intelligence](https://github.com/onka13/code-intelligence), without changing it, and gives the agent the files around the capability. The agent then writes the recipe in `.harvest/` following `skills/harvest-recipe/SKILL.md`. The recipe is filed under `stacks/` only when it passes the lint and holds none of your secrets, account ids or package name. If it fails, the agent gets the problems back (`--fix-rounds`, default 2). Add `--image <toolchain image>` to be offered the full check afterwards (`--verify` runs it without asking). Use `--files a,b` when the capability's words do not find the right files, and `--category` to fix the category.

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

A missing stack, a recipe for a capability you have built, or a fix to an existing item are all welcome. See `CONTRIBUTING.md`. Licensed under the Apache License 2.0.
