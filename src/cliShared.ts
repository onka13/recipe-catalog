import fs from 'node:fs';
import path from 'node:path';
import { AGENTS, type AgentName, type AgentOptions } from './check/agent.js';
import type { CheckOptions, ItemCheck } from './check/check.js';
import type { Problem } from './model.js';

/** Argument parsing and output shared by the `catalog` commands. */

export function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

export const flag = (args: string[], name: string) => args.includes(`--${name}`);

/** The positional arguments after the command, skipping `--name value` pairs and the boolean flags in `booleans`. */
export function positionals(args: string[], booleans: string[] = []): string[] {
  const out: string[] = [];
  for (let i = 1; i < args.length; i++) {
    if (!args[i].startsWith('--')) out.push(args[i]);
    else if (!booleans.includes(args[i].slice(2))) i++;
  }
  return out;
}

export function print(problems: Problem[]): void {
  for (const p of problems) console.log(`${p.severity === 'error' ? 'error  ' : 'warning'} ${p.path}: ${p.message}`);
  const errors = problems.filter((p) => p.severity === 'error').length;
  console.log(`${errors} error(s), ${problems.length - errors} warning(s)`);
}

export function readJson<T>(file: string, assert: (v: unknown) => asserts v is T): T | undefined {
  if (!fs.existsSync(file)) return undefined;
  const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(value);
  return value;
}

export const timeoutOf = (args: string[]) => Number(option(args, 'timeout') ?? 15) * 60_000;

/** `--agent`, `--agent-bin` and `--agent-model`; a string is the error to print. */
export function agentOption(args: string[], timeoutMs: number): AgentOptions | undefined | string {
  const name = option(args, 'agent');
  if (!name) return undefined;
  if (!AGENTS.includes(name as AgentName)) return `--agent must be one of ${AGENTS.join(', ')}.`;
  return { name: name as AgentName, bin: option(args, 'agent-bin'), model: option(args, 'agent-model'), timeoutMs };
}

export function checkOptions(args: string[], root: string, required: boolean): CheckOptions | string {
  const image = option(args, 'image');
  if (!image) return 'The check needs --image <toolchain image>.';
  const timeoutMs = timeoutOf(args);
  const agent = agentOption(args, timeoutMs);
  if (typeof agent === 'string') return agent;
  if (!agent && required) return 'A release needs --agent, because items carry instructions for a coding agent.';
  return { image, agent, timeoutMs, workDir: path.join(root, '.check') };
}

export function printCheck(check: ItemCheck): void {
  for (const s of check.steps) {
    console.log(`${s.status.padEnd(7)} ${s.step}${s.command ? `: ${s.command}` : ''}`);
    if (s.output && s.status !== 'passed') console.log(s.output.split('\n').map((l) => `          ${l}`).join('\n'));
  }
  console.log(`${check.kind} ${check.id}@${check.version}: ${check.status}`);
}
