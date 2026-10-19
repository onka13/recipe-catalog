import crypto from 'node:crypto';
import fs from 'node:fs';
import type { Catalog, Problem, RecipeItem, ScaffoldItem } from './model.js';
import { describeErrors, validator } from './schemas.js';
import { orderedMeta } from './write.js';

const PACKAGE = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { name: string; version: string };

export interface BundleFile { path: string; content: string }
export interface BundleItem {
  path: string;
  meta: Record<string, unknown>;
  description: string;
  changelog?: Array<{ version: string; notes: string[] }>;
  instructions?: Array<{ target: string; instruction: string }>;
  conventions?: Array<{ pattern: string; rule: string }>;
  files?: BundleFile[];
  contentHash?: string;
}
export interface Bundle {
  schemaVersion: 1;
  catalogVersion: string;
  generator: string;
  stacks: BundleItem[];
  scaffolds: BundleItem[];
  recipes: BundleItem[];
}

/** JSON with object keys sorted at every level, so equal content always gives equal text. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** The hash of everything a consumer receives for one item: front matter, description, instructions, changelog and files. */
export function contentHash(item: Omit<BundleItem, 'path' | 'contentHash'>): string {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(item)).digest('hex')}`;
}

function itemContent(item: ScaffoldItem | RecipeItem): Omit<BundleItem, 'path' | 'contentHash'> {
  return {
    meta: orderedMeta(item), description: item.description, changelog: item.changelog, files: item.files,
    ...(item.kind === 'recipe' ? { instructions: item.instructions } : {}),
    // Only present when the recipe has conventions, so the hash of a recipe without them is what it was before.
    ...(item.kind === 'recipe' && item.conventions.length ? { conventions: item.conventions } : {}),
  };
}

/** The `contentHash` the bundle and the check report carry for this item. */
export const itemContentHash = (item: ScaffoldItem | RecipeItem) => contentHash(itemContent(item));

function bundleItem(item: ScaffoldItem | RecipeItem): BundleItem {
  const content = itemContent(item);
  return { path: item.path, ...content, contentHash: contentHash(content) };
}

const byPath = (a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path);

/** The release bundle (`release/catalog.json`). Call it only on a catalog without lint errors. */
export function buildBundle(catalog: Catalog, catalogVersion: string): Bundle {
  const bundle: Bundle = {
    schemaVersion: 1, catalogVersion, generator: `${PACKAGE.name} ${PACKAGE.version}`,
    stacks: [...catalog.stacks].sort(byPath).map((s) => ({ path: s.path, meta: orderedMeta(s), description: s.description })),
    scaffolds: [...catalog.scaffolds].sort(byPath).map(bundleItem),
    recipes: [...catalog.recipes].sort(byPath).map(bundleItem),
  };
  assertValidBundle(bundle);
  return bundle;
}

export function assertValidBundle(bundle: unknown): asserts bundle is Bundle {
  const validate = validator('bundle');
  if (!validate(bundle)) throw new Error(`The bundle does not match bundle.schema.json: ${describeErrors(validate.errors).join('; ')}`);
}

function compareSemver(a: string, b: string): number {
  const parse = (v: string) => { const [core, pre] = v.split('-', 2); return { nums: core.split('.').map(Number), pre }; };
  const x = parse(a); const y = parse(b);
  for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] - y.nums[i];
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre < y.pre ? -1 : 1;
}

type Compared = Pick<BundleItem, 'path' | 'meta' | 'contentHash'>;

/** One item against its released form: a released `id@version` never changes, and versions never go backwards. */
function compareReleased(current: Compared, old: BundleItem, release: string): Problem[] {
  const id = String(old.meta.id);
  const order = compareSemver(String(current.meta.version), String(old.meta.version));
  if (order < 0) return [{ path: current.path, message: `version ${current.meta.version} is older than the released ${old.meta.version}.`, severity: 'error' }];
  if (order === 0 && current.contentHash !== old.contentHash) {
    return [{ path: current.path, message: `${id}@${old.meta.version} was released in ${release} and has changed; publish the change as a new version.`, severity: 'error' }];
  }
  return [];
}

/** Format section 7.2 for one item (Catalog Studio checks the item being edited against the last release). */
export function compareItemWithRelease(item: ScaffoldItem | RecipeItem, previous: Bundle): Problem[] {
  const old = previous[item.kind === 'recipe' ? 'recipes' : 'scaffolds'].find((i) => i.meta.id === item.meta.id);
  return old ? compareReleased(bundleItem(item), old, previous.catalogVersion) : [];
}

/** Format section 7.2: a published `id@version` never changes, and versions never go backwards. */
export function compareWithRelease(next: Bundle, previous: Bundle): Problem[] {
  const problems: Problem[] = [];
  for (const kind of ['scaffolds', 'recipes'] as const) {
    const now = new Map(next[kind].map((i) => [String(i.meta.id), i]));
    for (const old of previous[kind]) {
      const current = now.get(String(old.meta.id));
      if (!current) problems.push({ path: old.path, message: `${String(old.meta.id)} was in ${previous.catalogVersion} and is gone.`, severity: 'warning' });
      else problems.push(...compareReleased(current, old, previous.catalogVersion));
    }
  }
  return problems;
}
