#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { assertValidBundle, buildBundle, compareWithRelease, type Bundle } from './bundle.js';
import { CatalogChecker } from './check/check.js';
import { assertValidChecks, prepareRelease, type ChecksReport } from './check/release.js';
import { checkOptions, option, print, printCheck, readJson } from './cliShared.js';
import { addCommand, contextCommand, harvestCommand } from './harvestCli.js';
import { hasErrors, lintCatalog } from './lint.js';
import { readCatalog } from './read.js';
import { studioCommand } from './studio/server.js';

const USAGE = `Usage: catalog <command> [options]

  lint [--against <bundle.json>]            Check every item (FORMAT.md 7.1); with --against, also that no
                                            released version changed (7.2)
  build --version <x.y.z>                   Lint, then write release/catalog.json
  verify <item-id> --image <image> [--agent claude|codex|copilot] [--agent-bin <path>]
                                            Apply one item to a fresh project in the toolchain image and
                                            build and test it (7.3)
  release --version <x.y.z> --image <image> --agent <name> [--agent-bin <path>]
                                            Lint, check every new or changed item, then write
                                            release/catalog.json and release/checks.json
  harvest <project> "<capability>" --stack <id> --agent claude|codex|copilot [--agent-bin <path>]
          [--category <id>] [--files a,b] [--budget <tokens>] [--fix-rounds <n>] [--image <image> [--verify]]
                                            Your coding agent turns a capability of your project into a
                                            recipe; it is checked and filed under stacks/ (CAT-23)
  context <project> "<capability>" [--files a,b] [--budget <tokens>]
                                            Print the project map and the files around the capability
  add <item folder> [--project <dir>] [--stack <id>]
                                            Check a recipe written outside stacks/ and file it in its folder
  studio [--port <n>]                       Edit items in a local web page (CAT-28)

Common options: --root <dir> (default .), --timeout <minutes per command> (default 15),
                --agent-model <model> (the agent's model, for example haiku; its own default otherwise)
`;

function lintAll(root: string, against?: string) {
  const read = readCatalog(root);
  const problems = [...read.problems, ...lintCatalog(read.catalog)];
  const previous = against ? readJson<Bundle>(against, assertValidBundle) : undefined;
  if (against && !previous) problems.push({ path: against, message: 'The release bundle to compare against does not exist.', severity: 'error' });
  if (previous && !hasErrors(problems)) problems.push(...compareWithRelease(buildBundle(read.catalog, '0.0.0'), previous));
  return { problems, catalog: read.catalog };
}

function verify(args: string[], root: string): number {
  const id = args[1];
  const { problems, catalog } = lintAll(root);
  if (hasErrors(problems)) { print(problems); return 1; }
  const options = checkOptions(args, root, false);
  if (typeof options === 'string') { console.error(options); return 2; }
  const checker = new CatalogChecker(catalog, options);
  const scaffold = catalog.scaffolds.find((s) => s.meta.id === id);
  const recipe = catalog.recipes.find((r) => r.meta.id === id);
  if (!scaffold && !recipe) { console.error(`No scaffold or recipe has the id ${id}.`); return 2; }
  const check = scaffold ? checker.scaffold(scaffold) : checker.recipe(recipe!);
  printCheck(check);
  console.log(`The project folders are in ${path.relative(process.cwd(), options.workDir)}/.`);
  return check.status === 'passed' ? 0 : 1;
}

function release(args: string[], root: string): number {
  const version = option(args, 'version');
  if (!version) { console.error('release needs --version <x.y.z>.'); return 2; }
  const bundleFile = path.join(root, 'release/catalog.json');
  const checksFile = path.join(root, 'release/checks.json');
  const { problems, catalog } = lintAll(root, fs.existsSync(bundleFile) ? bundleFile : undefined);
  if (hasErrors(problems)) { print(problems); return 1; }
  const options = checkOptions(args, root, true);
  if (typeof options === 'string') { console.error(options); return 2; }
  const result = prepareRelease(catalog, version, readJson<ChecksReport>(checksFile, assertValidChecks), options, (l) => console.log(l));
  console.log(`${result.checks.items.length - result.reused} checked, ${result.reused} unchanged since the last release`);
  if (result.failed.length) {
    result.failed.forEach(printCheck);
    fs.mkdirSync(options.workDir, { recursive: true });
    fs.writeFileSync(path.join(options.workDir, 'report.json'), `${JSON.stringify(result.checks, null, 2)}\n`);
    console.log(`${result.failed.length} item(s) failed; nothing was released. Full report: .check/report.json`);
    return 1;
  }
  fs.mkdirSync(path.dirname(bundleFile), { recursive: true });
  fs.writeFileSync(bundleFile, `${JSON.stringify(result.bundle, null, 2)}\n`);
  fs.writeFileSync(checksFile, `${JSON.stringify(result.checks, null, 2)}\n`);
  console.log(`Wrote release/catalog.json and release/checks.json. Next: git add release && git commit -s -m "release: v${version}" && git tag v${version}`);
  return 0;
}

async function run(args: string[]): Promise<number> {
  const [command] = args;
  const root = path.resolve(option(args, 'root') ?? '.');
  if (command === 'lint') {
    const { problems, catalog } = lintAll(root, option(args, 'against'));
    console.log(`${catalog.stacks.length} stack(s), ${catalog.scaffolds.length} scaffold(s), ${catalog.recipes.length} recipe(s)`);
    print(problems);
    return hasErrors(problems) ? 1 : 0;
  }
  if (command === 'build') {
    const version = option(args, 'version');
    if (!version) { console.error('build needs --version <x.y.z>.'); return 2; }
    const { problems, catalog } = lintAll(root, option(args, 'against'));
    if (hasErrors(problems)) { print(problems); return 1; }
    const out = path.resolve(root, option(args, 'out') ?? 'release/catalog.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(buildBundle(catalog, version), null, 2)}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), out)}`);
    return 0;
  }
  if (command === 'verify') return verify(args, root);
  if (command === 'release') return release(args, root);
  if (command === 'context') return contextCommand(args, root);
  if (command === 'add') return addCommand(args, root);
  if (command === 'harvest') return harvestCommand(args, root);
  if (command === 'studio') return studioCommand(args, root);
  console.log(USAGE);
  return command ? 2 : 0;
}

run(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
