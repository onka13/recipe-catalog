#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { assertValidBundle, buildBundle, compareWithRelease, type Bundle } from './bundle.js';
import { AGENTS, type AgentName, type AgentOptions } from './check/agent.js';
import { CatalogChecker, type CheckOptions, type ItemCheck } from './check/check.js';
import { assertValidChecks, prepareRelease, type ChecksReport } from './check/release.js';
import { hasErrors, lintCatalog } from './lint.js';
import type { Problem } from './model.js';
import { readCatalog } from './read.js';

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

Common options: --root <dir> (default .), --timeout <minutes per command> (default 15)
`;

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

function print(problems: Problem[]): void {
  for (const p of problems) console.log(`${p.severity === 'error' ? 'error  ' : 'warning'} ${p.path}: ${p.message}`);
  const errors = problems.filter((p) => p.severity === 'error').length;
  console.log(`${errors} error(s), ${problems.length - errors} warning(s)`);
}

function readJson<T>(file: string, assert: (v: unknown) => asserts v is T): T | undefined {
  if (!fs.existsSync(file)) return undefined;
  const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(value);
  return value;
}

function lintAll(root: string, against?: string) {
  const read = readCatalog(root);
  const problems = [...read.problems, ...lintCatalog(read.catalog)];
  const previous = against ? readJson<Bundle>(against, assertValidBundle) : undefined;
  if (against && !previous) problems.push({ path: against, message: 'The release bundle to compare against does not exist.', severity: 'error' });
  if (previous && !hasErrors(problems)) problems.push(...compareWithRelease(buildBundle(read.catalog, '0.0.0'), previous));
  return { problems, catalog: read.catalog };
}

function checkOptions(args: string[], root: string, required: boolean): CheckOptions | string {
  const image = option(args, 'image');
  if (!image) return 'The check needs --image <toolchain image>.';
  const name = option(args, 'agent');
  if (name && !AGENTS.includes(name as AgentName)) return `--agent must be one of ${AGENTS.join(', ')}.`;
  if (!name && required) return 'A release needs --agent, because items carry instructions for a coding agent.';
  const timeoutMs = Number(option(args, 'timeout') ?? 15) * 60_000;
  const agent: AgentOptions | undefined = name ? { name: name as AgentName, bin: option(args, 'agent-bin'), timeoutMs } : undefined;
  return { image, agent, timeoutMs, workDir: path.join(root, '.check') };
}

function printCheck(check: ItemCheck): void {
  for (const s of check.steps) {
    console.log(`${s.status.padEnd(7)} ${s.step}${s.command ? `: ${s.command}` : ''}`);
    if (s.output && s.status !== 'passed') console.log(s.output.split('\n').map((l) => `          ${l}`).join('\n'));
  }
  console.log(`${check.kind} ${check.id}@${check.version}: ${check.status}`);
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

function run(args: string[]): number {
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
  console.log(USAGE);
  return command ? 2 : 0;
}

process.exitCode = run(process.argv.slice(2));
