import type { CatalogInfo, Changes, ItemSummary } from './api.js';

/** How the page groups the catalog: stacks by name, then the stack's scaffolds and its recipes per category. */

export interface StackGroup {
  stack: ItemSummary;
  scaffolds: ItemSummary[];
  /** In the order of CATEGORIES.md, only the categories that hold a recipe. */
  categories: Array<{ id: string; recipes: ItemSummary[] }>;
  recipeCount: number;
}

const byName = (a: ItemSummary, b: ItemSummary) => a.name.localeCompare(b.name);

export const stacksOf = (info: CatalogInfo): ItemSummary[] => info.items.filter((i) => i.kind === 'stack').sort(byName);

export function groupsOf(info: CatalogInfo, match: (item: ItemSummary) => boolean = () => true): StackGroup[] {
  return stacksOf(info).map((stack) => {
    const own = info.items.filter((i) => i.stack === stack.id && i.kind !== 'stack' && match(i));
    const recipes = own.filter((i) => i.kind === 'recipe');
    const categories = info.categories.map((c) => ({ id: c.id, recipes: recipes.filter((r) => r.category === c.id).sort(byName) }))
      .filter((c) => c.recipes.length);
    return { stack, scaffolds: own.filter((i) => i.kind === 'scaffold').sort(byName), categories, recipeCount: recipes.length };
  });
}

/** The item whose folder holds `file` (a path relative to the catalog's root). */
export function itemOfFile(info: CatalogInfo, file: string): ItemSummary | undefined {
  return info.items.filter((i) => file === i.path || file.startsWith(`${i.path}/`)).sort((a, b) => b.path.length - a.path.length)[0];
}

/** The paths of the items with uncommitted changes. */
export function changedItems(info: CatalogInfo, changes: Changes): Set<string> {
  return new Set(changes.files.map((f) => itemOfFile(info, f.path)?.path).filter((p): p is string => !!p));
}

export const STATUS: Record<string, string> = { M: 'Modified', A: 'Added', D: 'Deleted', R: 'Renamed', '??': 'New' };
