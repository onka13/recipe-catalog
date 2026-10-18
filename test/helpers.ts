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
