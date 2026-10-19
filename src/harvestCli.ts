import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { CatalogChecker } from './check/check.js';
import { agentOption, checkOptions, flag, option, positionals, print, printCheck, timeoutOf } from './cliShared.js';
import { projectContext, readPackageName } from './harvest/context.js';
import { harvest, slug } from './harvest/harvest.js';
import { checkStaged } from './harvest/stage.js';
import { hasErrors } from './lint.js';
import type { RecipeItem } from './model.js';
import { readCatalog } from './read.js';
import { writeItem } from './write.js';

/** The `context`, `add` and `harvest` commands (CAT-23). */

const DEFAULT_BUDGET = 8000;
const listOption = (args: string[], name: string) => option(args, name)?.split(',').map((s) => s.trim()).filter(Boolean);
const budgetOf = (args: string[]) => Number(option(args, 'budget') ?? DEFAULT_BUDGET);

export async function contextCommand(args: string[], root: string): Promise<number> {
  const [projectDir, capability] = positionals(args);
  if (!projectDir || !capability) { console.error('context needs <project folder> "<capability>".'); return 2; }
  const outDir = path.join(root, '.harvest', slug(capability), 'codeintel');
  const context = await projectContext({ projectDir, capability, files: listOption(args, 'files'), budget: budgetOf(args), outDir });
  console.log(context.text);
  return 0;
}

export function addCommand(args: string[], root: string): number {
  const [folder] = positionals(args);
  if (!folder) { console.error('add needs <item folder> (the folder holding RECIPE.md).'); return 2; }
  const projectDir = option(args, 'project');
  const { catalog } = readCatalog(root);
  const checked = checkStaged(catalog, path.resolve(folder), {
    projectDir, packageName: projectDir ? readPackageName(projectDir) : undefined, stack: option(args, 'stack'),
  });
  if (!checked.item || hasErrors(checked.problems)) { print(checked.problems); return 1; }
  writeItem(root, checked.item);
  fs.rmSync(path.resolve(folder), { recursive: true, force: true });
  if (checked.problems.length) print(checked.problems);
  console.log(`Filed ${checked.item.path}`);
  return 0;
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

/** CAT-23 "the command offers to run the check": runs it with --verify, asks on a terminal, else prints the command. */
async function offerCheck(args: string[], root: string, item: RecipeItem): Promise<number> {
  const options = checkOptions(args, root, false);
  const command = `npm run catalog -- verify ${item.meta.id} --image <toolchain image> --agent ${option(args, 'agent')}`;
  if (typeof options === 'string') { console.log(`Check it before opening a pull request: ${command}`); return 0; }
  if (!flag(args, 'verify') && !(await confirm(`Run the full check (FORMAT.md 7.3) on ${item.meta.id} now?`))) {
    console.log(`Check it before opening a pull request: ${command.replace('<toolchain image>', options.image)}`);
    return 0;
  }
  const check = new CatalogChecker(readCatalog(root).catalog, options).recipe(item);
  printCheck(check);
  return check.status === 'passed' ? 0 : 1;
}

export async function harvestCommand(args: string[], root: string): Promise<number> {
  const [projectDir, capability] = positionals(args, ['verify']);
  const stack = option(args, 'stack');
  const agent = agentOption(args, timeoutOf(args));
  if (!projectDir || !capability || !stack) { console.error('harvest needs <project folder> "<capability>" --stack <id> --agent <name>.'); return 2; }
  if (!agent || typeof agent === 'string') { console.error(agent ?? 'harvest needs --agent claude|codex|copilot: the coding agent you already use writes the recipe.'); return 2; }
  const result = await harvest({
    catalogRoot: root, projectDir: path.resolve(projectDir), capability, stack, category: option(args, 'category'),
    files: listOption(args, 'files'), budget: budgetOf(args), agent, fixRounds: Number(option(args, 'fix-rounds') ?? 2),
    log: (line) => console.log(line),
  });
  if (!result.item) {
    print(result.problems);
    console.log(`Nothing was added. The agent's work and logs are in ${path.relative(process.cwd(), result.stageDir)}/.`);
    return 1;
  }
  if (result.problems.length) print(result.problems);
  console.log(`Added ${result.item.path} (${result.item.files.length} file(s), ${result.item.instructions.length} instruction(s)).`);
  return offerCheck(args, root, result.item);
}
