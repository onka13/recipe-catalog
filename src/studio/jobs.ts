import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS } from '../check/agent.js';
import { StudioError } from './items.js';

/**
 * Verify and harvest run as `catalog` commands in a child process, because they take minutes; the page follows their
 * output. Arguments are built from checked fields and passed without a shell.
 */

const CLI = fileURLToPath(new URL('../cli.js', import.meta.url));
const MAX_OUTPUT = 1024 * 1024;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE = /^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/;

export interface Job { id: string; title: string; status: 'running' | 'passed' | 'failed'; exitCode?: number; output: string }

type Fields = Record<string, unknown>;

function text(fields: Fields, name: string, required = true): string | undefined {
  const value = fields[name];
  if (value === undefined || value === '') {
    if (required) throw new StudioError(`${name} is required.`);
    return undefined;
  }
  if (typeof value !== 'string' || value.startsWith('-')) throw new StudioError(`${name} is not valid.`);
  return value;
}

function agentArgs(fields: Fields, required: boolean): string[] {
  const agent = text(fields, 'agent', required);
  if (!agent) return [];
  if (!AGENTS.includes(agent as never)) throw new StudioError(`agent must be one of ${AGENTS.join(', ')}.`);
  const bin = text(fields, 'agentBin', false);
  if (bin && !path.isAbsolute(bin)) throw new StudioError('agentBin must be an absolute path.');
  const model = text(fields, 'agentModel', false);
  if (model && !/^[A-Za-z0-9._:-]+$/.test(model)) throw new StudioError('agentModel is not a model name.');
  return ['--agent', agent, ...(bin ? ['--agent-bin', bin] : []), ...(model ? ['--agent-model', model] : [])];
}

function verifyArgs(fields: Fields): string[] {
  const id = text(fields, 'id');
  const image = text(fields, 'image');
  if (!ID.test(id!)) throw new StudioError('id is not an item id.');
  if (!IMAGE.test(image!)) throw new StudioError('image is not a Docker image name.');
  return ['verify', id!, '--image', image!, ...agentArgs(fields, false)];
}

function harvestArgs(fields: Fields): string[] {
  const project = text(fields, 'project');
  if (!path.isAbsolute(project!) || !fs.existsSync(project!)) throw new StudioError('project must be the absolute path of an existing folder.');
  const capability = text(fields, 'capability');
  const stack = text(fields, 'stack');
  const category = text(fields, 'category', false);
  if (!ID.test(stack!) || (category && !ID.test(category))) throw new StudioError('stack and category are ids.');
  return ['harvest', project!, capability!, '--stack', stack!, ...(category ? ['--category', category] : []), ...agentArgs(fields, true)];
}

export class JobRunner {
  private readonly jobs = new Map<string, Job>();

  constructor(private readonly root: string) {}

  start(fields: Fields): Job {
    const args = fields.command === 'verify' ? verifyArgs(fields) : fields.command === 'harvest' ? harvestArgs(fields) : undefined;
    if (!args) throw new StudioError('command must be verify or harvest.');
    const job: Job = { id: crypto.randomUUID(), title: `catalog ${args.slice(0, 2).join(' ')}`, status: 'running', output: '' };
    this.jobs.set(job.id, job);
    const child = spawn(process.execPath, [CLI, ...args, '--root', this.root], { cwd: this.root, stdio: ['ignore', 'pipe', 'pipe'] });
    const append = (chunk: Buffer) => { job.output = (job.output + chunk.toString('utf8')).slice(-MAX_OUTPUT); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', (error) => { job.output += `\n${error.message}`; job.status = 'failed'; });
    child.on('close', (code) => { job.exitCode = code ?? 1; job.status = code === 0 ? 'passed' : 'failed'; });
    return job;
  }

  get(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) throw new StudioError('No such job.', 404);
    return job;
  }
}
