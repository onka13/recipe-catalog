import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

export interface CommandResult {
  exitCode: number;
  output: string;
}

const MAX_OUTPUT = 64 * 1024 * 1024;
const TAIL = 4000;

/** The last part of a command's output, for the check report. */
export const tail = (text: string) => (text.length > TAIL ? `...${text.slice(-TAIL)}` : text);

/**
 * One long-lived container of the toolchain image with the check folder mounted at `/work`, so caches (pub, npm, NuGet) persist
 * between the commands of one check. Package caches are shared between checks through named volumes.
 */
export class Sandbox {
  private readonly name = `catalog-check-${crypto.randomBytes(4).toString('hex')}`;
  private started = false;

  constructor(private readonly image: string, private readonly hostDir: string, private readonly timeoutMs: number) {}

  start(): void {
    const args = ['run', '-d', '--rm', '--name', this.name, '-v', `${this.hostDir}:/work`,
      '-v', 'catalog-check-pub-cache:/root/.pub-cache', '-v', 'catalog-check-npm-cache:/root/.npm',
      '-v', 'catalog-check-nuget-cache:/root/.nuget/packages',
      '--entrypoint', 'sleep', this.image, 'infinity'];
    const result = spawnSync('docker', args, { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Could not start the toolchain image ${this.image}: ${result.stderr || result.error?.message}`);
    this.started = true;
  }

  /** Runs one shell command in `/work/<cwd>`. */
  exec(command: string, cwd: string): CommandResult {
    const result = spawnSync('docker', ['exec', '-w', `/work/${cwd}`, this.name, 'bash', '-lc', command], {
      encoding: 'utf8', maxBuffer: MAX_OUTPUT, timeout: this.timeoutMs,
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    if (result.error) return { exitCode: 124, output: `${output}\n${result.error.message}` };
    return { exitCode: result.status ?? 1, output };
  }

  stop(): void {
    if (this.started) spawnSync('docker', ['rm', '-f', this.name], { encoding: 'utf8' });
    this.started = false;
  }
}
