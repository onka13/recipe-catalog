import fs from 'node:fs';
import path from 'node:path';
import { runAgent, type AgentOptions } from '../check/agent.js';
import { hasErrors, lintCatalog } from '../lint.js';
import type { Catalog, Problem, RecipeItem } from '../model.js';
import { readCatalog } from '../read.js';
import { writeItem } from '../write.js';
import { projectContext, type ProjectContext } from './context.js';
import { fixPrompt, harvestPrompt, STAGED_FOLDER } from './prompt.js';
import { checkStaged } from './stage.js';

/**
 * CAT-23: turn a capability of the developer's own project into a recipe, with the coding agent they already use.
 * The tool has no model client: the agent runs in its non-interactive mode in a staging folder and may read the project.
 */

export interface HarvestOptions {
  catalogRoot: string;
  projectDir: string;
  capability: string;
  stack: string;
  category?: string;
  files?: string[];
  budget: number;
  agent: AgentOptions;
  /** Fix rounds after the first attempt when the written item fails the check. */
  fixRounds: number;
  log: (line: string) => void;
}

export interface HarvestResult {
  item?: RecipeItem;
  problems: Problem[];
  /** Where the agent worked; kept when the harvest fails. */
  stageDir: string;
  /** The agent wrote no item on purpose (its reply is the problem's message). */
  declined?: boolean;
}

export const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'harvest';

function catalogWithoutErrors(root: string) {
  const read = readCatalog(root);
  const problems = [...read.problems, ...lintCatalog(read.catalog)];
  if (hasErrors(problems)) throw new Error('The catalog has lint errors; run `catalog lint` and fix them before harvesting.');
  return read.catalog;
}

function resolveStack(options: HarvestOptions) {
  const catalog = catalogWithoutErrors(options.catalogRoot);
  const stack = catalog.stacks.find((s) => s.meta.id === options.stack);
  if (!stack) throw new Error(`No stack has the id ${options.stack}. Stacks: ${catalog.stacks.map((s) => s.meta.id).join(', ')}.`);
  if (options.category && !catalog.categories.some((c) => c.id === options.category)) throw new Error(`${options.category} is not listed in CATEGORIES.md.`);
  return { catalog, stack };
}

interface Rounds {
  options: HarvestOptions;
  catalog: Catalog;
  stageDir: string;
  context: ProjectContext;
  first: string;
}

/** The agent writes the item, the check runs, and the agent fixes what it found, up to `fixRounds` times. */
function agentRounds({ options, catalog, stageDir, context, first }: Rounds): HarvestResult {
  let prompt = first;
  let problems: Problem[] = [];
  for (let round = 0; round <= options.fixRounds; round++) {
    options.log(round === 0 ? `Running ${options.agent.name} ...` : `Round ${round}: ${options.agent.name} fixes ${problems.length} problem(s) ...`);
    const run = runAgent(options.agent, stageDir, prompt, [context.projectDir]);
    fs.writeFileSync(path.join(stageDir, `agent-${round}.log`), run.output);
    if (run.exitCode !== 0) return { problems: [{ path: stageDir, message: `${options.agent.name} exited with ${run.exitCode}:\n${run.output.slice(-2000)}`, severity: 'error' }], stageDir };
    // The skill lets the agent decline (the capability is app-specific or the stack has it already): stop and show why.
    if (!fs.existsSync(path.join(stageDir, STAGED_FOLDER))) return { problems: [{ path: stageDir, message: `${options.agent.name} wrote no item. Its reply:\n${run.output.trim().slice(-3000)}`, severity: 'error' }], stageDir, declined: true };
    const checked = checkStaged(catalog, path.join(stageDir, STAGED_FOLDER), { projectDir: context.projectDir, packageName: context.packageName, stack: options.stack });
    problems = checked.problems;
    if (checked.item && !hasErrors(problems)) {
      writeItem(options.catalogRoot, checked.item);
      fs.rmSync(stageDir, { recursive: true, force: true });
      return { item: checked.item, problems, stageDir };
    }
    prompt = fixPrompt(first, problems);
  }
  return { problems, stageDir };
}

export async function harvest(options: HarvestOptions): Promise<HarvestResult> {
  const { catalog, stack } = resolveStack(options);
  const stageDir = path.join(options.catalogRoot, '.harvest', slug(options.capability));
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });
  options.log(`Reading ${options.projectDir} with Code Intelligence ...`);
  const context = await projectContext({ ...options, outDir: path.join(stageDir, 'codeintel') });
  options.log(`Files around the capability: ${context.targets.join(', ')}`);
  const first = harvestPrompt(catalog, { capability: options.capability, stack, category: options.category, projectContext: context.text });
  return agentRounds({ options, catalog, stageDir, context, first });
}
