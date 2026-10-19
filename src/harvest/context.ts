import fs from 'node:fs';
import path from 'node:path';
import { neighborhood, PACKS, renderMap, scan, type CodeMap, type FileRecord, type SymbolNode } from 'code-intelligence';

/** What the agent receives about the developer's project (CAT-23): its map and the files around the capability. */

export interface ContextOptions {
  projectDir: string;
  capability: string;
  /** Files (relative to the project) the capability lives in; found from the capability's words when absent. */
  files?: string[];
  /** Token budget for the related files' skeletons. */
  budget: number;
  /** Where the code map is written; never inside the project. */
  outDir: string;
}

export interface ProjectContext {
  projectDir: string;
  /** The project's own package name (pubspec.yaml or package.json), which an item must replace with {{PACKAGE_NAME}}. */
  packageName?: string;
  targets: string[];
  /** The `<project_context>` block of the prompt. */
  text: string;
}

const STOP_WORDS = new Set(['and', 'the', 'with', 'for', 'from', 'into', 'that', 'this', 'use', 'using', 'add', 'support']);
const MAX_TARGETS = 6;

export function capabilityWords(capability: string): string[] {
  const words = capability.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return [...new Set(words.flatMap((w) => (w.endsWith('s') && w.length > 3 ? [w, w.slice(0, -1)] : [w])))];
}

function symbolNames(symbols: SymbolNode[]): string[] {
  return symbols.flatMap((s) => [s.name, ...symbolNames(s.members ?? [])]);
}

/** Files whose path or declarations name the most capability words, best first. */
export function findTargets(map: CodeMap, capability: string): string[] {
  const words = capabilityWords(capability);
  const score = (f: FileRecord) => {
    const haystack = [f.path, ...symbolNames(f.symbols)].join(' ').toLowerCase();
    return words.filter((w) => haystack.includes(w)).length;
  };
  return map.files
    .filter((f) => f.language !== 'other')
    .map((f) => ({ path: f.path, score: score(f) }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, MAX_TARGETS)
    .map((f) => f.path);
}

export function readPackageName(projectDir: string): string | undefined {
  const pubspec = path.join(projectDir, 'pubspec.yaml');
  if (fs.existsSync(pubspec)) return /^name:\s*([A-Za-z0-9_]+)\s*$/m.exec(fs.readFileSync(pubspec, 'utf8'))?.[1];
  const pkg = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkg)) return (JSON.parse(fs.readFileSync(pkg, 'utf8')) as { name?: string }).name;
  return undefined;
}

function fileBlock(tag: string, attrs: string, body: string): string {
  return `<${tag} ${attrs}>\n${body.trimEnd()}\n</${tag}>`;
}

export async function projectContext(options: ContextOptions): Promise<ProjectContext> {
  const projectDir = path.resolve(options.projectDir);
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) throw new Error(`The project folder ${projectDir} does not exist.`);
  const { map, topology } = await scan({ root: projectDir, out: options.outDir, packs: PACKS });
  const targets = options.files?.length ? options.files : findTargets(map, options.capability);
  if (!targets.length) {
    throw new Error(`No file of the project names any of the words ${capabilityWords(options.capability).join(', ')}. Name the files the capability lives in with --files.`);
  }
  const around = neighborhood(map, topology, targets, options.budget);
  const records = new Map(map.files.map((f) => [f.path, f]));
  const full = around.targets.map((t) => fileBlock('file', `path="${t.path}" role="target"`, fs.readFileSync(path.join(projectDir, t.path), 'utf8')));
  const related = around.selected.map((r) => fileBlock('skeleton', `path="${r.path}" reason="${r.reason}"`, records.get(r.path)?.skeleton ?? ''));
  const omitted = around.omitted.files ? `\n<omitted files="${around.omitted.files}">Read them from the project folder when you need them.</omitted>` : '';
  const text = [
    `<project_context folder="${projectDir}">`,
    fileBlock('project_map', 'format="codeintel map"', renderMap(map, { depth: 6 })),
    ...full, ...related,
    `</project_context>${omitted}`,
  ].join('\n');
  return { projectDir, packageName: readPackageName(projectDir), targets: around.targets.map((t) => t.path), text };
}
