import fs from 'node:fs';
import path from 'node:path';
import type { ItemFile, RecipeItem, ScaffoldItem, StackMeta } from '../model.js';
import { applyPrompt, runAgent, type AgentOptions } from './agent.js';
import { Sandbox, tail } from './sandbox.js';

export interface Step {
  step: string;
  command?: string;
  status: 'passed' | 'failed' | 'skipped';
  exitCode?: number;
  output?: string;
}

/** One project folder being built in the sandbox: `<hostDir>/<tier>` on the host is `/work/<tier>` in the container. */
export interface Workspace {
  sandbox: Sandbox;
  hostDir: string;
  tier: string;
  stack: StackMeta;
  values: Record<string, string>;
  agent?: AgentOptions;
  steps: Step[];
}

const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

export function fill(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER, (whole, key: string) => values[key] ?? whole);
}

const tierPath = (ws: Workspace, rel = '') => path.join(ws.hostDir, ws.tier, rel);

/** Runs commands in order and stops at the first that fails. */
export function runCommands(ws: Workspace, step: string, commands: string[]): boolean {
  for (const raw of commands) {
    const command = fill(raw, ws.values);
    const result = ws.sandbox.exec(command, ws.tier);
    const passed = result.exitCode === 0;
    ws.steps.push({ step, command, status: passed ? 'passed' : 'failed', exitCode: result.exitCode, ...(passed ? {} : { output: tail(result.output) }) });
    if (!passed) return false;
  }
  return true;
}

export function writeFiles(ws: Workspace, step: string, files: ItemFile[], onlyIfMissing: string[] = []): void {
  for (const file of files) {
    const target = tierPath(ws, file.path);
    if (onlyIfMissing.includes(file.path) && fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fill(file.content, ws.values));
  }
  if (files.length) ws.steps.push({ step, status: 'passed' });
}

const readOrNull = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);

/** A coding agent carries out the recipe's instructions; every target file must have changed (format 7.3.3). */
function applyInstructions(ws: Workspace, recipe: RecipeItem): boolean {
  if (!recipe.instructions.length) return true;
  const step = `${recipe.meta.id}: instructions`;
  if (!ws.agent) {
    ws.steps.push({ step, status: 'skipped', output: 'No coding agent was given (--agent), so the instructions were not carried out.' });
    return false;
  }
  const before = recipe.instructions.map((i) => readOrNull(tierPath(ws, i.target)));
  const result = runAgent(ws.agent, tierPath(ws), applyPrompt(recipe, (t) => fill(t, ws.values)));
  const unchanged = recipe.instructions.filter((i, n) => readOrNull(tierPath(ws, i.target)) === before[n]).map((i) => i.target);
  const passed = result.exitCode === 0 && unchanged.length === 0;
  const why = unchanged.length ? `Not changed: ${unchanged.join(', ')}\n` : '';
  ws.steps.push({ step, command: ws.agent.name, status: passed ? 'passed' : 'failed', exitCode: result.exitCode, ...(passed ? {} : { output: tail(`${why}${result.output}`) }) });
  return passed;
}

function installPackages(ws: Workspace, recipe: RecipeItem): boolean {
  const commands = (recipe.meta.packages ?? []).map((p) =>
    fill(p.dev ? ws.stack.addDevPackage : ws.stack.addPackage, { NAME: p.name, VERSION: p.version }));
  return runCommands(ws, `${recipe.meta.id}: packages`, commands);
}

/** Format section 5: commands in the empty tier folder, then its files, then its verify commands. */
export function applyScaffold(ws: Workspace, scaffold: ScaffoldItem): boolean {
  fs.mkdirSync(tierPath(ws), { recursive: true });
  const id = scaffold.meta.id;
  if (!runCommands(ws, `${id}: commands`, scaffold.meta.commands)) return false;
  writeFiles(ws, `${id}: files`, scaffold.files);
  if (!fs.existsSync(tierPath(ws, scaffold.meta.markerFile))) {
    ws.steps.push({ step: `${id}: marker file`, status: 'failed', output: `${scaffold.meta.markerFile} does not exist after the scaffold.` });
    return false;
  }
  return runCommands(ws, `${id}: verify`, scaffold.meta.verify);
}

/** Files, packages, instructions, then the recipe's verify commands. */
export function applyRecipe(ws: Workspace, recipe: RecipeItem): boolean {
  const id = recipe.meta.id;
  writeFiles(ws, `${id}: files`, recipe.files, recipe.meta.onlyIfMissing);
  if (!installPackages(ws, recipe)) return false;
  if (!applyInstructions(ws, recipe)) return false;
  return runCommands(ws, `${id}: verify`, recipe.meta.verify);
}

export function runDeliveryScripts(ws: Workspace): boolean {
  return runCommands(ws, 'delivery scripts', ['bash scripts/build.sh', 'bash scripts/test.sh']);
}
