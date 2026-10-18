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
  timeoutMs: number;
}

const SKILL = fileURLToPath(new URL('../../../skills/apply-recipe/SKILL.md', import.meta.url));

/** Each agent's non-interactive mode, allowed to read and edit files in the working folder only. */
function argsFor(name: AgentName, prompt: string): string[] {
  if (name === 'claude') return ['-p', prompt, '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Edit,Write,Glob,Grep', '--output-format', 'text'];
  if (name === 'codex') return ['exec', '--full-auto', prompt];
  return ['-p', prompt, '--allow-tool', 'write', '--no-ask-user', '-s'];
}

function skillBody(): string {
  const text = fs.readFileSync(SKILL, 'utf8');
  return text.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

/** The prompt: the apply-recipe skill, then the recipe's instructions with its placeholders already filled in. */
export function applyPrompt(recipe: RecipeItem, fill: (text: string) => string): string {
  const instructions = recipe.instructions.map((i) => `### ${i.target}\n${fill(i.instruction)}`).join('\n\n');
  return `${skillBody()}\n\n<recipe id="${recipe.meta.id}" version="${recipe.meta.version}">\n${instructions}\n</recipe>\n`;
}

export function runAgent(options: AgentOptions, cwd: string, prompt: string): { exitCode: number; output: string } {
  const result = spawnSync(options.bin ?? options.name, argsFor(options.name, prompt), {
    cwd, encoding: 'utf8', timeout: options.timeoutMs, maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error) return { exitCode: 127, output: `${output}\nCould not run ${options.bin ?? options.name}: ${result.error.message}` };
  return { exitCode: result.status ?? 1, output };
}
