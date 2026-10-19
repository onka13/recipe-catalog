import fs from 'node:fs';
import path from 'node:path';
import { assertValidBundle, compareItemWithRelease, type Bundle } from '../bundle.js';
import { recipePath } from '../harvest/stage.js';
import { lintCatalog } from '../lint.js';
import { lintSchema } from '../lintItem.js';
import { parseChangelog, parseConventions, parseInstructions, renderChangelog, renderConventions, renderInstructions } from '../markdown.js';
import type { Catalog, Item, ItemFile, Problem, Section } from '../model.js';
import { readCatalog } from '../read.js';
import { writeItem } from '../write.js';

/** Catalog Studio's item operations (CAT-28), all through the format library: read, lint, write. */

/** An item as the page edits it: the body sections as Markdown text, parsed again by the format library on save. */
export interface EditableItem {
  kind: Item['kind'];
  /** The item's folder; for a new item, derived from its front matter. */
  path: string;
  isNew: boolean;
  meta: Record<string, unknown>;
  title: string;
  description: string;
  instructions: string;
  conventions: string;
  changelog: string;
  extraSections: Section[];
  files: ItemFile[];
}

export interface ItemSummary { kind: Item['kind']; path: string; id: string; name: string; version?: string; stack: string; category?: string }

export class StudioError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const ITEM_KINDS = ['stack', 'scaffold', 'recipe'];

export function listItems(catalog: Catalog): ItemSummary[] {
  const all: Item[] = [...catalog.stacks, ...catalog.scaffolds, ...catalog.recipes];
  return all.map((i) => ({
    kind: i.kind, path: i.path, id: i.meta.id, name: i.meta.name, stack: i.kind === 'stack' ? i.meta.id : i.meta.stack,
    ...(i.kind === 'stack' ? {} : { version: i.meta.version }), ...(i.kind === 'recipe' ? { category: i.meta.category } : {}),
  }));
}

export function findItem(catalog: Catalog, itemPath: string): Item {
  const found = [...catalog.stacks, ...catalog.scaffolds, ...catalog.recipes].find((i) => i.path === itemPath);
  if (!found) throw new StudioError(`${itemPath} is not an item of the catalog.`, 404);
  return found;
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const titleOf = (id: string) => id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/** CAT-28 "New recipe": version 1.0.0 with a changelog entry, the verify commands of the stack's default scaffold. */
export function newRecipe(catalog: Catalog, input: { stack?: unknown; category?: unknown; id?: unknown }): EditableItem {
  const stack = catalog.stacks.find((s) => s.meta.id === input.stack);
  if (!stack) throw new StudioError(`Choose a stack: ${catalog.stacks.map((s) => s.meta.id).join(', ')}.`);
  if (!catalog.categories.some((c) => c.id === input.category)) throw new StudioError('Choose a category from CATEGORIES.md.');
  if (typeof input.id !== 'string' || !ID.test(input.id)) throw new StudioError('The id is kebab-case: lowercase letters, digits and single dashes.');
  const scaffold = catalog.scaffolds.find((s) => s.meta.id === stack.meta.defaultScaffold);
  const meta = {
    schemaVersion: 1, id: input.id, name: titleOf(input.id), version: '1.0.0', language: stack.meta.language, stack: stack.meta.id,
    category: input.category, standardType: 'custom', order: 50, verify: scaffold?.meta.verify ?? [],
  };
  const edited: EditableItem = {
    kind: 'recipe', path: '', isNew: true, meta, title: meta.name, description: '', instructions: '', conventions: '',
    changelog: '### 1.0.0\n- First version.', extraSections: [], files: [],
  };
  return { ...edited, path: fromEditable(edited).path };
}

export function toEditable(item: Item): EditableItem {
  return {
    kind: item.kind, path: item.path, isNew: false, meta: { ...item.meta }, title: item.title, description: item.description,
    instructions: item.kind === 'recipe' ? renderInstructions(item.instructions) : '',
    conventions: item.kind === 'recipe' ? renderConventions(item.conventions) : '',
    changelog: item.kind === 'stack' ? '' : renderChangelog(item.changelog),
    extraSections: item.extraSections, files: item.kind === 'stack' ? [] : item.files,
  };
}

/** The format library's item; a new recipe's path comes from its front matter so the two always agree (CAT-25). */
export function fromEditable(e: EditableItem): Item {
  if (!ITEM_KINDS.includes(e.kind)) throw new StudioError(`Unknown item kind ${String(e.kind)}.`);
  const base = { path: e.path, title: e.title.trim(), description: e.description.trim(), extraSections: e.extraSections ?? [] };
  if (e.kind === 'stack') return { ...base, kind: 'stack', meta: e.meta as never };
  const changelog = parseChangelog(e.changelog);
  if (e.kind === 'scaffold') return { ...base, kind: 'scaffold', meta: e.meta as never, changelog, files: e.files };
  const recipe: Item = {
    ...base, kind: 'recipe', meta: e.meta as never, changelog, files: e.files,
    instructions: parseInstructions(e.instructions), conventions: parseConventions(e.conventions),
  };
  return e.isNew ? { ...recipe, path: recipePath(recipe) } : recipe;
}

function lastRelease(root: string): Bundle | undefined {
  const file = path.join(root, 'release/catalog.json');
  if (!fs.existsSync(file)) return undefined;
  const bundle: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  assertValidBundle(bundle);
  return bundle;
}

function withItem(catalog: Catalog, item: Item): Catalog {
  const swap = <T extends Item>(list: T[]) => list.filter((i) => i.path !== item.path);
  const next: Catalog = { ...catalog, stacks: swap(catalog.stacks), scaffolds: swap(catalog.scaffolds), recipes: swap(catalog.recipes) };
  if (item.kind === 'stack') next.stacks.push(item);
  else if (item.kind === 'scaffold') next.scaffolds.push(item);
  else next.recipes.push(item);
  return next;
}

/** The lint of the edited item in the context of the whole catalog, and, against the last release, format section 7.2. */
export function lintEdited(root: string, edited: EditableItem): { item: Item; problems: Problem[] } {
  const { catalog } = readCatalog(root);
  const draft = { ...fromEditable({ ...edited, isNew: false }), path: edited.path || '(new item)' };
  const schemaProblems: Problem[] = [];
  if (!lintSchema(draft, (message) => void schemaProblems.push({ path: draft.path, message, severity: 'error' }))) return { item: draft, problems: schemaProblems };
  const item = fromEditable(edited);
  const problems = lintCatalog(withItem(catalog, item)).filter((p) => p.path === item.path || p.path.startsWith(`${item.path}/`));
  if (edited.isNew && fs.existsSync(path.join(root, item.path))) problems.push({ path: item.path, message: `${item.path} already exists.`, severity: 'error' });
  const release = item.kind === 'stack' ? undefined : lastRelease(root);
  if (release && item.kind !== 'stack') problems.push(...compareItemWithRelease(item, release));
  return { item, problems };
}

/** Writes only the item's own folder, and only when the lint finds no error. */
export function saveEdited(root: string, edited: EditableItem): { item: Item; problems: Problem[] } {
  const { item, problems } = lintEdited(root, edited);
  if (problems.some((p) => p.severity === 'error')) return { item, problems };
  if (!edited.isNew && !readCatalog(root).catalog[`${item.kind}s` as 'stacks'].some((i) => i.path === item.path)) {
    throw new StudioError(`${item.path} is not an item of the catalog.`, 404);
  }
  writeItem(root, item);
  return { item, problems };
}
