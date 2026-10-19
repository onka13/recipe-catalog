import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { StudioError } from './items.js';

/** CAT-28: the changed catalog files as a diff for the pull request, read from git without changing its index. */

export interface Changes { files: Array<{ status: string; path: string }>; diff: string }

const SCOPE = ['stacks', 'CATEGORIES.md'];

function git(cwd: string, args: string[], okCodes = [0]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw new StudioError(`git could not run: ${result.error.message}`, 500);
  if (!okCodes.includes(result.status ?? -1)) throw new StudioError(`git ${args[0]} failed: ${result.stderr.trim()}`, 500);
  return result.stdout;
}

export function catalogChanges(root: string): Changes {
  // Paths in git's output are relative to the repository's top folder, so every command runs there.
  const top = git(root, ['rev-parse', '--show-toplevel']).trim();
  const scope = SCOPE.map((s) => path.relative(top, path.join(fs.realpathSync(root), s)) || '.');
  const files = git(top, ['status', '--porcelain=v1', '--untracked-files=all', '--', ...scope]).split('\n').filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3) }));
  const tracked = git(top, ['diff', 'HEAD', '--', ...scope]);
  // `--no-index` exits with 1 when the files differ, which is always the case for a new file.
  const untracked = files.filter((f) => f.status === '??')
    .map((f) => git(top, ['diff', '--no-index', '--', '/dev/null', f.path], [0, 1]));
  return { files, diff: [tracked, ...untracked].filter(Boolean).join('') };
}
