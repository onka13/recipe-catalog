import type { Catalog, Item, Problem, RecipeItem, StackItem } from './model.js';
import { lintChangelog, lintPath, lintPlaceholders, lintRecipe, lintSchema, lintText } from './lintItem.js';

const reporter = (problems: Problem[], path: string) => (message: string, severity: Problem['severity'] = 'error') =>
  void problems.push({ path, message, severity });

function lintOne(item: Item, catalog: Catalog, problems: Problem[]): boolean {
  const report = reporter(problems, item.path);
  if (!lintSchema(item, report)) return false;
  lintPath(item, catalog, report);
  lintText(item, report);
  if (item.kind === 'stack') return true;
  lintChangelog(item, report);
  lintPlaceholders(item, report);
  if (item.kind === 'recipe') lintRecipe(item, report);
  return true;
}

function lintUniqueIds(items: Item[], problems: Problem[]): void {
  const seen = new Map<string, string>();
  for (const item of items) {
    const key = `${item.kind === 'stack' ? 'stack' : 'item'}:${item.meta.id}`;
    const first = seen.get(key);
    if (first) problems.push({ path: item.path, message: `id "${item.meta.id}" is already used by ${first}.`, severity: 'error' });
    else seen.set(key, item.path);
  }
}

function lintDependencyCycles(recipes: RecipeItem[], report: (path: string, message: string) => void): void {
  const byId = new Map(recipes.map((r) => [r.meta.id, r]));
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (r: RecipeItem, trail: string[]): void => {
    if (state.get(r.meta.id) === 'done') return;
    if (state.get(r.meta.id) === 'visiting') return report(r.path, `dependsOn forms a cycle: ${[...trail, r.meta.id].join(' -> ')}.`);
    state.set(r.meta.id, 'visiting');
    for (const dep of r.meta.dependsOn ?? []) { const next = byId.get(dep); if (next) visit(next, [...trail, r.meta.id]); }
    state.set(r.meta.id, 'done');
  };
  for (const r of recipes) visit(r, []);
}

/** References between items resolve within the stack (dependsOn, mandatory recipes, the stack's two named items). */
function lintStack(stack: StackItem, catalog: Catalog, problems: Problem[]): void {
  const report = (path: string, message: string) => void problems.push({ path, message, severity: 'error' });
  const recipes = catalog.recipes.filter((r) => r.meta.stack === stack.meta.id);
  const ids = new Set(recipes.map((r) => r.meta.id));
  const delivery = recipes.find((r) => r.meta.id === stack.meta.deliveryScriptsRecipe);
  if (!delivery) report(stack.path, `deliveryScriptsRecipe "${stack.meta.deliveryScriptsRecipe}" is not a recipe of this stack.`);
  else if (delivery.meta.standardType !== 'delivery-scripts') report(stack.path, `deliveryScriptsRecipe "${delivery.meta.id}" must have standardType delivery-scripts.`);
  const scaffolds = catalog.scaffolds.filter((s) => s.meta.stack === stack.meta.id);
  if (!scaffolds.some((s) => s.meta.id === stack.meta.defaultScaffold)) report(stack.path, `defaultScaffold "${stack.meta.defaultScaffold}" is not a scaffold of this stack.`);
  for (const r of recipes) for (const dep of r.meta.dependsOn ?? []) if (!ids.has(dep)) report(r.path, `dependsOn "${dep}" is not a recipe of the stack ${stack.meta.id}.`);
  for (const s of scaffolds) {
    for (const m of s.meta.mandatoryRecipes) if (!ids.has(m)) report(s.path, `mandatory recipe "${m}" is not a recipe of the stack ${stack.meta.id}.`);
    if (s.meta.mandatoryRecipes[0] !== stack.meta.deliveryScriptsRecipe) report(s.path, `The first mandatory recipe must be the stack's delivery-scripts recipe "${stack.meta.deliveryScriptsRecipe}".`);
  }
  lintDependencyCycles(recipes, report);
}

function lintOrphans(catalog: Catalog, valid: Set<Item>, problems: Problem[]): void {
  const stackIds = new Set(catalog.stacks.map((s) => s.meta.id));
  for (const item of [...catalog.scaffolds, ...catalog.recipes]) {
    const stack = item.path.split('/')[2];
    if (valid.has(item) && !stackIds.has(stack)) problems.push({ path: item.path, message: `The stack folder ${stack} has no valid STACK.md.`, severity: 'error' });
  }
}

/** Format section 7.1. Returns errors and warnings; an item that fails its schema gets no further checks. */
export function lintCatalog(catalog: Catalog): Problem[] {
  const problems: Problem[] = [];
  if (!catalog.categories.length) problems.push({ path: 'CATEGORIES.md', message: 'CATEGORIES.md is missing or lists no category.', severity: 'error' });
  const all: Item[] = [...catalog.stacks, ...catalog.scaffolds, ...catalog.recipes];
  const valid = new Set(all.filter((item) => lintOne(item, catalog, problems)));
  const checked: Catalog = { ...catalog, stacks: catalog.stacks.filter((i) => valid.has(i)), scaffolds: catalog.scaffolds.filter((i) => valid.has(i)), recipes: catalog.recipes.filter((i) => valid.has(i)) };
  lintUniqueIds([...valid], problems);
  for (const stack of checked.stacks) lintStack(stack, checked, problems);
  lintOrphans(checked, valid, problems);
  return problems;
}

export const hasErrors = (problems: Problem[]) => problems.some((p) => p.severity === 'error');
