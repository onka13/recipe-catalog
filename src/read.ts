import fs from 'node:fs';
import path from 'node:path';
import { FormatError, parseBody, parseChangelog, parseInstructions, splitFrontMatter } from './markdown.js';
import type { Catalog, Category, Item, ItemFile, Problem, RecipeItem, ScaffoldItem, Section, StackItem } from './model.js';
import { ITEM_FILE, MAX_FILE_BYTES } from './model.js';

const UTF8 = new TextDecoder('utf-8', { fatal: true });
const CATEGORY_LINE = /^- `([^`]+)`:\s*(.+)$/;

export interface ReadResult {
  catalog: Catalog;
  /** Problems that stop an item from being read at all; the lint reports everything else. */
  problems: Problem[];
}

const toPosix = (p: string) => p.split(path.sep).join('/');

function subfolders(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

export function readCategories(root: string): Category[] {
  const file = path.join(root, 'CATEGORIES.md');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').flatMap((line) => {
    const m = CATEGORY_LINE.exec(line.trim());
    return m ? [{ id: m[1], meaning: m[2].trim() }] : [];
  });
}

/** Every file under `<item>/files/`, as UTF-8 text, sorted by path. */
export function readItemFiles(root: string, itemPath: string, problems: Problem[]): ItemFile[] {
  const base = path.join(root, itemPath, 'files');
  const out: ItemFile[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = toPosix(path.relative(base, full));
      const where = `${itemPath}/files/${rel}`;
      if (entry.isSymbolicLink()) problems.push({ path: where, message: 'Symbolic links are not allowed.', severity: 'error' });
      else if (entry.isDirectory()) walk(full);
      else out.push(...readTextFile(full, rel, where, problems));
    }
  };
  if (fs.existsSync(base)) walk(base);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function readTextFile(full: string, rel: string, where: string, problems: Problem[]): ItemFile[] {
  const bytes = fs.readFileSync(full);
  if (bytes.length > MAX_FILE_BYTES) {
    problems.push({ path: where, message: 'Files must be at most 1 MB.', severity: 'error' });
    return [];
  }
  try {
    return [{ path: rel, content: UTF8.decode(bytes) }];
  } catch {
    problems.push({ path: where, message: 'Files must be UTF-8 text; binary files are not supported.', severity: 'error' });
    return [];
  }
}

function readItemText(root: string, itemPath: string, kind: Item['kind'], problems: Problem[]) {
  const file = path.join(root, itemPath, ITEM_FILE[kind]);
  if (!fs.existsSync(file)) {
    problems.push({ path: itemPath, message: `${ITEM_FILE[kind]} is missing.`, severity: 'error' });
    return null;
  }
  try {
    const { front, body } = splitFrontMatter(fs.readFileSync(file, 'utf8'));
    return { meta: front, ...parseBody(body) };
  } catch (error) {
    if (!(error instanceof FormatError)) throw error;
    problems.push({ path: `${itemPath}/${ITEM_FILE[kind]}`, message: error.message, severity: 'error' });
    return null;
  }
}

const take = (all: Section[], title: string) => all.find((s) => s.title === title)?.text ?? '';
const others = (all: Section[], known: string[]) => all.filter((s) => !known.includes(s.title));

export function readStack(root: string, itemPath: string, problems: Problem[]): StackItem | null {
  const text = readItemText(root, itemPath, 'stack', problems);
  if (!text) return null;
  return { kind: 'stack', path: itemPath, meta: text.meta as StackItem['meta'], title: text.title, description: text.description, extraSections: text.sections };
}

export function readScaffold(root: string, itemPath: string, problems: Problem[]): ScaffoldItem | null {
  const text = readItemText(root, itemPath, 'scaffold', problems);
  if (!text) return null;
  return {
    kind: 'scaffold', path: itemPath, meta: text.meta as ScaffoldItem['meta'], title: text.title, description: text.description,
    changelog: parseChangelog(take(text.sections, 'Changelog')), files: readItemFiles(root, itemPath, problems),
    extraSections: others(text.sections, ['Changelog']),
  };
}

export function readRecipe(root: string, itemPath: string, problems: Problem[]): RecipeItem | null {
  const text = readItemText(root, itemPath, 'recipe', problems);
  if (!text) return null;
  return {
    kind: 'recipe', path: itemPath, meta: text.meta as RecipeItem['meta'], title: text.title, description: text.description,
    instructions: parseInstructions(take(text.sections, 'Instructions')), changelog: parseChangelog(take(text.sections, 'Changelog')),
    files: readItemFiles(root, itemPath, problems), extraSections: others(text.sections, ['Instructions', 'Changelog']),
  };
}

/** Reads `stacks/<language>/<stack>/{STACK.md, scaffolds/<id>/, recipes/<category>/<id>/}`. */
export function readCatalog(root: string): ReadResult {
  const problems: Problem[] = [];
  const catalog: Catalog = { root, categories: readCategories(root), stacks: [], scaffolds: [], recipes: [] };
  for (const language of subfolders(path.join(root, 'stacks'))) {
    for (const stackId of subfolders(path.join(root, 'stacks', language))) {
      const stackPath = `stacks/${language}/${stackId}`;
      const stack = readStack(root, stackPath, problems);
      if (stack) catalog.stacks.push(stack);
      for (const id of subfolders(path.join(root, stackPath, 'scaffolds'))) {
        const item = readScaffold(root, `${stackPath}/scaffolds/${id}`, problems);
        if (item) catalog.scaffolds.push(item);
      }
      for (const category of subfolders(path.join(root, stackPath, 'recipes'))) {
        for (const id of subfolders(path.join(root, stackPath, 'recipes', category))) {
          const item = readRecipe(root, `${stackPath}/recipes/${category}/${id}`, problems);
          if (item) catalog.recipes.push(item);
        }
      }
    }
  }
  return { catalog, problems };
}
