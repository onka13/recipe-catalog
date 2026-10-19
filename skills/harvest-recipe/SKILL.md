---
name: harvest-recipe
description: Turn one capability of a working project (for example "AdMob ads with consent" or "request signing") into a Recipe Catalog recipe that other projects of the same stack can apply. Use when someone asks to harvest, extract or contribute a recipe from their own project.
---
You are turning one capability of a working project into a recipe of the Recipe Catalog. A recipe is a folder with a `RECIPE.md` (YAML front matter, then Markdown) and a `files/` folder. Another project of the same stack receives the recipe like this: its files are written into the project, its packages are added, its parameters are filled in, a coding agent carries out its `## Instructions` on existing project files, and then the project must build and pass its tests. `<catalog_format>` (the catalog's `FORMAT.md`) is the full specification.

## If the prompt has no `<project_context>`

Someone asked you directly, inside a clone of the catalog. Get the context and a place to write first:
1. Ask for the project folder, the capability and the stack if they did not say (stacks are the folders under `stacks/<language>/`).
2. From the catalog's root run `npm run catalog -- context <project folder> "<capability>"` (add `--files a,b` when it finds the wrong files). Its output is the `<project_context>`.
3. Read `FORMAT.md` and `CATEGORIES.md`, and one existing recipe of the stack as an example.
4. Write the item to `.harvest/<id>/item/` in the catalog, not into `stacks/`.
5. When it is written, run `npm run catalog -- add .harvest/<id>/item --project <project folder>`. It checks the item and files it under `stacks/`. Fix every problem it reports and run it again until it passes.
6. Offer the full check: `npm run catalog -- verify <id> --image recipe-catalog-toolchain --agent <your agent>`.

## Method

1. **Find the capability.** Start with the target files in `<project_context>`. The project folder is readable, so open any other file you need, such as manifests, platform files (`AndroidManifest.xml`, `Info.plist`), entry points (`main.dart`, `src/index.ts`) and tests. Do not change anything in the project folder.
2. **Check `<existing_recipes>` first.** If a recipe of the stack already provides the capability, write nothing and name that recipe. When only a part is missing, write a small recipe for that part with `dependsOn` on the existing one.
3. **Separate the reusable part from the app.** A recipe holds what any project of the stack needs for this capability: services, adapters, configuration, and wiring into the entry point. Leave out the app's own screens, business rules, names and data.
4. **Decide what goes where:**
   - Code and configuration that is new to a project go under `files/`, at the same path they get in the project (relative to the tier's root, for example `lib/core/ads/ad_service.dart`). Copy them in full. Never elide code.
   - A change to a file every project already has (an entry point, a manifest, a platform file) is an instruction: one `### <path>` under `## Instructions` per file, saying exactly what to add or change and where. A target is one existing file, never a pattern.
   - Rules for code written later (for example "screens that show ads call `AdService.load` first") go under `## Conventions`, as `### <glob pattern>` sections.
   - Packages the capability needs go in `packages`, with the version the project uses and `dev: true` for development-only packages.
5. **Make it generic with parameters.** Every value that belongs to the developer's project becomes a `{{KEY}}` placeholder declared in `parameters`. This covers account ids, app ids, ad unit ids, URLs, keys, bundle ids and display names. A key, token or password has `secret: true` and no `default`. A public test value (such as Google's AdMob test ids) may be a `default`. The project's own package name becomes `{{PACKAGE_NAME}}` everywhere, including imports (`package:{{PACKAGE_NAME}}/...`).
6. **Never write a secret or an id of the developer's accounts** into the item, not even in a comment or an example. The check compares the item with the project's `.env` files and with known key formats, and refuses it.
7. **Front matter:** `schemaVersion: 1`, a kebab-case `id` that no recipe of `<existing_recipes>` uses, `name`, `version: 1.0.0`, the stack's `language` and `stack`, a `category` from `<categories>`, a kebab-case `standardType` naming the capability, `order` (use 50 unless it must run before or after another recipe), `dependsOn` (ids of `<existing_recipes>` it needs, if any), and `verify` (at least one command that proves the capability compiles, usually the stack's analyzer or type check).
8. **Body:** `# <name>`, then two or three sentences on what the capability does and when to use it. Then `## Instructions` and `## Conventions` when there are any, and `## Changelog` with `### 1.0.0` and `- First version.`. Mention neither the source project nor its author.
9. **A test:** if the capability has logic, add a small test under `files/` that needs no network or device. It must run with the test runner of a project of this stack as `<stack_baseline>` shows it (the scaffold's test script and `scripts/test.sh`), with no other runner added. If the stack cannot run a test of this kind, write none and say so in your reply.

## Reply

When the item is written, reply with the item's id, its category, and one line per file written. If the capability cannot be made generic (it is all app-specific) or the stack already has it, write nothing (no `item/` folder) and say why.
