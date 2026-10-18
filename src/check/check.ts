import fs from 'node:fs';
import path from 'node:path';
import { itemContentHash } from '../bundle.js';
import type { Catalog, RecipeItem, ScaffoldItem, StackItem } from '../model.js';
import type { AgentOptions } from './agent.js';
import { applyRecipe, applyScaffold, runDeliveryScripts, type Step, type Workspace } from './apply.js';
import { Sandbox } from './sandbox.js';

export interface CheckOptions {
  image: string;
  agent?: AgentOptions;
  /** Where check folders are created (one per item); kept after the run for inspection. */
  workDir: string;
  timeoutMs: number;
}

export interface ItemCheck {
  kind: 'scaffold' | 'recipe';
  id: string;
  version: string;
  contentHash: string;
  status: 'passed' | 'failed';
  checkedAt: string;
  image: string;
  agent?: string;
  steps: Step[];
}

const TIER = 'tier';
/** Values for the check run: parameters use their defaults, a secret parameter a placeholder text. */
function valuesFor(recipes: RecipeItem[]): Record<string, string> {
  const values: Record<string, string> = { PACKAGE_NAME: 'catalog_check', PROJECT_NAME: 'catalog-check' };
  for (const r of recipes) for (const p of r.meta.parameters ?? []) values[p.key] = p.default ?? `check-value-${p.key.toLowerCase()}`;
  return values;
}

function report(item: ScaffoldItem | RecipeItem, steps: Step[], passed: boolean, options: CheckOptions): ItemCheck {
  const usedAgent = options.agent && steps.some((s) => s.step.endsWith(': instructions') && s.status !== 'skipped');
  return {
    kind: item.kind, id: item.meta.id, version: item.meta.version, contentHash: itemContentHash(item),
    status: passed ? 'passed' : 'failed', checkedAt: new Date().toISOString(), image: options.image,
    ...(usedAgent ? { agent: options.agent?.name } : {}), steps,
  };
}

/** Runs `work` in a fresh container on `hostDir`; the container is removed afterwards, the folder kept. */
function inSandbox(hostDir: string, stack: StackItem, catalog: Catalog, options: CheckOptions, work: (ws: Workspace) => boolean) {
  fs.mkdirSync(hostDir, { recursive: true });
  const sandbox = new Sandbox(options.image, hostDir, options.timeoutMs);
  const ws: Workspace = { sandbox, hostDir, tier: TIER, stack: stack.meta, values: valuesFor(catalog.recipes), agent: options.agent, steps: [] };
  sandbox.start();
  try {
    return { passed: work(ws), steps: ws.steps };
  } finally {
    sandbox.stop();
  }
}

const recipeById = (catalog: Catalog, id: string) => {
  const found = catalog.recipes.find((r) => r.meta.id === id);
  if (!found) throw new Error(`Recipe ${id} is not in the catalog (run catalog lint).`);
  return found;
};

/** A scaffold, its mandatory recipes in order, then the tier's build and test scripts. */
export function checkScaffold(catalog: Catalog, scaffold: ScaffoldItem, options: CheckOptions): { check: ItemCheck; dir: string } {
  const stack = catalog.stacks.find((s) => s.meta.id === scaffold.meta.stack);
  if (!stack) throw new Error(`Stack ${scaffold.meta.stack} is not in the catalog.`);
  const dir = path.join(options.workDir, scaffold.meta.id);
  fs.rmSync(dir, { recursive: true, force: true });
  const { passed, steps } = inSandbox(dir, stack, catalog, options, (ws) =>
    applyScaffold(ws, scaffold)
    && scaffold.meta.mandatoryRecipes.every((id) => applyRecipe(ws, recipeById(catalog, id)))
    && runDeliveryScripts(ws));
  return { check: report(scaffold, steps, passed, options), dir };
}

/** The recipes `recipe` depends on, dependencies first, without those already applied. */
function dependencyOrder(catalog: Catalog, recipe: RecipeItem, applied: Set<string>): RecipeItem[] {
  const out: RecipeItem[] = [];
  const visit = (r: RecipeItem) => {
    for (const dep of r.meta.dependsOn ?? []) {
      if (applied.has(dep)) continue;
      applied.add(dep);
      const item = recipeById(catalog, dep);
      visit(item);
      out.push(item);
    }
  };
  visit(recipe);
  return out;
}

export class CatalogChecker {
  private readonly baselines = new Map<string, { check: ItemCheck; dir: string }>();

  constructor(private readonly catalog: Catalog, private readonly options: CheckOptions) {}

  private baseline(stack: StackItem) {
    let found = this.baselines.get(stack.meta.id);
    if (!found) {
      const scaffold = this.catalog.scaffolds.find((s) => s.meta.id === stack.meta.defaultScaffold);
      if (!scaffold) throw new Error(`defaultScaffold ${stack.meta.defaultScaffold} is not in the catalog.`);
      found = checkScaffold(this.catalog, scaffold, this.options);
      this.baselines.set(stack.meta.id, found);
    }
    return found;
  }

  scaffold(scaffold: ScaffoldItem): ItemCheck {
    const stack = this.catalog.stacks.find((s) => s.meta.id === scaffold.meta.stack);
    if (stack?.meta.defaultScaffold === scaffold.meta.id) return this.baseline(stack).check;
    return checkScaffold(this.catalog, scaffold, this.options).check;
  }

  /** Format section 7.3, starting from a copy of the stack's checked baseline. */
  recipe(recipe: RecipeItem): ItemCheck {
    const stack = this.catalog.stacks.find((s) => s.meta.id === recipe.meta.stack);
    if (!stack) throw new Error(`Stack ${recipe.meta.stack} is not in the catalog.`);
    const base = this.baseline(stack);
    const scaffold = this.catalog.scaffolds.find((s) => s.meta.id === stack.meta.defaultScaffold) as ScaffoldItem;
    const baseStep: Step = { step: `baseline: ${scaffold.meta.id} and its mandatory recipes`, status: base.check.status };
    if (base.check.status === 'failed') return report(recipe, [baseStep, ...base.check.steps.filter((s) => s.status !== 'passed')], false, this.options);
    if (scaffold.meta.mandatoryRecipes.includes(recipe.meta.id)) return report(recipe, [baseStep], true, this.options);
    const dir = path.join(this.options.workDir, recipe.meta.id);
    fs.rmSync(dir, { recursive: true, force: true });
    // Relative symlinks (node_modules/.bin) stay relative, so they still resolve inside the container.
    fs.cpSync(base.dir, dir, { recursive: true, verbatimSymlinks: true });
    const applied = new Set(scaffold.meta.mandatoryRecipes);
    const { passed, steps } = inSandbox(dir, stack, this.catalog, this.options, (ws) =>
      dependencyOrder(this.catalog, recipe, applied).every((dep) => applyRecipe(ws, dep))
      && applyRecipe(ws, recipe) && runDeliveryScripts(ws));
    return report(recipe, [baseStep, ...steps], passed, this.options);
  }
}
