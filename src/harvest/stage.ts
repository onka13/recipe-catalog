import fs from 'node:fs';
import path from 'node:path';
import { lintCatalog } from '../lint.js';
import { lintSchema } from '../lintItem.js';
import type { Catalog, Problem, RecipeItem } from '../model.js';
import { readRecipe } from '../read.js';
import { findLeaks } from './secrets.js';

/**
 * A recipe written outside the catalog (by the harvest agent, or by hand) is checked before it is filed: its schema,
 * the lint in the context of the whole catalog, the secret check against its project, and that its folder is new.
 */

export interface StagedCheck {
  /** The item with its catalog path (`stacks/<language>/<stack>/recipes/<category>/<id>`), when its front matter allows one. */
  item?: RecipeItem;
  problems: Problem[];
}

export interface StageOptions {
  /** The project the recipe was harvested from, for the secret check. */
  projectDir?: string;
  packageName?: string;
  /** The stack the recipe must belong to. */
  stack?: string;
}

export const recipePath = (item: RecipeItem) =>
  `stacks/${item.meta.language}/${item.meta.stack}/recipes/${item.meta.category}/${item.meta.id}`;

/** The problems of the lint that concern the item at `itemPath`. */
function lintInCatalog(catalog: Catalog, item: RecipeItem): Problem[] {
  const withItem: Catalog = { ...catalog, recipes: [...catalog.recipes, item] };
  return lintCatalog(withItem).filter((p) => p.path === item.path || p.path.startsWith(`${item.path}/`));
}

/** Checks the item folder `folder` (holding RECIPE.md and files/) against `catalog`. */
export function checkStaged(catalog: Catalog, folder: string, options: StageOptions): StagedCheck {
  const problems: Problem[] = [];
  const staged = readRecipe(path.dirname(folder), path.basename(folder), problems);
  if (!staged) return { problems };
  if (!lintSchema(staged, (message) => void problems.push({ path: `${folder}/RECIPE.md`, message, severity: 'error' }))) return { problems };
  const item: RecipeItem = { ...staged, path: recipePath(staged) };
  const report = (message: string) => void problems.push({ path: item.path, message, severity: 'error' });
  if (options.stack && item.meta.stack !== options.stack) report(`stack is "${item.meta.stack}"; the recipe was harvested for the stack ${options.stack}.`);
  if (fs.existsSync(path.join(catalog.root, item.path))) report(`${item.path} already exists; choose another id, or change the existing item with a new version.`);
  problems.push(...lintInCatalog(catalog, item));
  if (options.projectDir) problems.push(...findLeaks(item, options.projectDir, options.packageName));
  return { item, problems };
}
