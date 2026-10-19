import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { RecipeItem } from '../model.js';

export const AGENTS = ['claude', 'codex', 'copilot'] as const;
export type AgentName = (typeof AGENTS)[number];

export interface AgentOptions {
  name: AgentName;
  /** The agent's executable; defaults to its name on the PATH. */
  bin?: string;
  /** The model the agent uses (for example `haiku`); the agent's own default when absent. */
  model?: string;
  timeoutMs: number;
}

const SKILL = fileURLToPath(new URL('../../../skills/apply-recipe/SKILL.md', import.meta.url));

/**
 * Each agent's non-interactive mode, allowed to read and edit files in the working folder, and to read the folders in
 * `readDirs` (Codex's sandbox reads everywhere and writes only in the working folder).
 */
function argsFor(options: AgentOptions, prompt: string, readDirs: string[]): string[] {
  const addDirs = readDirs.flatMap((d) => ['--add-dir', d]);
  const model = options.model ? ['--model', options.model] : [];
  if (options.name === 'claude') return ['-p', prompt, '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Edit,Write,Glob,Grep', ...addDirs, ...model, '--output-format', 'text'];
  if (options.name === 'codex') return ['exec', '--full-auto', ...model, prompt];
  return ['-p', prompt, '--allow-tool', 'write', ...addDirs, ...model, '--no-ask-user', '-s'];
}

/** A skill's instructions without its front matter. */
export function skillBody(file: string): string {
  const text = fs.readFileSync(file, 'utf8');
  return text.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

/** The prompt: the apply-recipe skill, then the recipe's instructions with its placeholders already filled in. */
export function applyPrompt(recipe: RecipeItem, fill: (text: string) => string): string {
  const instructions = recipe.instructions.map((i) => `### ${i.target}\n${fill(i.instruction)}`).join('\n\n');
  return `${skillBody(SKILL)}\n\n<recipe id="${recipe.meta.id}" version="${recipe.meta.version}">\n${instructions}\n</recipe>\n`;
}

export function runAgent(options: AgentOptions, cwd: string, prompt: string, readDirs: string[] = []): { exitCode: number; output: string } {
  const result = spawnSync(options.bin ?? options.name, argsFor(options, prompt, readDirs), {
    cwd, encoding: 'utf8', timeout: options.timeoutMs, maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error) return { exitCode: 127, output: `${output}\nCould not run ${options.bin ?? options.name}: ${result.error.message}` };
  return { exitCode: result.status ?? 1, output };
}
