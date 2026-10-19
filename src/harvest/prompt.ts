import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skillBody } from '../check/agent.js';
import type { Catalog, Problem, StackItem } from '../model.js';
import { renderItem } from '../write.js';

/** The prompt of a harvest run: the `harvest-recipe` skill, the task, the format, and the project context. */

const SKILL = fileURLToPath(new URL('../../../skills/harvest-recipe/SKILL.md', import.meta.url));
export const STAGED_FOLDER = 'item';

export interface HarvestTask {
  capability: string;
  stack: StackItem;
  category?: string;
  projectContext: string;
}

/** The stack's smallest recipe with instructions, as a worked example of the format. */
function example(catalog: Catalog, stack: StackItem): string {
  const recipes = catalog.recipes.filter((r) => r.meta.stack === stack.meta.id && r.meta.standardType !== 'delivery-scripts');
  const smallest = (list: typeof recipes) => [...list].sort((a, b) => renderItem(a).length - renderItem(b).length)[0];
  const pick = smallest(recipes.filter((r) => r.instructions.length)) ?? smallest(recipes);
  if (!pick) return '';
  const files = pick.files.map((f) => `- files/${f.path}`).join('\n');
  return `<example_recipe path="${pick.path}">\n${renderItem(pick).trimEnd()}\n\nIts files/ folder:\n${files || '(none)'}\n</example_recipe>`;
}

/** How a project of the stack is created and built and tested, so the agent writes a test the stack really runs. */
function stackBaseline(catalog: Catalog, stack: StackItem): string {
  const scaffold = catalog.scaffolds.find((s) => s.meta.id === stack.meta.defaultScaffold);
  const delivery = catalog.recipes.find((r) => r.meta.id === stack.meta.deliveryScriptsRecipe);
  const testScript = delivery?.files.find((f) => f.path === 'scripts/test.sh');
  return [
    `<stack_baseline stack="${stack.meta.id}">`,
    renderItem(stack).trimEnd(),
    scaffold ? `\nDefault scaffold:\n${renderItem(scaffold).trimEnd()}` : '',
    testScript ? `\nscripts/test.sh, which the check and every project run as the test step:\n${testScript.content.trimEnd()}` : '',
    '</stack_baseline>',
  ].filter(Boolean).join('\n');
}

export function harvestPrompt(catalog: Catalog, task: HarvestTask): string {
  const format = fs.readFileSync(path.join(catalog.root, 'FORMAT.md'), 'utf8').trim();
  const categories = catalog.categories.map((c) => `- ${c.id}: ${c.meaning}`).join('\n');
  const existing = catalog.recipes.filter((r) => r.meta.stack === task.stack.meta.id)
    .map((r) => `- ${r.meta.id} (${r.meta.category}): ${r.meta.name}`).join('\n');
  const category = task.category ? `category: ${task.category} (given; do not change it)` : 'category: choose one from <categories>';
  return [
    skillBody(SKILL),
    `<harvest_task>\ncapability: ${task.capability}\nstack: ${task.stack.meta.id} (language ${task.stack.meta.language}, ${task.stack.meta.name})\n${category}\nwrite the item to: ./${STAGED_FOLDER}/RECIPE.md and ./${STAGED_FOLDER}/files/ in the current folder\n</harvest_task>`,
    `<catalog_format>\n${format}\n</catalog_format>`,
    `<categories>\n${categories}\n</categories>`,
    `<existing_recipes stack="${task.stack.meta.id}">\n${existing || '(none)'}\n</existing_recipes>`,
    stackBaseline(catalog, task.stack),
    example(catalog, task.stack),
    task.projectContext,
  ].filter(Boolean).join('\n\n');
}

/** The prompt of a fix round: the first prompt and what the check found in the written item. */
export function fixPrompt(first: string, problems: Problem[]): string {
  const list = problems.map((p) => `- ${p.path}: ${p.message}`).join('\n');
  return `${first}\n\n<problems>\nThe item in ./${STAGED_FOLDER}/ was written but did not pass the catalog's check. Fix every problem below in ./${STAGED_FOLDER}/ and change nothing else.\n${list}\n</problems>\n`;
}
