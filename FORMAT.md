# Catalog format (schemaVersion 1)

This document defines how scaffolds, recipes and stacks are written. The JSON Schemas in `schema/` are the machine-readable form of the front matter rules; `catalog lint` applies both.

## 1. Principles

1. **One item, one folder, one Markdown file.** A stack is `STACK.md`, a scaffold is `SCAFFOLD.md`, a recipe is `RECIPE.md`. YAML front matter holds the fields a tool needs; the Markdown body holds what a person or a coding agent reads.
2. **Files are real files.** What an item writes into a project sits under the item's `files/` folder at the path it gets in the project, so it can be read, diffed, linted and compiled.
3. **Folders are the taxonomy.** The path tells the language, the stack and the category. The front matter repeats them, and the lint rejects a mismatch.
4. **Every item is checked the way a project receives it.** A recipe is more than code: its instructions tell a coding agent how to change files the project already has. The check builds a fresh project of the stack, applies the item, lets a coding agent carry out its instructions, and runs the project's build and tests (section 7). An item that fails cannot be released.
5. **Released versions never change.** A fix is a new version with a changelog entry.

## 2. Repository layout

```
README.md  FORMAT.md  CONTRIBUTING.md  CATEGORIES.md  LICENSE
schema/                    JSON Schemas: front matter of STACK, SCAFFOLD and RECIPE; the release bundle; the check report
src/                       the format library (read, write, lint, bundle) and the `catalog` command
release/                   catalog.json (the release bundle) and checks.json (the check report), written at release
stacks/
  <language>/
    <stack-id>/
      STACK.md
      scaffolds/<scaffold-id>/SCAFFOLD.md, files/...
      recipes/<category>/<recipe-id>/RECIPE.md, files/...
```

Example: `stacks/dart/mobile-flutter/recipes/monetization/admob-monetization/RECIPE.md`.

- `<language>`: the stack's primary language, lowercase (`dart`, `typescript`, `python`, `go`, `kotlin`, `swift`, `java`, `csharp`, `php`, `ruby`, `rust`).
- `<stack-id>`: unique across the catalog, kebab-case, `<project-type>-<framework>[-<variant>]` (`mobile-flutter`, `backend-node-tsoa`, `web-admin-react`).
- `<category>`: one of `CATEGORIES.md`. A new category is added there, with its meaning, in the same pull request.
- Scaffold and recipe ids are unique across the whole catalog, kebab-case, and equal the folder name.

## 3. `STACK.md`

```markdown
---
schemaVersion: 1
id: mobile-flutter
name: Flutter mobile app
language: dart
projectType: mobile-app
requiredTools:
  - flutter
  - git
deliveryScriptsRecipe: flutter-delivery-scripts
defaultScaffold: flutter-app
addPackage: flutter pub add {{NAME}}:{{VERSION}}
addDevPackage: flutter pub add dev:{{NAME}}:{{VERSION}}
---
# Flutter mobile app

What projects of this stack look like, and anything a contributor should know.
```

- `projectType`: `mobile-app`, `web-app`, `backend-api`, `cli`, `library` or `desktop-app`.
- `deliveryScriptsRecipe` names the stack's recipe that writes `scripts/build.sh` and `scripts/test.sh`. Tools run exactly these two scripts to build and test a project of the stack; the check of section 7 does too.
- `defaultScaffold` names the scaffold the check starts from when it verifies a recipe.
- `addPackage` and `addDevPackage` add one package of a recipe's `packages` to a project of the stack, with `{{NAME}}` and `{{VERSION}}` filled in. Tools need no built-in knowledge of a stack's package manager.

## 4. `RECIPE.md`

```markdown
---
schemaVersion: 1
id: admob-monetization
name: Google AdMob Mobile Ads & Consent
version: 1.0.0
language: dart
stack: mobile-flutter
category: monetization
standardType: monetization-ads
interfacePort: AdServicePort
order: 40
tags: [ads, admob]
dependsOn: [core-foundation]
parameters:
  - key: ADMOB_APP_ID_ANDROID
    label: AdMob Android App ID
    default: ca-app-pub-3940256099942544~3347511713
    secret: false
packages:
  - name: google_mobile_ads
    version: ^5.1.0
    dev: false
verify:
  - flutter analyze
---
# Google AdMob Mobile Ads & Consent

Banner and interstitial ads with the Google UMP consent flow, behind `AdServicePort`.

## Instructions

### android/app/src/main/AndroidManifest.xml
Inside the `<application>` element, add
`<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="{{ADMOB_APP_ID_ANDROID}}"/>`.

## Changelog

### 1.0.0
- First version.
```

### 4.1 Front matter

| Field | Required | Meaning |
|---|---|---|
| `schemaVersion` | yes | `1` for this document |
| `id`, `name`, `version` | yes | Identity; `version` is SemVer and has a `## Changelog` entry |
| `language`, `stack`, `category` | yes | Equal to the folder path |
| `standardType` | yes | The capability the recipe provides (`logging`, `networking-rest`, `monetization-ads`, `delivery-scripts`, ..., or `custom`) |
| `interfacePort` | no | The interface the recipe's code exposes, when it follows ports and adapters |
| `order` | yes | Position within the stack's list |
| `tags`, `platformPermissions`, `dependsOn` | no | Lists; `dependsOn` names recipes of the same stack, without cycles |
| `parameters` | no | `key` (`UPPER_SNAKE`), `label`, `description`, `default`, `secret`. A secret parameter has no default. |
| `packages` | no | `name`, `version` (required, so every install is reproducible), `dev`; added with the stack's `addPackage` / `addDevPackage` |
| `onlyIfMissing` | no | Paths under `files/` written only when the project does not have them yet |
| `verify` | yes | Commands run in the tier folder after the recipe is applied; all must exit 0 |

No other field is allowed.

### 4.2 Body

- `# <name>`, then the description: everything up to the first `## ` heading.
- `## Instructions`: one `### <target path>` subsection per project file a coding agent must change when the recipe is applied (files the project already has, which cannot be shipped as whole files). The target is one file, never a pattern. The text is the instruction. Headings inside an instruction go in a fenced code block or use four or more `#`.
- `## Conventions`: one `### <file pattern>` subsection per rule for code written after the recipe is applied ("extend `BaseController` in every `src/features/*/presentation/controllers/*Controller.ts`"). Conventions are not applied or checked at install; tools that write code later pass them on for the files a pattern matches.
- `## Changelog`: one `### <version>` subsection per released version, newest first, each with `- ` notes.
- Other `## ` sections are allowed; tools keep them and do not interpret them.

### 4.3 Files and placeholders

- Every file under `files/` is written into the project's tier folder at the same relative path.
- Files are UTF-8 text, at most 1 MB each. No binary files, no symbolic links.
- `{{KEY}}` in a file, an instruction or a command is replaced by the parameter's value. Two placeholders need no parameter: `{{PACKAGE_NAME}}` (the package name the project's own manifest declares) and `{{PROJECT_NAME}}`. Any other placeholder must be a declared parameter.

## 5. `SCAFFOLD.md`

```markdown
---
schemaVersion: 1
id: node-tsoa-api
name: Node TypeScript API
version: 1.0.0
language: typescript
stack: backend-node-tsoa
markerFile: package.json
requiredTools: [node, npm, git]
commands:
  - npm init -y > /dev/null
  - npm install --include=dev --no-audit --no-fund express@4.21.2
verify:
  - npm run lint
  - npm run build
mandatoryRecipes:
  - node-delivery-scripts
  - node-core-foundation
---
# Node TypeScript API

A TypeScript Express API with build, lint and test scripts.

## Changelog

### 1.0.0
- First version.
```

- `commands` run in the empty tier folder, then the files under `files/` are written (a scaffold does not need `printf` to create `tsconfig.json`), then `verify` runs.
- `markerFile` must exist after the scaffold; it shows that a folder is already scaffolded.
- `mandatoryRecipes` are applied in this order after the scaffold; the first is the stack's `deliveryScriptsRecipe`.

## 6. Versions and releases

- Item versions are SemVer. A released `id@version` never changes, and versions never go backwards: `catalog lint --against <previous release/catalog.json>` rejects both.
- The catalog is released as a whole with a tag (`v<major>.<minor>.<patch>`), so a consumer takes one reviewed set.
- A release commit carries two generated files:
  - `release/catalog.json`, the **bundle**: every item with its front matter (`meta`), description, instructions, changelog, files and `contentHash` (SHA-256 of the item's content as canonical JSON). Consumers read the bundle; they do not need to parse Markdown. Schema: `schema/bundle.schema.json`.
  - `release/checks.json`, the **check report**: for every scaffold and recipe, its id, version, `contentHash` and the result of the check of section 7. Schema: `schema/checks.schema.json`. A consumer refuses a release whose report is missing an item, marks one as failed, or names a different content hash.
- A change of this format is a new `schemaVersion`. Consumers refuse a `schemaVersion` they do not know.

## 7. Checks

1. **Lint** (`catalog lint`), on every pull request: front matter matches its schema; the path equals `language`, `stack`, `category` and `id`; ids are unique; `dependsOn` and `mandatoryRecipes` resolve within the stack, without cycles; every stack has its `deliveryScriptsRecipe` and `defaultScaffold`; the newest changelog entry is the current version; the file rules of 4.3; placeholders are declared.
2. **Immutability** (`catalog lint --against`), on every pull request: no released `id@version` changed.
3. **Apply and verify**, for each new or changed item, in a fresh folder in the stack's toolchain image:
   1. run the stack's `defaultScaffold` (or the scaffold itself) and its `mandatoryRecipes` in order;
   2. apply the item's `dependsOn`, then the item: its files, then its packages, with its parameters at their defaults;
   3. a coding agent carries out each `### <target path>` instruction, started without interaction;
   4. run the tier's `scripts/build.sh` and `scripts/test.sh`, then the item's `verify` commands;
   5. fail when a command exits non-zero or an instruction's target file did not change, naming the step, the command and its output. Conventions are not part of the check.

   Steps 1 and 2 run on every pull request, and so does step 4 when the item has no instructions. Step 3 needs a model key, so on a pull request it runs when a maintainer starts it; a release needs the full run to have passed for every item. Contributors run the same check with their own agent before opening a pull request.
4. **Tests are encouraged.** A recipe that adds files should ship a test under `files/` that `scripts/test.sh` runs. The lint warns when one is missing; it becomes a rule once the existing items have tests.
