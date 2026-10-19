import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root (tests run from `dist/test/`). */
export const REPO = fileURLToPath(new URL('../../', import.meta.url));

/** A throwaway copy of the catalog's Flutter stack and CATEGORIES.md, for tests that plant errors. */
export function flutterFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  fs.copyFileSync(path.join(REPO, 'CATEGORIES.md'), path.join(root, 'CATEGORIES.md'));
  fs.cpSync(path.join(REPO, 'stacks/dart/mobile-flutter'), path.join(root, 'stacks/dart/mobile-flutter'), { recursive: true });
  return root;
}

export const FLUTTER = 'stacks/dart/mobile-flutter';

export function edit(root: string, relPath: string, change: (text: string) => string): void {
  const file = path.join(root, relPath);
  fs.writeFileSync(file, change(fs.readFileSync(file, 'utf8')));
}

export function remove(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

/** A throwaway copy of every stack with CATEGORIES.md and FORMAT.md. */
export function catalogFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  for (const file of ['CATEGORIES.md', 'FORMAT.md']) fs.copyFileSync(path.join(REPO, file), path.join(root, file));
  fs.cpSync(path.join(REPO, 'stacks'), path.join(root, 'stacks'), { recursive: true });
  return root;
}

/** Every file under `dir` with its content, to prove which files an action changed. */
export function snapshot(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '.git') walk(full); } else out.set(path.relative(dir, full), fs.readFileSync(full, 'utf8'));
    }
  };
  walk(dir);
  return out;
}

export function changedFiles(before: Map<string, string>, after: Map<string, string>): string[] {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((k) => before.get(k) !== after.get(k)).sort();
}
